# SarvNema magazine: publishing and operations

Public magazine: https://sarvnema.ir/mag
Music collections: https://sarvnema.ir/music/collections

## What ships

Thirty original Persian manuscripts live in `content/magazine/`. Their reviewed first-month plan is `first-month.mjs`; each assembled article is validated at 850–1,500 words. The initial batch is approximately 1,000–1,200 words per assembled article, with six sections, visible FAQs, references, illustrations and real archive links. Existing magazine guides remain available.

This is a researched editorial queue and a publication agent, not an unconfigured model claiming to report live news. The initial queue covers 30 publication dates. When exhausted, `status.json` reports `exhausted: true`; prepare and review the next plan before the end of the queue. Never invent releases, cast announcements, festival winners, quotes or personal author credentials to fill a daily slot. There is no paid generative-text API secretly enabled.

The agent refreshes *unpublished* drafts' related archive cards each cycle. Episode announcements preserve the exact season/episode. IMDb charts older than seven days are excluded; an upstream denial does not become a fresh chart. An archive discovery date is explicitly distinguished from a release date.

The magazine also shows dated fresh news-feed headlines separately, linking readers to the original publisher. Only the last seven days are shown; feed headlines are not misrepresented as newly authored SarvNema reporting.

## Schedule and recovery

- One article per Tehran calendar date, normally at or after 09:00.
- Five-minute polling, single-flight execution, durable atomic snapshots and a Linux `flock` lock.
- Missed startup: one catch-up publication after the scheduled hour, not a burst of missed posts.
- `--bootstrap` publishes the first article immediately **only if the public index is empty**. That still consumes the date's one publication slot.
- Public `magazine.json` is authoritative for recovery; losing the private checkpoint does not republish the same date/slug.
- Thirty future drafts, the calendar and indexing state remain in a private volume, not in `public/`.

```sh
npm run blog-agent:validate
node --test scripts/tests/blog-agent.test.mjs
node scripts/blog-agent.mjs --publish --bootstrap --no-indexing # optional local first article
```

## Production deployment

The actual server uses `docker-compose.prod.yml` and `/home/ubuntu/vod`. Both compose variants include the agent without an opt-in profile. `Dockerfile` includes the editorial content; `Dockerfile.publishers` layers updated scripts/content over the built app image.

```sh
git lfs install
git lfs pull
npm ci
npm run blog-agent:validate
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml build blog-agent telegram-channel
docker compose -f docker-compose.prod.yml up -d app blog-agent telegram-channel
docker compose -f docker-compose.prod.yml exec blog-agent node scripts/blog-agent.mjs --publish --bootstrap
docker compose -f docker-compose.prod.yml logs --tail=60 blog-agent
docker compose -f docker-compose.prod.yml exec blog-agent node scripts/publisher-health.mjs /app/.media-cache/blog-agent/status.json
```

Do **not** reset a server checkout with live scraper changes. Preserve/archive dirty data, apply scoped code changes, or deploy from a separate clean release directory while reusing the data mounts. Do not run a second publisher against a different private volume sharing the same public directory; the shared lock/state are part of the deployment contract. Do not use `down -v` during an upgrade.

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `BLOG_ENABLED` | `1` in compose | Enables publication, not merely queue preparation |
| `BLOG_PUBLISH_HOUR` | `9` | Tehran hour, integer 0–23 |
| `BLOG_STATE_DIR` | `.media-cache/blog-agent` | Private persistent queue/checkpoint/key directory |
| `VOD_DATA_DIR` | `public/data` | Shared catalog and published article snapshot |
| `NEXT_PUBLIC_SITE_URL` | `https://sarvnema.ir` | Canonical host for discovery notifications |

Back up `public/data/magazine.json` and the `vod_blog_agent` volume together. Status includes published/queued counts, next slug, heartbeat, exhausted state and IndexNow errors. A heartbeat older than 20 minutes fails the container health check. Docker restarts an exited process; it does not automatically restart a merely unhealthy container, so monitor unhealthy status in your infrastructure alerts.

## SEO and discoverability

Pages are server-rendered, readable without a client-side content fetch, canonical and mobile-responsive. Published articles use truthful `BlogPosting`, breadcrumb and visible FAQ structured data. Topic hubs are noindex until they contain a published article. Only published article/hub URLs enter the sitemap. Covers are lightweight 1600×900 WebP images with alt text and dimensions. The homepage links to the magazine and latest published content.

- RSS: https://sarvnema.ir/mag/feed.xml
- Crawl rules: https://sarvnema.ir/robots.txt
- Sitemap parts: `/sitemap/0.xml`, `/sitemap/1.xml`, etc., as advertised in robots.txt.
- AI-readable optional index: https://sarvnema.ir/llms.txt
- IndexNow key: https://sarvnema.ir/indexnow-key.txt

The public key is not a password. The agent verifies the deployed key before submitting canonical URLs to IndexNow and retries errors at 15-minute intervals. HTTP 200/202 means the notification was received/queued, **not** that a URL was indexed or ranked. `llms.txt` is supplementary; it is not a requirement or a guarantee that ChatGPT, Gemini or Claude will cite the site.

Google Search Console and Bing Webmaster Tools need the site owner's account/verification. Submit the advertised sitemap parts there and inspect the first article after deployment. These account actions were not performed without credentials. Check crawler access, server errors, canonical consistency and useful original content; do not promise ranking or manufacture backlinks.

Primary technical references: [Google helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article), [IndexNow protocol](https://www.indexnow.org/documentation).

## Adding another month

1. Research a balanced plan across releases, cinema, series, music, festivals and shared experiences. Record original source URLs and dated observations for news.
2. Add complete UTF-8 manuscripts and unique stable slugs to the plan; never reuse an already published slug for a supposedly new article.
3. Keep the factual portion sourced and the analysis clearly identified. Review titles, hierarchy, accessibility, internal links and quotations.
4. Run the validation, tests and build before deploying the new queue. The agent skips already published slugs and continues the daily cadence.
5. Monitor archive cards: sources and downloads are selected from real catalog data, not hardcoded guesses. Music tags automatically regenerate through the daily music refresh.

The first-month keyword map is in [blog-editorial-calendar.md](blog-editorial-calendar.md). Image production is recorded in [blog-images.md](blog-images.md).
