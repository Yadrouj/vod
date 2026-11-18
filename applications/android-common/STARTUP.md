# Branded startup — mobile and Android TV

Both editions display **سرونما**, with the original vector mark and the site's
Persian slogan: **هر داستان، در یک قاب روشن**. The application **and** launcher
Activity labels, plus the task title, use the same `app_name` resource. Package IDs
are unchanged (`ir.sarvnema.app` / `ir.sarvnema.tv`) so existing installs can update.
The mobile preview is now version 0.3.0 (3); TV is 0.4.0 (4).

## Experience

- A native cinematic surface covers the still-rendering WebView, with three
  offline scenes, a slow pan, 1.2-second crossfades, warm projector-like light and
  a dark vignette. Scenes change every 5.2 seconds while loading; no scene imposes
  a minimum wait. There is no video decoder, soundtrack or background download.
- The canonical cypress mark reveals from below with a 900ms eased scale/fade;
  a soft golden halo breathes behind it. Real bundled Alibaba Black/Regular fonts
  render the Persian name, slogan and status. A rounded slim **real WebView
  progress** bar avoids a fake countdown or invented percentage.
- A single shared layout supports RTL, large fonts, small landscape windows and
  tablet/TV sizes. A scrollable fallback prevents cropped text; `sw600dp` and
  explicit `television` resources provide larger ten-foot typography, including
  TV devices whose logical height is under 600dp. Status is an accessible live region.
- Android 8–11 get the dark branded launch window. Android 12+ uses its native
  system splash with the same mark/background, handing off to the loading surface
  in the same Activity. No second splash Activity or timed duplicate intro.
- The overlay dismisses only after `onPageFinished`, a read-only DOM check for a
  complete document/main content/loaded fonts, and `postVisualStateCallback`.
  A committed response or progress=100 alone cannot dismiss it. The attached,
  VISIBLE WebView can prepare its frame while hidden behind the opaque overlay.
- Once ready, a 420ms mobile / 520ms TV/tablet eased fade, slight scale and upward reveal opens the
  page. There is **no artificial minimum wait**. Normal in-app page navigation and
  returning from background do not replay startup.
- Android's disabled-animation setting shows a still scene and removes logo motion
  and the reveal transition. All animation pauses in the background. TalkBack and remote/touch focus
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

`CinematicBackdrop` decodes three 1280×720 WebP assets on one background executor,
using RGB565 (about 5.3MiB total decoded pixels), and draws at most 30fps. Paints,
matrices and shaders are reused; gradients are rebuilt only on size changes.
Failure to decode falls back to the dark gradient. Teardown stops callbacks and
the executor; it never recycles a bitmap still referenced by a hardware frame.

## Artwork and font provenance

Run `node applications/tools/prepare-startup-assets.mjs` to reproduce the small
bundled images and copy the existing project fonts. The three sources are
`public/media/magazine/editorial-cinema-music.webp`, `festivals.webp` and
`music.webp`; these existing editorial illustrations have no film-poster text
to crop on a portrait screen. Font sources are `public/fonts/alibaba-black.ttf`
and `alibaba-regular.ttf`. No newly fetched artwork or additional dependency is
needed at launch. If resource shrinking is introduced later, retain the three
`startup_scene_0*` names: the shared controller resolves them by resource name.

## Verification

```powershell
node --import tsx --test scripts/tests/android-apps.test.ts
$env:PLAYWRIGHT_MODULE='C:/path/to/playwright/index.mjs'
node --test scripts/tests/android-startup.browser.test.mjs
./applications/android-mobile/build-debug.ps1
./applications/android-tv/build-debug.ps1
```

Unit/JDK checks cover scene timing/crossfade bounds, state and resource/integration contracts; the browser test
executes the exact DOM readiness probe. SDK builds verify resources, Java/DEX and
APK signatures. None of these substitutes for a physical-device startup test.
Before release, test cold/warm launch, slow/offline/retry, HTTP failure, Back,
rotation, large fonts, TalkBack, disabled animations, and TV remote focus.

Debug builds are produced under `.media-cache/` and the requested previews are
staged at versioned paths under `public/apps/releases/`, linked from `/apps`.
These are explicitly labelled test builds, not final store releases; no keystore
is published. Tests verify each APK's hash and bundled images/fonts. The SDK
verifies v2/v3 signatures, and signer fingerprints match the previous previews.
Install with `adb install -r <apk>` using the same signing key as the previous
debug build. Website deployment alone never updates an already-installed APK.

Platform references: [WebView render readiness](https://developer.android.com/reference/android/webkit/WebView#postVisualStateCallback(long,%20android.webkit.WebView.VisualStateCallback)),
[page-finished semantics](https://developer.android.com/reference/android/webkit/WebViewClient#onPageFinished(android.webkit.WebView,%20java.lang.String)),
[Android 12 splash migration](https://developer.android.com/develop/ui/views/launch/splash-screen/migrate).
