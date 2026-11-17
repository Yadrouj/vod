import ir.sarvnema.shell.StartupState;

public final class StartupStateSpec {
    private static int checks;
    private static void check(boolean value, String label) {
        checks++; if (!value) throw new AssertionError(label);
    }
    public static void main(String[] args) {
        StartupState state = new StartupState();
        long first = state.started();
        check(!state.canProbe(first), "navigation start is not a finished page");
        state.progress(100);
        check(!state.canProbe(first), "100 percent alone cannot reveal an unfinished page");
        check(!state.requestVisual(first), "must wait for onPageFinished");
        state.finished();
        check(state.canProbe(first), "finished page may check its DOM");
        check(!state.reveal(first), "DOM must also have a visual-state callback");
        check(state.requestVisual(first), "only ready DOM can request first frame");
        check(!state.requestVisual(first), "deduplicate repeated onPageFinished/probe callbacks");

        long redirect = state.started();
        check(redirect != first, "redirect gets its own render token");
        check(state.progress() == 0, "redirect resets its real progress");
        check(!state.reveal(first) && !state.canProbe(first), "ignore stale DOM and frame callbacks");
        check(!state.canProbe(redirect), "new navigation must finish independently");
        state.progress(-3); check(state.progress() == 0, "negative progress is clamped");
        state.progress(40); state.progress(20); check(state.progress() == 40, "progress never moves backward");
        state.progress(105); check(state.progress() == 100, "progress never exceeds 100");
        state.finished(); check(state.requestVisual(redirect), "redirect requests its own frame");
        check(state.reveal(redirect), "reveal only after matching frame callback");
        check(!state.reveal(redirect), "transition is one-shot");
        check(!state.awaitingPage(), "normal subsequent navigations have no startup gate");
        check(state.started() == redirect, "in-app navigation never replays the intro");

        StartupState failed = new StartupState();
        long failedToken = failed.started(); failed.finished(); failed.requestVisual(failedToken); failed.cancel();
        check(!failed.reveal(failedToken), "a failed HTTP/SSL/offline load cannot reveal later");
        failed.finished(); failed.progress(100);
        check(!failed.awaitingPage() && !failed.canProbe(failed.generation()), "cancel blocks all pending callbacks");
        StartupState retry = new StartupState();
        long retriedToken = retry.started(); retry.finished();
        check(retry.requestVisual(retriedToken) && retry.reveal(retriedToken), "retry gets an independent successful attempt");
        retry.cancel(); check(!retry.reveal(retriedToken), "destroy cancels even after reveal");
        System.out.println("PASS: startup state (" + checks + " checks): frame readiness, redirects, progress, failure, retry and destroy");
    }
}
