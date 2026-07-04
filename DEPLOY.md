# راهنمای انتشار رمق (Deploy Guide)

## ⚠️ نیازمندی مهم قبل از انتخاب هاست

این اپ **باید روی سرور Node واقعی** اجرا شود (نه serverless مثل Vercel/Netlify)، چون سه روت API آن به `curl` و دیسک نیاز دارند:

| روت | چرا |
|---|---|
| `/api/media` | ویدیوهای مسل‌ویکی را با `curl` می‌گیرد (کلودفلر fetch نود را بلاک می‌کند) و در `.media-cache/` روی دیسک کش می‌کند |
| `/api/torob` | قیمت مکمل‌ها از ترب با `curl` |
| `/api/ai` | مربی هوشمند (Z.AI) با `curl` |

پس گزینه‌های مناسب: **VPS خودت** یا **PaaS ایرانی داکری مثل لیارا/آروان** (برای کاربر ایرانی سرعت بهتر و بدون دردسر تحریم).

---

## گزینه‌ی ۱ — VPS (توصیه‌شده)

روی سرور (Ubuntu، با Node ≥ 20 و nginx):

```bash
# 1) کد
git clone https://github.com/FatemehKare1/ramagh.git
cd ramagh
npm install

# 2) متغیرهای محیطی (فایل .env.local روی سرور بساز — هرگز در گیت نیست)
cat > .env.local <<'EOF'
AI_API_KEY=<کلید z.ai>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<کلاینت آی‌دی گوگل>
NEXT_PUBLIC_ADMIN_CODE=<کد دلخواه پنل ادمین>
EOF

# 3) بیلد و اجرا با PM2
npm run build
npm i -g pm2
pm2 start "npm start" --name ramagh   # روی پورت 3000
pm2 save && pm2 startup
```

nginx به‌عنوان reverse proxy (مثلاً ساب‌دامین `app.example.ir`):

```nginx
server {
    listen 443 ssl http2;
    server_name app.example.ir;
    # ssl_certificate ...؛ با certbot بگیر: certbot --nginx -d app.example.ir

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 25m;   # آپلود عکس آنالیز بدن
    }
}
```

> اگر پورت 443 سرورت درگیر سایت دیگری است (مثل وضعیت فعلی VPS تو)، همین بلاک را با `server_name` متفاوت کنار همان سایت اضافه کن — nginx بر اساس SNI جدا می‌کند.

## گزینه‌ی ۲ — لیارا (ساده‌ترین راه ایرانی)

1. در [liara.ir](https://liara.ir) یک برنامه‌ی **Next.js** بساز (پلتفرم Next پشتیبانی می‌شود و ایمیج آن curl دارد).
2. یک **دیسک** بساز و به مسیر `/app/.media-cache` مونت کن (برای کش ویدیوها).
3. متغیرهای محیطی بالا را در بخش تنظیمات برنامه اضافه کن.
4. دیپلوی: `npm i -g @liara/cli && liara deploy` (یا اتصال مستقیم به همین ریپوی گیت‌هاب).

## بعد از بالا آمدن (چک‌لیست تولید)

- [ ] **گوگل**: در Google Cloud Console → Credentials → همان کلاینت، دامنه‌ی تولید (مثلاً `https://app.example.ir`) را به **Authorized JavaScript origins** اضافه کن.
- [ ] `NEXT_PUBLIC_*` متغیرها موقع **build** در کد قرار می‌گیرند — بعد از هر تغییرشان دوباره build بگیر.
- [ ] صفحه‌ی `/login` و دکمه‌ی گوگل را تست کن.
- [ ] `/admin` فقط با `NEXT_PUBLIC_ADMIN_CODE` باز می‌شود — کد پیش‌فرض را حتماً عوض کن.
- [ ] PWA: کاربران از منوی مرورگر «Add to Home Screen / نصب» را می‌زنند.

## نکته‌ها

- دادهٔ کاربر (برنامه، رژیم، تاریخچه، عکس‌های آنالیز) **local-first** است و در IndexedDB مرورگر خود کاربر می‌ماند؛ سرور دیتابیس ندارد.
- محتوای تمرین‌ها متعلق به MuscleWiki است — استفادهٔ شخصی/غیرتجاری.
- برای به‌روزکردن دیتای تمرین‌ها: `npm run build-dataset` (به curl و دسترسی به musclewiki.com نیاز دارد).
