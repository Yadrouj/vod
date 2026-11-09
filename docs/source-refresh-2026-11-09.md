# Source refresh — 2026-11-09

## Verified alternatives

- Probed 2,400 additional candidate URLs associated with existing DonyayeSerial titles.
- Added 160 verified alternatives for 160 titles to the bundled source overlay.
- Verification checks HTTP status, media signature and known full-file size. It is not a guarantee that every codec plays on every device.
- Existing provider priority applies to playback, rooms and downloads; originals remain available.
- The episode coverage is partial, not a full replacement of every series season.

## Music

- Refreshed recent Meloobit, RozMusic and Musics-Fa listings, including remix listings.
- Rebuilt music home, artist indexes and mood playlists.
- Recovered verified non-Meloobit MP3 alternatives for 12 tracks, preserving artist/title/version identity and source-page attribution.
- Confirmed all old music IDs remain reachable as a primary ID or alias after rebuilding.
- Run `node scripts/recover-meloobit-alternatives.mjs` after a music refresh to regenerate the bundled music overlay. Changes to this bundled overlay require the normal build/deploy workflow.

## Diagnostics

- `.media-cache/vod-sync/expanded-alternative-report.json`: per-URL alternative checks.
- `.media-cache/music-recovery/meloobit-report.json`: music alternative checks.
- `public/data/vod-sync-status.json`: final video refresh outcome and source reports.
- `data/daily-music-refresh-status.json`: completed music refresh steps.

## Production safety

The production checkout has uncommitted live catalog data overlapping video refresh outputs. Deployment must not overwrite it or reset/stash it. Follow `deploy/DEPLOY-SARVNEMA.md` and obtain approval for a backup-and-merge procedure before deploying overlapping files.
