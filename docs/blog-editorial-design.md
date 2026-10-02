# SarvNema editorial revision

The supplied Digikala Mag article and Zoomg cinema-news page were inspected on 2026-10-03. Digikala required browser access; the web reader could not open it. Their breadcrumb/category hierarchy, visible byline/date/read time, concise opening, contextual reading suggestions and related-content pathways informed our own design. No article prose, celebrity quote, image, author identity or news claim was copied.

## Content and navigation

All 30 queued manuscripts retain their researched body and source list. `enrichEditorial` adds natural in-body links to works actually selected from the local film/series/music catalog. Only available catalog matches get media links. Category-appropriate existing browse lists, artists, nonempty tagged playlists, playback, downloads and shared-session routes are included. Stale IMDb charts remain excluded instead of being presented as current trends. The Telegram bot is `https://t.me/Sarvnema_bot`, not a guessed channel username.

Inline formatting supports a deliberately small `[label](destination)` grammar. React escapes text. Only local absolute paths and the exact bot URL become links; raw HTML, arbitrary external URLs, protocol-relative URLs and backslash/control-character redirects are not interpreted. Source links remain a separate cited-source section. Related article suggestions only use already published articles.

The layout has a breadcrumb trail, concise deck, publication and revision dates, share link, branded cover, readable text column, sticky desktop contents and mobile scrollable contents, contextual “read also” links and restrained bot introduction. No invented visitor counts, comments or ratings are displayed.

## Revising published articles safely

Normal scheduled publication does not silently rewrite existing articles. To apply an intentional editorial/cover revision, stop the daemon to release its lifetime kernel lock, run a one-shot worker, then restart it:

```sh
docker compose -f docker-compose.prod.yml stop blog-agent
docker compose -f docker-compose.prod.yml run --rm --no-deps blog-agent node scripts/blog-agent.mjs --publish --revise-published
docker compose -f docker-compose.prod.yml start blog-agent
```

This reads the server's own catalog and preserves the original `publishedAt`. Only changed content receives a new `modifiedAt`; revisions are idempotent. It does not publish the next queued article or use up another daily slot. Changed URLs return to the IndexNow queue. Do not upload a local `public/data/magazine.json` over the live server snapshot.

Branded asset prompts and locations: [blog-images.md](blog-images.md). Four theme covers are shared across the 30 articles. The scheduled one-article-per-day plan remains unchanged.
