# Series magazine: first batch

Ten existing series dossiers have been expanded into Persian long-form articles.
Each source manuscript is validated at 3,000 prose words minimum, excluding
headings and link targets. This is batch 1 of the requested 30 series articles.

| Series | Article |
| --- | --- |
| Adolescence | `/mag/review-adolescence` |
| The Pitt | `/mag/review-the-pitt` |
| Dept. Q | `/mag/review-dept-q` |
| The Studio | `/mag/review-the-studio` |
| Pluribus | `/mag/review-pluribus` |
| MobLand | `/mag/review-mobland` |
| Paradise | `/mag/review-paradise` |
| Task | `/mag/review-task` |
| When Life Gives You Tangerines | `/mag/review-when-life-gives-you-tangerines` |
| Dexter: Resurrection | `/mag/review-dexter-resurrection` |

The articles use verified existing person profiles, real title-gallery images,
the existing trailer component, live catalog availability, season/episode watch
links, and links to the title's download/version selector. Spoiler sections use
native closed disclosures. Audience summaries cite limited public discussions;
they are not presented as representative polling or first-hand viewing.

## Episode scores

`content/magazine/dossiers/series-batch-one.mjs` records the evidence snapshot
checked on 2026-11-06. Most values were observed in indexed IMDb pages; a small
number use explicitly linked IMDb-rating mirrors. Every row links its actual
evidence source. The UI explains that these are snapshots, not a live feed.
Unknown and future episode scores remain null. TVmaze episode artwork data is
not relabeled as IMDb ratings. The overall series rating is not derived from
the arithmetic mean of the episode ratings.

## Rebuild and verify

```powershell
node scripts/build-magazine-dossiers.mjs --publish
node --test scripts/tests/magazine-dossiers.test.mjs scripts/tests/magazine-series-batch.test.mjs
npx tsc --noEmit
# With Playwright available (or PLAYWRIGHT_MODULE pointing to its index):
node scripts/smoke-magazine-series-batch.mjs
```

The smoke test covers all ten routes at 390px and 1440px, overflow, profile links,
episode links, and closed/open spoiler interactions. It uses localhost only.
Manuscripts and publication snapshots are tracked in Git; no writing or network
scraping happens when an article is opened. Later work still includes batches
2 and 3 and refreshing time-sensitive rating snapshots.
