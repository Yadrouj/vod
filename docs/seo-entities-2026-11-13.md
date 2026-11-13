# Entity-page SEO and AI discovery

## What changed

- Shared title/description templates cover film and series pages, actors and
  directors, tracks and artist profiles. Persian and original names are paired
  only where known; generic provider category labels are not accepted as film
  names. Artist filmography/discography counts refer to the archive, not a claim
  of a complete career. Unknown birth dates, awards and biographies are not invented.
- The same visible FAQ answers generate `FAQPage` JSON-LD. Answers reflect missing
  files, actual archive seasons, source limitations and copyright restrictions.
- Actor pages include `ProfilePage`/`Person` and breadcrumbs. Film credits link to
  person pages, movie images are absolute URLs and restricted titles do not
  advertise `WatchAction`. Existing valid video-thumbnail/date checks remain.
- The header now targets distinct `/films`, `/series`, `/animation`, `/top-imdb`
  and `/iranian-films` hubs. Each has its own title and canonical, is linked in
  the site footer and sitemap, and uses the existing search/filter implementation.
  Matching simple `/browse` variants canonicalize to those hubs. User query
  results are `noindex,follow`; valid editorial profiles remain indexable.
- Shared user playlists and administration pages are `noindex` to avoid generic
  loading/login screens becoming branded sitelinks. No legitimate actor profile
  is removed merely to manipulate Google's selection.
- Search crawlers have explicit public-page access with the same private-route
  exclusions. `llms.txt` gives canonical section links and citation/availability
  caveats; authenticated MCP is documented without exposing API keys or media files.
- The supported Next.js `htmlLimitedBots` option includes AI search/user agents
  alongside the existing framework crawler baseline. Their HTML has complete
  head metadata without JavaScript; ordinary browsers keep streaming metadata.

## Public name-label provenance

`lib/data/person-name-labels.json` holds 4,290 public Persian/original label pairs
from Wikidata, matched by the exact IMDb person ID. Every record preserves its
source entity URL. The importer ignores ambiguous matches and keeps completed
batches if the public service returns an error. The initial run stopped on HTTP
429; it did not evade rate limits. Missing labels retain the original name.
These are name labels, not copied biographies. Wikidata structured data is CC0.

To enrich a bounded additional batch later, respecting service limits:

```sh
node scripts/enrich-person-name-labels.mjs --limit=250
```

Do not run bulk enrichment on every page request. Review generated changes and
commit them before deploying. Future labels may differ from the initial count.

## Search limitations and operator actions

Sitelinks are selected automatically by Google. Clear navigation, stable canonical
URLs and distinctive headings improve signals but cannot force header-only links
or a ranking position. Do not use fake `noindex` rules on real content or mark up
hidden text. Allow recrawling and inspect the homepage and clean hubs in Search
Console after deployment; submit `https://sarvnema.ir/sitemap.xml` and the magazine
index it advertises.

Google deprecated FAQ rich results in May 2026. Visible FAQs remain useful to
readers and other semantic consumers; they are not a rich-result promise.
Google explicitly says `llms.txt` is not used to improve Search/AI rankings.
Indexable HTML, factual text, internal links and matching structured data remain
the foundation. AI robots permissions alone cannot override a CDN challenge or
guarantee that ChatGPT, Claude, Gemini or Perplexity will index/cite the site.
No Search Console submission or CDN configuration change is performed here.

Sources: [Google sitelinks](https://developers.google.com/search/docs/appearance/sitelinks),
[Google title links](https://developers.google.com/search/docs/appearance/title-link),
[Google AI optimization](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide),
[Google May/June 2026 FAQ changelog](https://developers.google.com/search/updates),
[OpenAI crawlers](https://developers.openai.com/api/docs/bots),
[Anthropic crawlers](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler),
[Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers),
[Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing).

## Verification

Unit tests: `node --import tsx --test scripts/tests/entity-seo.test.ts`.
Browser smoke: `node scripts/smoke-entity-seo.mjs` (local server; Playwright path
may be supplied with `PLAYWRIGHT_MODULE`). Checks include mobile/desktop layout,
metadata, canonical URLs and exact equality of visible FAQ/JSON-LD answers.
Use `npx tsc --noEmit`, targeted ESLint and existing video/sitemap regressions too.

Verified locally on the production build: nine browser routes at 390/1440px,
correct titles and canonicals, exact visible-FAQ/JSON-LD parity, zero horizontal
overflow and zero browser exceptions. Raw HTML requests as OAI-SearchBot,
Claude-SearchBot, PerplexityBot and Twitterbot received complete head metadata
without JavaScript. Admin/shared-playlist noindex, robots exclusions and canonical
llms links also passed. Production build and TypeScript passed; targeted ESLint
had no errors (existing image-element warnings remain on profile components).
Video, sitemap, magazine, recommendation and MCP regression tests passed.
These checks do not mean that production has been redeployed or that external
search engines have recrawled/reindexed the changes.
