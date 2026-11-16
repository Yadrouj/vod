package ir.sarvnema.shell;

import java.net.URI;
import java.util.Locale;

/** Pure Java policy, independently tested without an Android device. */
public final class UrlPolicy {
    private UrlPolicy() {}
    public static boolean https(String value) {
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                && uri.getRawUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443)
                && !value.contains("\\");
        } catch (Exception ignored) { return false; }
    }
    public static boolean trusted(String value) {
        try { return https(value) && "sarvnema.ir".equalsIgnoreCase(new URI(value).getHost()); }
        catch (Exception ignored) { return false; }
    }
    public static boolean downloadPage(String value) {
        if (!trusted(value)) return false;
        try {
            String path = new URI(value).getPath();
            return path.startsWith("/download/") || path.startsWith("/d/");
        } catch (Exception ignored) { return false; }
    }
    public static boolean mediaFile(String value) {
        if (!https(value)) return false;
        try { return new URI(value).getPath().toLowerCase(Locale.ROOT).matches(".*\\.(mp3|m4a|aac|flac|wav|ogg|opus|mp4|m4v|webm|mkv|zip|srt|vtt|ass|ssa)$"); }
        catch (Exception ignored) { return false; }
    }
}
