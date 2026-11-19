# IMDb trailer refresh

Run `node scripts/refresh-imdb-trailers.mjs --limit=100`. The daily maintenance
scheduler also runs this as an independent four-minute job. Four minutes are
reallocated from the large video crawl so the total nightly budget stays at four
hours. Dashboard settings
upgrade without changing existing disabled sources, days or hours.

Selection prefers a real IMDb movie chart observation no older than seven days.
When that chart is unavailable, the fallback is explicitly labelled as recent
catalogue movies sorted by year and IMDb vote count, **not a current IMDb rank or
box-office ranking**. Series, fake IMDb IDs and speculative future-year filler
are excluded. A short candidate list is reported, never padded with unrelated titles.

The optional `IMDB_DATA_API_BASE` metadata service is health-checked once. If it is
unavailable, the worker reads the ordinary public IMDb title/video pages. It does
not bypass challenges, authentication, paywalls or rate limits. HTTP 202/401/403/429
opens the circuit; the remaining targets are reported as not attempted.

The mounted `public/data/imdb-trailers.json` sidecar merges into title details,
without rewriting the large catalogue or production's existing title files.
Signed playback URLs are checked for expiration; valid existing entries survive
upstream outages. Each report distinguishes selected targets, attempted titles,
playable URLs and reference-only metadata. It does **not** claim files were
downloaded or browser playback tested. No video binaries are downloaded by this
worker, and a stable IMDb page link is not counted as a playable trailer.

Title pages count only unexpired supported playback entries and provide a stable
external IMDb trailer/gallery link. Expired links no longer silently remove the
only way to reach the official trailer. The worker exits non-zero until the
requested playable quota is met; scheduled failures do not block the other sources.
