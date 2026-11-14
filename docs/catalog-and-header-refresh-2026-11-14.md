# Catalog and desktop navigation refresh — 2026-11-14

## Shipped data

The bounded refresh inspected existing public source integrations (FamilyMovie,
Moviesho/ZardFilm, Meloobit, RozMusic and Musics-Fa). It is not a claim that every
page or every historical episode in these archives was rescanned.

| Change | Count |
| --- | ---: |
| Refreshed film/series profiles | 134 (50 films, 84 series) |
| Genuinely new film/series IDs | 49 |
| Existing profiles compared against the raw archive | 77 |
| File links added across new and existing profiles | 4,360 |
| Rotating publisher file signatures refreshed | 5,035 |
| Checked music records included | 91 |
| Genuinely new music records | 62 (61 audio, 1 video) |
| Existing music records enriched | 29 |
| Music artist profiles represented | 84 |

There are 9,959 film/series file links across this update. Its 3,105 distinct
season/episode slots include older episodes: these are **not** 3,105 new releases.
Music verification inspected file prefixes with bounded byte-range requests:
201/203 URLs answered with an audio/video signature. This checks more than an
HTTP status but is **not** a complete playback test of every file in every browser.

Seven ambiguous video identities (same name/year, different provider IDs) and four
conflicting old music artist attributions were held back rather than guessed.
The Musics-Fa parser now isolates the primary article, excluding sidebar artists,
related-post files and clearly labelled devotional listings according to the
existing source policy. Original recordings and remixes keep separate identities.

### Source limitations

- Public VOD: FamilyMovie inspected 87 recent pages; the listing advertised 550.
  One request timed out. Curated sources returned 59 usable title records, with one
  detail failure. Overlapping identities are reconciled conservatively.
- DonyayeSerial's live series feed was unreachable; its history was preserved, not
  represented as a successful full refresh.
- Several other existing sources timed out or exposed only application/search
  pages. fj-ios denied public crawling. No login/robots restriction was bypassed.
- Meloobit's public directory denied listing, but exact files supplied by its
  public title pages were checked individually. Dead/HTML responses are excluded.

## Deployment and archive safety

Two bounded release bundles live in `lib/data/media-refresh-2026-11-14-*.json`.
The catalog loaders apply them to both full and compact indexes at runtime. New
title pages, search results, artist profiles and sitemap entries use the same
loaders. **No manual data import is needed after a normal code deployment.**

Large mounted `public/data` archives and their Git LFS objects were not rewritten.
Original providers, biographies, trusted names, newer source checks and newer
signed URLs are preserved. Copyright-restricted titles remain restricted. New
checked sources remove a coming-soon state only when a full release exists.
FamilyMovie links refresh from a reviewed publisher page even if the original
profile's primary provider is DonyayeSerial.

The raw archive files can subsequently be rebuilt by existing scheduled jobs;
the bundled update is immutable, idempotent and cached by archive snapshot.
Signed links may expire, so their existing runtime publisher refresh still applies.

## Desktop header

`components/gradient-menu.module.css` scopes the new navigation to widths above
760px. The header overlays the full-bleed banner with a gradient fading to complete
transparency. It has clearer search, compact category/navigation links, separate
history/download controls, language selection and archive count. Smaller desktop
widths use two organized rows; mobile layout is unchanged. Keyboard focus,
RTL/LTR, active states and reduced-motion preferences are supported.

Real-browser QA also found an existing English-page hydration failure: Node
rendered "South Korea" while the browser's ICU rendered "Korea" in the country
selector. Discovery now shares pinned catalog country labels so this mismatch
cannot replace the landing tree or interrupt freshly opened header dialogs.

## Reproduce and verify

Raw source outputs, check reports and held-back records are under the ignored
`.media-cache/refresh-2026-11-14/` folder. The producer needs these source outputs;
it does not itself run the network scrapers:

```sh
node scripts/prepare-release-bundle.mjs --date=2026-11-14 --reuse-verified
node --import tsx --test scripts/tests/prepare-release-bundle.test.mjs scripts/tests/music-fa-primary.test.mjs scripts/tests/bundled-video-release.test.ts scripts/tests/bundled-music-release.test.ts scripts/tests/familymovie-release.test.ts
npm run build
npm start
```

Run `scripts/smoke-desktop-header-refresh.mjs` against the local server. It uses
Playwright (`PLAYWRIGHT_MODULE` may point to an installed module), defaults to
Edge (`PLAYWRIGHT_CHANNEL` is configurable), and accepts only a loopback
`LOAD_BASE_URL`. Screenshots go to `.media-cache/header-refresh/`.

Scrapers retain their normal default output locations. New optional environment
overrides allow a non-destructive isolated run:

- `MUSIC_SOURCE_CACHE_DIR`, `ROZMUSIC_CACHE_DIR`, `ROZMUSIC_OUTPUT`,
  `ROZMUSIC_STATUS_FILE` for RozMusic.
- `MUSICS_FA_OUTPUT`, `MUSICS_FA_STATUS_FILE` for Musics-Fa.
- Existing `MELOOBIT_STATE_DIR`, `MELOOBIT_STATUS_FILE` for Meloobit.

This change does not deploy production or change scheduler configuration.

## Verification result

- Production build and TypeScript: passed.
- Relevant archive, search, source-parser, bundle, publisher-refresh and SEO tests:
  94 passed, none failed.
- ESLint on changed implementation/test files: no errors or warnings.
- Real Edge/Chromium smoke: Persian and English at 761, 1024, 1280, 1440 and
  1920px; search/IMDb ordering and focus return; category/download/history dialogs;
  mobile search at 320, 390 and 760px; new video/music/artist detail routes and
  new music search. No browser JavaScript errors or horizontal overflow.
- No large archive/LFS files changed. Local server uses port 3004.
