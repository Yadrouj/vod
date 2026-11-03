# Daily news, Iranian box office, music and hero artwork

These changes are shipped through Git only. They do not install a timer, replace the running website, or publish Telegram messages on a remote server automatically.

## Daily jobs (Asia/Tehran)

The existing maintenance supervisor checks the configured days and the **03:00–07:00** window. Its first jobs are now news, Iranian box office/tickets, then IMDb charts/artwork. Slow catalog jobs cannot consume the whole night before these lightweight jobs run. Maximum allocated budgets remain 240 minutes in total; actual job deadlines also stop at 07:00. Admin overrides and disabled sources remain respected. Older saved dashboards gain the new box-office source without resetting their settings.

Use exactly one trigger owner: the Compose maintenance daemon, or the host's persistent systemd timer. Do not enable both. For a systemd-managed deployment, after deploying the new application image:

```bash
sudo bash deploy/install-maintenance-timer.sh docker-compose.prod.yml
systemctl is-active sarvnema-maintenance.timer
systemctl list-timers sarvnema-maintenance.timer --no-pager
journalctl -u sarvnema-maintenance.service --since yesterday
docker compose -f docker-compose.prod.yml run --rm --no-deps -T maintenance node scripts/maintenance-scheduler.mjs --check
```

The existing installer checks every five minutes, uses `Persistent=true`, and refuses duplicate scheduler ownership. The daemon checks every fifteen minutes. The app must be healthy with spare capacity; a deferral is not a successful update. Check `data/maintenance-scheduler-last-run.json` and the private scraper dashboard, not just container uptime. Restarting a container alone does not prove a daily refresh happened. A short news batch exits nonzero so it can be topped up on the next eligible trigger. Failures do not starve the other jobs.

For focused manual verification (without running every film scraper):

```bash
npm run scrape-news
npm run refresh-iran-box-office
npm run refresh-imdb-trending -- --force
node scripts/build-mood-playlists.mjs
```

## News: ten genuinely new links each day

`scripts/scrape-vod-news.mjs` reads publisher RSS and Google News RSS. It stores a Tehran-day selection/history inside `vod-news.json`. Each daily batch contains at most ten previously unpublished links/headlines, with Persian cinema headlines prioritized. Retries fill a short batch without replacing a full batch. URL and normalized headline checks prevent mirrored feeds from announcing the same story again. The selection history is bounded to 31 batches; older selected headlines and article dates are not rewritten as today's news.

Only news with a real publication date, at most three days old and not in the future, can enter a new daily batch. The landing displays ten cards; `/mag#daily-news` displays the same selection. Source failures and `daily: {day, goal, count, state, checkedAt}` remain inspectable in the server-side snapshot. If sources supply fewer than ten valid new items, the state is `partial`: no fabricated headlines or publication dates. Last-good dated news remains visible for up to seven days. Headlines are attributed, link to their source, and use short excerpts rather than republishing full articles.

## Iranian box office and CinemaTicket prices

