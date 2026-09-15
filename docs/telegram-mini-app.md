# Mini App تلگرام و انتشار منوی جدید بات‌ها

ورودی عمومی: **https://sarvnema.ir/mini-app**. صفحهٔ جدید جست‌وجوی تصحیح‌شونده،
فیلم، سریال، موسیقی، انیمیشن، برترین‌های IMDb و سینمای قدیم ایران را به صفحات
فعلی سایت وصل می‌کند؛ پلیر، تماشای همزمان و گیت دانلود پنج‌ثانیه‌ای همان سایت‌اند.

## تنظیمات

در environment خصوصی worker تلگرام (نه در Git) تنظیم کنید:

```dotenv
TELEGRAM_MINI_APP_URL=https://sarvnema.ir/mini-app
NEXT_PUBLIC_SITE_URL=https://sarvnema.ir
```

`TELEGRAM_MINI_APP_URL` اختیاری است؛ بدون آن مسیر `/mini-app` از
`PUBLIC_APP_URL` یا `NEXT_PUBLIC_SITE_URL` و در نهایت `https://sarvnema.ir`
ساخته می‌شود. آدرس باید HTTPS عمومی باشد. آدرس داخلی Docker در `BOT_SITE_URL`
برای دکمهٔ Mini App استفاده نمی‌شود. آدرس نامعتبر دکمه را غیرفعال می‌کند.
`NEXT_PUBLIC_SITE_URL` را برای app نیز تنظیم کنید تا لینک عمومی آثار و دانلودها
به دامنهٔ سایت برود، نه نام داخلی کانتینر. در صورت تغییر این متغیر app را rebuild کنید.

پس از انتشار صفحه و اجرای worker جدید، `setChatMenuButton` دکمهٔ «سرونما»
را برای گفت‌وگوهای خصوصی تنظیم می‌کند. منوی `/start` و دستور `/app` نیز دکمهٔ
`web_app` دارند؛ داخل گروه‌ها لینک عادی سایت نمایش داده می‌شود.
این تغییر مخصوص تلگرام است؛ منو و جست‌وجوی مشترک بله هم اصلاح شده ولی بله
نباید payload اختصاصی Telegram Web App دریافت کند.

