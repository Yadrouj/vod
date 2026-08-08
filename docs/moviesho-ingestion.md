# Moviesho catalog ingestion

SarvNema treats Moviesho as a discovery source for new titles and direct media files. It does not replace or rewrite an existing title merely because the same IMDb title appears there.

## Matching safety

The importer never accepts a fuzzy title match on its own. For every candidate it:

1. parses the title/folder from `sr1.moviesho.com`;
2. searches the public Moviesho WordPress index;
3. opens the candidate title page;
4. extracts the page's explicit `imdb.com/title/tt...` anchor;
5. verifies that the same page contains either the exact movie file URL or the exact series-folder prefix.

Ambiguous and unresolved titles are written to the scan report and are not added to the catalog. Successful and unresolved checks are cached under `.media-cache/vod-sync/` so the recurring scan remains inexpensive.

## Data flow

`npm run sync-vod-catalog` now scans:

- `https://sr1.moviesho.com/Movie/2025/`
- `https://sr1.moviesho.com/Movie/2026/`
- `https://sr1.moviesho.com/Series/`

Only previously unseen IMDb IDs are merged. Movie qualities, series seasons/episodes, sizes, modified dates and matching `.srt` files are retained. New IDs then pass through the existing official IMDb dataset enrichment and the rich IMDb metadata service, which supplies plots, posters, galleries, videos/trailers and cast profile images.

The catalog daemon runs this full sync every six hours by default. Override it with `VOD_SYNC_INTERVAL_MS` (minimum 15 minutes).

## Commands

```powershell
npm run test:moviesho-source
npm run scrape-moviesho -- public/data/vod-catalog.json .media-cache/vod-sync/moviesho-source.json .media-cache/vod-sync/moviesho-report.json
$env:VOD_SYNC_DRY_RUN='1'; npm run sync-vod-catalog
```

Useful scoped validation options:

```powershell
$env:MOVIESHO_MOVIE_MONTHS='2026/08'
$env:MOVIESHO_MOVIE_NAMES='Evil Dead Burn'
$env:MOVIESHO_SERIES_NAMES='Trying'
$env:MOVIESHO_MOVIE_GROUP_LIMIT='5'
$env:MOVIESHO_SERIES_LIMIT='5'
```

Production tuning:

- `MOVIESHO_DIRECTORY_CONCURRENCY` (default `5`)
- `MOVIESHO_MATCH_CONCURRENCY` (default `4`)
- `MOVIESHO_SITE_REQUEST_INTERVAL_MS` (default `220`; shared pacing for the public site)
- `MOVIESHO_SITE_RETRIES` (default `7`; honors `Retry-After` and exponential backoff)
- `MOVIESHO_TIMEOUT_MS` (default `18000`)
- `MOVIESHO_MATCH_TTL_MS` (default 30 days)
- `MOVIESHO_UNRESOLVED_TTL_MS` (default 12 hours)
- `MOVIESHO_MOVIE_YEARS` (default `2025,2026`)
