# سرونما — Android phone/tablet WebView

- Display name: **سرونما** (the same shared brand resource as Android TV).
- Application ID: `ir.sarvnema.app`. TV remains `ir.sarvnema.tv`; installing one
  does not replace the other. Android application IDs use Latin technical identifiers,
  while the visible label is Persian.
- Home: `https://sarvnema.ir/`. This wraps the existing responsive site, not the
  remote-only `/tv` interface. It does not introduce another catalog/database.
- Minimum Android 8 / API 26; compile/target API 35 for this preview build.

## Build and install (Windows)

Requires JDK 17+ (Android Studio JBR supported), SDK platform 35/build-tools 35.0.0.

```powershell
./applications/android-mobile/build-debug.ps1
adb install -r .media-cache/android-mobile/sarvnema-android-debug.apk
adb shell am start -n ir.sarvnema.app/.MainActivity
```

The shared build script also compiles the common canonical brand resources and URL
policy. It aligns/signs/verifies the APK. The key and all outputs remain ignored
under `.media-cache/`. This artifact is debug-signed, **not a store release**.

## Implemented native integration

- Shared [branded startup](../android-common/STARTUP.md): Persian launcher/task
  name, logo/slogan, real progress and first-render-gated animated reveal; native
  slow/offline retry and reduced-motion support. Preview 0.2.0, versionCode 2.
- A browser-backed app without an address bar; site navigation remains inside it.
- System-bar/cutout/keyboard insets; soft-keyboard resize, loading indicator and
  branded connection-error/retry screen.
- Fullscreen custom-view handling; requests sensor landscape for video and restores
  the previous orientation when leaving. Android may reject orientation on some
  devices/multitasking configurations.
- Back closes a web dialog/fullscreen first, then a popup, then web history, then
  asks before exit. Native and predictive Back callbacks are supported.
- User-initiated new-tab links create one closeable in-app popup; the main browser
  is retained. The visible site's download countdown runs unchanged.
- HTTPS download handoff to Android DownloadManager on Android 10+, in public
  Downloads, with notification. Queued does not mean the upstream download succeeded.
  Android 8/9 use the system browser; no broad storage permission is requested.
- Explicit Android document picker for user-selected subtitle/upload files; only
  returned `content://` URIs are accepted, never arbitrary file URLs/private paths.
- Camera/microphone requests are optional and origin-checked for SarvNema, then
  gated by Android runtime permission. Unknown web permissions are denied. Browsing,
  searching and ordinary playback need neither camera nor microphone.

## Security and limitations

- Only the exact HTTPS `sarvnema.ir` origin is trusted in the main app view.
  External user-selected HTTPS pages open via the system browser; file/content/
  intent/javascript top-level navigation is blocked.
- No native JS interface, SSL bypass, mixed-content allowance or auto-granted
  microphone/camera permissions. Content access exists only to support the explicit
  document-picker workflow; local file access is disabled.
- SarvNema cookies are **never** forwarded to external CDN downloads. First-party
  download cookies are scoped to the matching first-party URL.
- No background audio/foreground playback service, offline movie library, casting,
  DRM bypass, codec conversion or native YouTube downloader is added.
- The web catalog/player keeps its existing source restrictions and copyright
  takedowns. A WebView cannot make an unavailable source or unsupported codec work.
- Update Android System WebView on test devices. Camera/mic, file picker, downloads,
  fullscreen/rotation, keyboard/cutouts and resume need physical-device testing;
  a successful SDK compilation is not a device test.

## Public distribution / apps page

The `/apps` page has separate mobile and TV cards. At the owner's request, real
debug-signed previews are bundled at versioned first-party HTTPS URLs under
`public/apps/releases/` (mobile 0.2.0, TV 0.3.0). The page explicitly labels them
experimental, not store releases. Package/version/size/SHA-256 are recorded in
`lib/data/android-app-releases.json` and checked against the APKs by tests. Only
the APKs are published; private keystores remain ignored under `.media-cache/`.

After physical-device validation and production signing, host the final APKs
over HTTPS and optionally override the bundled downloads with site variables:

```dotenv
ANDROID_MOBILE_APK_URL=https://your-release-host/sarvnema-android.apk
ANDROID_TV_APK_URL=https://your-release-host/sarvnema-tv.apk
```

Only valid credential-free HTTPS overrides are accepted. The mobile APK opens
the existing production homepage; shipping new web routes and download files still
requires the normal website deployment workflow. Never overwrite a versioned APK:
add a new filename and update the manifest for each release.

Official references: [WebView URI validation](https://developer.android.com/privacy-and-security/risks/unsafe-uri-loading),
[fullscreen/file chooser callbacks](https://developer.android.com/reference/android/webkit/WebChromeClient),
[runtime web permissions](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis/wrap-webview-in-compose),
[DownloadManager destinations](https://developer.android.com/reference/android/app/DownloadManager.Request).
