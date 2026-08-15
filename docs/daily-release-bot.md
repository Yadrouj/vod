# Daily release bot

`npm run daily-release-bot` is the production worker for SarvNema's daily release review. Run it under a process supervisor such as PM2, systemd, Docker, or the hosting platform's worker service; do not start a long-running crawler inside a Next.js request.

Each daily cycle runs sequentially, with locks to prevent concurrent catalog writes:

1. Refreshes the configured DonyayeSerial archive, recent series feed, and Moviesho source.
2. Runs F2MY's incremental movie and series crawler.
3. Queries IMDb's date-bounded release search for current films and series, then matches IMDb IDs and normalized titles against the local catalog.
4. Publishes `public/data/vod-updates.json` and release-aware items in `public/data/vod-news.json`.

Entries with verified files are `available`. An IMDb release without a matching source file is `coming-soon`, which means the next source cycle will check it again. Existing catalog entries are never deleted because a source is temporarily unavailable.

## Commands

```powershell
# Run one full all-source review now
npm run daily-release-refresh

# Only reconcile the existing catalog with IMDb and rebuild Updates/News
npm run daily-release-refresh -- --monitor-only

# Keep the full review running every 24 hours (default)
npm run daily-release-bot
```

## Environment controls

| Variable | Default | Purpose |
| --- | --- | --- |
| `DAILY_RELEASE_BOT_INTERVAL_HOURS` | `24` | Frequency of the long-running worker. |
| `DAILY_RELEASE_BOT_INITIAL_DELAY_MS` | `120000` | Delay before the first background cycle. |
| `IMDB_RELEASE_LOOKBACK_DAYS` | `7` | Date window used for IMDb release discovery. |
| `RELEASE_MONITOR_RETENTION_DAYS` | `14` | How long Update cards remain visible. |
| `DAILY_RELEASE_SKIP_CATALOG_SYNC` | unset | Set to `1` to omit the DonyayeSerial/Moviesho sync. |
| `DAILY_RELEASE_SKIP_F2MY` | unset | Set to `1` to omit F2MY's incremental scan. |
| `IMDB_RELEASE_DISCOVERY_URLS` | unset | Optional comma-separated JSON feeds; uses IMDb's date-bounded release search by default. |

The Admin page also exposes a safe **Run reconciliation now** action for the current catalog and **Run all source checks** for a complete single cycle.
