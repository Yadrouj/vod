# Episode artwork

Series artwork is audited in IMDb order using the catalog's `imdbRating` and
`imdbVotes` fields. The audit uses the IMDb ID to resolve a show in TVMaze and
stores one image URL per season/episode in `public/data/episode-metadata`.

Run a bounded local check with:

```bash
npm run audit-series-episode-images -- --limit=50 --concurrency=4
```

Run or resume the complete queue with:

```bash
npm run audit-series-episode-images:all -- --resume
```

The generated `public/data/episode-metadata/index.json` report is ignored by
Git and is safe to regenerate. Titles without an IMDb ID are reported as
`unsupported`; temporary provider failures remain `unavailable` and can be
retried in the next run. The maintenance scheduler runs the resumable queue in
the configured daily window.

## Customizing an episode image

Edit `public/data/episode-artwork-overrides.json`. Use either `1:2` or `S01E02`
as the episode key:

```json
{
  "tt0903747": {
    "1:1": {
      "imageUrl": "https://cdn.example.com/breaking-bad-s01e01.jpg",
      "imageAlt": "Custom artwork for Breaking Bad season 1 episode 1",
      "imagePosition": "50% 30%",
      "imageFit": "cover"
    }
  }
}
```

`imageFit` accepts `cover` or `contain`. If a provider image is missing, the
episode card uses the series backdrop/poster as a safe fallback, while keeping
the episode's season and number unchanged.

## Serving stills from this server

Pages never point visitors at `static.tvmaze.com`. Every TVMaze still is
presented as `/api/episode-image/<imdbId>/<season>/<episode>`, which serves the
image from the `vod_episode_images` volume (`/app/.media-cache/episode-images`,
overridable with `EPISODE_IMAGE_DIR`) and downloads it once on the first
request. A visitor whose network cannot reach TVMaze previously saw the series
poster repeated on every episode; now each episode keeps its own still, and a
download that genuinely fails falls back to that episode's generated artwork
rather than the shared poster.

Only `https://static.tvmaze.com` is mirrored, the stored bytes must carry an
image signature, and each file is capped at 2 MB. Saved snapshots in
`public/data/episode-metadata` keep the original TVMaze URL: the rewrite happens
only when a page is served, because the image route needs that URL to fill the
store. Custom artwork from `episode-artwork-overrides.json` is served from its
own URL and is never mirrored.

Fill the store for the whole catalog (resumable, skips stills already stored):

```bash
npm run cache-episode-images
npm run cache-episode-images -- --only=tt0903747 --concurrency=4 --delay-ms=150
```

At roughly 8 KB per still, the full catalog is well under 1 GB. The script
honours `MAINTENANCE_DEADLINE`, so it can run inside the nightly window.
