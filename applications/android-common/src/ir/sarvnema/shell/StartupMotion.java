package ir.sarvnema.shell;

/** Pure motion math. The animation never decides when a page is ready. */
public final class StartupMotion {
    public static final long SCENE_MS = 5200, FADE_MS = 1200;
    private StartupMotion() {}
    public static int scene(long elapsed, int count) {
        return count < 1 ? 0 : (int) ((Math.max(0, elapsed) / SCENE_MS) % count);
    }
    public static float blend(long elapsed) {
        float t = (Math.max(0, elapsed) % SCENE_MS - (SCENE_MS - FADE_MS)) / (float) FADE_MS;
        t = Math.max(0f, Math.min(1f, t));
        return t * t * (3f - 2f * t);
    }
    public static float drift(long elapsed) {
        return (float) (0.5 - 0.5 * Math.cos(Math.max(0, elapsed) * Math.PI / 14000.0));
    }
}
