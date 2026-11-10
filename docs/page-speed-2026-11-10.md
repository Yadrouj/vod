# Page-loading optimization — 2026-11-10

## Changes

- Music landing playlist previews are server-rendered. The browser no longer
  receives every playlist's member IDs just to display cover links and counts.
  Full interactive collection pages remain unchanged.
- Category recommendations use one eligible-title pass with per-genre
  deduplication instead of rescanning the entire catalogue for each category.
  All categories and full counts remain available. Only the six preview cards
  actually rendered by the menu are serialized, rather than ten.
- Removed unused homepage featured-menu computation and payload.
- Weekly IMDb matching normalizes each catalogue title once and preserves
  exact title/year/type matching, IMDb-ID preference and link-count tie-breaks.
- Recently-updated discovery parses each timestamp once, not in every sort
  comparison. It retains original dates and future-date exclusion.
- Desktop and mobile search dialogs use an on-demand client chunk. Desktop
  pointer/focus intent warms the chunk before clicking.
- The next hero image is inserted only after the current artwork finishes or
  fails, preventing it competing with the lead image during initial loading.

## Measured local results

Same development server and archive, complete uncompressed HTML/RSC responses:

| Route | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| `/` | 930,175 bytes | 824,468 bytes | 11.4% |
| `/music` | 1,177,708 bytes | 706,582 bytes | 40.0% |

One-shot CPU comparison against the previous algorithms on the real local
catalogue: weekly selection 292 ms → 32 ms (same nine IDs); category candidate
grouping 1,700 ms → 51 ms. These are local microbenchmarks, not guarantees for
production latency or Core Web Vitals. Warm development response times varied
with compilation and do not support a reliable TTFB improvement claim.

Validation: category/discovery/performance regression tests, TypeScript, targeted
ESLint, HTTP 200 for both landing pages, mobile Edge search-dialog opening and
no horizontal viewport overflow at 390px. Production deployment is separate.
