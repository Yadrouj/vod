# به‌روزرسانی خودکار شبانه

## زمان و اجرا

پس از یک بار انتشار این نسخه، سرویس `maintenance` در هر دو فایل Compose همراه سایت بالا می‌آید؛ برای خبر یا فیلم و آهنگ جدید نیازی به build، restart یا deploy روزانه نیست.

- بازه دقیق: **۰۲:۰۰ تا قبل از ۰۵:۰۰ به وقت Asia/Tehran**، مستقل از ساعت محلی میزبان.
- هر ۱۵ دقیقه بررسی؛ فقط وقتی سایت آماده و کم‌ترافیک است.
- کارها پشت‌سرهم، نه موازی؛ محدودیت CPU برابر ۰٫۷۵ هسته و حافظهٔ worker برابر ۳GB.
- Health Checkها جزو ترافیک نیستند؛ فقط اتاق دارای کاربر متصل شمرده می‌شود.
- هر کار بودجه زمانی دارد. در پایان بودجه/ساعت ۵، درخت پردازش متوقف می‌شود؛ نتیجه «partial» است، نه موفقیت ساختگی.
- موفقیت هر کار و مراحل موسیقی/فیلم برای همان روز checkpoint می‌شود. خرابی یک منبع مانع منابع مستقل بعدی نیست. مراحل ساخت index در retry دوباره اجرا می‌شوند.
- اگر همه شب سایت شلوغ باشد، هیچ تضمینی برای انجام همه کارها نیست؛ وضعیت انتظار/ناتمام ثبت می‌شود و در پنجرهٔ بعدی تلاش می‌شود.

## منابع و مراحل

| کار مستقل | منابع / خروجی | سقف زمان |
|---|---|---|
| خبر | IMDb و RSS خبری فارسی/انگلیسی؛ تاریخ واقعی خبر، حفظ داده قبلی هنگام شکست | ۵ دقیقه |
| ترند IMDb | کش فهرست محبوبیت | ۸ دقیقه |
| کاتالوگ فیلم | DonyayeSerial، خوراک قسمت‌ها، Moviesho و منابع منتخب | ۴۵ دقیقه |
| F2MY | صفحات تازهٔ فیلم/سریال با یک worker و سقف ۸۰ جزئیات | ۲۵ دقیقه |
| منابع منتخب مستقل | Moviesho و ZardFilm؛ ادغام و ساخت صفحات حتی اگر DonyayeSerial قطع باشد | ۱۵ دقیقه |
| تغییرات انتشار | تطبیق کاتالوگ و تاریخ انتشار IMDb | ۵ دقیقه |
| موسیقی | RozMusic، Musics-Fa، Remix، WorldOfMusic، Persian Classics/Sevil Habib، RemiixBaz، Aftab؛ سپس index آهنگ/هنرمند/لندینگ | ۷۵ دقیقه |

این زمان‌بندی برای اسکریپرهای فعال موجود است، نه هر منبعی که قبلاً نامش در گفتگو آمده. برای UPtv اسکریپر مستقل قابل‌اجرا در این مخزن پیدا نشد. اسکریپت قدیمی MihanDownload به یک پوشهٔ تاریخ‌دار ثابت اشاره دارد و ابزار old-iranian از فهرست ثابت نام‌ها پروفایل می‌سازد؛ این دو ابزار تاریخی عمداً به عنوان کشف «تازه‌های روزانه» معرفی نشده‌اند. افزودن منبع جدید نیازمند adapter و تست همان منبع است.

اسکن شبانه incremental و محدود به صفحات تازه است؛ اسکن همه صفحات تاریخی هر شب نه لازم است و نه با محدودیت فشار/سه ساعت سازگار است. فایل ویدئو/صوت دانلود نمی‌شود؛ لینک و متادیتا وارد کاتالوگ می‌شود.

## راه‌اندازی پیشنهادی روی سرور

