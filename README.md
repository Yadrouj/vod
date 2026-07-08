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

## Harvester

Run the full scraper/enricher:

```bash
npm run harvest-vod
```

HTML-only ripper, no API, no external metadata:

```bash
npm run rip-html
```

That writes whatever exists inside the archive HTML into:

```text
public/data/vod-catalog.json
```

Best-effort IMDb image scraper:

```powershell
$env:IMDB_LIMIT="10"
npm run scrape-imdb-images
```

It reads `public/data/vod-catalog.json`, tries IMDb title/media pages by IMDb ID,
downloads visible image URLs into `public/media/imdb/`, and writes local image
paths back to the catalog. It does not bypass IMDb WAF, login, CAPTCHA, or
other access controls.

Private IMDb data API enrichment:

```powershell
$env:IMDB_API_LIMIT="100"
npm run enrich-vod-api
```

Full run:

```powershell
npm run enrich-vod-api
```

Default API base:

```text
http://185.203.118.87:8026
```

With poster/backdrop enrichment:

```powershell
$env:TMDB_API_KEY="your_tmdb_key"
npm run harvest-vod
```

The final site file is:

```text
public/data/vod-catalog.json
```

IMDb datasets do not include poster/banner images. `TMDB_API_KEY` lets the harvester attach poster, backdrop, logo, overview, country, language, and tagline data by IMDb ID.
