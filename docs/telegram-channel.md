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

For a local preview, leave `TELEGRAM_CHANNEL_ENABLED=0` and run
`npm run telegram-channel:preview`. JPG banners and caption/button JSON files are
saved under `.media-cache/telegram-channel` (or the configured directory).
Preview never advances delivery checkpoints. Initial publishing considers only
updates from the last seven days, so an old archive is not broadcast on setup.

Successful message IDs are saved after each send. A pending update is retained
when artwork/catalog fetching fails. Rate limits defer retries. If a send loses
its acknowledgement, its state is `uncertain` (or `sending` after a crash): inspect
the channel before manually resetting that one entry to `pending`. Automatic
retries cannot guarantee exactly-once delivery after an ambiguous Telegram error.
If the lock survives a crash, confirm its recorded PID is no longer running before
removing that specific `.lock` file. Do not remove the JSON state file.

No token is required to generate captions in unit tests. Production credentials
are loaded from `.env.local` or supplied by the process manager and never committed.