```bash
cd /home/ubuntu/vod
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs --tail=100 maintenance
docker compose -f docker-compose.prod.yml exec maintenance node scripts/maintenance-scheduler.mjs --check
```

`--check` فقط ساعت، آستانه‌ها و سلامت را می‌خواند و اسکریپری اجرا نمی‌کند.

داده و وضعیت در bind mountهای `public/data` و `data` و کش در volume پایدار `vod_imdb_cache` قرار دارند. فایل‌های زنده با rename جایگزین می‌شوند؛ پوشهٔ زندهٔ صفحات هنگام انتشار حذف نمی‌شود. کش صفحات و خبر از mtime تازه می‌شود (معمولاً ۳۰ ثانیه؛ کش CDN می‌تواند زمان بیشتری اضافه کند). صفحهٔ جدید از مسیر داینامیک موجود ساخته می‌شود.

**پشتیبان‌گیری:** این bind mountها داخل checkout هستند. قبل از deploy بعدی از آن‌ها بکاپ بگیرید؛ اسکریپت قدیمی `deploy/deploy.sh` از reset استفاده می‌کند و ممکن است دادهٔ tracked تولیدشده روی سرور را بازنویسی کند. به‌روزرسانی شبانه خودش git/build اجرا نمی‌کند.

## Cron واقعی میزبان، به جای daemon

اگر حتماً cron میزبان می‌خواهید، سرویس daemon را متوقف کنید و فقط یک روش را فعال نگه دارید:

```bash
docker compose -f docker-compose.prod.yml stop maintenance
sudo crontab -e
```

خط [sarvnema-maintenance.cron](../infra/cron/sarvnema-maintenance.cron) را به crontab روت اضافه کنید. مسیر پروژه را بررسی کنید. cron هر ۱۵ دقیقه worker یک‌باره را با `flock` اجرا می‌کند؛ کنترل ساعت تهران و توقف در ساعت ۵ داخل worker انجام می‌شود. اجرای دوبارهٔ `compose up` daemon را دوباره فعال می‌کند؛ در روش cron باید آن را دوباره متوقف کنید. فایل log میزبان را با logrotate محدود کنید.

این تغییرات تنظیمات انتشار را آماده می‌کنند؛ نصب cron یا بالا آمدن worker روی سرور واقعی باید همان‌جا بررسی شود.

## تنظیمات

برای override فایل Compose، متغیرها را در `.env` کنار Compose یا با `docker compose --env-file ...` بدهید؛ `env_file: .env.local` به تنهایی override عبارت‌های ${...} در Compose نیست.

```dotenv
MAINTENANCE_TIME_ZONE=Asia/Tehran
MAINTENANCE_IDLE_START_HOUR=2
MAINTENANCE_IDLE_END_HOUR=5
MAINTENANCE_POLL_MS=900000
MAINTENANCE_MAX_RECENT_REQUESTS=12
MAINTENANCE_MAX_ACTIVE_ROOMS=1
MAINTENANCE_MAX_MEMORY_MB=1350
MAINTENANCE_MAX_LOAD_AVG=1.25
CURATED_VOD_PAGE_LIMIT=2
CURATED_VOD_DETAIL_LIMIT=60
CURATED_VOD_CONCURRENCY=1
CURATED_VOD_REQUEST_GAP_MS=1000
MUSIC_REFRESH_REQUEST_GAP_MS=1200
```

وضعیت: `data/maintenance-scheduler-status.json`، موفقیت‌های روزانه: `data/maintenance-scheduler-state.json`، checkpoint مراحل: `data/refresh-checkpoints/`.

`npm run maintenance-now` دستی و اجباری است، آستانهٔ idle و ساعت را نادیده می‌گیرد ولی همچنان حداکثر سه ساعت بودجه دارد. آن را در cron استفاده نکنید.

تست‌ها: `node --test scripts/tests/maintenance.test.mjs scripts/tests/news.test.mjs`، به‌علاوهٔ تست کش دادهٔ زنده در `scripts/tests/live-data.test.ts`.
