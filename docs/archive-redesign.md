# Cinema archive

- `/browse` uses a scoped yellow cinema theme, compact collapsible filters, two-column mobile posters, persistent titles, year/type and IMDb score. Missing images fall back to a neutral placeholder, not another film's artwork.
- Server renders the first 40 compact cards. `/api/archive` fetches 40 more at a time near the bottom, with a manual button, timeout/retry and loading skeletons. Each numbered page is capped at 200 cards. Existing `browseVodIndex` consumers still default to 30.
- Filters remain in the URL; pagination resets the optional `batch` parameter. A noscript link requests increasing server-rendered batches, up to the same 200-card limit. Full no-JavaScript usability is not verified: the production browser check encountered a hidden fallback/link and a subsequent load timeout with scripting disabled; ordinary JavaScript-enabled browser checks pass.
- Search retains IMDb ordering and separate movie/series groups. Old-Iranian browsing retains its smaller dedicated index. This redesign does not modify catalog metadata or assert that old catalog matches are accurate.
- No entire catalog or full descriptions are sent to the browser; only visible-batch card metadata. Images are lazy-loaded, automatic detail-route prefetch is disabled, animations respect reduced motion, and route/filter/card navigation has feedback.
- Tests: `scripts/tests/archive.test.ts`, `scripts/smoke-archive.mjs`. Browser checks cover 320–1440px, filters, 40-to-200 loading, distinct cards, next-page navigation, invalid offsets and grouped search.
