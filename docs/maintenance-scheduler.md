# زمان‌بند کم‌فشار کاتالوگ

سرویس `maintenance` همهٔ منابع فعال فیلم، سریال، موسیقی، انتشارهای جدید IMDb و خبرهای سایت را روزی یک‌بار بررسی می‌کند. این سرویس فقط در پنجرهٔ کم‌ترافیک اجرا می‌شود و پیش از شروع، وضعیت `readyz` اپ را می‌سنجد:

- تعداد درخواست‌های پنج دقیقهٔ اخیر
- تعداد اتاق‌های فعال Watch/Listen Together
- حافظهٔ مصرف‌شدهٔ Node
- میانگین بار سیستم

اگر هر معیار از حد مجاز بالاتر باشد، هیچ scrapeای انجام نمی‌شود و زمان‌بند پانزده دقیقهٔ بعد دوباره بررسی می‌کند. قفل فایل مانع اجرای هم‌زمان و خراب‌شدن کاتالوگ است.

## منابع روزانه

- DonyayeSerial، feed قسمت‌های جدید، F2MY، Moviesho، دسته‌های منتخب ZardFilm
- جست‌وجوی بازه‌دار IMDb برای فیلم و سریال‌های منتشرشده؛ موارد بدون فایل با وضعیت `coming-soon` وارد بخش به‌روزرسانی می‌شوند
- RozMusic، Musics-Fa و ریمیکس‌ها، WorldOfMusic، RemiixBaz، مجموعه‌های قدیمی فارسی و Aftab foreign music
- خبرهای VOD و ساخت دوبارهٔ indexهای کم‌حجم صفحهٔ اول و جست‌وجو

اجرای روزانه incremental است: صفحه‌های تازه و موارد تغییرکرده را با یک درخواست در ثانیه بررسی می‌کند؛ داده‌های تاریخچه پاک نمی‌شوند. اجرای کامل historical فقط باید دستی و در زمان نگهداری انجام شود.

## Docker (روش پیشنهادی)

`docker-compose.prod.yml` و `docker-compose.production.yml` اکنون سرویس `maintenance` را دارند. پس از deploy معمول کافی است:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f maintenance
```

تنظیمات پیش‌فرض: ساعت ۲ تا ۶ بامداد تهران، حداکثر ۱۲ درخواست در پنج دقیقه و حداکثر یک اتاق فعال. در `.env.local` سرور می‌توان تغییرشان داد:

```bash
MAINTENANCE_TIME_ZONE=Asia/Tehran
MAINTENANCE_IDLE_START_HOUR=2
MAINTENANCE_IDLE_END_HOUR=6
MAINTENANCE_POLL_MS=900000
MAINTENANCE_MAX_RECENT_REQUESTS=12
MAINTENANCE_MAX_ACTIVE_ROOMS=1
MAINTENANCE_MAX_MEMORY_MB=1350
MAINTENANCE_MAX_LOAD_AVG=1.25
CURATED_VOD_CONCURRENCY=1
CURATED_VOD_REQUEST_GAP_MS=1000
MUSIC_REFRESH_REQUEST_GAP_MS=1200
MUSIC_PULSE_INTERVAL_MS=14400000
MUSIC_PULSE_ALLOW_OUTSIDE_IDLE=0
VOD_SERIES_EXPAND_CONCURRENCY=1
VOD_SERIES_EXPAND_CHANGED_LIMIT=100
VOD_SYNC_METADATA_INTERVAL_MS=604800000
```

## Cron میزبان (جایگزین Docker service)

اگر نمی‌خواهید سرویس `maintenance` در Compose فعال باشد، محتوای [sarvnema-maintenance.cron](../infra/cron/sarvnema-maintenance.cron) را با `crontab -e` روی سرور نصب کنید. از هر دو روش هم‌زمان استفاده نکنید.

## اجرای دستی

```bash
# اجرای اجباری بدون انتظار برای ساعت کم‌ترافیک؛ مناسب اجرای کنترل‌شدهٔ مدیر
npm run maintenance-now

# یک بازبینی کامل history موسیقی هم اضافه می‌کند؛ ممکن است چند ساعت زمان ببرد
npm run maintenance-full-now

# بازبینی موسیقی بدون VOD
npm run daily-music-refresh

# بازبینی سبکِ صفحه‌های تازهٔ آهنگ، ریمیکس و موزیک‌ویدئو؛
# این همان چرخه‌ای است که سرویس maintenance بین refreshهای روزانه اجرا می‌کند.
npm run music-pulse-now

# full historical music scan — فقط در پنجرهٔ نگهداری، زمان‌بر است
node scripts/daily-music-refresh.mjs --full
```

وضعیت آخرین چرخه در `data/maintenance-scheduler-status.json` و وضعیت جزءبه‌جزء موسیقی در `data/daily-music-refresh-status.json` ثبت می‌شود.
