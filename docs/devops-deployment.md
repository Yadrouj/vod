# راهنمای دواپس انتشار SarvNema

این runbook برای استقرار نسخه‌های جدید سایت، کاتالوگ‌های بزرگ Git LFS، workerهای اسکریپر و بات‌های Telegram/Bale نوشته شده است. آخرین تغییرات بات در کامیت `65c5789` روی `origin/main` قرار دارد.

## معماری production

فایل اصلی استقرار کامل `docker-compose.production.yml` است:

```text
nginx:80 → app:3004
                 └── public/data و data از host به‌صورت bind mount
maintenance → هر روز ۰۳:۰۰ تا قبل از ۰۷:۰۰ Asia/Tehran
```

`docker-compose.prod.yml` نسخهٔ قدیمی‌تر برای سروری است که Nginx زیرساختی و network خارجی `infrastructure_default` از قبل دارد. روی سرور معمولی که Nginx همین پروژه را اجرا می‌کند، از `docker-compose.production.yml` استفاده کنید؛ هر دو فایل را هم‌زمان بالا نیاورید.

فیلم و آهنگ روی این سرور proxy یا ذخیره نمی‌شوند. سایت متادیتا و لینک را ارائه می‌کند و دانلود بعد از گیت پنج‌ثانیه‌ای `/download/continue` به منبع اصلی منتقل می‌شود.

## پیش‌نیاز

- Ubuntu 22.04/24.04 یا Linux سازگار
- Docker Engine و Docker Compose v2
- Git و Git LFS
- حداقل ۲ vCPU، ۴GB RAM و فضای کافی برای checkout و cache
- دامنه و TLS در CDN یا reverse proxy