برای دکمهٔ **Main Mini App** روی پروفایل بات نیز مالک می‌تواند در BotFather
از تنظیمات بات، بخش Mini Apps، همین URL را ثبت کند. این تنظیم حساب به‌صورت
خودکار توسط کد انجام نشده است. منابع رسمی:
[Telegram Mini Apps](https://core.telegram.org/bots/webapps)،
[setChatMenuButton](https://core.telegram.org/bots/api#setchatmenubutton)،
[InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton).

## رفتار داخل تلگرام

- SDK رسمی فقط هنگام ورود به `/mini-app` بارگیری می‌شود و هنگام جابه‌جایی داخلی باقی می‌ماند؛ بازدید معمولی صفحات سایت SDK را بارگیری نمی‌کند.
- صفحه آماده و باز می‌شود (`ready` و `expand`)؛ حاشیهٔ امن دستگاه رعایت می‌شود.
- دکمهٔ بازگشت تلگرام در ورودی مخفی و در صفحات بعدی فعال است؛ کاربر به مسیر قبلی برمی‌گردد.
- این نسخه مرور عمومی است، نه ورود با حساب تلگرام. هیچ شناسه‌ای از `initDataUnsafe` قابل اعتماد فرض نمی‌شود و هیچ توکن باتی وارد مرورگر نمی‌شود.
- اگر بعداً ورود، خرید یا دادهٔ شخصی اضافه شود، اعتبارسنجی امضای `initData` و تازگی آن باید سمت سرور پیاده شود. APIهای خصوصی `/api/bot/*` همچنان توکن می‌خواهند.

## انتشار روی سرور

فقط push کردن کافی نیست: **app و هر دو worker باید کد جدید را اجرا کنند**.
ابتدا طبق [راهنمای دواپس](./devops-deployment.md) از `data` و `public/data`
پشتیبان بگیرید، وضعیت Git را بررسی کنید، `main` و LFS را دریافت کنید؛ داده‌های
runtime را با reset یا checkout اجباری پاک نکنید. این تغییر فایل LFS جدید ندارد.

روی سرور دارای شبکهٔ خارجی `infrastructure_default` و فایل
`docker-compose.prod.yml`، پس از به‌روزرسانی کد و environment:

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps app
curl -fsS https://sarvnema.ir/readyz
curl -fsS -o /dev/null https://sarvnema.ir/mini-app
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate telegram-bot
docker compose -f docker-compose.prod.yml logs --tail=50 telegram-bot
```

اگر هرکدام از build، readiness یا صفحهٔ Mini App ناموفق بود، ادامه ندهید.
Telegram worker باید همان image جدید `vod-app` را بگیرد؛ `restart` تنها روی
کانتینر قدیمی کافی نیست. این دستورها maintenance را تغییر نمی‌دهند و تایمر
شبانهٔ میزبان را با daemon دوم موازی نمی‌کنند.

اگر از stack مستقل `docker-compose.production.yml` استفاده می‌کنید، app را
با environment همان سرور rebuild/recreate کنید؛ آن stack workerهای بات را
به‌صورت process جدا اجرا می‌کند. برای workerهای **از قبل نصب‌شدهٔ systemd**:

```bash
sudo systemctl restart sarvnema-telegram.service sarvnema-bale.service
sudo systemctl status sarvnema-telegram.service sarvnema-bale.service
```

فقط سرویس‌های واقعاً نصب‌شده را restart کنید: تلگرام را هم‌زمان با Docker و
systemd اجرا نکنید؛ برای هر توکن فقط یک poller فعال باشد. اگر بله با Supervisor
یا روش دیگری اجرا می‌شود، همان process را با کد جدید restart کنید.

## بررسی پس از انتشار

1. در **هر دو بات** `/start`، سریال، ژانر، «همه / بدون فیلتر» را بزنید: باید تنظیمات سریال بماند؛ نتیجه یا فهرست کشور خودکار نمایش داده نشود.
2. سال ساخت باید از ۲۰۲۶، ۲۰۲۵، ۲۰۲۴ ... شروع شود (در صورت وجود محتوا)، مستقل از تعداد آثار. صفحهٔ بعد و بازگشت را امتحان کنید.
3. «نمایش نتایج»، صفحهٔ دوم، عنوان، فصل، قسمت و چند مرحله بازگشت را بررسی کنید؛ نوع سریال، فیلتر و شمارهٔ صفحه حفظ شود.
4. `breakng bud` را بفرستید: نزدیک‌ترین عبارت و اولین نتیجه باید `Breaking Bad` باشد. پیشنهاد را انتخاب کنید و از جزئیات به جست‌وجو برگردید.
5. در تلگرام خصوصی `/app` و دکمهٔ منو را باز کنید؛ وارد سریال شوید و با Back داخلی برگردید. در گروه، دکمه باید لینک عادی باشد.

تست‌های محلی بدون ارسال پیام به بات زنده:

```bash
node --import tsx --test scripts/tests/bot-api.test.ts scripts/tests/typo-search.test.ts scripts/tests/bot-navigation.test.mjs scripts/tests/bot-adapters.test.mjs
node scripts/smoke-bot-mini-app.mjs
```

smoke مرورگر به سایت محلی (پیش‌فرض پورت ۳۰۰۴)، Chrome و Playwright نیاز دارد؛
در صورت نصب بیرون مخزن `PLAYWRIGHT_MODULE` را تنظیم کنید. SDK تلگرام در این
تست شبیه‌سازی می‌شود؛ تست واقعی داخل کلاینت تلگرام بعد از deploy همچنان لازم است.
