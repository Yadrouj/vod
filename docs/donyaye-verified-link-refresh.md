# Verified DonyayeSerial link refresh (November 5, 2026)

## What ships

The small bundled snapshot in `lib/data/donyaye-link-updates.json` contains
171 media-header-verified additions, two exact URL repairs and 24 confirmed
missing catalog sources. It affects 94 existing title records. The two
repairs handle the actual bad `dls3.aparatchi-dlcenter.top` URLs observed on
production for `tt1155056`; their verified original hosts are `dls4` for
1080p and `dls7` for 720p. This is not a blanket host rewrite.

The layer applies when loading title details, download exports, bot details
and online/watch-together sources. It also repairs exact previously shared
plain/compact five-second download-gate URLs. No quality or episode is
silently substituted. A quarantined URL without a replacement shows a
source-selection notice rather than redirecting to a known 404.

The 674 MB archive and original split title files are not rewritten. The
bundled repair snapshot is code-owned and copied into the production image
under `lib`, so an old mounted data directory cannot hide the fix. A mutable
`VOD_DATA_DIR/donyaye-link-updates.json` holds subsequent nightly results.
The app merges it with the bundle and refreshes its cache every 30 seconds.
No network verification runs in page rendering. Existing API/CDN caches
can delay visible changes until expiry; restart/purge on deployment.

## Verification policy

- Probe only known provider URLs, with approved provider CDN redirects.
  Request bytes 0–1023, recognize MKV/MP4/AVI headers, cancel the body, and
  enforce timeouts. No complete movies are downloaded.
- Keep a working existing host, even when the source lists a different
  host. Replace a missing source only with a verified identical file path
  for the same IMDb title. Preserve case, queries, qualities and episodes.
- Add a missing quality/file only after its actual media signature passes.
- Confirm a 404/410 a second time before quarantining it. Authentication,
  regional denials, timeouts and malformed responses never quarantine a
  URL. This machine's results are not a guarantee for every region/codec.
- Quarantine lasts at most seven days. Recheck the affected URLs nightly;
  a successful media response restores them without deleting raw data.
- Retain other providers and copyright restrictions. Two source entries
  for the restricted title were deliberately excluded from the 173
  initially identified additions, leaving 171 publishable additions.
- Partial/unavailable feed checks are reported as warnings, not fresh data.

The available master HTML archive was byte-for-byte unchanged from the
November 3 audit, with upstream Last-Modified September 21. A fresh fetch
does not make this old snapshot a complete list of current releases.
All source/title identities were compared; live checks were bounded,
not an exhaustive test of all 232,303 DonyayeSerial catalog entries.

## Nightly integration

`scripts/sync-vod-catalog.mjs`, already in the configured 03:00–07:00 Tehran
maintenance window, now runs `scripts/refresh-donyaye-links.mjs` on the
archive snapshot and on a successfully fetched recent-series feed. The
repair file is atomic; dry-run mode writes it inside the staging directory,
not live data. Default verification budget is 800 requests per invocation;
`DONYAYE_REPAIR_PROBE_LIMIT` is capped at 5,000. Budget exhaustion preserves
existing data, never treats an unchecked candidate as verified, and is
visible in the report. The normal sync lock serializes nightly runs.

Series discovery now follows the known public migration to
`https://donyayeserial-new1.top/series/`, resolves relative links against
the actual response URL, keeps pagination on that origin, ignores unrelated
hosts, and bounds HTML responses. `DONYAYE_SERIES_URL` still permits an
explicit operator-configured source. The old official domain gets its known
migration fallback even when it was explicitly configured.

The live frontend connection was refused from this workstation during the
final run; no new recent-series results are claimed from that attempt.
Redirect, discovery, exact IMDb matching and fallback behavior are covered
by offline tests. A healthy server connection is still necessary to collect
new releases; no login or regional restriction is bypassed.

Manual refresh after acquiring a source snapshot:

```sh
node scripts/refresh-donyaye-links.mjs SOURCE.json public/data/donyaye-link-updates.json REPORT.json
```

Do not run a manual refresh concurrently with the scheduled sync. The
worker also rechecks existing additions, repaired targets and quarantines.
Its output keeps verified links when a later source fetch is incomplete.

## Deployment (not performed by this change)

Pull this commit with the usual clean-worktree procedure, then rebuild and
restart the existing app and maintenance containers, preserving all data
volumes and `.env.local`:

```sh
docker compose -f docker-compose.prod.yml up -d --build app maintenance
```

No new LFS archive upload/data migration is required. Purge stale title,
download API and download-gate HTML caches. Check
`/api/downloads/tt1155056`, `/api/watch-party/title/tt1155056` and an old
download-gate URL to verify the original hosts and the five-second flow.
Use the scheduler's existing daily trigger; do not start a duplicate daemon.

## Checked locally

- The relevant regression suite passed: 75 tests, no failures or skips.
- The production build, TypeScript check and scoped ESLint check passed.
- The production-mode local API returned the corrected 1080p/720p hosts for
  `tt1155056` and all five verified additions for `tt0448115`.
- Browser checks at 390 px and 1440 px preserved the five-second redirect
  to the repaired URL. Known missing URLs stayed on the source-selection
  notice, with no horizontal overflow or page JavaScript errors. External
  media navigation was intercepted by the test; no movie was downloaded.

These checks do not certify every catalog URL or deploy the production site.
