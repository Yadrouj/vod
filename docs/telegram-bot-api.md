# Telegram Bot API Layer

These routes are ready for a Telegram bot to call later. They are open in local development. If `BOT_API_TOKEN` is set, send either `Authorization: Bearer <token>` or `x-bot-token: <token>`.

Base URL locally:

```text
http://localhost:3004
```

## Endpoints

```text
GET /api/bot
GET /api/bot/filters
GET /api/bot/search
GET /api/bot/title/:imdbCode
GET /api/bot/music
```

## Filters And Menus

```text
GET /api/bot/filters
```

Returns menu-ready values for movies, series, genres, countries, languages, years, qualities, and IMDb score presets.

## Search

```text
GET /api/bot/search?q=break
GET /api/bot/search?type=series&genre=Crime&minImdb=8
GET /api/bot/search?type=movie&yearFrom=2020&country=United%20States
```

Supported query params:

```text
q, type, genre, country, language, year, yearFrom, yearTo, quality, minImdb, maxImdb, page, limit, sort
```

Types are `movie`, `series`, or `all`. Sort can be `relevance`, `rating`, `year`, or `title`. The response includes `telegram.text` and `telegram.buttons` for each result.

## Music

```text
GET /api/bot/music?mode=filters
GET /api/bot/music?q=ابی&kind=track&limit=10
GET /api/bot/music?kind=video&category=موزیک%20ویدیو
GET /api/bot/music?id=classic-7c557a96fb6886
```

Music results are paginated in the same shape as VOD results. The item endpoint returns the SarvNema page, original source page, and all available stream/download URLs so Telegram can show the original links and generate a text-file list for the user.

## Title Detail

```text
GET /api/bot/title/tt0903747
GET /api/bot/title/tt0903747?season=1
GET /api/bot/title/tt0468569?includeDownloads=1
```

Movie details include compact metadata and file links. Series details include seasons first; when `season` is sent, the response expands that season into episodes and quality/file buttons.
