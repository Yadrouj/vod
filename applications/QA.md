# Android mobile + shared SarvNema branding — verification

Date: 2026-11-16 (Asia/Tehran).

## Passed

- Android mobile and TV SDK builds, APK alignment, and v2/v3 signature verification.
- Android SDK `aapt dump badging` confirms both display names are **سرونما**, both
  use `res/mipmap-anydpi-v26/ic_launcher.xml`, and IDs are separate:
  `ir.sarvnema.app` (versionCode 1) and `ir.sarvnema.tv` (versionCode 2).
- Automated brand test compares all three path coordinate lists against the
  canonical site logo, including its white foreground and shaded layer.
- Native URL-policy tests execute with the JDK, rejecting host lookalikes,
  credentials, HTTP/file/content/intent/javascript navigation, and nontrusted
  origins. They check countdown and media-file classification separately.
- 38 targeted unit/security/regression tests pass, none skipped.
- TypeScript check and optimized Next.js production build pass (58 static tasks).
- Both browser suites pass against development **and production** builds:
  - Applications page at 320/390/768/1440px: two real edition cards, correct
    package labels/logos, safe release state, anchors/FAQ and no horizontal overflow.
  - Existing TV routes at 720p/1080p: D-pad focus, typo search, episode/version
    entry, actual decoding of a generated local clip, dialogs/Back, restrictions.
- No external movie/music file was downloaded to test the player. Browser TV
  playback uses a generated fixture, not proof of provider/device compatibility.

## Local artifacts

- `.media-cache/android-mobile/sarvnema-android-debug.apk`
- `.media-cache/android-tv/sarvnema-tv-debug.apk`
- `.media-cache/android-app-tests/`: applications-page screenshots
- Signing keys and build outputs are ignored; no private release key is committed.

## Remaining release gates

- `adb devices` had no connected device/emulator. Native fullscreen/rotation,
  camera/mic permission flows, document picker, Downloads notifications and the
  five-second download handoff require real Android-device testing.
- Both APKs are debug builds. Production signing, hosting, public release URLs,
  Play Store submission and production website deployment were not performed.
- The mobile shell opens the current production homepage. The new `/apps` content
  and TV routes need website deployment before appearing on the production site.
- The local preview used port 6239 because Windows had reserved both 3004 and
  3104; no firewall, port reservations or unrelated services were changed.
