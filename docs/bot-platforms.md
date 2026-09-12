# راه‌اندازی بات‌های SarvNema در تلگرام و بله

این راهنما قرارداد مشترک بات‌ها، متن آمادهٔ معرفی، لوگو و اجرای بات‌های تلگرام و بله را توضیح می‌دهد. هر دو بات از API سایت استفاده می‌کنند؛ بنابراین جست‌وجو، فیلترها، پوسترها، فصل/قسمت سریال و لینک‌های دانلود یک منبع دارند.

## لوگو و متن معرفی

لوگوی آمادهٔ سایت را به‌عنوان تصویر پروفایل بات استفاده کنید:

```text
https://YOUR_DOMAIN/app-icon/512
```

این تصویر همان نشان SarvNema با پس‌زمینهٔ تیره و فضای امن مناسب آواتار است. اگر پنل بله یا BotFather فایل می‌خواهد، همین URL را دانلود و بارگذاری کنید.

نام پیشنهادی:

```text
SarvNema | فیلم، سریال و موزیک
```

توضیح کوتاه:

```text
جست‌وجو و دریافت لینک فیلم، سریال، انیمیشن و موزیک؛ با پخش آنلاین، تماشای همزمان و دانلود امن.
```

توضیح کامل:

```text
SarvNema آرشیو فیلم، سریال، انیمیشن، موزیک و موزیک‌ویدئو را با جست‌وجوی نام، ژانر، سال، کشور و امتیاز IMDb در اختیارتان می‌گذارد. نتیجه‌ها ۱۰تایی نمایش داده می‌شوند؛ سریال‌ها فصل و قسمت دارند و همهٔ لینک‌های دانلود ابتدا به صفحهٔ امن سایت می‌روند و پس از ۵ ثانیه به منبع اصلی منتقل می‌شوند.
```

آمار زندهٔ تعداد فیلم، سریال، لینک و موزیک از این مسیرها خوانده می‌شود و نباید در متن بات به‌صورت عدد ثابت نوشته شود:

```text
GET /api/bot/filters
GET /api/bot/music?mode=filters
```

## متغیرهای محیطی

در `.env.local` یا secretهای سرویس اجرا قرار دهید؛ توکن‌ها را در Git commit نکنید:

```dotenv
BOT_SITE_URL=https://YOUR_DOMAIN
BOT_API_TOKEN=یک-توکن-طولانی-و-تصادفی

# تلگرام
BOT_API_TOKEN=توکن-بات-تلگرام

# بله
BALE_BOT_TOKEN=توکن-بات-بله
BALE_API_BASE_URL=https://tapi.bale.ai
```

برای تلگرام اسکریپت فعلی مقدار `BOT_API_TOKEN` را هم برای اتصال به Telegram و هم برای احراز API سایت مصرف می‌کند. اگر API سایت توکن جدا دارد، در کد production آن را با `BOT_SITE_API_TOKEN` جدا کنید و `BOT_API_TOKEN` را فقط برای توکن تلگرام نگه دارید.

## اجرا

```bash
npm run telegram-bot
npm run bale-bot
```

بات بله از polling و API سازگار با Bot API استفاده می‌کند. آدرس پایه با `BALE_API_BASE_URL` قابل تغییر است تا در صورت تغییر endpoint، بدون تغییر کد تنظیم شود.

## منوی کاربر

منوی اصلی این بخش‌ها را دارد:

- جست‌وجوی نام فیلم، سریال، انیمیشن، خواننده یا موزیک؛ نتیجهٔ ترکیبی فیلم/سریال و موسیقی.
- فیلم و سریال با فیلترهای ژانر، کشور، سال، کیفیت و حداقل/حداکثر IMDb.
- انیمیشن و کودک، فیلم‌های ۲۰۲۶، فیلم‌های ایرانی قدیمی و Top 250 IMDb.
- موسیقی، موزیک‌ویدئو، دسته‌بندی، هنرمند و collectionهای دادهٔ موسیقی.
- همهٔ فهرست‌ها با اندازهٔ ۱۰ نتیجه در هر صفحه و دکمهٔ قبلی/بعدی.

برای سریال، ترتیب رابط چنین است:

```text
عنوان → فصل → قسمت → کیفیت/دوبله/سافت‌ساب/هاردساب → دانلود یا صفحهٔ سایت
```

پوستر، عنوان، سال، ژانر و امتیاز IMDb در پاسخ API موجود است. بات بله کارت‌ها را با `sendPhoto` می‌فرستد و اگر پوستر قابل دسترس نباشد به پیام متنی fallback می‌کند.

## قرارداد API سایت

همهٔ مسیرها با هدر زیر فراخوانی شوند:

```http
x-bot-token: BOT_API_TOKEN
```

مسیرهای اصلی:

```text
GET /api/bot/filters
GET /api/bot/search?q=نام&section=animation&type=movie&page=1&limit=10
GET /api/bot/search?section=top-imdb&sort=rating&page=1&limit=10
GET /api/bot/search?section=old-iranian-films&sort=year&page=1&limit=10
GET /api/bot/search?type=movie&genre=Drama&country=Iran&yearFrom=2020&minImdb=7
GET /api/bot/title/tt0903747
GET /api/bot/title/tt0903747?season=1&includeDownloads=1&maxFiles=80
GET /api/bot/music?mode=filters
GET /api/bot/music?q=ابی&kind=track&page=1&limit=10
GET /api/bot/music?id=شناسه
```

پارامتر `section` شامل `top-imdb`, `persian-movies`, `old-iranian-films`, `recent-films`, `best-series`, `best-movies`, `kids`, `animation` و `latest-animation` است. پاسخ `search` دارای `pagination` و `items` است. هر item شامل `posterUrl`, `title`, `genres`, `year`, `imdbRating`, `urls.detail` و `urls.watch` است.

لینک‌های فایل در پاسخ جزئیات از قبل به `/download/continue` تبدیل می‌شوند و absolute هستند. بات نباید URL منبع را دوباره از دادهٔ خام استخراج یا به کاربر نمایش دهد. لینک دانلود با عنوان و کیفیت به شکل زیر عمل می‌کند:

```text
بات → https://YOUR_DOMAIN/download/continue?... → ۵ ثانیه پیام دانلود → منبع اصلی
```

## تست محلی

سایت را روی پورت پیش‌فرض اجرا کنید و بعد API را بررسی کنید:

```bash
curl -H "x-bot-token: $BOT_API_TOKEN" "http://localhost:3004/api/bot/filters"
curl -H "x-bot-token: $BOT_API_TOKEN" "http://localhost:3004/api/bot/search?section=animation&limit=10"
curl -H "x-bot-token: $BOT_API_TOKEN" "http://localhost:3004/api/bot/title/tt0903747?season=1&includeDownloads=1"
```

در پاسخ فایل‌ها باید `download/continue` دیده شود؛ وجود مستقیم `mkv`, `mp4` یا دامنهٔ آرشیو در URL بات نشانهٔ regression است.

## انتشار امن

توکن‌ها را فقط در secret manager یا environment سرویس قرار دهید. API بات را بدون `BOT_API_TOKEN` در production باز نگذارید. برای Telegram، نام و description اسکریپت با اجرای بات تنظیم می‌شود؛ متن‌های بله را از پنل مدیریت بات با متن‌های بالا ثبت کنید. لاگ‌ها نباید update کامل، توکن یا URL منبع دانلود را چاپ کنند.
