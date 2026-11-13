# Release picker, search appearance and editorial refresh

## Film/series selection

Download versions now follow **type → quality → source links** for movies and
individual series episodes. Labels are Persian dubbed / changeable subtitles /
burned-in subtitles, with original/other versions retained. Qualities are sorted
numerically descending. Changing type resets quality; only qualities actually
present under that type are shown. Missing quality metadata is explicit, and
source/play URLs remain unchanged. TXT/copy filters retain their optional
all-links behavior and use the same labels and numeric quality order.

## Google appearance

The screenshot contains automatically chosen sitelinks. These cannot be
specified or guaranteed. Improvements: stable brand-focused homepage H1 instead
of the rotating film heading, shorter archive page title, consistent Persian
site-name hints, clear principal navigation entities, and `data-nosnippet` on
transient loading/status text. Legitimate actor/profile pages are not deleted or
blanket-noindexed. After deployment, request recrawling of the homepage, browse,
music and magazine URLs in Search Console. Existing results may take days or
weeks to change.

References:
- https://developers.google.com/search/docs/appearance/sitelinks
- https://developers.google.com/search/docs/appearance/site-names
- https://developers.google.com/search/docs/appearance/title-link

## News and box office

News snapshot refreshed on 2026-11-13: ten items in the daily batch. Iran chart:
35 reported films, actual complete-day comparisons for November 12 and 11,
CinemaTicket samples matched six films. No invented daily growth.

Magazine has keyboard-accessible Iran/world tabs. `/mag?boxOffice=world#box-office`
opens the world table. Thirty worldwide release-group totals from Box Office
Mojo, in USD, distinguish worldwide, US/Canada and other markets. Source is
checked on requests at most hourly, visible pages poll the local API every five
minutes, and a daily maintenance task refreshes the snapshot. This is automatic
source-connected updating, not a real-time ticket-sales feed. Outages retain the
last observation with its original date and display a stale warning after 48h.
The new one-minute world job shares the existing four-hour nightly budget:
news receives four minutes instead of five; its per-request timeout remains
twelve seconds and the daily news target is unchanged.

## Sousan collection

`/music/collections/sousan-collection`: 53 existing tracks with successful audio
HEAD checks plus the attributed “Ba to che Shab ha” remix from Avajavan. One of
54 archived candidates failed verification and was omitted from this collection.
Track details retain publisher credit and source page. No original music file
was copied to this repository. The publisher describes the remix as trending;
an Instagram chart position or new publication date is not claimed.

Rebuild: `node scripts/build-sousan-collection.mjs`. Collection data is bundled
separately so routine scraper writes do not erase it. The added remix also
participates in search and the existing singer-profile merge.

## Validation

Release option, world parser, collection, daily news and Iran chart tests;
TypeScript and targeted ESLint; mobile browser smoke script
`scripts/smoke-release-editorial.mjs` (set PLAYWRIGHT_MODULE if Playwright is
installed outside this repository). Production publishing is a separate action.
