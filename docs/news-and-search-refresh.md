# News, magazine and search refresh — November 1, 2026

This change is separate from archive-refresh commit `94b59738`. Deployment to the
production server is not performed by these local scripts or by Git push.

## News

The previous news snapshot was dated September 17. Several narrow Persian Google
News queries returned HTTP 200 with zero items. The collector now records empty
feeds explicitly and also uses the publishers' public RSS:

- Khabarfoori's cinema/theatre feed, discovered from its category page;
- Tasnim's cinema feed;
- Flato's cinema and dedicated Iranian box-office feeds;
- broader Google News cinema, releases and series searches.

Cards retain real publication dates and publisher attribution, short excerpts and
the original article link. They are not newly authored SarvNema reporting.
Persian news has priority on the landing. Items older than seven days are not
shown as current news, including when a previous snapshot is retained after a
network failure. The existing independent nightly `news` job runs this collector.

```sh
node scripts/scrape-vod-news.mjs
```

The box-office panel requires an explicitly labelled **weekly sales in toman**
table with a source publication date. It does not convert ambiguous rial figures,
infer admissions, or label weekly revenue as lifetime gross. Its initial report
covers the first week of Aban 1405 and was published October 31. It links to the
full report and expires after 14 days if a newer table cannot be verified.
There is no claim of a live connection to Samfa.

## Search

Typo recovery still selects a real, whole-phrase candidate set, never dropping a
misspelled word. Matching movie and series results share one ranking:

1. Valid IMDb rating, descending (unrated titles last).
2. Real local selections of search results over seven Tehran dates.
3. IMDb vote count.
4. Fresh direct IMDb popularity-chart rank, when available.
5. Title relevance, release year and stable ID as deterministic tie-breakers.

No site popularity figures are invented. An empty counter starts at zero. The
browser records an actual selected film/series result, not a keystroke, prefetch,
query text or music selection. Counters store only date/title/count in ignored
`data/search-popularity/counts.json`; no IP, visitor ID or raw query is persisted.
Origin checks, bounded JSON, known-title validation and rate limits protect the
endpoint. Repeated selections of the same title from one connection are bounded.
The normal `data` volume preserves counters across application restarts.

Suggestions, submitted browse results, paginated archive results and the bot's
default search use the same comparator. Explicit bot sort choices remain intact.
Counters refresh on a short cache interval; popularity never outranks a higher
IMDb score.

Official charts returned HTTP 202 during this refresh. Their old captures were
retained, not re-dated; expired captures do not influence ranking. Fresh official
rating/vote datasets from the archive refresh remain separate from popularity
charts. No fabricated current trend list is shipped.

## Verification

```sh
node --import tsx --test --test-concurrency=2 scripts/tests/news.test.mjs scripts/tests/blog-agent.test.mjs scripts/tests/typo-search.test.ts scripts/tests/search-popularity.test.ts scripts/tests/bot-api.test.ts
npx tsc --noEmit
npm run build
```

The first 30 magazine articles are now published in the local snapshot. See
`docs/blog-agent.md` for the explicit one-time batch command and the next-queue
requirement. Git LFS archive uploads continue independently of this small change.

Browser verification covered 320/390/1440px news/box-office layouts, both newly
published article routes, all 30 article sitemap URLs, and rejected selection
requests. The broader discovery smoke also passed 320/390/768/1440px, corrections,
keyboard navigation and progressive results with the music request held pending.
Its first cold mixed-search run timed out once; the subsequent full run passed.
Warm isolated film/music search responses were about 100–120ms locally. This
does not claim that cold initialization of the large music dictionary is fixed.
