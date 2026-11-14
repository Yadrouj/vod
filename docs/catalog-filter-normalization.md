# Catalogue search filters

`lib/catalog-facets.mjs` is shared by the runtime, index builders and bot API.
English canonical values are distinct from the labels shown in Persian/English.
For example `Drama` and `درام` produce one option; old URLs using either spelling
match the same set of titles. Active-filter chips use the selected locale too.

Only recognized countries, languages and genres enter those menus. Years,
provider navigation categories, actor names and unknown placeholders are excluded
from facets, not removed from the source archive. Historical countries remain
distinct, as do Chinese/Mandarin/Cantonese and Filipino/Tagalog. Compound genre
tags are split, while complete language names containing commas stay intact.

The runtime rebuilds facets once per enriched index snapshot, including newly
supplemented titles, so existing raw indexes are corrected without rewriting live
data. Both full and classic-film index builders normalize future nightly output.
Bot facet counts deduplicate bilingual labels per title and share filtering rules.

Checks:

```sh
node --import tsx --test scripts/tests/catalog-facets.test.ts scripts/tests/bot-api.test.ts scripts/tests/archive.test.ts scripts/tests/typo-search.test.ts
node scripts/smoke-catalog-filters.mjs
```

The browser smoke test is local-only and supports `LOAD_BASE_URL`,
`PLAYWRIGHT_MODULE` and `BROWSER_CHANNEL`. It checks translated/deduplicated
options, country/year separation, old filter URLs, real form submission,
320/390/1440px layouts and the English locale. Raw provider data is not modified.

Verified on the local production build: 40 genres, 144 countries and 216 languages
from 29,054 archive titles, with unique Persian menu labels and no numeric country
entries. The browser smoke test passed in both locales with no overflow or browser
exceptions. The build, TypeScript, targeted ESLint and 50 related regression tests
passed. These counts describe the local snapshot, not a guaranteed live inventory.
