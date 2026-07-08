# VOD Archive

Standalone Next.js VOD catalog running at the site root.

## Run

```bash
npm install
npm run dev
```

Default local URL:

```text
http://localhost:3004
```

## Data

- `public/data/vod-archive-imdb.json` contains the enriched catalog.
- DonyayeSerial links are matched by IMDb ID.
- IMDb metadata is enriched from IMDb's official non-commercial datasets.

IMDb datasets do not include poster/banner images. The app is ready to attach image URLs by IMDb ID from a licensed image provider or your own hosted assets.
