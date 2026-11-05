# Safari playback and unavailable music files

## Verified production finding (November 5, 2026)

The reported artist page was `/music/artists/mohsen-yeganeh`. Six sampled RozMusic
MP3 releases returned valid 206 responses for `Range: bytes=0-1`, both from their
provider and through the live SarvNema relay. The relay returned `audio/mpeg`.

However, `melodify-5809`, `melodify-5810`, and `melodify-5828` returned **503**
with `The Melodify library is not mounted.` from the production relay. These
failures are missing/unmounted server files, not evidence of a Safari codec bug.
No production configuration or server filesystem was changed during this work.

Deployment must preserve/configure `MELODIFY_LIBRARY_HOST_PATH` and mount the
actual library into the app container as `/music-library`, with
`MELODIFY_LIBRARY_DIR=/music-library`. See the existing app volume in
`docker-compose.prod.yml`. Check the actual read-only file from *inside* the app
container. A file only present on a different SSH host is not a container mount.
Do not put SSH passwords, private keys, or account cookies into the repository.

## Client changes

- Apple/WebKit playback consults the actual media element's `canPlayType` before
  automatically selecting a known unsupported container. Compatible alternatives
  stay within the same movie or exact series episode; other providers remain
  preferred. MKV is not relabelled as MP4 or claimed to have been transcoded.
- Music tries each available source at most once (relay and, where appropriate,
  a secure original URL). It no longer cycles indefinitely through failed URLs.
- A missing Melodify file no longer receives a generic "browser cannot play"
  verdict or a redundant retry against the same missing archive URL.
- Reload player / Choose source controls are provided. A deliberate retry clears
  previous attempts and reinitializes media without a page reload.

## Relay changes

- Use identity encoding for upstream byte ranges, normalize generic MP3 MIME
  types, and advertise byte-range support when a real 206 response proves it.
- Preserve `Content-Range` / `Content-Length`; range responses are private,
  `no-store`, with `Vary: Range`, rather than cached as whole songs.
- Reject HTML/JSON pages as media during playback as well as download.
- HEAD checks fetch only a two-byte probe, cancel the body, and expose complete
  resource length without pretending that a missing file is playable.
- Missing library files return `MUSIC_LIBRARY_UNAVAILABLE`, with a non-cacheable
  503 response. Actual upstream 200 responses are not falsely labelled as 206.

These changes cannot supply a missing server mount or make every codec work on
every iPhone. External regional restrictions still require another permitted
provider, and a browser-compatible rendition must actually exist.

References: [Apple video delivery guidance](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari),
[Apple byte-range requirements](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/CreatingVideoforSafarioniPhone/CreatingVideoforSafarioniPhone.html),
[Cloudflare's Safari/MP4 cache guidance](https://developers.cloudflare.com/cache/troubleshooting/mp4-videos-on-ios-and-safari/).

## Verification

The combined regression run passed 86 tests; one Linux-only lock test was
skipped on Windows. Production build, TypeScript and scoped ESLint were checked.
Chrome recovery tests cover 320/390/1440 px, fullscreen recovery, playback
position, same-episode room fallback and a guest's local-only retry.

`scripts/smoke-music-webkit.mjs` additionally checks the initial fast-failure
case, bounded attempts, deliberate reload and uninterrupted music when leaving
the song page. Chrome uses an intercepted range-aware audio fixture. Windows
WebKit's native media loader bypasses that interception: its check covers the
real missing-file message and media-element remount, **not successful playback
of the missing archive**. No physical iPhone playback test is claimed.

A native error listener also checks media state immediately on attachment,
because a fast failure can occur before a persistent portal's React handler
attaches. Late initialization must not erase an already reported source error.