`/mag#iran-box-office` precedes the article list. `iran-box-office.json` is independent of the news feed. Sources are the public requests made by [SAMFAA](https://samfaa.ir/) and [CinemaTicket](https://cinematicket.org/). The SAMFAA report is all-provinces for the current Persian screening year. It is **season cumulative revenue**, not an all-time or weekly gross. Rial is converted to toman by division by ten; the source observation timestamp is retained.

Daily change uses two explicit, distinct, completed Tehran calendar days, fetched with the public frontend's Jalali `custom/from/to` parameters. Today's partial box office is never compared with yesterday's full day. Identical date responses, invalid counters and unknown/missing baselines cannot produce a percentage. Last-good comparisons keep their original period labels if the provider is unavailable. Ticket counts are admissions, not unique people, and analysis does not infer audience demographics.

CinemaTicket's public movie list is matched by exact normalized title only. Prices come from future, purchasable sessions on the observation's Tehran day. `min_price/max_price` are **rial**, converted to toman. Each sample links to the exact movie page and records its date, cinema/session sample counts, and observed range. This is not a fixed nationwide ticket price and is not used to estimate national box-office admissions. Old-day samples disappear automatically; unmatched films do not receive invented prices. Session prices/availability may change after capture.

## IMDb and full-width hero quality

`refresh-imdb-trending.mjs` refreshes both public IMDb popularity charts and validates real landscape artwork. Only official Amazon/TMDB assets or existing local media are accepted for newly validated art; native images must be at least **1920×800**, landscape, decode successfully and not be blank placeholders. It uses already saved IMDb galleries and optional TMDB lookup (`TMDB_READ_ACCESS_TOKEN` or `TMDB_API_KEY`, supplied privately to the maintenance worker; never in client code). TMDB attribution requirements still apply when using its data.

`imdb-trending.json` retains the chart's actual observation date. `imdb-hero-art.json` stores dimensions, artwork source and validation date. A blocked/empty IMDb HTTP 202/403 response is **not** a successful chart update: previous data is preserved, status reports the failure, and old rankings are not labelled today's trends. Only a direct snapshot observed on the current Tehran day is marked current. No alternative popularity score is presented as IMDb's ranking. At the November 3 local check, IMDb returned an empty 202 challenge for both charts; that external availability limitation remains, not a freshly downloaded chart.

During an upstream outage, a fallback hero can use validated artwork independently of the expired chart. It is labelled a viewing suggestion, not a current IMDb trend; unverified low-resolution posters cannot silently enter the desktop hero. On Linux the CLI workers use kernel `flock` locks, automatically released after crashes/container removal, avoiding PID-reuse problems across one-off containers. The existing production image already installs `flock`. On Windows/non-CLI invocations, PID ownership permits recovery only after proving the owner exited. Live/permission-uncertain or malformed legacy PID locks are not stolen; an operator must verify no worker is running before removing an unverifiable legacy lock.

## Music playlists

Daily music maintenance already rebuilds `music-mood-playlists.json` and `music-mood-tracks.json` after ingesting tracks. The landing now shows real linked, playable collections for Iranian moods (road, sad, Peykan nostalgia, Peugeot/car mood, shooti/remix, excitement), styles and publication years. The full category navigation is at the end; search results retain their filters. Explicit archive tags remain separate from editorial mood names. Year collections use the catalog's publication metadata, never import time or an invented original-release year. Choose a driving playlist before moving.

## Data and rollout

Keep the application and maintenance worker on the same persistent `public/data` / `VOD_DATA_DIR` bind mount. Deploy the new JSON snapshots along with the code for immediate local baseline data; subsequent runs atomically replace successful snapshots. Retain `data/` scheduler checkpoints. Do not expose the whole `/data/` directory through Nginx to make these widgets work: these are server-side reads. No database reset, catalog purge, or LFS re-upload of unrelated historical archives is required.

See [Yoinks findings and reproducible test](youtube-yoinks.md) for the separate YouTube limitation. A CLI download guide is not a browser download service or a way to remove YouTube's sign-in requirements.

## Local verification, November 3, 2026

- Production Next.js build and TypeScript completed successfully. Scoped lint has no errors (existing external-image optimization warnings remain).
- Relevant regression run: 352 passed, zero failed; the Linux-only scheduler case is skipped on Windows. Additional real Linux container runs pass the refresh suites and exercise both overlapping-worker/crash recovery and the news CLI's kernel-lock re-exec/output-directory behavior.
- `node scripts/smoke-daily-editorial.mjs` passed at 390px and 1440px: 34 table rows, real loaded posters, table before articles, ten exact selected headlines, 24 playlist preview cards, a resolving 40-track collection, no horizontal page overflow and no browser runtime exceptions. Desktop hero native landscape dimensions were checked. Screenshots stay in ignored `.media-cache/daily-editorial-smoke/`.
- Box-office data includes completed November 2 vs November 1 comparisons for 17 films. Ticket samples are separately dated; they expire at the next Tehran day, independently of the box-office snapshot.
- The actual pinned Yoinks helper was retested on Blender's licensed sample; the latest attempt hit a YouTube connection timeout. No downloaded MP4 or browser download has been verified. IMDb chart acquisition also remains externally blocked; neither failure is reported as a successful fresh fetch.
