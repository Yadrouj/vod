# Catalog spelling suggestions

Cinema and music searches use a local `TypoSearchIndex`. Exact normalized matches
win. When there are none, bounded edit-distance candidates cover substitutions,
missing/extra characters, adjacent swaps and joined words. Persian/Arabic letter
variants, diacritics, digits and Latin accents normalize consistently.

For `hoise`, the live catalog suggests `House`, `horse` and `Noise`. The strongest
candidate supplies results; other interpretations remain clickable alternatives,
not unrelated high-rated titles mixed into the main list. Cinema results stay
globally IMDb-descending; movie/series tabs filter that pool. Music retains its
title/artist relevance, popularity and year ordering.

The original input is never silently changed. The dropdown and browse page say
“Related results for…” and expose correction chips/links. Choosing one performs
a normal search. Submitted `/browse` queries and archive pagination use the same
matcher, and correction links preserve other filters. Music artist suggestions
use the resolved spelling too. Network errors stay distinct from empty results.

Telegram and Bale now call this same matcher through `/api/bot/search` and
`/api/bot/music`. Both return `mode`, `matchedQuery` and actionable `corrections`.
For `breakng bud`, both misspelled words resolve together to **Breaking Bad**;
`bud` alone no longer qualifies unrelated results when the first word fails.
Multiword candidates must be real contiguous title phrases, matching every input
word in order. An index of words to titles narrows the candidate pool before
whole-phrase validation, so frequent individual words cannot displace a closer
title. Exact matching phrases still win; bot search ranks relevance within the
resolved phrase, while the website retains global IMDb ordering.

## Limits and caching

- No external API, query logging, new dependency or environment variable.
- Only real catalog names can supply alternatives (at most five); no fabricated
  confidence percentages or promise of every possible spelling.
- Short tokens (under three letters), numeric queries, IMDb IDs and oversized
  inputs are not fuzzily expanded. No plausible candidate means a neutral hint.
- At most one edit for short words, two for words of six or more letters;
  eight tokens, an 80-character fuzzy-query limit and a 64-entry per-index cache.
  The last word of a multiword title may be an unfinished prefix of at least two
  letters; no word is discarded. Singleword candidates retain bounded expansion.
- Immutable catalog snapshots invalidate indexes. Music's dictionary is built
  only when needed for a search, not for ordinary music landing requests.
- Suggestion requests include `suggest=spelling-v1` to avoid old cached responses.

## Checks

```sh
node --import tsx --test scripts/tests/typo-search.test.ts scripts/tests/discovery.test.ts scripts/tests/performance.test.ts
node scripts/smoke-search-corrections.mjs
node scripts/smoke-search-imdb.mjs
```

Browser checks require the local server (`LOAD_BASE_URL`, default port 3004) and
Playwright (`PLAYWRIGHT_MODULE` when installed outside this repository). They test
the real catalog, desktop/mobile correction chips, keyboard use, original input,
submitted searches, type filters and retained IMDb ordering.
