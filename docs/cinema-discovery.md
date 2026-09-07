# Cinema discovery

The landing hero now alternates movies and series from the public IMDb
MOVIEmeter and TVmeter charts. Chart rank is separate from user rating.
Only catalog titles with artwork and an exact IMDb identity, or an unambiguous
title/year/type match, are selected. This job does not import media or invent
playable links. The existing player still handles quality selection.

## Refresh and failure behavior

`npm run refresh-imdb-trending` reads two public HTML charts sequentially, with
a 12-second request timeout, a 4 MB response cap, and a six-hour attempt cooldown.
It runs at the beginning of `daily-release-refresh.mjs`, so the existing
idle-aware maintenance scheduler also refreshes it daily. No extra per-visitor
IMDb calls or new scheduler process are required. The production maintenance
scheduler must already be running; adding the job does not provision a server.

- Public snapshot: `public/data/imdb-trending.json` (small, atomic replacement).
- Local diagnostics: `data/imdb-trending-status.json` (ignored by Git).
- Concurrent runs are prevented by `data/imdb-trending.lock`.
- `--force` bypasses the attempt cooldown, not upstream access controls.
- HTTP 202/challenges, 403, invalid HTML and incomplete parses preserve the last
  good chart. They do not interrupt the remaining daily source jobs.
- Direct captures younger than eight days can say “this week's IMDb favorites.”
  Older captures show “last saved chart” with the observation date. After thirty
  days the hero uses explicitly labeled local recommendations instead.

On 2026-09-07 direct requests returned HTTP 202 with an empty response.
The initial ten titles were matched to reviewed public IMDb search-cache
excerpts. Provenance is in `data/imdb-chart-bootstrap.json`. These entries are
marked `search-cache`, never as a live chart. The observation timestamp is
when the excerpt was reviewed, **not** a claimed IMDb publication timestamp.
`--bootstrap-cache` initializes missing charts only; it cannot replace a
previously fetched chart. A future successful normal refresh replaces the seed.
IMDb describes its weekly popularity methodology here:
https://help.imdb.com/article/imdbpro/industry-research/starmeter-moviemeter-and-companymeter-faq/GSPB7HDNPKVT5VHC

## Search and history

Film search suggestions and full search results sort by descending IMDb user
rating (ties: vote count, year, ID), with separate film/series groups and filters.
The combined suggestions reserve room for both types. Music search does not use
IMDb filters. Landing suggestion popups are anchored below the whole search
form, including on mobile, with their own scroll area.

Continue-watching and recent-download history each use a single image-card rail,
with navigation arrows and touch scrolling. History stays in this browser's
local storage. Old cookies are read as a fallback and retired on the next
successful local save, avoiding large artwork/URL cookies on every request.
Quality variants of a movie/episode collapse to the latest progress card;
separate episodes remain separate. Resume URLs are accepted only when they
match a source already present in the title's playable list.

`POST /api/history-metadata` resolves up to 20 old records from the local catalog
without fetching supplied URLs. It is bounded to 32 KB, rate limited, and uses
private/no-store responses. Ambiguous remakes are not guessed.

## Verification

```sh
node --import tsx --test scripts/tests/discovery.test.ts scripts/tests/imdb-charts.test.mjs scripts/tests/release-updates.test.ts
npx tsc --noEmit --incremental false
node scripts/smoke-discovery.mjs
node scripts/smoke-discovery-search.mjs
node scripts/smoke-release-landing.mjs
```

Browser scripts require Playwright and Chrome, a local server (default port
3004), and optionally `PLAYWRIGHT_MODULE` pointing to an existing Playwright
installation. They use isolated browser history. The resume test intercepts
one media request with a tiny, range-capable silent WAV; no movies are downloaded.
