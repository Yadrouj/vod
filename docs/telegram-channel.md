# Automatic posts for @sarvnema

The publisher watches `public/data/vod-updates.json` and music catalog changes.
It posts a 1280×720 artwork banner, informal Persian caption, and separate
quality/dub/sub download buttons. Buttons use the website's five-second download
page. Episode posts only include files for the announced season/episode.

Add the existing Telegram bot as an administrator of **@sarvnema** with permission
to post. Enable native reactions in the channel's Telegram settings; these are
Telegram's real reaction counts, not invented like counters in the caption.

Configure the server's environment:

```dotenv
BOT_API_TOKEN=<existing bot token>
BOT_SITE_URL=http://127.0.0.1:3004
NEXT_PUBLIC_SITE_URL=https://sarvnema.ir
TELEGRAM_CHANNEL_ID=@sarvnema
TELEGRAM_CHANNEL_ENABLED=1
TELEGRAM_CHANNEL_BATCH_SIZE=5
TELEGRAM_CHANNEL_STATE_DIR=/var/lib/sarvnema/telegram-channel
```

The state directory must be writable and persistent across deployments. Keep one
publisher instance. Run `npm run telegram-channel` under the same process manager
used for the existing bot; it checks updates every five minutes. It is separate
from the bot's update polling and does not change its webhook or consume updates.
Keep the existing daily scraper schedule running to supply fresh catalog data.

## Docker service

Both Compose files now include a `telegram-channel` service behind the `channel`
profile. It shares the live catalog read-only and keeps delivery checkpoints in
the `vod_telegram_channel` volume. It restarts with Docker and checks every five
minutes. The ordinary bot remains a separate process. Start only one publisher.

On the existing infrastructure host (`/home/ubuntu/vod`), first update the checkout
and rebuild the application image using the normal deployment procedure. Then:

```bash
docker compose --env-file .env.local -f docker-compose.prod.yml up -d telegram-channel
docker compose --env-file .env.local -f docker-compose.prod.yml logs --tail=50 telegram-channel
```

For the standalone stack:

```bash
docker compose --env-file /etc/sarvnema/production.env -f docker-compose.production.yml up -d telegram-channel
docker compose --env-file /etc/sarvnema/production.env -f docker-compose.production.yml logs --tail=50 telegram-channel
```

Set `TELEGRAM_CHANNEL_ENABLED=1` in that environment file. Inside Docker, the state
path is fixed to the persistent volume and the catalog API uses the internal app
address. Do not run a second publisher on a laptop while the server is publishing.
Preserve this volume during deployments and backups; do not use `down -v`.

## Channel branding and discovery

The channel uses the public handle **@sarvnema** and numeric ID
`-1004367173542`. Its name is **سرونما | دانلود فیلم و سریال، موسیقی | SarvNema**.
The 197-character About explains Iranian/foreign films, series, animation,
music, Persian dubbing/subtitles and online/shared viewing, with site and bot links.
The 1024×1024 avatar uses the existing cypress/play mark with gold and evergreen
colours. Its editable source is `public/brand/sarvnema-telegram.svg`.

```bash
# Render a local avatar and profile preview; no Telegram mutation.
npm run telegram-channel:profile
# Apply the title, About and photo; publish/pin the welcome guide once.
npm run telegram-channel:profile -- --apply --welcome
```

This needs the bot's `can_change_info`, `can_post_messages` and
`can_edit_messages` channel permissions. The script saves the previous profile
and welcome message ID in the configured state directory. Keep that state when
rerunning, so the guide is not posted again. The current guide is
[t.me/sarvnema/4](https://t.me/sarvnema/4); do not run `--welcome` on a fresh server
state if this guide already exists.

Automatic captions use a small set of relevant hashtags: the brand, media type,
and available Persian/original title (for example `#سریال #Breaking_Bad`). The
channel title and About use natural phrases instead of repeating search terms.
Telegram supports [public channel discovery](https://telegram.org/faq_channels)
and [public post text/hashtag search](https://core.telegram.org/method/channels.searchPosts).
These changes make the content identifiable; they do not guarantee search rank.

**Reactions:** channel reactions currently need enabling in Telegram itself:
channel → Edit/Manage Channel → Reactions. Suggested choices: ❤️ 👍 🔥 👏.
The [Bot API](https://core.telegram.org/bots/api) can inspect allowed reactions,
but does not expose a method to change the channel's allowed set.

For a local preview, leave `TELEGRAM_CHANNEL_ENABLED=0` and run
`npm run telegram-channel:preview`. JPG banners and caption/button JSON files are
saved under `.media-cache/telegram-channel` (or the configured directory).
Preview never advances delivery checkpoints. Initial publishing considers only
updates from the last seven days. That starting boundary is persisted so the
second and subsequent cycles do not suddenly broadcast older archive entries.
Future-dated and undated film/series events are excluded.

Successful message IDs are saved after each send. A pending update is retained
when artwork/catalog fetching fails. Rate limits defer retries. If a send loses
its acknowledgement, its state is `uncertain` (or `sending` after a crash): inspect
the channel before manually resetting that one entry to `pending`. Automatic
retries cannot guarantee exactly-once delivery after an ambiguous Telegram error.
If the lock survives a crash, confirm its recorded PID is no longer running before
removing that specific `.lock` file. Do not remove the JSON state file.

No token is required to generate captions in unit tests. Production credentials
are loaded from `.env.local` or supplied by the process manager and never committed.
