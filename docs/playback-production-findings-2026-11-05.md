# Production playback investigation — November 5, 2026

HTTP 200 for a watch page is not proof of media playback.

## Friends (`tt0108778`)

Bounded real Chrome tests against production, season 1 episode 1:

- Initial `1080p.6CH` release did not advance and decoded zero frames, including
  after CDN transport fallback. This alone does not prove its audio codec.
- Explicit 480p played for 8.13 seconds and decoded 199 frames.
- Explicit 720p played for 8.55 seconds and decoded 209 frames.

Automatic ordering now prefers conventional filename hints over surround/HEVC
releases within each provider tier. Episode chronology, alternative-provider
priority and explicit user selections remain intact. Passive remembered risky
versions may upgrade only within the same episode. No files are removed, and
filename heuristics do not guarantee browser compatibility.

## Gilmore Girls (`tt0238784`)

The selected season 1 episode 1 DonyayeSerial URL failed real Chrome playback
with `net::ERR_BLOCKED_BY_ORB`, MediaError 4 and zero decoded frames. A separate
bounded 128 KiB range request returned HTTP 206, Matroska bytes, codec identifiers
`V_MPEG4/ISO/AVC` and `A_AAC`, and `application/octet-stream`.
Thus this is not evidence that the file is missing or that the viewer's VPN is
necessarily on. The generic MIME response is a suspected contributor, not a
verified complete diagnosis. No alternate release has been verified in this
investigation; no unrestricted video proxy or regional bypass was introduced.

## Music (`melodify-6381`, Moein — Maandegar)

Production catalog source is `Maandegar Moein.mp3` in the imported Melodify
library. The `vod-app` container has neither a `/music-library` mount nor the
`MELODIFY_LIBRARY_DIR` setting. The catalog alone cannot supply its MP3 bytes.
This affects other imported library tracks, not necessarily scraped music.

The previously supplied archive host `62.83.32.47:22` timed out from the current
workspace. Restoring real playback requires access to the archive files on the
current host and a read-only mount; see `safari-playback-and-library.md`.
Do not replace archive URLs with artwork, guessed songs or unverified sources.

Only the automatic version-selection fix is implemented here. These observations
do not claim all three reported issues are resolved or all archive files tested.
