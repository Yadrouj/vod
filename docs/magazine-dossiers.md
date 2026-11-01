# Researched review and biography dossiers

This batch adds 60 Persian long-form dossiers, independently of the original 30-article magazine. It is a locally prepared/public snapshot, **not a production deployment or a claim of 60 backdated daily posts**.

## Public paths

- `/mag/topics/reviews`: 30 reviews, 15 films and 15 series.
- `/mag/topics/legends`: 30 career/biography dossiers.
- `/mag/review-pluribus`: sample review.
- `/mag/life-christopher-nolan`: sample biography.
- `/mag/sitemap.xml`: all published articles and topic hubs, including both batches.
- `/mag/feed.xml`: the most recent 50 articles. This is intentionally a recent-items feed, not a complete sitemap.

Each dossier contains at least 850 prose words (853–934 in this batch), plus FAQs, real archive cards and references. Counts exclude filmography labels, navigation and schema. There are 60 distinct real cover URLs/archived assets. Landscape gallery stills are preferred when available; portrait photos/posters use contain layout instead of destructive landscape cropping.

## Editorial boundaries

- Selection: 2025–2026 releases, local IMDb snapshot dated **2026-11-01**, rating at least 7.5, more than 10,000 votes in the selected batch, and contemporary professional-review coverage.
- IMDb MovieMeter/TVMeter access was denied during research. These articles explicitly **do not claim a verified live popularity rank**. Never relabel an old chart as today's trend.
- Critical opinions are short, attributed paraphrases with the critic's name, outlet, exact review URL and scope (film, season or limited screened episodes). They are not copies/translations of full copyrighted reviews, nor invented quotes, nor claims that the SarvNema editor watched a private screener.
- Reader interpretation is identified separately from sourced facts. Historic film plots discussed within a biography are not substitutes for a complete factual biography or a comprehensive historical study.
- Sources include RogerEbert.com, IMDb/Rotten Tomatoes, BFI, AFI, Cannes, Berlinale, the Academy, institutional artist archives and UNICEF. Source access can vary by region/site; there is no fabricated HTTP-verification timestamp on every link.
- Individual career insights are in `biography-insights.mjs`. No unsourced private-life gossip, diagnostic labels or dangerous stunt instructions are used as anecdotes.
- Biographical filmographies include **only actual related titles in SarvNema**, including different credit types. They are not falsely called every worldwide work or every directorial work. Leila Hatami currently has one matched local work; no fake internal links were invented to fill the list.
- Existing content restrictions, including `tt33184638`, are unchanged.

## Spoilers and media

Native HTML `<details>` keeps spoiler prose **and the section's potentially revealing title** closed by default. The table of contents and summary use a neutral warning. Touch and keyboard operation are supported without an additional client bundle. The spoiler body has `data-nosnippet`; neither the excerpt nor schema includes the spoiler prose.

The disclosure itself operates without JavaScript (tested using its actual rendered HTML and CSS). The existing app-wide Next.js streaming/loading shell still needs browser JavaScript to reveal a complete page; this scoped magazine change does not claim full-page no-JS support or alter that shared shell. Articles remain server-rendered with text and structured data in the response, and future daily slugs remain allowed at runtime.

Gallery stills and trailers use the same title data as the About page. No interviews, fan videos or AI images are passed off as original trailers/stills. Where no trailer exists in the archive, none is fabricated; expiring direct IMDb video links fall back to the original video page through the existing gallery player. Presence of a download link is not a promise of regional availability.

Series episode shortcuts are derived from explicit season/episode links. No directory is crawled during article rendering. A missing episode number means no explicit link was available to the shortcut, **not** that the episode never aired. Quality/version tags open the title's existing download selector rather than bypassing language/quality choice or the download gate.

## Files and publication

Manuscripts: `content/magazine/dossiers/reviews/` and `biographies/`.
Curated sources/identities: `review-selections.mjs`, `biography-selections.mjs`.
Snapshot: `public/data/magazine-dossiers.json` (ordinary Git JSON, no additional large LFS dataset).

```sh
node --max-old-space-size=2304 scripts/build-magazine-dossiers.mjs           # validate only
node --max-old-space-size=2304 scripts/build-magazine-dossiers.mjs --inspect # per-article word counts; never publishes
node --max-old-space-size=2304 scripts/build-magazine-dossiers.mjs --publish # atomic, all 60; preserve publication dates
node --max-old-space-size=2304 --test scripts/tests/magazine-dossiers.test.mjs
node --import tsx --test scripts/tests/magazine-inline.test.tsx scripts/tests/magazine-media.test.ts scripts/tests/magazine-sitemap.test.ts
```

Repeat publication is content-idempotent: it does not reset publication dates or refresh modification dates for identical content. Run one batch publisher at a time. No external IndexNow notification, Telegram post or server mutation is performed by this script.

`loadMagazine()` merges the two snapshots, filters future dates and deduplicates slugs. A missing optional dossier snapshot does not hide the original magazine. The existing daily agent continues to own `magazine.json` and cannot overwrite this independent batch. This does **not** create a new unreviewed daily content queue; the original exhausted queue still needs a new reviewed plan for future daily publishing.

For a later production deployment, ship the code, manuscripts and snapshot together. If `VOD_DATA_DIR` points to a persistent volume, copy `magazine-dossiers.json` into that same data directory; do not overwrite live scraper datasets or reset the volume. Pull required existing LFS media normally. Rebuild the app/restart according to the existing deployment guide, then check the two hubs and the magazine sitemap. **No production deployment was performed during this task.**

Browser regression (local hosts only; use your existing Playwright installation):

```sh
LOAD_BASE_URL=http://127.0.0.1:3004 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/smoke-magazine-dossiers.mjs
```
