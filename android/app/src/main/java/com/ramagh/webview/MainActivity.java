package com.ramagh.webview;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST_CODE = 701;

    private WebView webView;
    private View loadingView;
    private TextView loadingText;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean pageFinished;
    private int pageProgress;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(5, 7, 13));
        getWindow().setNavigationBarColor(Color.rgb(5, 7, 13));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(5, 7, 13));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new RamaghWebViewClient());
        webView.setWebChromeClient(new RamaghChromeClient());

        loadingView = createLoadingView();
        root.addView(webView);
        root.addView(loadingView);
        setContentView(root);

        showLoading(getString(R.string.loading_app));
        webView.loadUrl(BuildConfig.WEBVIEW_URL);
    }

    private View createLoadingView() {
        LinearLayout container = new LinearLayout(this);
        container.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        container.setBackgroundColor(Color.rgb(5, 7, 13));
        container.setGravity(Gravity.CENTER);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setPadding(dp(32), dp(32), dp(32), dp(32));

        ImageView logo = new ImageView(this);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(104), dp(104));
        logo.setLayoutParams(logoParams);
        logo.setImageResource(R.drawable.ic_ramagh_logo);
        logo.setContentDescription(getString(R.string.app_name));

        TextView title = new TextView(this);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.setMargins(0, dp(20), 0, dp(8));
        title.setLayoutParams(titleParams);
        title.setText(getString(R.string.app_name));
        title.setTextColor(Color.rgb(241, 245, 249));
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);

        loadingText = new TextView(this);
        loadingText.setTextColor(Color.rgb(184, 242, 74));
        loadingText.setTextSize(14);
        loadingText.setGravity(Gravity.CENTER);

        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        LinearLayout.LayoutParams progressParams = new LinearLayout.LayoutParams(dp(180), dp(8));
        progressParams.setMargins(0, dp(22), 0, 0);
        progress.setLayoutParams(progressParams);
        progress.setIndeterminate(true);

        container.addView(logo);
        container.addView(title);
        container.addView(loadingText);
        container.addView(progress);
        return container;
    }

    private void showLoading(String message) {
        pageFinished = false;
        pageProgress = 0;
        loadingText.setText(message);
        loadingView.setAlpha(1f);
        loadingView.setVisibility(View.VISIBLE);
    }

    private void hideLoadingIfReady() {
        if (!pageFinished || pageProgress < 100) {
            return;
        }

        loadingView.animate()
                .alpha(0f)
                .setStartDelay(180)
                .setDuration(180)
                .withEndAction(() -> loadingView.setVisibility(View.GONE))
                .start();
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST_CODE || filePathCallback == null) {
            return;
        }

        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i++) {
                    result[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }

        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    private final class RamaghWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            showLoading(getString(R.string.loading_app));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            pageFinished = true;
            hideLoadingIfReady();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrl(Uri.parse(url));
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request != null && request.isForMainFrame()) {
                pageFinished = true;
                pageProgress = 100;
                loadingText.setText(getString(R.string.loading_error));
            }
        }

        private boolean handleUrl(Uri uri) {
            String scheme = uri.getScheme();
            if (scheme == null || scheme.equals("http") || scheme.equals("https")) {
                return false;
            }

            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                return true;
            }
            return true;
        }
    }

    private final class RamaghChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            pageProgress = newProgress;
            hideLoadingIfReady();
        }

        @Override
        public boolean onShowFileChooser(
                WebView webView,
                ValueCallback<Uri[]> filePathCallback,
                FileChooserParams fileChooserParams
        ) {
            if (MainActivity.this.filePathCallback != null) {
                MainActivity.this.filePathCallback.onReceiveValue(null);
            }
            MainActivity.this.filePathCallback = filePathCallback;

            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                    "image/*",
                    "application/pdf",
                    "text/plain"
            });

            try {
                startActivityForResult(Intent.createChooser(intent, getString(R.string.pick_file)), FILE_CHOOSER_REQUEST_CODE);
            } catch (ActivityNotFoundException exception) {
                MainActivity.this.filePathCallback = null;
                return false;
            }
            return true;
        }
    }
}
