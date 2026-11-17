# Branded startup — mobile and Android TV

Both editions display **سرونما**, with the original vector mark and the site's
Persian slogan: **هر داستان، در یک قاب روشن**. The application **and** launcher
Activity labels, plus the task title, use the same `app_name` resource. Package IDs
are unchanged (`ir.sarvnema.app` / `ir.sarvnema.tv`) so existing installs can update.
The mobile preview is now version 0.2.0 (2); TV is 0.3.0 (3).

## Experience

- A native surface, available without the network, covers the still-rendering
  WebView: quiet dark radial background, centered mark/name/slogan, subtly breathing
  mark and a slim **real WebView progress** indicator. No fake percentage/countdown.
- A single shared layout supports RTL, large fonts, small landscape windows and
  tablet/TV sizes. A scrollable fallback prevents cropped text; `sw600dp` dimensions
  provide larger ten-foot typography. Loading updates are accessible live regions.
- Android 8–11 get the dark branded launch window. Android 12+ uses its native
  system splash with the same mark/background, handing off to the loading surface
  in the same Activity. No second splash Activity or timed duplicate intro.
- The overlay dismisses only after `onPageFinished`, a read-only DOM check for a
  complete document/main content/loaded fonts, and `postVisualStateCallback`.
  A committed response or progress=100 alone cannot dismiss it. The attached,
  VISIBLE WebView can prepare its frame while hidden behind the opaque overlay.
- Once ready, a 320 ms eased fade with a tiny upward content reveal opens the
  page. There is **no artificial minimum wait**. Normal in-app page navigation and
  returning from background do not replay startup.
- Android's disabled-animation setting removes both the pulse and the reveal
  transition; breathing pauses in the background. TalkBack and remote/touch focus
  cannot reach the covered page; focus returns when the transition finishes.

“Complete” means the initial document, current fonts and its rendered content are
ready. It does not wait for every future React fetch, lazy image, entire film or
music file. Those continue to use the existing web loading/player UI.

## Failure and lifecycle

At 8 seconds the status acknowledges slow loading. At 35 seconds (per attempt,
not extended by redirects), loading becomes the native connection/retry screen.
HTTP/main-frame network failures use the same screen immediately. Retry creates
a new startup attempt; redirects invalidate older DOM/render callbacks. Destroy
clears callbacks/animations; canceled or failed loads never animate over an error
screen. Back is still available during loading. Ordinary web/new-tab/fullscreen,
download, TLS, origin and runtime permission policies are unchanged.

The common Java controller deliberately has no dependency on either app's `R`
package: each Activity passes the shared layout/string IDs, and named layout tags
are its view-binding contract. No JS/native bridge, new runtime dependency or
network request is added.

## Verification

```powershell
node --import tsx --test scripts/tests/android-apps.test.ts
$env:PLAYWRIGHT_MODULE='C:/path/to/playwright/index.mjs'
node --test scripts/tests/android-startup.browser.test.mjs
./applications/android-mobile/build-debug.ps1
./applications/android-tv/build-debug.ps1
```

Unit/JDK checks cover state and resource/integration contracts; the browser test
executes the exact DOM readiness probe. SDK builds verify resources, Java/DEX and
APK signatures. None of these substitutes for a physical-device startup test.
Before release, test cold/warm launch, slow/offline/retry, HTTP failure, Back,
rotation, large fonts, TalkBack, disabled animations, and TV remote focus.

These remain local debug-signed APKs under `.media-cache/`, not published releases.
Install with `adb install -r <apk>` using the same signing key as the previous
debug build. Website deployment alone never updates an already-installed APK.

Platform references: [WebView render readiness](https://developer.android.com/reference/android/webkit/WebView#postVisualStateCallback(long,%20android.webkit.WebView.VisualStateCallback)),
[page-finished semantics](https://developer.android.com/reference/android/webkit/WebViewClient#onPageFinished(android.webkit.WebView,%20java.lang.String)),
[Android 12 splash migration](https://developer.android.com/develop/ui/views/launch/splash-screen/migrate).
