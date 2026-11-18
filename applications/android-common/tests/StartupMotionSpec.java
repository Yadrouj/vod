import ir.sarvnema.shell.StartupMotion;

public final class StartupMotionSpec {
    private static void check(boolean value, String label) {
        if (!value) throw new AssertionError(label);
    }
    public static void main(String[] args) {
        check(StartupMotion.scene(-100, 3) == 0, "negative elapsed is clamped");
        check(StartupMotion.scene(9999, 0) == 0, "missing images cannot divide by zero");
        check(StartupMotion.scene(5199, 3) == 0 && StartupMotion.scene(5200, 3) == 1, "scene handoff");
        check(StartupMotion.scene(15600, 3) == 0, "three-scene loop");
        check(StartupMotion.scene(Long.MAX_VALUE, 3) < 3, "large elapsed stays bounded");
        check(StartupMotion.blend(4000) == 0f && StartupMotion.blend(4600) == .5f, "crossfade timing");
        check(StartupMotion.blend(5199) > .999f && StartupMotion.blend(5200) == 0f, "handoff has no black frame");
        float previous = 0;
        for (long at = 4000; at < 5200; at++) {
            float blend = StartupMotion.blend(at);
            check(blend >= previous && blend <= 1, "monotonic bounded smooth crossfade"); previous = blend;
        }
        for (long at = 0; at < 100000; at += 113) {
            float drift = StartupMotion.drift(at);
            check(drift >= 0 && drift <= 1 && !Float.isNaN(drift), "bounded slow pan");
        }
        System.out.println("PASS: startup motion: scene loops, crossfades, bounds and long uptime");
    }
}
