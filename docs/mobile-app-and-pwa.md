# Mobile app shell, PWA and voice search

The website has a shared mobile bottom navigation (up to 760px), contextual
cinema/music destinations, a top-layer search dialog, and a separate film-title
action bar above navigation. Film accents are yellow; music accents stay green.
Film actions open the existing quality/episode picker and room builder. They
never turn a trailer into a full-film source. Pulses stop after four cycles and
all new animation respects `prefers-reduced-motion`.

## Installation and offline behavior

- Serve the production app over HTTPS; localhost is also a secure context.
- `/manifest.webmanifest` declares standalone display, Persian language,
  192px/512px PNG brand icons (including a maskable icon), and film/music shortcuts.
- Android's installed-PWA splash uses the manifest icon/background. There is no
  artificial startup delay. Server route skeletons and immediate navigation
  feedback cover loading after the browser opens the app.
- The production shell registers `/sw.js` after hydration. The only cached
  resource is `/offline.html`. Navigational network failure displays that shell.
  It does **not** promise offline film/audio playback, cache source URLs, store
  room tokens, intercept Range requests, or cache APIs/RSC payloads.
- Worker updates wait for the normal worker lifecycle, rather than reloading a
  page during music/video playback. Bump the offline cache version when changing
  the offline shell. The worker script is served with no-store headers.
- Browser Back/internal navigation preserves the existing root music player.
  Reloading/closing the browser or the OS killing the process cannot preserve
  that DOM audio element.

## Approximate country / privacy

Country discovery is a separate, bounded request after hydration, so the shared
landing-page cache is not personalized per visitor. `/api/discovery-country`
returns at most 12 card summaries and `private, no-store`; it never returns an IP.
Results match catalog country metadata and sort by year then rating. It does not
invent availability or quietly substitute unrelated countries for an empty result.

The automatic mode is **off at the infrastructure level by default**: absent a
trusted country header it shows “country unknown” and manual country selection.
The UI supports an explicit personalization-off choice. Only the user's manual
choice is saved in localStorage, not inferred location, an IP, GPS or browsing
history. A failed/disabled storage store falls back to an in-memory choice.

To enable automatic country detection on the deployment:

```dotenv
TRUST_VIEWER_CONNECTION_HEADERS=1
VIEWER_COUNTRY_HEADER=x-viewer-country
```

The reverse proxy must **replace**, not pass through, `X-Viewer-Country` using a
trusted GeoIP/CDN country code. Keep the origin inaccessible to direct public
requests. With a CDN, accept its geo headers only from authenticated/allowlisted
CDN connections; never trust a client-supplied `CF-IPCountry` through a public
origin. This change does not configure a GeoIP provider or enable these flags.
Do not use locale, browser timezone, or user language to pretend a country was
detected. Manual selection always wins over the proxy hint.

Donyaye Serial warnings are conditional on the selected/available source, not a
claim that a VPN was detected. Users in Iran may need to turn off VPN; users
outside Iran should choose another available source. IP/country troubleshooting
remains separately opt-in through the existing playback error UI.

## Voice search and Android wrapper contract

Voice uses the browser's `SpeechRecognition` / `webkitSpeechRecognition` API,
not an OpenAI API. Opening the dialog does not start recording. The user chooses
a language and explicitly presses Start, after a notice that the browser may
process audio using its speech service. Recognition stops after 20 seconds,
on close/Escape, when the document becomes hidden, or on unmount. Users confirm
the transcript before it enters the existing ranked/grouped autocomplete.
The wave is a listening indicator, not a fake measured audio waveform.

Unavailable APIs, denied permissions, no-speech, and service/network failures
have a visible retry/type alternative. Speech support and Persian accuracy
depend on the browser/service; there is no guarantee of offline recognition.

The Android wrapper is **not in this repository**. Before shipping it:

1. Prefer a Trusted Web Activity for installed Chrome/PWA capabilities, or test
   the intended WebView version. Do not assume Web Speech exists in WebView.
2. A WebView host needs native runtime microphone permission and a carefully
   scoped `WebChromeClient.onPermissionRequest` implementation for audio capture;
   microphone permission alone does not add Web Speech support.
3. If Web Speech is absent, implement native speech recognition in the host or
   choose a transcription backend before promising voice inside the wrapper.
   The website currently keeps typed search available in that case.
4. Implement WebView back-stack navigation, external download handling, video
   fullscreen, audio focus and lifecycle rules. Only allow app HTTPS origins in
   privileged bridges; never grant arbitrary resource permissions or ignore SSL
   errors. Test safe areas and keyboard resize on a physical Android device.

Primary references:
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Android WebChromeClient permission requests](https://developer.android.com/reference/android/webkit/WebChromeClient#onPermissionRequest(android.webkit.PermissionRequest))

## Verification

```powershell
node --import tsx --test scripts/tests/mobile-app.test.ts scripts/tests/performance.test.ts
npm run build
# Start the custom production server on a separate local port, then:
$env:PLAYWRIGHT_MODULE='<path-to-playwright>/index.mjs'
$env:LOAD_BASE_URL='http://127.0.0.1:3006'
node scripts/smoke-mobile-app.mjs
node scripts/smoke-navigation-feedback.mjs
node scripts/smoke-music-refresh.mjs
```

Browser voice tests mock recognition responses to test permission, cleanup and
query behavior deterministically. They do not validate a real microphone or
external speech-service accuracy. Offline tests use a real service worker.
Desktop Chrome's responsive viewport is not a physical Android WebView test.

Validated locally (2026-09-08): production build, 17 unit/regression tests,
320/390/600/760px home/detail layout without horizontal page overflow, distinct
playback/navigation bars, nested voice dialog success/denial/unsupported states,
reduced-motion behavior, country persistence/off/no-store responses, PNG sizes,
real offline fallback/reconnect, history modal, and music continuity after Back.
The click-feedback smoke observed 2–4ms locally; this is UI acknowledgement,
not a promise that network/server rendering takes that time.
