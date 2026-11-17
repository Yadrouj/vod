# SarvNema applications — phase 1: Android TV

This is an original SarvNema ten-foot interface inspired by familiar streaming
patterns, not a Netflix clone or an affiliated product. It uses the existing
catalog, search ranking/correction, media delivery, subtitle and recovery engines.

The launcher display name is **سرونما** and the application ID remains
`ir.sarvnema.tv`. The icon/name now come from the same `android-common/res` assets
as the mobile edition (`ir.sarvnema.app`), using the exact site logo rather than a
separate approximation. The shared SDK builder is called by the existing script.

## What is implemented

The [shared native startup](../android-common/STARTUP.md) now shows the SarvNema
mark/name/slogan, real loading progress and an eased reveal only when the first
page is ready to draw. It includes TV-sized typography, remote focus protection,
offline/slow retry and disabled-animation support. Preview 0.3.0, versionCode 3.

Both debug-signed previews can be downloaded from `/apps`, explicitly marked as
test builds, with versioned first-party files and SHA-256 metadata. See the
[distribution notes](../android-mobile/README.md#public-distribution--apps-page).
Physical-device validation and final store signing are still release gates.

| Route | Purpose |
| --- | --- |
| `/apps` | Public applications page, setup instructions, honest release status |
| `/tv` | Cinematic home, real catalog rails, local continue-watching history |
| `/tv/search` | Persian/English search, spelling suggestions, type/genre/year/IMDb filters, remote keyboard |
| `/tv/title/:id` | Title, original name, season/episode → version → descending quality selection |
| `/tv/watch/:id` | Direct playback, timeline, ±10s, source/retry, subtitles, speed and fullscreen |

The TV routes omit website floating navigation, music overlays and room launchers.
They are noindex to avoid duplicate title pages; `/apps` is canonical and included
in the main sitemap. Catalog/media restrictions also apply to TV playback.

## Remote behaviour

- D-pad moves by physical screen position, including RTL. Focus is high-contrast.
- OK/Enter activates links/buttons. On the player surface it plays/pauses.
- Any direction on the player surface reveals and focuses playback controls.
- On the timeline, left/right seeks five seconds; up/down leaves the timeline.
- Play/pause, rewind and fast-forward hardware keys are forwarded by the shell.
- Back closes the top dialog first, then exits fullscreen, then returns a page.
  At TV Home, the Android shell asks before exiting.
- Search supports native text entry and an optional Persian/English remote keyboard.
- Progress is device-local; it is not account/cloud synchronization.

## Run the website first

```powershell
$env:PORT='3004'
npm run dev
# http://localhost:3004/apps
# http://localhost:3004/tv
```

For physical TV testing, the web routes must first be deployed using the repository
deployment guide. The APK opens `https://sarvnema.ir/tv`; building an APK does not
publish the web routes or make an old server support them. Never disable TLS to
work around a connection failure.

## Build a development APK (Windows)

Prerequisites: JDK 17+ (Android Studio's bundled JBR works), Android SDK platform
35 and build tools 35.0.0. The shell uses only Android platform APIs; no Maven,
Gradle plugin or JavaScript/native bridge is needed.

```powershell
./applications/android-tv/build-debug.ps1
# Optional explicit paths:
./applications/android-tv/build-debug.ps1 -Sdk 'C:/Android/Sdk' -JavaHome 'C:/Java/jdk-21'
```

Output: `.media-cache/android-tv/sarvnema-tv-debug.apk`. This is **debug-signed**, not
a production/Play Store release. Build folders and the debug key stay ignored.
The script compiles resources/Java, generates DEX, aligns, signs and verifies the
APK. It never deletes a directory or changes a production service.

Install on a connected Android TV test device:

```powershell
adb devices
adb install -r .media-cache/android-tv/sarvnema-tv-debug.apk
adb shell am start -n ir.sarvnema.tv/.MainActivity
```

The manifest declares TV Leanback, no touchscreen requirement, landscape and only
INTERNET permission. Supported baseline: Android 8 / API 26+. Use an up-to-date
Android System WebView. Device codec support still determines playable files;
this wrapper does not transcode MKV, add DRM support or bypass provider restrictions.

## Production release (separate step)

1. Test on real TV hardware and Android TV emulator with an actual remote.
2. Supply a production signing key outside Git; do not distribute the debug key.
3. Increment manifest versionCode/versionName and prepare a correctly sized,
   localized launcher banner/store artwork. The current vector banner is a preview.
4. Build/sign/verify a release artifact under the operator's distribution policy.
5. Host the signed APK on HTTPS. Set `ANDROID_TV_APK_URL` in the site's private
   environment to that URL, then rebuild/deploy the site. Only then does `/apps`
   show a download button; it never points to a nonexistent APK.

## Security boundaries

- Main-frame navigation stays on HTTPS `sarvnema.ir/tv` routes. User-initiated
  external HTTPS links open the system browser; file/intent/javascript schemes
  are not opened by the shell.
- No file/content access, mixed content, SSL overrides, microphone/camera grant,
  generic native bridge or automatic download manager.
- HTML media preloads only on the selected playback page, not every catalog card.
- Search returns bounded, paginated card metadata, not a bulk media-link dump.
- Playback still goes through catalog source ordering, codec checks and recovery.

## Verification

```powershell
npx tsc --noEmit
node --import tsx --test scripts/tests/tv-navigation.test.ts
$env:TV_TEST_ORIGIN='http://127.0.0.1:3004'
$env:PLAYWRIGHT_MODULE='C:/path/to/playwright-core/index.mjs'
$env:TV_TEST_BROWSER='msedge'
node --test scripts/tests/tv-browser.test.mjs
```

Browser QA covers real routes/search corrections, focus, version/episode entry,
dialog Back behaviour and 720p/1080p layouts; video requests are replaced with a
tiny locally generated clip to exercise real decoding without downloading films.
It is **not** a claim that all upstream files play on TV.
Manual release gates: stereo/surround sources, slow networks, subtitles/sync,
fullscreen Back, remote media keys, long series, suspend/resume and offline retry.

## Next stages

1. Android TV device feedback, compatibility matrix and signed release.
2. Optional TV pairing/watch-together and voice search after explicit UX/privacy work.
3. The [Android mobile WebView](../android-mobile/README.md) is now implemented;
   physical-device release checks, iOS and store publication remain separate steps.

Reference design/platform rules: [TV navigation](https://developer.android.com/training/tv/get-started/navigation),
[TV layouts](https://developer.android.com/training/tv/playback/compose/layouts),
[TV manifest requirements](https://developer.android.com/training/tv/get-started/create).
