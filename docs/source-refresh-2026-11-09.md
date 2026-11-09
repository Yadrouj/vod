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

The user approved backup-and-merge of overlapping live data. A complete backup of tracked live changes is under `/home/ubuntu/vod/.deploy-backups/2026-11-09-source-refresh/`. The live server catalog was downloaded and merged into the refreshed catalog before rebuilding indexes. The merged result has 29,045 titles and 538,062 links, including 284 links retained from the live server beyond the fresh local result.

The incremental refresh added 29 titles and updated 8,136 existing records before the live-data merge. Four curated requests timed out, the live Donyaye series feed was unavailable, and two new-title metadata API requests failed. Existing data was preserved. This is a partial source review, not proof that all remote archives or codecs work.

`deploy/tools/pack-lfs-delta.mjs` creates a thin Git transfer pack against existing LFS objects, without changing the application checkout/index. Every reconstructed LFS object must be SHA-256 verified before use. `deploy/tools/push-staged-lfs.mjs` can upload staged objects from the server using the laptop's existing Git credential over SSH stdin; it does not save credentials or alter persistent Git config. Never print credential payloads or authentication headers.
