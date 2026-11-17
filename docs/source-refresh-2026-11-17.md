# Incremental source refresh — 2026-11-17 (Tehran)

This is a bounded **recent-release refresh**, not a full historical crawl or a
claim that all upstream files play in every browser. No production deployment or
Telegram/channel posting is part of this update.

## Published data bundle

| Result | Count |
| --- | ---: |
| Matched film/series profiles in this batch | 194 |
| Films / series | 77 / 117 |
| New profile IDs against the archive plus the previous published bundle | 50 |
| File links represented (including historical episodes and qualities) | 23,845 |
| Distinct season/episode slots represented | 5,804 |
| Ambiguous same-title/year source IDs held back | 14 |
| Checked music records retained | 80 |
| New / enriched music records | 42 / 38 |
| Artist profiles represented in this music batch | 78 |
| Conflicting old music attributions held back | 3 |
| Generic-artist multi-song pages held back as playlist candidates | 2 |
| Additional alternative file URLs verified / titles covered | 39 / 23 |
| New dated headlines selected for November 17 | 10 |

The producer's `addedLinks` (14,986) and refreshed signatures (4,674) compare
against the **raw** archive. They are not counts of new film releases, and may
include versions previously visible through the November 14 overlay. New title
and music ID counts use an effective baseline containing that earlier overlay.
The 5,804 episode slots include older seasons, not 5,804 newly released episodes.

## Sources reviewed

- FamilyMovie: 98 recent detail pages inspected from a listing advertising 564;
  89 usable profiles, nine timeout errors. The batch is explicitly partial.
- Moviesho/ZardFilm curated categories: 203 source posts returned, 81 details
  needing review, 58 usable title records; 16 request/discovery/detail failures.
  Categories include series, animation/anime, Turkish, Indian, Korean, Iranian,
  documentary and war titles.
- DonyayeSerial series feed: two listing pages, 27 detail pages and 12,860 file
  links returned. Existing mirror priority and player recovery are unchanged.
- F2MY: two movie and two series listing pages, 96 discovered entries, 45 detail
  pages freshly reviewed with 2,183 links. Only this attempt's fresh cache entries
  enter the bundle, not every historical cached page.
- Meloobit: two latest pages, 50 discovered records; 49 had verified files. Its
  public download-directory listing returned 403, so only exact public article
  files were checked; no listing or login restriction was bypassed.
- RozMusic: two audio pages, one music-video page and 30 discovered records.
- Musics-Fa: two listing pages, 24 details reviewed and 23 retained candidates.

Music candidates are matched across sources before publication. The combined
check report contains 239 distinct media URL checks/reused recent checks, 235
with a supported audio/video prefix. These are **not** 280 songs or full playback
tests. Three conflicting singer attributions are excluded instead of guessed.
Two generic-artist pages containing different songs are retained privately as
playlist candidates, not published as one track. Two bitrates of the same DJ mix
still qualify as one release; different singers' files must not be cross-attached.

The alternative-source pass examines 48 candidate URLs round-robin over matching
IMDb identities. Thirty-nine returned an accepted media prefix and file-size
evidence; nine were unverified. The output preserves prior verified alternatives.
It is a sample, not verification of all 23,845 links in the bundle.

## News and IMDb

The news worker completed its ten-headline Tehran-day goal, preserving real
publisher dates, attribution and links. Twenty recent headlines remain in the
display payload, including eligible prior days; no stale headline is re-dated.

IMDb movie/TV popularity requests returned HTTP 202 challenge responses, not
usable charts (a separate public page check was also blocked). The previous chart
snapshot remains byte-for-byte unchanged. Four existing hero images were
revalidated as high-resolution; this is **not** a newly observed popularity rank.

## Archive and runtime safety

- Immutable batches: `lib/data/media-refresh-2026-11-17-{vod,music}.json`.
- `current-video-release.ts` and `current-music-release.ts` apply November 14 and
  November 17 batches in order. Updating must not drop the previous additions.
- Full title pages, full/compact search indexes, music landing and artist indexes
  share those releases. A new profile is not merely an unattached JSON file.
- Copyright restrictions, exact IDs, canonical Persian names, cast data, episode
  artwork, original providers and newer live signatures remain protected.
- Large mounted/LFS `vod-catalog.json`, `music-index.json` and artist files were
  not rewritten. Normal server-data backup/merge rules still apply at deployment.
- No dependency, bot posting schedule, maintenance service or deployment changed.

Raw snapshots, verification reports, held-back records and pre-refresh backups
are retained under ignored `.media-cache/refresh-2026-11-17/`.

## Reproduction and tests

The source scrapers must first populate that date's private work directory.
`prepare-baselines.mjs` there prepares effective old snapshots without mutating
the raw archives. Then:

```sh
node scripts/prepare-release-bundle.mjs --date=2026-11-17 \
  --video-baseline=.media-cache/refresh-2026-11-17/video-baseline.json \
  --music-baseline=.media-cache/refresh-2026-11-17/music-baseline.json
node --import tsx --test scripts/tests/current-media-release.test.ts \
  scripts/tests/bundled-video-release.test.ts scripts/tests/bundled-music-release.test.ts
npm run build
```

Browser checks use `MEDIA_REFRESH_TEST_ORIGIN` and `PLAYWRIGHT_MODULE` with
`scripts/tests/current-media-release.browser.test.mjs`. They inspect genuine local
pages/search; upstream media/telemetry is blocked so they are not playback tests.

Verified locally: 64 targeted unit/regression tests, one production-browser test,
and the optimized Next.js build (all 58 static generation tasks). Browser checks
cover new film/series/music/artist pages at 390px, actual music/title search, all
42 new music IDs through the full-library API, and the new headline on the 1440px
homepage. No browser JavaScript errors were observed on those checked routes.
