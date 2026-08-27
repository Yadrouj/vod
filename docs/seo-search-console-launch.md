# راه‌اندازی SEO، Google Search Console و GA4 برای سرونما

این پروژه اکنون این موارد را به‌صورت خودکار تولید می‌کند:

- عنوان، توضیح، canonical، Open Graph و Twitter Card فارسی
- JSON-LD از نوع `Organization`، `WebSite`، `WebPage`، `FAQPage`، `Movie`، `TVSeries`، `MusicRecording` و `VideoObject` (در صفحه‌های مرتبط)
- FAQ قابل مشاهده در لندینگ فیلم/سریال و لندینگ موسیقی
- `robots.txt` و sitemap بخش‌بندی‌شده برای آرشیو بزرگ
- زبان پیش‌فرض `fa` و `dir="rtl"` برای بازدیدکننده‌ای که هنوز زبان انتخاب نکرده است

## ۱. متغیرهای محیطی

روی محیط production این مقادیر را وارد کنید؛ آن‌ها را در Git قرار ندهید.

```env
NEXT_PUBLIC_SITE_URL=https://sarvnema.ir
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GOOGLE_SITE_VERIFICATION=مقدار-تگ-تأیید-سرچ-کنسول
```

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` شناسهٔ Data stream وب در GA4 است.
- `GOOGLE_SITE_VERIFICATION` فقط مقدار `content` تگ تأیید Google است، نه کل تگ HTML.
- اگر تأیید مالکیت را با DNS انجام می‌دهید، متغیر دوم لازم نیست.

پس از ذخیرهٔ متغیرها، سرویس را redeploy کنید. اسکریپت GA4 فقط وقتی شناسهٔ معتبر با الگوی `G-...` وجود داشته باشد لود می‌شود.

## ۲. Google Search Console

1. در Search Console یک **Domain property** برای `sarvnema.ir` بسازید و DNS TXT را تأیید کنید. این روش `www` و زیردامنه‌ها را نیز پوشش می‌دهد.
2. بعد از deploy، این URLها را باز کنید:
   - `https://sarvnema.ir/robots.txt`
   - `https://sarvnema.ir/sitemap/0.xml`
   - `https://sarvnema.ir/sitemap/1.xml` (در آرشیو فعلی لازم است؛ تعداد نهایی را robots.txt اعلام می‌کند.)
3. همهٔ sitemapهایی که در `robots.txt` آمده‌اند را در بخش **Sitemaps** ثبت کنید.
4. در URL Inspection، صفحه‌های `/`، `/music`، یک صفحهٔ فیلم، یک صفحهٔ سریال و یک صفحهٔ موسیقی را بررسی و برای crawl درخواست کنید.
5. با Rich Results Test داده‌های ساختاریافته را بررسی کنید. وجود schema تضمین rich result نیست؛ محتوای واقعی و قابل‌مشاهده ملاک است.

## ۳. Google Analytics 4

1. در Google Analytics یک Property و Web data stream برای `https://sarvnema.ir` بسازید.
2. Measurement ID را در `NEXT_PUBLIC_GA_MEASUREMENT_ID` قرار دهید و deploy کنید.
3. با Realtime یا DebugView بازدید خودتان را بررسی کنید.
4. پیش از فعال‌سازی عمومی، سیاست حریم خصوصی و سازوکار رضایت کاربر را مطابق قوانین محل فعالیتتان بررسی کنید. GA4 برای جمع‌آوری داده به رضایت معتبر کاربر نیاز دارد.

## ۴. نگهداری روزانه

- URLهای canonical با `https://sarvnema.ir` نگه داشته شوند؛ نسخه‌های آزمایشی و `localhost` نباید index شوند.
- فقط صفحه‌هایی که اطلاعات یا لینک منبع واقعی دارند وارد sitemap می‌شوند.
- `lastModified` sitemap از زمان ساخت ایندکس محتوا می‌آید؛ آن را صرفاً برای تغییرات واقعی محتوا به‌روز کنید.
- در Search Console، گزارش‌های Pages، Video indexing، Sitemaps و Core Web Vitals را هفتگی مرور کنید.
- محتوای راهنما و FAQ را وقتی واقعیت محصول تغییر کرد اصلاح کنید؛ FAQ مصنوعی یا تکرار بی‌دلیل کلمات کلیدی تولید نکنید.
