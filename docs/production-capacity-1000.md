# زیرساخت پیشنهادی سرونما برای ۱۰۰۰ کاربر روزانه

این طراحی برای حدود ۱۰۰۰ کاربر فعال روزانه، ۵۰ تا ۱۰۰ کاربر هم‌زمان در ساعات اوج و چند ده اتصال هم‌زمان Watch Together در نظر گرفته شده است. شرط اصلی ظرفیت این است که بایت‌های فیلم از منبع فایل یا CDN مستقیماً به مرورگر برسند؛ سرور سرونما فقط صفحه، متادیتا، سرچ و پیام‌های همگام‌سازی را پاسخ می‌دهد.

## معماری اجراشده

```text
Browser
  ├── HTML / Search / Metadata ──> Nginx cache + rate limit ──> Next.js :3004
  ├── Watch Together websocket ───────────────────────────────> Socket.IO
  └── Video bytes ────────────────────────────────────────────> Source/CDN
```

- Nginx پاسخ‌های HTML عمومی را برای هر زبان پنج دقیقه کش می‌کند.
- درخواست‌های RSC مربوط به navigation کش نمی‌شوند تا state روتر Next.js خراب نشود.
- نتیجه Suggest و AI Search هم داخل process و هم روی Nginx کش می‌شود.
- مسیرهای scrape زیرنویس و لینک فصل rate limit و cache دارند تا منبع خارجی با هر بازدید دوباره فراخوانی نشود.
- `healthz/` برای liveness و `readyz/` برای readiness و مصرف حافظه در دسترس است.
- Watch Together روی یک realtime node اجرا می‌شود؛ این انتخاب برای این ظرفیت عمدی است تا state اتاق‌ها بین چند process گم نشود.
- سقف اتاق، تعداد مهمان، صف، payload و نرخ eventهای Socket.IO محدود شده است.
- فایل ۳۶۰ مگابایتی آرشیو منبع وارد image تولید نمی‌شود. runtime از `vod-home.json`، `vod-index.json` و فایل مستقل هر عنوان استفاده می‌کند.

## حداقل سرور پیشنهادی

- ۲ vCPU
- ۲ GB RAM
- ۲۰ GB SSD
- اتصال شبکه پایدار و ترجیحاً Cloudflare جلوی Nginx
- Ubuntu 24.04 یا هر میزبان سازگار با Docker

ویدئو نباید از این ماشین proxy شود. اگر بعداً فایل‌ها تحت مالکیت سرونما قرار گرفتند، آن‌ها را در Object Storage سازگار با S3/R2 قرار دهید و با CDN، Range Request و URL امضاشده تحویل دهید.

## استقرار

متغیرهای حساس را در shell یا فایل env خارج از Git قرار دهید:

```bash
export PUBLIC_APP_URL=https://sarvnema.ir
export BOT_API_TOKEN=replace-me
export TELEGRAM_BOT_TOKEN=replace-me
export TELEGRAM_BOT_USERNAME=Sarvnema_bot
docker compose -f docker-compose.production.yml up -d --build
```

بررسی سلامت:

```bash
curl -fsS http://127.0.0.1/healthz
curl -fsS http://127.0.0.1/readyz
```

پنل و API ادمین در Nginx عمومی بسته شده‌اند. برای archive sync از SSH tunnel، VPN یا یک hostname ادمین دارای احراز هویت استفاده شود.

## تست بار سبک

روی محیط staging یا production کنترل‌شده اجرا شود:

```bash
npm run load-smoke -- https://sarvnema.ir 300 20
```

خروجی شامل throughput، خطا، p50، p95 و p99 است. معیار پذیرش پیشنهادی برای این ظرفیت:

- نرخ خطای HTTP کمتر از ۱٪
- p95 سرچ کش‌شده کمتر از ۱۵۰ms در شبکه داخلی
- p95 HTML کش‌شده کمتر از ۲۰۰ms در لبه
- RSS اپ کمتر از ۱.۵GB
- reconnect موفق Socket.IO بعد از قطع کوتاه شبکه

## چه زمانی scale افقی لازم است؟

تا زمانی که مصرف CPU پایدار زیر ۶۰٪ است و تعداد اتصال Watch Together از چندصد اتصال هم‌زمان عبور نکرده، همین یک app node ساده‌تر و مطمئن‌تر است. برای مرحله بعد:

1. state اتاق‌ها به Redis با TTL منتقل شود.
2. Redis/Redis Streams adapter برای broadcast میان Socket.IO nodeها اضافه شود.
3. Load Balancer برای Socket.IO session affinity داشته باشد یا polling غیرفعال و WebSocket-only شود.
4. فایل‌های index از image جدا و در یک artifact/object store نسخه‌بندی شوند.
5. در صورت عبور کاتالوگ از چندصدهزار عنوان، سرچ به Meilisearch/OpenSearch یا Redis Search منتقل شود.

طبق مستندات رسمی Socket.IO، چند node علاوه بر load balancing به forwarding بین nodeها نیاز دارد و Redis adapter فقط packetها را با Pub/Sub پخش می‌کند؛ خود state اتاق را ذخیره نمی‌کند. به همین دلیل صرفاً اضافه‌کردن adapter بدون room store مشترک کافی نیست:

- https://socket.io/docs/v4/using-multiple-nodes/
- https://socket.io/docs/v4/redis-adapter/

برای Cache Components و CDN caching در Next.js 16:

- https://nextjs.org/docs/app/api-reference/functions/cacheLife
- https://nextjs.org/docs/app/guides/cdn-caching

## Watch Together Voice Lounge

Voice Lounge uses WebRTC peer-to-peer audio. Socket.IO only carries signaling and active-speaker state; voice bytes do not pass through the SarvNema application server. Audio tracks stay muted until the user holds the Push-to-Talk button.

- HTTPS is required outside localhost for microphone access.
- The default room limit is 10 voice participants (`WATCH_PARTY_MAX_VOICE_PARTICIPANTS`). Text chat and synchronized playback can still support the larger room limit.
- Public STUN is used as a fallback. Production should provide TURN credentials for mobile networks and restrictive NATs:

```bash
WATCH_PARTY_ICE_SERVERS='[{"urls":"stun:stun.example.com:3478"},{"urls":"turn:turn.example.com:3478","username":"sarvnema","credential":"replace-me"}]'
```

For consistently large voice rooms, replace the peer mesh with an SFU such as LiveKit or mediasoup. The current Push-to-Talk implementation is intentionally optimized for small social watch parties.
