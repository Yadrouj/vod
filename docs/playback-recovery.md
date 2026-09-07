# Playback recovery and viewer connection information

- Cinema detail downloads explicitly reset the inherited two-column season layout. Seasons are above a full-width episode list, without nested height limits.
- The room launcher is always present on title pages. Titles without release links allow choosing a different title/personal media; they do not manufacture a playable movie from its trailer.
- The online picker includes alternate MKV release files. Rooms prefer MP4/WebM and offer MKV when no preferred mirror exists. Browser/codec compatibility is not guaranteed merely by a container extension.
- DonyayeSerial playback failures include conditional VPN/Iran-IP guidance. This is troubleshooting, **not** confirmed geoblocking or VPN detection. A participant's regional source failure no longer changes the source for all room members automatically.
- The online player offers retry, source/quality selection, original-file and download-page actions. Keyboard: Space/K play, arrows seek, F fullscreen, M mute.

## Optional IP / country display

The user explicitly clicks “Show connection IP & country”. `/api/viewer-connection` makes no third-party requests, stores nothing and responds with `private, no-store`. By default it returns unknown values, including on localhost.

Only enable these settings behind a proxy that **overwrites** the chosen headers and prevents clients from bypassing the proxy:

```dotenv
TRUST_VIEWER_CONNECTION_HEADERS=1
VIEWER_IP_HEADER=x-real-ip
VIEWER_COUNTRY_HEADER=x-country-code
```

Use the actual header names supplied by your deployment. The IP header must contain a single validated address, not an arbitrary forwarded chain. The country header must be an ISO country code from your proxy's location data. Do not set the trust flag on an unprotected server. Country is approximate connection location, not physical location. No browser geolocation permission is requested.

Tests: `scripts/tests/playback-help.test.ts`, `scripts/tests/link-labels.test.ts`, and `scripts/smoke-playback-recovery.mjs` (local site plus synthetic media, no movie downloads).
