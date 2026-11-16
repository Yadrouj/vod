# Phase 1 verification — 2026-11-16

## Passed locally

- `npm run build`: optimized Next.js production build, TypeScript, all 58 static
  generation tasks; `/apps`, `/tv`, title/watch/search routes and TV API registered.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: no errors; eight `no-img-element` advisories for catalog/brand
  images (publisher art is sized with the existing catalog image helper).
- 34 targeted unit tests: D-pad geometry/query bounds, search spelling/ranking,
  release labels/quality order, provider priority, Safari source compatibility,
  fullscreen behaviour, warmup and subtitle preferences.
- Browser integration on Microsoft Edge (Chromium), both development and
  production builds: passed.
  - 1280×720 and 1920×1080 layouts; no horizontal page overflow.
  - Home focus, D-pad movement, title/episode/version entry and source settings.
  - `breakng bud` resolves to Breaking Bad, with a correction suggestion.
  - Spaced remote-keyboard buttons, native text input and persistent search state.
  - Real decoding/play of a tiny generated WebM fixture (upstream media requests
    are intercepted, not downloaded).
  - Subtitle/settings dialogs keep focus; Back closes them before leaving playback.
  - Copyright-disabled title `tt33184638` has no video on its TV watch route.
  - `/apps` fits a 390px mobile viewport.
- Android SDK 35 CLI build: passed, aligned APK; v2/v3 signature verification passed.
  Package `ir.sarvnema.tv`, min API 26, target API 35, Leanback launch activity and
  only INTERNET permission verified with Android SDK `aapt dump badging`.

## Artifacts (local, intentionally ignored by Git)

- `.media-cache/android-tv/sarvnema-tv-debug.apk`
- `.media-cache/android-tv/qa/`: desktop/TV/mobile screenshots
- `.media-cache/android-tv/debug.keystore`: development-only signing key

## Not yet verified / not published

- No Android TV device or emulator was connected. Remote delivery, codec/audio
  combinations, native fullscreen, device sleep/resume and real slow-network
  playback still need device tests.
- This test does not certify every third-party movie/series file. Existing source
  restrictions and provider availability still apply; no transcoding/DRM bypass.
- No production signing, Play Store submission, public APK hosting or production
  website deployment was performed as part of this task.
- The APK targets `https://sarvnema.ir/tv`; deploy the web changes before device
  testing against that production address.
