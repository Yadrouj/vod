package ir.sarvnema.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import ir.sarvnema.shell.StartupScreen;

/** Browser-backed TV shell. Catalog/search/playback live in the versioned /tv UI. */
public final class MainActivity extends Activity {
    private static final String HOME = "https://sarvnema.ir/tv";
    private WebView web;
    private FrameLayout root;
    private View customView;
    private View errorView;
    private WebChromeClient.CustomViewCallback customCallback;
    private boolean backPending;
    private StartupScreen startup;

    private static boolean trusted(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) && "sarvnema.ir".equalsIgnoreCase(uri.getHost())
            && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        StartupScreen.handoffSystemSplash(this);
        setTitle(R.string.app_name);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(9, 11, 16)); setContentView(root);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(9, 11, 16));
        web.setFocusable(true); web.setFocusableInTouchMode(true);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false); settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " SarvNemaTV/0.1");
        // No JS/native bridge, SSL bypass, storage permission, microphone or camera grant.
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!request.isForMainFrame()) return false;
                if (trusted(uri) && ("/tv".equals(uri.getPath()) || uri.getPath().startsWith("/tv/"))) return false;
                if (request.hasGesture() && "https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException unavailable) { showError("No browser is installed to open this link."); }
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) { if (startup != null) startup.pageStarted(); }
            @Override public void onPageFinished(WebView view, String url) {
                if (startup != null && trusted(Uri.parse(url)) && url.equals(view.getUrl())) startup.pageFinished();
                if (errorView == null && (startup == null || !startup.blocksInput())) web.requestFocus();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError(getString(R.string.startup_failed));
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError(getString(R.string.startup_failed));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { if (startup != null) startup.progress(value); }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view; customCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                web.setVisibility(View.GONE); view.requestFocus();
            }
            @Override public void onHideCustomView() { hideFullscreen(); }
        });
        beginStartup();
        if (state == null || web.restoreState(state) == null || !trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) web.loadUrl(HOME);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }
    private void beginStartup() {
        if (startup != null) startup.cancel();
        startup = new StartupScreen(this, root, web, R.layout.startup_screen, R.string.startup_slow, () -> showError(getString(R.string.startup_failed)));
    }
    private void hideFullscreen() {
        if (customView == null) return;
        root.removeView(customView); customView = null;
        web.setVisibility(View.VISIBLE); web.requestFocus();
        if (customCallback != null) { customCallback.onCustomViewHidden(); customCallback = null; }
    }
    private void showError(String message) {
        if (errorView != null || isFinishing()) return;
        if (startup != null) startup.cancel();
        web.stopLoading();
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(android.view.Gravity.CENTER); panel.setPadding(64, 48, 64, 48);
        panel.setBackgroundColor(Color.rgb(9, 11, 16));
        TextView title = new TextView(this); title.setText(R.string.app_name); title.setTextSize(30); title.setTextColor(Color.rgb(242, 208, 128)); panel.addView(title);
        TextView body = new TextView(this); body.setText(message); body.setTextColor(Color.WHITE); body.setTextSize(20); body.setPadding(0, 24, 0, 24); panel.addView(body);
        Button retry = new Button(this); retry.setText(R.string.startup_retry); retry.setMinHeight(64); panel.addView(retry);
        retry.setOnClickListener(v -> { root.removeView(panel); errorView = null; beginStartup(); web.loadUrl(HOME); });
        errorView = panel; root.addView(panel, new FrameLayout.LayoutParams(-1, -1)); retry.requestFocus();
    }
    @Override public void onBackPressed() {
        handleBack();
    }
    private void handleBack() {
        if (customView != null) { hideFullscreen(); return; }
        if (startup != null && startup.blocksInput()) { confirmExit(); return; }
        if (errorView != null) { confirmExit(); return; }
        if (backPending) return;
        if (!trusted(Uri.parse(web.getUrl() == null ? HOME : web.getUrl()))) { web.loadUrl(HOME); return; }
        backPending = true;
        web.evaluateJavascript("!window.dispatchEvent(new CustomEvent('sarvnema:tv-back',{cancelable:true}))", consumed -> {
            backPending = false;
            if (isFinishing() || isDestroyed()) return;
            if ("true".equals(consumed)) return;
            confirmExit();
        });
    }
    private void confirmExit() { new AlertDialog.Builder(this).setTitle("از سرونما خارج می‌شی؟").setNegativeButton("ادامه می‌دم", null).setPositiveButton("خروج", (dialog, which) -> finish()).show(); }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (startup != null && startup.blocksInput() && !event.isSystem()) return true;
        String key = null;
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) key = "MediaPlayPause";
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_PLAY) key = "MediaPlay";
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_PAUSE) key = "MediaPause";
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) key = "MediaFastForward";
        if (event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_REWIND) key = "MediaRewind";
        if (key != null && web != null) {
            if (errorView != null || (startup != null && startup.blocksInput())) return true;
            if (event.getAction() == KeyEvent.ACTION_DOWN && (event.getRepeatCount() == 0 || event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD || event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_REWIND) && trusted(Uri.parse(web.getUrl() == null ? HOME : web.getUrl())))
                web.evaluateJavascript("(document.querySelector('[data-tv-player]')||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'" + key + "',bubbles:true,cancelable:true}))", null);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }
    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); web.saveState(state); }
    @Override protected void onPause() { if (startup != null) startup.pause(); if (web != null) { web.evaluateJavascript("document.querySelectorAll('video,audio').forEach(m=>m.pause())", null); web.onPause(); } super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (startup != null) startup.resume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() { if (startup != null) startup.cancel(); if (web != null) { ((ViewGroup) web.getParent()).removeView(web); web.destroy(); } super.onDestroy(); }
}
