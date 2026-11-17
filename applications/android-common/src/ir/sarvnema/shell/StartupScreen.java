package ir.sarvnema.shell;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.PathInterpolator;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/** Branded, one-shot loading overlay; never exposes an unfinished or failed WebView. */
public final class StartupScreen {
    private static final long SLOW_MS = 8000, TIMEOUT_MS = 35000;
    // Read-only JS, no native bridge. Main content + fonts must be ready, not just a committed response.
    private static final String READY = "(function(){return document.readyState==='complete'&&!!document.querySelector('main')&&(!document.fonts||document.fonts.status==='loaded');})()";
    private final Activity activity;
    private final FrameLayout root;
    private final WebView web;
    private final View overlay, brand, mark;
    private final ProgressBar meter;
    private final TextView status;
    private final int slowMessage;
    private final Runnable onTimeout;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final StartupState state = new StartupState();
    private final int previousAccessibility, previousDescendantFocus;
    private final ObjectAnimator breath;

    public StartupScreen(Activity activity, FrameLayout root, WebView web, int layout, int slowMessage, Runnable onTimeout) {
        this.activity = activity; this.root = root; this.web = web; this.slowMessage = slowMessage; this.onTimeout = onTimeout;
        overlay = LayoutInflater.from(activity).inflate(layout, root, false);
        brand = overlay.findViewWithTag("startup_brand"); mark = overlay.findViewWithTag("startup_mark");
        meter = (ProgressBar) overlay.findViewWithTag("startup_progress"); status = (TextView) overlay.findViewWithTag("startup_status");
        previousAccessibility = web.getImportantForAccessibility(); previousDescendantFocus = web.getDescendantFocusability();
        web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        web.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
        web.clearFocus();
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -1)); overlay.requestFocus();
        breath = ObjectAnimator.ofFloat(mark, View.ALPHA, 0.65f, 1f);
        breath.setDuration(1100); breath.setRepeatCount(ValueAnimator.INFINITE); breath.setRepeatMode(ValueAnimator.REVERSE);
        resume();
        scheduleDeadline();
    }

    /** Match Android 12+ system launch to the same native loading surface, without a second Activity. */
    public static void handoffSystemSplash(Activity activity) {
        if (Build.VERSION.SDK_INT >= 31) activity.getSplashScreen().setOnExitAnimationListener(view -> view.remove());
    }
    public boolean blocksInput() { return overlay.getParent() != null; }
    public void pageStarted() {
        if (!state.awaitingPage()) return;
        state.started(); meter.setProgress(0);
        // Redirects invalidate old probes, but must not extend the overall startup deadline.
    }
    public void progress(int value) {
        if (!state.awaitingPage()) return;
        state.progress(value); meter.setProgress(state.progress(), ValueAnimator.areAnimatorsEnabled());
    }
    public void pageFinished() {
        if (!state.awaitingPage()) return;
        state.finished(); probe(state.generation());
    }
    private void scheduleDeadline() {
        handler.postDelayed(() -> { if (state.awaitingPage()) status.setText(slowMessage); }, SLOW_MS);
        handler.postDelayed(() -> {
            if (!state.awaitingPage() || activity.isFinishing() || activity.isDestroyed()) return;
            cancel(); onTimeout.run();
        }, TIMEOUT_MS);
    }
    private void probe(long token) {
        if (!state.canProbe(token) || activity.isFinishing() || activity.isDestroyed()) return;
        web.evaluateJavascript(READY, result -> {
            if (!state.canProbe(token) || activity.isFinishing() || activity.isDestroyed()) return;
            if (!"true".equals(result)) { handler.postDelayed(() -> probe(token), 120); return; }
            if (!state.requestVisual(token)) return;
            web.postVisualStateCallback(token, new WebView.VisualStateCallback() {
                @Override public void onComplete(long id) {
                    if (activity.isFinishing() || activity.isDestroyed() || !state.reveal(id)) return;
                    reveal();
                }
            });
        });
    }
    private void reveal() {
        handler.removeCallbacksAndMessages(null); breath.cancel(); mark.setAlpha(1f); meter.setProgress(100);
        if (!ValueAnimator.areAnimatorsEnabled()) { removeOverlay(); return; }
        // WebView stays attached and VISIBLE under the opaque overlay until its first frame is ready.
        web.setAlpha(0f); web.setTranslationY(8 * root.getResources().getDisplayMetrics().density);
        PathInterpolator easing = new PathInterpolator(0.2f, 0f, 0f, 1f);
        web.animate().alpha(1f).translationY(0f).setDuration(320).setInterpolator(easing).start();
        brand.animate().scaleX(1.035f).scaleY(1.035f).setDuration(280).setInterpolator(easing).start();
        overlay.animate().alpha(0f).setDuration(320).setInterpolator(easing).withEndAction(this::removeOverlay).start();
    }
    private void removeOverlay() {
        root.removeView(overlay);
        web.setImportantForAccessibility(previousAccessibility); web.setDescendantFocusability(previousDescendantFocus);
        web.requestFocus();
    }
    public void pause() { if (breath.isStarted()) breath.pause(); }
    public void resume() {
        if (state.awaitingPage() && ValueAnimator.areAnimatorsEnabled()) {
            if (breath.isPaused()) breath.resume(); else if (!breath.isStarted()) breath.start();
        }
    }
    /** Errors, retries and Activity destruction invalidate every pending DOM/render callback. */
    public void cancel() {
        state.cancel(); handler.removeCallbacksAndMessages(null); breath.cancel();
        overlay.animate().withEndAction(null).cancel(); brand.animate().cancel(); web.animate().cancel();
        web.setAlpha(1f); web.setTranslationY(0f); removeOverlay();
    }
}
