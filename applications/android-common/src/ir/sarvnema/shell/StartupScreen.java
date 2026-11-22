package ir.sarvnema.shell;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Rect;
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
    // A usable, painted route is enough. Slow posters, fonts and telemetry are not startup gates.
    private static final String READY = "(function(){return Array.from(document.querySelectorAll('main:not([aria-busy=true])')).some(m=>m.getBoundingClientRect().height>0&&!m.closest('[hidden]')&&!!m.querySelector('a[href],button,h1'));})()";
    private final Activity activity;
    private final FrameLayout root;
    private final WebView web;
    private final View overlay, brand, mark, halo;
    private final CinematicBackdrop cinema;
    private final ProgressBar meter;
    private final TextView status;
    private final int slowMessage;
    private final Runnable onTimeout;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final StartupState state = new StartupState();
    private final int previousAccessibility, previousDescendantFocus;
    private final ObjectAnimator breath;
    private final ValueAnimator entrance;
    private final Rect clip = new Rect();
    private boolean entered, foreground = true;
    private long probingGeneration = -1;

    public StartupScreen(Activity activity, FrameLayout root, WebView web, int layout, int slowMessage, Runnable onTimeout) {
        this.activity = activity; this.root = root; this.web = web; this.slowMessage = slowMessage; this.onTimeout = onTimeout;
        overlay = LayoutInflater.from(activity).inflate(layout, root, false);
        brand = overlay.findViewWithTag("startup_brand"); mark = overlay.findViewWithTag("startup_mark");
        halo = overlay.findViewWithTag("startup_halo"); cinema = (CinematicBackdrop) overlay.findViewWithTag("startup_cinema");
        meter = (ProgressBar) overlay.findViewWithTag("startup_progress"); status = (TextView) overlay.findViewWithTag("startup_status");
        previousAccessibility = web.getImportantForAccessibility(); previousDescendantFocus = web.getDescendantFocusability();
        web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        web.setDescendantFocusability(ViewGroup.FOCUS_BLOCK_DESCENDANTS);
        web.clearFocus();
        root.addView(overlay, new FrameLayout.LayoutParams(-1, -1)); overlay.requestFocus();
        breath = ObjectAnimator.ofFloat(halo, View.ALPHA, .45f, 1f);
        breath.setDuration(1800); breath.setRepeatCount(ValueAnimator.INFINITE); breath.setRepeatMode(ValueAnimator.REVERSE);
        entrance = ValueAnimator.ofFloat(0f, 1f);
        entrance.setDuration(900); entrance.setInterpolator(new PathInterpolator(.16f, 1f, .3f, 1f));
        entrance.addUpdateListener(animation -> introFrame((float) animation.getAnimatedValue()));
        introFrame(ValueAnimator.areAnimatorsEnabled() ? 0f : 1f);
        resume();
        scheduleDeadline();
    }

    private void introFrame(float value) {
        mark.setScaleX(.82f + .18f * value); mark.setScaleY(.82f + .18f * value);
        mark.setAlpha(.3f + .7f * value);
        clip.set(0, Math.round(mark.getHeight() * (1f - value)), mark.getWidth(), mark.getHeight());
        mark.setClipBounds(value >= 1f ? null : clip);
        brand.setAlpha(.6f + .4f * value);
        brand.setTranslationY((1f - value) * 14 * root.getResources().getDisplayMetrics().density);
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
        long token = state.generation();
        if (probingGeneration == token) return;
        probingGeneration = token; state.finished(); probe(token);
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
        handler.removeCallbacksAndMessages(null); breath.cancel(); entrance.cancel(); cinema.pauseMotion();
        introFrame(1f); meter.setProgress(100);
        if (!ValueAnimator.areAnimatorsEnabled()) { removeOverlay(); return; }
        // WebView stays attached and VISIBLE under the opaque overlay until its first frame is ready.
        web.setAlpha(0f); web.setTranslationY(6 * root.getResources().getDisplayMetrics().density);
        web.setScaleX(.992f); web.setScaleY(.992f);
        Configuration config = root.getResources().getConfiguration();
        boolean television = (config.uiMode & Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION;
        long duration = television || config.smallestScreenWidthDp >= 600 ? 220 : 160;
        PathInterpolator easing = new PathInterpolator(0.2f, 0f, 0f, 1f);
        web.animate().alpha(1f).translationY(0f).scaleX(1f).scaleY(1f).setDuration(duration).setInterpolator(easing).start();
        brand.animate().translationY(-10 * root.getResources().getDisplayMetrics().density).scaleX(1.035f).scaleY(1.035f).setDuration(duration).setInterpolator(easing).start();
        overlay.animate().alpha(0f).setDuration(duration).setInterpolator(easing).withEndAction(this::removeOverlay).start();
    }
    private void removeOverlay() {
        if (overlay.getParent() != root) return;
        cinema.release();
        root.removeView(overlay);
        web.setImportantForAccessibility(previousAccessibility); web.setDescendantFocusability(previousDescendantFocus);
        web.requestFocus();
    }
    public void pause() {
        foreground = false; cinema.pauseMotion();
        if (breath.isStarted()) breath.pause(); if (entrance.isStarted()) entrance.pause();
    }
    public void resume() {
        foreground = true;
        if (state.awaitingPage() && ValueAnimator.areAnimatorsEnabled()) {
            cinema.resumeMotion();
            if (breath.isPaused()) breath.resume(); else if (!breath.isStarted()) breath.start();
            if (entrance.isPaused()) entrance.resume();
            else if (!entered) mark.post(() -> {
                if (!entered && foreground && state.awaitingPage() && ValueAnimator.areAnimatorsEnabled()) { entered = true; entrance.start(); }
            });
        } else if (state.awaitingPage()) {
            breath.cancel(); entrance.cancel(); cinema.pauseMotion(); introFrame(1f);
        }
    }
    /** Errors, retries and Activity destruction invalidate every pending DOM/render callback. */
    public void cancel() {
        state.cancel(); handler.removeCallbacksAndMessages(null); breath.cancel(); entrance.cancel(); cinema.release();
        overlay.animate().withEndAction(null).cancel(); brand.animate().cancel(); web.animate().cancel();
        web.setAlpha(1f); web.setTranslationY(0f); web.setScaleX(1f); web.setScaleY(1f); removeOverlay();
    }
}
