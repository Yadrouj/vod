# Telegram services on a separate server

The site host (`ubuntu-one`, inside Iran) cannot reach `api.telegram.org`. The
bot and channel publisher therefore run on `62.83.32.47`, which can. All data
stays on the site host.

| Runs on `62.83.32.47` | Stays on `ubuntu-one` |
|---|---|
| `telegram-bot` (with the file delivery worker) | site and `/api/bot/*` |
| `telegram-channel` | catalogue JSON in `public/data` |
| | delivery queue in `data/telegram-deliveries` |
| | channel state in `data/telegram-channel` |

There is no database connection. From `62.83.32.47` only port 443 on `ubuntu-one`
is open, so everything goes through `https://sarvnema.ir` with the shared
`BOT_API_TOKEN`. The relay in `telegram-api-relay.md` is no longer used by these
services: leave `TELEGRAM_API_BASE_URL` unset here.

## Channel data

With `TELEGRAM_CHANNEL_REMOTE_DATA=1` the publisher uses:

- `GET /api/bot/channel/data/<name>`: `vod-updates`, `music-index`,
  `melodify-library`, `imdb-trending`. Gzipped, with an ETag, so unchanged files
  are not downloaded again.
- `GET` and `PUT /api/bot/channel/state?document=state|status`.

These routes refuse every request if the site has no `BOT_API_TOKEN`.

If an upload fails, state stays in `state.journal.json` in the `channel_state`
volume, and it takes priority over the site's copy until it uploads. Do not delete
that file while it exists: it may hold the only record of a post, and removing it
can cause a duplicate. If the site is unreachable at the start of a cycle, the
publisher skips that cycle.

Music files with a `melodify` source are read from the library folder on
`62.83.32.47`, mounted read-only.

## Deploy

From a checkout on your machine:

```bash
ssh ubuntu@62.83.32.47 'mkdir -p ~/vod-telegram'
git archive HEAD deploy/telegram lib/content-restrictions.mjs \
  scripts/telegram-bot.mjs scripts/telegram-channel.mjs scripts/telegram-file-delivery.mjs \
  scripts/telegram-mini-app.mjs scripts/bot-navigation.mjs scripts/atomic-json.mjs \
  scripts/lib/telegram-channel-audio.mjs scripts/lib/telegram-channel-remote.mjs \
  scripts/lib/telegram-publishing-schedule.mjs \
  | ssh ubuntu@62.83.32.47 'cd ~/vod-telegram && tar x && cp -r deploy/telegram/. . && rm -r deploy'
ssh ubuntu@62.83.32.47 'cd ~/vod-telegram && docker compose up -d --build'
```

`~/vod-telegram/.env` (mode 600, not in Git):

```bash
BOT_API_TOKEN=            # same value as the site host
BOT_SITE_URL=https://sarvnema.ir
NEXT_PUBLIC_SITE_URL=https://sarvnema.ir
TELEGRAM_BOT_USERNAME=Sarvnema_bot
TELEGRAM_CHANNEL_ID=@sarvnema
TELEGRAM_CHANNEL_ENABLED=1
```

Telegram allows one long-polling consumer per token. Stop any other bot container
before starting this one, or both will get `409 Conflict`.
