import ir.sarvnema.shell.UrlPolicy;

public final class UrlPolicySpec {
    private static void check(boolean value, String label) { if (!value) throw new AssertionError(label); }
    public static void main(String[] args) {
        for (String value : new String[] {"https://sarvnema.ir/", "https://sarvnema.ir:443/music", "https://SARVNEMA.IR/watch/tt0903747", "https://sarvnema.ir/download/continue?url=https%3A%2F%2Fcdn.example%2Fa.mp4"}) check(UrlPolicy.trusted(value), value);
        for (String value : new String[] {null,"", "http://sarvnema.ir/", "https://sarvnema.ir.evil.test/", "https://sarvnema.ir@evil.test/", "https://evil.test@sarvnema.ir/", "https://sarvnema.ir:8443/", "https://sarvnema%2eir/", "https://sarvnema.ir\\@evil.test/", "javascript:alert(1)", "file:///etc/passwd", "content://ir.sarvnema.app/private", "intent://sarvnema.ir", "https://music.sarvnema.ir/"}) check(!UrlPolicy.trusted(value), "rejected " + value);
        check(UrlPolicy.mediaFile("https://cdn.example/movie.MKV?token=public"), "media extension with query");
        check(UrlPolicy.mediaFile("https://music.sarvnema.ir/ABBA/song.mp3"), "music CDN download, not app origin");
        check(!UrlPolicy.mediaFile("https://cdn.example/song.mp3/evil.html"), "extension must end path");
        check(!UrlPolicy.mediaFile("http://cdn.example/movie.mp4"), "no cleartext native download");
        check(UrlPolicy.downloadPage("https://sarvnema.ir/download/continue?url=x"), "countdown page");
        check(UrlPolicy.downloadPage("https://sarvnema.ir/d/abc123"), "short download URL");
        check(!UrlPolicy.downloadPage("https://cdn.example/download/continue"), "no external countdown trust");
        check(!UrlPolicy.downloadPage("https://sarvnema.ir/music/track"), "regular page cannot auto-download arbitrary redirects");
        System.out.println("PASS: URL policy cases, trusted origin, countdown and media classification");
    }
}
