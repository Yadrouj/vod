# Meloobit music source

Source: https://meloobit.ir/ · archive: https://meloobit.ir/category/آهنگ/ · download index: https://sv2.mybia2music.com/s2/Music/

The archive currently advertises 506 pages. The crawler discovers the last page from pagination rather than stopping permanently at that number. Promoted cards repeat above every archive page and are deliberately excluded from chronological discovery.

## Data and identity

- Reads the actual `data-song`, `data-artist`, original artwork, publication date and download controls from each song's own article. Related/sidebar tracks cannot become that song's downloads.
- Uses HTTPS for the supported download host. Only the public `sv2.mybia2music.com/s2/Music/` subtree is accepted; credentials, alternate hosts, traversal and automatic redirects are not followed.
- Directory siblings are matched using the complete artist-and-song filename, including remix/version distinctions. Only bitrate/resolution suffixes are normalized. Unknown qualities are called original quality, never silently asserted to be 320 kbps.
- Checks a bounded audio/video range, not the entire song. HTML error pages and failed files stay unavailable. Unverified songs stay in the private checkpoint and are not added to the public archive.
- Exact cross-provider identities keep existing archive IDs and artist profiles. Audio/video, remixes and different artists are distinct. Meloobit's original page is retained on each source even after merging.
- Publication dates come from the actual page, not download-folder timestamps. Persian dates are calendar-validated. `addedAt` is the arrival date, not an invented release date.
- Does not copy lyrics or entire provider articles. Descriptions are concise original metadata summaries; original source links remain.

## Playlists and categories

`build-mood-playlists.mjs` adds verified Meloobit tracks to the existing collections, continuous player and artist directory. It also creates a latest-releases collection and retains homepage selected/week/month/year membership. Mix/DJ sets are identified explicitly from release metadata, not presented as provider-authored categories. Real category labels and remix tags contribute to existing mood collections; artist names, numeric WordPress tags and song titles are not mistaken for genres.

## Run and resume

```bash
# Bounded initial/incremental run, publishes verified successes
npm run scrape-meloobit

# Two-hour resumable backfill batch; repeat until pages and pending validations finish
npm run scrape-meloobit:full

# Small daytime update without historical crawling
node scripts/refresh-meloobit.mjs --recent-only --pages=1 --budget-ms=180000

# Parser/crawler and playlist regression tests
node --test scripts/tests/meloobit.test.mjs scripts/tests/music-tag-playlists.test.mjs
```

For the first **complete** archive import, run the optional worker (the app and its image must already be built):

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.meloobit.yml up -d --no-deps meloobit-backfill
docker logs --tail 30 vod-meloobit-backfill
docker compose -f docker-compose.prod.yml -f docker-compose.meloobit.yml stop meloobit-backfill
```

This initial user-requested import runs now, independently of the nightly window, with 0.5 CPU/1 GB memory and bounded log files. It publishes verified additions after each 15-minute batch and repeats until every discovered archive page and pending validation has been reviewed, then exits successfully. It honors the source's enabled toggle at batch boundaries and yields to other music publishers via their shared lock. It does not post to Telegram itself. Progress is in `data/meloobit-backfill-status.json`; failures and rejected files remain in the source report. Ordinary later updates still run only in the configured nightly schedule. Graceful shutdown checkpoints progress and releases the publication lock.

Defaults: two newest pages plus two historical pages, 24 detail-page enrichments, seven-minute request budget. Calls are paced per host, with retries/backoff for transient failures. Checkpoint writes are throttled to ten seconds and forced at page/exit boundaries, avoiding rewriting the growing archive after every network response. Newest pages are always refreshed; completed historical pages and already validated links resume from checkpoints. Stale/unavailable link validation retries before fetching more history; newly failed checks propagate to existing source availability. A partial run publishes only verified successes and explicitly reports unfinished work; it is not a claim that every archive page is complete.

Configuration: `MELOOBIT_RECENT_PAGES`, `MELOOBIT_BACKFILL_PAGES`, `MELOOBIT_DETAIL_LIMIT`, `MELOOBIT_BUDGET_MS`, `MELOOBIT_STATE_DIR`, `MELOOBIT_STATUS_FILE`, `MUSIC_REFRESH_REQUEST_GAP_MS`. CLI: `--pages=N`, `--backfill-pages=N`, `--detail-limit=N`, `--budget-ms=N`, `--delay-ms=N`, `--full`, `--recent-only`. `--pages=0 --full` resumes history without refetching front pages.

Private cache/checkpoint: `.media-cache/music/meloobit-source.json`. Lock: `.media-cache/music/meloobit.lock` (expiry exceeds the run deadline). Status: `data/meloobit-status.json`, including completed/total pages, discovered/verified songs, validated/unavailable links, warnings and remaining state. Keep the music cache volume across deployments. Never replace the server's live `public/data` with an older developer snapshot.

## Daily server scheduling

Meloobit is a separate eight-minute job in the existing 03:00–07:00 Asia/Tehran maintenance window. The aggregate music job retains 62 minutes, keeping the total planned budget within four hours. Admin controls at `/admin/scrapers` expose the source, timing, enabled state and progress. Existing saved schedules need not be overwritten: missing known jobs use the saved global schedule. The ordinary/daytime music refresh also supports Meloobit; a nightly aggregate run avoids duplicating its independent job.

The worker's normal Docker image must be rebuilt/recreated to install changed scripts, and the application image rebuilt for type/API changes. A one-off initial run can use `docker exec vod-maintenance node scripts/refresh-meloobit.mjs ...` while the scheduler is waiting. It shares the aggregate music-refresh lock, so two catalog publishers cannot run concurrently. Publication merges into the current archive without rebuilding/removing unrelated providers, preserves artist biographies, then rebuilds compact/playlist indexes. The aggregate RozMusic rebuild also retains the cached Meloobit source.
