# Search Console video structured-data fix

Prepared November 5, 2026. Production publication is intentionally left to
the site operator; a Git push alone does not update Search Console.

## Root causes

1. Music-video pages emitted `VideoObject.image`, but not `thumbnailUrl`.
   Google requires `name`, `thumbnailUrl` and `uploadDate`; `image` does not
   replace the video-specific thumbnail property.
2. The homepage's `WebPage.about` contained `{"@type":"VideoObject"}` as
   a topic. Google treated this empty object as another video, even though
   the homepage was not describing a specific playable video there.

Reference: [Google's VideoObject documentation](https://developers.google.com/search/docs/appearance/structured-data/video).

## Implementation

- Music videos use their existing real cover image(s) as absolute HTTP(S)
  `thumbnailUrl` values, with duplicates removed. Available stream sources
  take priority over download sources for `contentUrl`.
- The known publication date is preserved; archive arrivals/refresh times
  and guessed January 1 dates are not substituted for missing metadata.
- Video actions are `WatchAction`; audio tracks remain `MusicRecording`
  with `ListenAction`. Video artists are represented as creators.
- Missing required video metadata yields ordinary `WebPage` metadata,
  without an invalid `VideoObject`. No logo or generic placeholder is
  invented to pass validation.
- Film/series watch-page schema uses the same thumbnail/date safeguards.
  Title-page `Movie`/`TVSeries` metadata and page availability are unchanged.
- Landing `about` entries are named `Thing` topics, not empty instances of
  video, movie or music entities. There is no artificial homepage video.
- JSON-LD remains server-rendered and script-safe. No image requests or
  additional network calls run in the page-rendering path. Page design,
  playback and download behavior are unchanged.

## Coverage

The catalog check covered all 180 current music videos: all retain complete
video schema. All nine reported music IDs are covered by regression tests;
their real thumbnail URLs also returned HTTP 200 with `image/jpeg` during
the live availability check.

The production-build local HTML audit passed all ten reported URLs with
zero missing required video fields. The homepage correctly emitted no
topic-only video; each reported music page emitted one complete video.
The wider 40-test suite, scoped lint, TypeScript and production build passed.

```sh
node --import tsx --test scripts/tests/video-seo.test.ts scripts/tests/video-seo-catalog.test.ts
npx tsc --noEmit
npm run build
```

These are application/schema-field checks, not a claim of Google indexing,
a successful authenticated Search Console validation or guaranteed rich
results. Image accessibility from this machine is not proof of access from
all crawlers, regions or networks.

## After deployment

1. Build/restart the app using the normal production deployment process.
   No catalog data migration or new LFS assets are needed.
2. Purge stale HTML for `/`, `/music` and affected `/music/*` pages from any
   reverse-proxy/CDN cache, or wait for those responses to expire.
3. Inspect a reported music URL in the
   [Rich Results Test](https://search.google.com/test/rich-results). Verify
   that the video includes its actual thumbnail, name and publication date.
   On `/`, the empty video should disappear, not receive a fake thumbnail.
4. Use Search Console's live URL inspection to confirm Google receives the
   updated production HTML. Request a recrawl of representative URLs, then
   click **Validate fix** in the missing-`thumbnailUrl` report.
5. Allow Google to recrawl/reprocess the URLs. Historical errors will not
   disappear immediately, and video indexing is a separate report from
   structured-data validity.

Reported music IDs:

```text
roz-6a790afae23927
roz-d570ce5a2a334f
roz-c1df6976538d39
roz-8a06d6a86ea460
roz-e2371a46acf2e4
roz-37cde9c05f4a9f
roz-0b32594e32e815
roz-d6e23ad697aaa7
roz-8a8c4fa385e5c7
```
