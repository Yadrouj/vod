package ir.sarvnema.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;
import ir.sarvnema.shell.UrlPolicy;
import ir.sarvnema.shell.StartupScreen;

/** Phone/tablet shell for the existing responsive website; no privileged JS bridge. */
public final class MainActivity extends Activity {
    private static final String HOME = "https://sarvnema.ir/";
    private static final int PICK_FILE = 101, MEDIA_PERMISSION = 102;
    private FrameLayout root;
    private WebView web, popup, pendingPopupNavigation;
    private LinearLayout popupLayer;
    private View customView, errorView;
    private StartupScreen startup;
    private WebChromeClient.CustomViewCallback customCallback;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileCallback;
    private WebView fileOwner;
    private PermissionRequest pendingPermission;
    private WebView permissionOwner;
    private boolean resumed, backPending;
    private String lastDownload = "";
    private long lastDownloadAt;
    private int previousOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        StartupScreen.handoffSystemSplash(this);
        setTitle(R.string.app_name);
        getWindow().setStatusBarColor(Color.rgb(9,11,16));
        getWindow().setNavigationBarColor(Color.rgb(9,11,16));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        root = new FrameLayout(this); root.setBackgroundColor(Color.rgb(9,11,16)); setContentView(root);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                root.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return Build.VERSION.SDK_INT >= 30 ? WindowInsets.CONSUMED : insets.consumeSystemWindowInsets();
        });
        web = createBrowser(); root.addView(web, new FrameLayout.LayoutParams(-1,-1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new FrameLayout.LayoutParams(-1,dp(3),Gravity.TOP));
        progress.setVisibility(View.GONE);
        beginStartup();
        if (state == null || web.restoreState(state) == null || !UrlPolicy.trusted(web.getUrl())) web.loadUrl(HOME);
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void beginStartup() {
        if (startup != null) startup.cancel();
        startup = new StartupScreen(this, root, web, R.layout.startup_screen, R.string.startup_slow, this::showError);
    }
    private void retryHome() {
        web.stopLoading(); closePopup();
        if (errorView != null) { root.removeView(errorView); errorView = null; }
        progress.setVisibility(View.GONE); beginStartup(); web.loadUrl(HOME);
    }
    private WebView currentBrowser() { return popup != null ? popup : web; }
    private WebView createBrowser() {
        WebView browser = new WebView(this); browser.setBackgroundColor(Color.rgb(9,11,16));
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        // Content URIs are supplied only through the explicit Android document picker.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false); settings.setSupportMultipleWindows(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true); settings.setLoadWithOverviewMode(true);
        settings.setBuiltInZoomControls(false); settings.setDisplayZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " SarvNemaAndroid/0.1");
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String target = request.getUrl().toString();
                boolean gesture = request.hasGesture() || view == pendingPopupNavigation;
                if ("about:blank".equals(target) && view == popup) return false;
                if (view == pendingPopupNavigation) pendingPopupNavigation = null;
                if (UrlPolicy.trusted(target)) return false;
                // The site's visible countdown completes before this handoff; no timer bypass.
                if (UrlPolicy.https(target) && (UrlPolicy.downloadPage(view.getUrl()) || (gesture && UrlPolicy.mediaFile(target)))) {
                    download(view, target, null, null); return true;
                }
                if (gesture && UrlPolicy.https(target)) { openBrowser(target); if (view == popup) closePopup(); }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (view == web && startup != null) startup.pageStarted();
                if (view == currentBrowser() && progress != null) { progress.setProgress(0); progress.setVisibility(startup != null && startup.blocksInput() ? View.GONE : View.VISIBLE); }
                if (pendingPermission != null && view == permissionOwner) denyPermission();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (view == currentBrowser() && progress != null) progress.setVisibility(View.GONE);
                if (view == web && startup != null && UrlPolicy.trusted(url) && url.equals(view.getUrl())) startup.pageFinished();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        browser.setDownloadListener((url,userAgent,disposition,mime,length) -> {
            if (UrlPolicy.trusted(browser.getUrl())) download(browser,url,disposition,mime);
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                if (progress != null && view == currentBrowser()) progress.setProgress(value);
                if (view == web && startup != null) startup.progress(value);
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view; customCallback = callback; previousOrientation = getRequestedOrientation();
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                root.addView(view,new FrameLayout.LayoutParams(-1,-1)); root.requestApplyInsets();
            }
            @Override public void onHideCustomView() { hideFullscreen(); }
            @Override public boolean onCreateWindow(WebView parent, boolean dialog, boolean gesture, Message result) {
                if (!gesture || popup != null || !UrlPolicy.trusted(parent.getUrl())) return false;
                popup = createBrowser(); pendingPopupNavigation = popup; popupLayer = new LinearLayout(MainActivity.this); popupLayer.setOrientation(LinearLayout.VERTICAL);
                popupLayer.setBackgroundColor(Color.rgb(9,11,16));
                Button close = new Button(MainActivity.this); close.setText("بازگشت به سرونما  ×"); close.setOnClickListener(v -> closePopup());
                popupLayer.addView(close,new LinearLayout.LayoutParams(-1,dp(52)));
                popupLayer.addView(popup,new LinearLayout.LayoutParams(-1,0,1));
                root.addView(popupLayer,new FrameLayout.LayoutParams(-1,-1));
                ((WebView.WebViewTransport) result.obj).setWebView(popup); result.sendToTarget(); return true;
            }
            @Override public void onCloseWindow(WebView window) { if (window == popup) closePopup(); }
            @Override public boolean onShowFileChooser(WebView owner, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!UrlPolicy.trusted(owner.getUrl()) || params.getMode() == FileChooserParams.MODE_SAVE) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback; fileOwner = owner;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                ArrayList<String> types = new ArrayList<>();
                for (String type : params.getAcceptTypes()) if (type.matches("[a-zA-Z0-9.+*-]+/[a-zA-Z0-9.+*-]+")) types.add(type);
                if (!types.isEmpty()) intent.putExtra(Intent.EXTRA_MIME_TYPES,types.toArray(new String[0]));
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent,PICK_FILE); } catch (ActivityNotFoundException missing) { callback.onReceiveValue(null); fileCallback = null; fileOwner = null; }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { runOnUiThread(() -> requestMediaPermission(browser,request)); }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (request == pendingPermission) { pendingPermission = null; permissionOwner = null; } }
        });
        return browser;
    }
    private void download(WebView owner, String url, String disposition, String mime) {
        if (!UrlPolicy.https(url)) { toast("این لینک امن نیست؛ از صفحهٔ منبع استفاده کن."); return; }
        if (url.equals(lastDownload) && SystemClock.elapsedRealtime() - lastDownloadAt < 2000) return;
        lastDownload = url; lastDownloadAt = SystemClock.elapsedRealtime();
        if (Build.VERSION.SDK_INT < 29) { openBrowser(url); return; }
        try {
            String filename = URLUtil.guessFileName(url,disposition,mime).replaceAll("[\\\\/\\p{Cntrl}\\u202A-\\u202E\\u2066-\\u2069]","_");
            if (filename.length() > 150) filename = filename.substring(filename.length()-150);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(filename).setDescription(getString(R.string.app_name));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,"sarvnema-" + System.currentTimeMillis() + "-" + filename);
            request.addRequestHeader("User-Agent",owner.getSettings().getUserAgentString());
            // Never forward SarvNema cookies to a third-party media/CDN host.
            if (UrlPolicy.trusted(url)) { String cookie = CookieManager.getInstance().getCookie(url); if (cookie != null) request.addRequestHeader("Cookie",cookie); }
            ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            toast("دانلود به دانلودمنیجر گوشی اضافه شد.");
            if (owner == popup) closePopup();
        } catch (RuntimeException unavailable) { openBrowser(url); }
    }
    private void requestMediaPermission(WebView owner, PermissionRequest request) {
        if (!resumed || pendingPermission != null || !UrlPolicy.trusted(owner.getUrl()) || !UrlPolicy.trusted(request.getOrigin().toString())) { request.deny(); return; }
        ArrayList<String> permissions = new ArrayList<>();
        for (String resource : request.getResources()) {
            String permission = PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) ? Manifest.permission.RECORD_AUDIO : PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) ? Manifest.permission.CAMERA : null;
            if (permission == null) { request.deny(); return; }
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) permissions.add(permission);
        }
        if (permissions.isEmpty()) { request.grant(request.getResources()); return; }
        pendingPermission = request; permissionOwner = owner;
        requestPermissions(permissions.toArray(new String[0]),MEDIA_PERMISSION);
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code,permissions,results);
        if (code != MEDIA_PERMISSION || pendingPermission == null) return;
        PermissionRequest request = pendingPermission; WebView owner = permissionOwner;
        pendingPermission = null; permissionOwner = null;
        boolean allowed = owner != null && UrlPolicy.trusted(owner.getUrl()) && !isFinishing() && results.length == permissions.length && results.length > 0;
        for (int result : results) allowed &= result == PackageManager.PERMISSION_GRANTED;
        if (allowed) request.grant(request.getResources()); else request.deny();
    }
    private void denyPermission() { if (pendingPermission != null) pendingPermission.deny(); pendingPermission = null; permissionOwner = null; }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code,result,data);
        if (code != PICK_FILE || fileCallback == null) return;
        ArrayList<Uri> uris = new ArrayList<>();
        if (result == RESULT_OK && data != null && fileOwner != null && UrlPolicy.trusted(fileOwner.getUrl())) {
            if (data.getData() != null) uris.add(data.getData());
            else if (data.getClipData() != null) for (int i=0;i<Math.min(12,data.getClipData().getItemCount());i++) uris.add(data.getClipData().getItemAt(i).getUri());
        }
        uris.removeIf(uri -> !"content".equals(uri.getScheme()) || uri.getAuthority() == null || uri.getAuthority().startsWith(getPackageName()));
        fileCallback.onReceiveValue(uris.isEmpty() ? null : uris.toArray(new Uri[0])); fileCallback = null; fileOwner = null;
    }
    private void hideFullscreen() {
        if (customView == null) return;
        root.removeView(customView); customView = null;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(0); setRequestedOrientation(previousOrientation); root.requestApplyInsets();
        if (customCallback != null) { WebChromeClient.CustomViewCallback callback = customCallback; customCallback = null; callback.onCustomViewHidden(); }
    }
    private void closePopup() {
        if (popup == null) return;
        if (permissionOwner == popup) denyPermission();
        if (fileOwner == popup && fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; fileOwner = null; }
        root.removeView(popupLayer); popupLayer.removeView(popup); popup.destroy(); popup = null; popupLayer = null; pendingPopupNavigation = null;
    }
    private void showError() {
        if (errorView != null || isFinishing()) return;
        if (startup != null) startup.cancel();
        web.stopLoading(); progress.setVisibility(View.GONE);
        LinearLayout panel = new LinearLayout(this); panel.setOrientation(LinearLayout.VERTICAL); panel.setGravity(Gravity.CENTER); panel.setPadding(dp(28),dp(28),dp(28),dp(28)); panel.setBackgroundColor(Color.rgb(9,11,16));
        ImageView icon = new ImageView(this); icon.setImageResource(R.drawable.app_icon); panel.addView(icon,new LinearLayout.LayoutParams(dp(96),dp(96)));
        TextView title = new TextView(this); title.setText(R.string.app_name); title.setTextColor(Color.WHITE); title.setTextSize(28); panel.addView(title);
        TextView body = new TextView(this); body.setText(R.string.startup_failed); body.setTextColor(Color.LTGRAY); body.setGravity(Gravity.CENTER); body.setPadding(0,dp(20),0,dp(20)); panel.addView(body);
        Button retry = new Button(this); retry.setText(R.string.startup_retry); retry.setOnClickListener(v -> retryHome()); panel.addView(retry);
        errorView = panel; root.addView(panel,new FrameLayout.LayoutParams(-1,-1));
    }
    private void openBrowser(String url) {
        if (!UrlPolicy.https(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url))); }
        catch (ActivityNotFoundException missing) { toast("مرورگری برای باز کردن لینک پیدا نشد."); }
    }
    private void toast(String text) { Toast.makeText(this,text,Toast.LENGTH_LONG).show(); }
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (customView != null) { hideFullscreen(); return; }
        if (errorView != null) { retryHome(); return; }
        if (startup != null && startup.blocksInput()) { confirmExit(); return; }
        if (backPending) return;
        WebView owner = currentBrowser();
        if (!UrlPolicy.trusted(owner.getUrl())) { if (popup != null) closePopup(); else web.loadUrl(HOME); return; }
        backPending = true;
        owner.evaluateJavascript("(function(){var d=Array.from(document.querySelectorAll('dialog[open]')).pop();if(d){if(d.dispatchEvent(new Event('cancel',{cancelable:true})))d.close();return true;}if(document.fullscreenElement){document.exitFullscreen();return true;}return !window.dispatchEvent(new CustomEvent('sarvnema:app-back',{cancelable:true}));})()", consumed -> {
            backPending = false; if (isFinishing() || isDestroyed() || "true".equals(consumed)) return;
            if (popup != null) closePopup();
            else if (web.canGoBack()) web.goBack();
            else confirmExit();
        });
    }
    private void confirmExit() { new AlertDialog.Builder(this).setTitle("از سرونما خارج می‌شی؟").setNegativeButton("ادامه می‌دم",null).setPositiveButton("خروج",(dialog,which) -> finish()).show(); }
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (startup != null && startup.blocksInput() && !event.isSystem()) return true;
        return super.dispatchKeyEvent(event);
    }
    @Override protected void onSaveInstanceState(Bundle state) { super.onSaveInstanceState(state); web.saveState(state); }
    @Override protected void onPause() { resumed = false; if (startup != null) startup.pause(); if (web != null) { web.evaluateJavascript("document.querySelectorAll('video,audio').forEach(function(m){m.pause();})",null); web.onPause(); } if (popup != null) popup.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); resumed = true; if (startup != null) startup.resume(); if (web != null) web.onResume(); if (popup != null) popup.onResume(); }
    @Override protected void onDestroy() {
        if (startup != null) startup.cancel();
        denyPermission(); if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        closePopup(); if (web != null) { root.removeView(web); web.destroy(); } super.onDestroy();
    }
}
