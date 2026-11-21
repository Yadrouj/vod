# Landing updates

Film discovery reads the live mounted catalogue, including new titles absent
from the compact home snapshot. The weekly rail no longer imports a frozen
JSON list at build time. It uses today's directly observed IMDb chart when
available, otherwise rated titles updated in the last seven days; sparse
catalogues fall back to recent-year picks. The UI states the basis and never
re-dates a blocked IMDb chart.

Music compact-index generation and rendered shelves share publication-date
ordering. Cover availability only breaks ties. Future dates and archive import
times are not evidence of a new release. The hero deduplicates tracks, weekly
and current-year shelves precede classics, and featured performers rotate by
the Tehran date.

## Refresh and verify

Use the existing scheduled workers in `scripts/maintenance-policy.mjs`.
Incremental runs keep previous sources, publish indexes atomically, and retain
the previous valid snapshot on upstream failure. Run video catalogue writers
sequentially. Music may run alongside video, but not another music writer.
Take a backup first and retain each worker's exit status and log.

After a refresh, compare a saved baseline against the live archives:

```sh
node scripts/audit-landing-refresh.mjs .deploy-backups/<run>/baseline.json
```

The baseline contains `at`, `titles: [{id, links}]` and
`tracks: [{id, sources}]`. The audit is read-only. It distinguishes new IDs,
additional links and additional music sources, lists any lost IDs, and reports
actual index/news dates. No scraper exit code proves that every upstream link
plays in every browser or that an entire historical archive was crawled.

Focused tests:

```sh
node --import tsx --test scripts/tests/home-discovery.test.ts scripts/tests/music-freshness.test.mjs scripts/tests/landing-refresh-audit.test.mjs scripts/tests/music-refresh.test.ts
```