نصب LFS روی Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y git-lfs
git lfs install
```

## دریافت کد و LFS

```bash
sudo mkdir -p /srv/sarvnema
sudo chown -R "$USER":"$USER" /srv/sarvnema
git clone https://github.com/Yadrouj/vod.git /srv/sarvnema/vod
cd /srv/sarvnema/vod
git lfs pull origin main
git lfs checkout
```

فایل‌های زیر با LFS ردیابی می‌شوند و باید پیش از build واقعاً دانلود شده باشند:

```text
public/data/vod-catalog.json
public/data/vod-people.json
public/media/**
```

صحت checkout را بررسی کنید:

```bash
git lfs ls-files
git check-attr filter -- public/data/vod-catalog.json public/data/vod-people.json
head -c 120 public/data/vod-catalog.json
```

خروجی `head` نباید با `version https://git-lfs.github.com/spec/v1` شروع شود؛ آن حالت یعنی فقط pointer دانلود شده و deploy نباید ادامه پیدا کند.

## Secretها و environment

فایل secret را خارج از Git بسازید:

```bash
sudo install -d -m 750 /etc/sarvnema
sudo nano /etc/sarvnema/production.env
sudo chmod 600 /etc/sarvnema/production.env
```

نمونهٔ حداقلی:

```dotenv
PUBLIC_APP_URL=https://sarvnema.ir
BOT_SITE_URL=https://sarvnema.ir
BOT_API_TOKEN=توکن-احراز-API-بات
SARVNEMA_ADMIN_TOKEN=توکن-ادمین
TELEGRAM_BOT_TOKEN=توکن-تلگرام
BALE_BOT_TOKEN=توکن-بله
BALE_API_BASE_URL=https://tapi.bale.ai
MAINTENANCE_TIME_ZONE=Asia/Tehran
MAINTENANCE_IDLE_START_HOUR=3
MAINTENANCE_IDLE_END_HOUR=7
MAINTENANCE_POLL_MS=900000
```

توکن‌ها را در compose، log، GitHub Actions output یا پیام خطا چاپ نکنید. API بات وقتی `BOT_API_TOKEN` تنظیم باشد هدر `x-bot-token` یا `Authorization: Bearer` را الزام می‌کند.

در پیاده‌سازی فعلی، `scripts/telegram-bot.mjs` مقدار `BOT_API_TOKEN` را هم برای Telegram و هم برای احراز API سایت مصرف می‌کند؛ بنابراین این مقدار باید توکن بات تلگرام باشد و همان مقدار در API سایت پذیرفته شود. `TELEGRAM_BOT_TOKEN` موجود در compose قدیمی برای سازگاری تنظیمات قبلی است و جایگزین `BOT_API_TOKEN` در worker فعلی نیست. worker بله از `BALE_BOT_TOKEN` برای Bale و از `BOT_API_TOKEN` برای API سایت استفاده می‌کند.

## استقرار نسخهٔ جدید

قبل از deploy از دادهٔ runtime پشتیبان بگیرید؛ این پوشه‌ها bind mount هستند:

```bash
cd /srv/sarvnema/vod
sudo mkdir -p /var/backups/sarvnema
sudo rsync -a --delete public/data/ /var/backups/sarvnema/public-data-latest/
sudo rsync -a --delete data/ /var/backups/sarvnema/data-latest/
```

سپس کد و LFS را به‌روزرسانی کنید:

```bash
git fetch origin
git pull --rebase origin main
git lfs pull origin main
git lfs checkout
git log -1 --oneline
```

نسخهٔ فعلی باید حداقل `65c5789 Add Bale bot and expand bot catalog flows` یا commit جدیدتر باشد. اگر rebase conflict دارد، deploy را متوقف کنید؛ روی سرور `git reset --hard` اجرا نکنید.

بالا آوردن stack:

```bash
docker compose --env-file /etc/sarvnema/production.env -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=100 app
docker compose -f docker-compose.production.yml logs --tail=100 maintenance
```

## smoke test بعد از deploy

```bash
curl -fsS https://sarvnema.ir/healthz
curl -fsS https://sarvnema.ir/readyz
curl -fsS -H "x-bot-token: $BOT_API_TOKEN" "https://sarvnema.ir/api/bot/filters"
curl -fsS -H "x-bot-token: $BOT_API_TOKEN" "https://sarvnema.ir/api/bot/search?section=old-iranian-films&limit=2"
curl -fsS -H "x-bot-token: $BOT_API_TOKEN" "https://sarvnema.ir/api/bot/title/tt0903747?season=1&includeDownloads=1&maxFiles=2"
```

در پاسخ آرشیو قدیمی باید حدود ۹۰۱ عنوان دیده شود. URL فایل در پاسخ بات باید شامل `/download/continue` باشد؛ وجود مستقیم URL آرشیو regression است.

## اجرای workerهای بات

بات‌ها در compose فعلی سرویس مستقل ندارند؛ آن‌ها را به‌عنوان process دائمی جدا اجرا کنید. روی host با Node 22:

```bash
cd /srv/sarvnema/vod
npm ci --omit=dev
set -a; . /etc/sarvnema/production.env; set +a
node scripts/telegram-bot.mjs
node scripts/bale-bot.mjs
```

برای production از systemd، Supervisor یا process manager استفاده کنید. نمونهٔ unit تلگرام:

```ini
[Unit]
Description=SarvNema Telegram bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/srv/sarvnema/vod
EnvironmentFile=/etc/sarvnema/production.env
ExecStart=/usr/bin/node scripts/telegram-bot.mjs
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

برای بله همین unit را با نام `sarvnema-bale.service` و `ExecStart=/usr/bin/node scripts/bale-bot.mjs` بسازید:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sarvnema-telegram.service sarvnema-bale.service
sudo systemctl status sarvnema-telegram.service sarvnema-bale.service
journalctl -u sarvnema-telegram.service -n 100 --no-pager
journalctl -u sarvnema-bale.service -n 100 --no-pager
```

## maintenance و اسکریپرها

سرویس `maintenance` هر ۱۵ دقیقه بررسی می‌کند و فقط در پنجرهٔ **۰۳:۰۰ تا قبل از ۰۷:۰۰ Asia/Tehran** تریگر روزانه را فعال می‌کند:

```bash
docker compose -f docker-compose.production.yml logs --tail=200 maintenance
docker compose -f docker-compose.production.yml exec maintenance node scripts/maintenance-scheduler.mjs --check
cat data/maintenance-scheduler-status.json
cat data/maintenance-scheduler-state.json
```

اجرای دستی فقط برای عملیات کنترل‌شده است:

```bash
docker compose -f docker-compose.production.yml exec maintenance node scripts/maintenance-scheduler.mjs --force
```

هم‌زمان daemon و cron را فعال نکنید. جزئیات سقف CPU/RAM و checkpoint در [`docs/maintenance-scheduler.md`](./maintenance-scheduler.md) است.

## rollback

اگر smoke test یا health check شکست خورد:

```bash
cd /srv/sarvnema/vod
git log --oneline -10
git show --stat 65c5789
```

یک commit سالم را انتخاب کنید و image را دوباره بسازید:

```bash
git fetch origin
git checkout <KNOWN_GOOD_COMMIT>
git lfs pull
docker compose -f docker-compose.production.yml up -d --build
```

دادهٔ runtime را فقط در صورت خرابی خود داده restore کنید؛ rollback کد به‌تنهایی نباید `public/data` یا `data` را حذف کند. برای برگشت به main:

```bash
git checkout main
git pull --rebase origin main
git lfs pull
```

## نگهداری و هشدارها

- حجم Docker، فضای `/var/backups/sarvnema` و volume `vod_imdb_cache` را پایش کنید.
- logهای Docker و systemd را با retention محدود کنید.
- `public/data` شامل snapshotهای بزرگ است؛ آن را در CDN عمومی جداگانه منتشر نکنید مگر cache و دسترسی مشخص داشته باشید.
- پنل `/api/admin/` در Nginx عمومی نیست؛ عملیات ادمین از VPN/SSH tunnel یا hostname احراز‌شده انجام شود.
- کلید LFS، bot token، `SARVNEMA_ADMIN_TOKEN` و URLهای منبع خصوصی نباید در issue، screenshot یا log ثبت شوند.

## منابع مرتبط

- [راهنمای بات‌های Telegram و Bale](./bot-platforms.md)
- [قرارداد API بات](./telegram-bot-api.md)
- [زمان‌بندی اسکریپرها](./maintenance-scheduler.md)
- [ظرفیت و معماری production](./production-capacity-1000.md)
