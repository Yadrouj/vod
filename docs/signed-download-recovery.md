# Expiring publisher download links

The 2026-11-16 MobLand S02E07 dubbed 720p report was a publisher HTTP 410:
the signature expired at 10:45:45 UTC (14:15:45 Tehran). It was not a missing
episode. The public publisher API supplied a new signature for the exact file;
a 1 KiB range request returned HTTP 206, `video/x-matroska` and a valid MKV header.

## Recovery

- `/download/continue` resolves expired targets **before** the existing five-second
  countdown. New website, history and bot gates include `itemId`.
- Legacy bot messages still work without that parameter: exact local title or
  filename metadata selects a unique catalogue entry (year/type disambiguate
  remakes), then its stored publisher page refreshes the signature.
- Refreshes use only the catalogue's trusted FamilyMovie API page and validate
  publisher ID, complete title, year and type. User URLs are never fetched by the
  resolver. Replacement requires the same origin, pathname and opaque parameters;
  only `md5`/`expires` may rotate. Episode, quality, language and encode cannot
  silently change. Copyright restrictions still apply.
- Live refresh accepts signatures valid for at least two minutes. Nightly imports
  still require six hours. This fixes public API results that were previously
  discarded because their new token lasted less than six hours.
- Refresh caches expire before the source token; one healthy episode cannot hide
  expired siblings. Publisher failure does not resurrect expired sources.
- Signed download API responses have at most a five-minute cache, bounded by
  token expiry minus one minute, with **no stale-while-revalidate** window.
- If the exact replacement cannot be obtained, the gate shows retry and title-page
  alternatives instead of redirecting to a known-expired URL. Fresh unrelated
  files and music downloads retain their original behavior.

## Audit

```powershell
node scripts/audit-signed-downloads.mjs
node scripts/audit-signed-downloads.mjs public/data/vod-catalog.json .media-cache/vod-sync/signed-download-audit.json --check=10
node --import tsx --test scripts/tests/vod-download-resolution.test.ts scripts/tests/familymovie-release.test.ts scripts/tests/public-vod-sources.test.mjs
```

The audit streams the archive, reports signed/expired counts, and optionally checks
an explicitly bounded sample against existing publisher pages. Only a 1 KiB media
range is requested; raw/live data is not overwritten. The default is offline
(`--check=0`). Archive expiry counts are **not** an assertion that every title lacks
other working sources, or that every fresh file was tested end-to-end.
