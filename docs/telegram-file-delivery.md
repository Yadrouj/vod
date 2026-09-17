# Telegram file delivery and music downloads

> Direct movie/series delivery into Telegram is currently disabled. The bot's
> active flow is the website download gate: open the SarvNema link, wait for
> the five-second countdown, then follow the original download. This document
> keeps the old delivery implementation notes for a later opt-in; it is not
> started by `scripts/telegram-bot.mjs`.

## What changed

- In private Telegram chats, each film/episode/music download quality has a short website download button. The existing site and TXT options remain.
- The signed link opens SarvNema's five-second waiting page. Merely generating a link or fetching its HTML does not send a file. The page starts a server-timed wait, then queues that exact file for that exact chat.
- The worker uploads an actual document with title, year, IMDb rating, genre, quality/dubbing information, episode code when applicable, and the title's site link. It does not send a TXT file instead of the movie.
- Five seconds is the waiting period, **not a promise that a movie transfers in five seconds**, and not a video-watching requirement.
- Waiting, queued, sending, confirmed delivery and failure are distinct states. The site never says “sent” until Telegram confirms the upload.
- Music download gates now use the catalogue-backed same-origin relay with `Content-Disposition: attachment`. Playback still uses the original inline relay behavior. Existing audio links without a music id are resolved by exact source URL. Third-party dead/blocked links can still fail; use another quality/source. A manual download button remains for browsers that block automatic downloads, particularly embedded browsers.
- No changes to Bale file delivery; its website music download links benefit from the relay fix.

## Deploy the website AND the worker

```sh
git pull --rebase origin main
git lfs pull
docker compose -f docker-compose.prod.yml up -d --build app telegram-bot
docker compose -f docker-compose.prod.yml logs --tail=100 app telegram-bot
```

No new catalog data or LFS objects are part of this feature. Keep the server's existing data volumes. Queue records live in `data/telegram-deliveries/` (ignored by Git and Docker build context). The existing app `./data:/app/data` mount persists them across restarts; the worker accesses them through the authenticated site API, not a shared file mount. Run **one delivery worker** and one app instance, or use the same persistent filesystem for app replicas. Do not use separate ephemeral per-replica directories.

Both app and bot must have the **same** `BOT_API_TOKEN`. New delivery endpoints fail closed if it is missing. The bot needs `PUBLIC_APP_URL=https://sarvnema.ir` (the existing default also uses this domain). `BOT_SITE_URL` can remain the private Docker address, `http://vod-app:3000`; it is never put in delivery buttons. Restart the worker after changing environment settings. Old download buttons need to be reopened to get the new options.

## Large films require a local Telegram Bot API server

Telegram's hosted Bot API accepts multipart uploads up to **50 MB**; a self-hosted Bot API in local mode supports **2000 MB**. Sources: [official file-upload limits](https://core.telegram.org/bots/api#sending-files), [official local-server instructions](https://core.telegram.org/bots/api#using-a-local-bot-api-server), [official server repository](https://github.com/tdlib/telegram-bot-api).

Without local mode, small music/files work and larger films show a size-limit message with the original website-download alternative. The code does not silently claim those films were sent.

1. Provision the official `telegram-bot-api` server using your own Telegram API ID/hash, with `--local`. Give it persistent storage. Keep its HTTP port private on the Docker network/firewall; **never expose it publicly**.
2. Stop the old bot worker and drain in-flight deliveries. Follow Telegram's documented `logOut` migration from the cloud endpoint before starting local polling; do not poll cloud and local endpoints simultaneously.
3. Add these settings to the worker's `.env.local` (the compose file already reads it):

```dotenv
PUBLIC_APP_URL=https://sarvnema.ir
TELEGRAM_API_BASE_URL=http://telegram-bot-api:8081
TELEGRAM_LOCAL_API=1
```

`TELEGRAM_API_BASE_URL` is the server base, without `/bot<TOKEN>`. `TELEGRAM_LOCAL_API=1` alone does not lift the limit: a non-cloud API base is also required. Actual server local mode must be configured separately. Keep token/API hash out of Git, logs, screenshots and tickets.

4. Restart the bot and test a small file, then a larger file you are authorized to distribute. The worker downloads to temporary disk and streams multipart from that file; reserve **at least 2 GB of free temporary space per worker**, plus space for the local Bot API's own storage. One transfer runs at a time; navigation/polling remains responsive. Source download timeout: 8 minutes; upload timeout: 12 minutes. Files beyond 2000 MB still use website download.

## Reliability and privacy

- Signed one-hour capabilities bind recipient, original file and metadata. Do not log full download-gate query strings: they contain private bearer links. Configure nginx/CDN analytics to omit/redact `delivery` queries. The gate sends `Referrer-Policy: no-referrer` through page metadata.
- Server-side five-second enforcement; queue POSTs/reloads are idempotent. Disk-exclusive claims prevent duplicate uploads across workers.
- An interrupted/uncertain upload is **not** automatically retried because Telegram may already have accepted it. After 25 minutes, stale active claims become `delivery_unknown`. Check the chat before deliberately requesting a new link.
- Queue state is bounded to 500 retained jobs and three outstanding tickets per chat. The worker cleans records 24 hours after expiry. A crash during transfer may leave `sarvnema-telegram-*` in the worker's temporary directory: inspect and remove only stale directories when no transfers are running.
- The transfer downloader rejects private/link-local networks, pins DNS resolution, validates every redirect, enforces actual streamed byte limits, and rejects HTML error pages. IPv4-only source connections are intentional.
- No live bot messages or remote server deployment are performed by the automated tests. Fixtures contain only original test media.

## Checks and rollback

```sh
node --import tsx --test scripts/tests/file-delivery.test.ts scripts/tests/player-fullscreen.test.ts scripts/tests/bot-adapters.test.mjs
```

`scripts/smoke-download-delivery.mjs` tests the real five-second page and download event using a local server, a test-only bot token and an isolated `TELEGRAM_DELIVERY_DIR`. It never calls Telegram. The mobile panel smoke also checks 44×44 controls, no overflow, portrait spacing and fullscreen orientation requests at 320/390/430 px and landscape.

Rollback by deploying the previous app+worker image together after draining/stopping transfers. Preserve the queue folder for diagnosis; do not retry uncertain transfers without checking the receiving chat. No archive migration is needed.

Mobile orientation locking is best-effort: native fullscreen remains active if the browser rejects automatic rotation. See [browser support and fullscreen requirement](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock). On unsupported browsers the viewer must rotate the phone manually.
