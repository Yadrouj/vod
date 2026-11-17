package ir.sarvnema.shell;

/** UI-thread state for one startup attempt; isolated from Android for regression tests. */
public final class StartupState {
    private long generation;
    private boolean active = true, finished, visualRequested, revealed;
    private int progress;

    public long started() {
        if (!active || revealed) return generation;
        generation++; finished = false; visualRequested = false; progress = 0;
        return generation;
    }
    public void progress(int value) {
        if (active && !revealed) progress = Math.max(progress, Math.max(0, Math.min(100, value)));
    }
    public void finished() { if (active && !revealed) finished = true; }
    public boolean awaitingPage() { return active && !revealed; }
    public boolean canProbe(long token) { return awaitingPage() && finished && generation == token; }
    public boolean requestVisual(long token) {
        if (!canProbe(token) || visualRequested) return false;
        visualRequested = true; return true;
    }
    public boolean reveal(long token) {
        if (!canProbe(token) || !visualRequested) return false;
        revealed = true; return true;
    }
    public void cancel() { generation++; active = false; }
    public long generation() { return generation; }
    public int progress() { return progress; }
}
