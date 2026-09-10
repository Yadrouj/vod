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
