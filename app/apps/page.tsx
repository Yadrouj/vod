import Link from "next/link";
import { ArrowLeft, CirclePlay, MonitorPlay, Search, Tv } from "lucide-react";
import { titleMetadata } from "@/lib/seo";
import { tvHome } from "@/lib/tv-catalog";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./apps.module.css";

export const metadata = titleMetadata({ title: "اپلیکیشن سرونما | تماشای فیلم و سریال روی Android TV", description: "سرونما برای صفحهٔ بزرگ: جستجوی فارسی و انگلیسی، انتخاب فصل و قسمت، نسخه و کیفیت، زیرنویس و کنترل با ریموت. نسخهٔ تحت وب تلویزیون را امتحان کنید.", pathname: "/apps", keywords: ["سرونما اندروید تی وی", "SarvNema Android TV", "اپلیکیشن فیلم و سریال"] });

export default async function ApplicationsPage() {
  const { hero, rows } = await tvHome("fa");
  let apk: string | null = null;
  try { const url = new URL(process.env.ANDROID_TV_APK_URL || ""); if (url.protocol === "https:" && !url.username && !url.password) apk = url.href; } catch { /* Browser preview needs no install. */ }
  return <div className={styles.page} dir="rtl">
    <header className={styles.header}><BrandLogo locale="fa" compact /><Link href="/tv">ورود به نسخهٔ تلویزیون <ArrowLeft size={18} /></Link></header>
    <main>
      <section className={styles.hero}><div className={styles.copy}><span className={styles.kicker}>SARVNEMA APPS · قدم اول، تلویزیون</span><h1>همان سرونما.<br />این بار، روی<br /><em>صفحهٔ بزرگ.</em></h1><p>از جستجو تا شروع فیلم، با چند حرکت ریموت. تجربه‌ای خلوت، خوانا و سینمایی برای Android TV؛ بدون شلوغی مرورگر.</p><div className={styles.actions}><Link href="/tv" className={styles.primary}><CirclePlay />امتحان نسخهٔ تلویزیون</Link>{apk && <a href={apk} className={styles.secondary}>دریافت APK اندروید TV</a>}<a href="#setup" className={styles.secondary}>چطور شروع کنم؟</a></div><small>{apk ? "نسخهٔ مرورگری و فایل نصب تلویزیون در دسترس‌اند." : "نسخهٔ مرورگری آمادهٔ آزمایش است. فایل نصب عمومی پس از امضا و تست روی تلویزیون ارائه می‌شود."}</small></div>
        <div className={styles.screenWrap}><div className={styles.screen}>
          {hero?.backdrop && <img className={styles.screenArt} src={hero.backdrop} alt="" fetchPriority="high" />}
          <div className={styles.screenShade} /><div className={styles.screenBrand}>سرونما <span>TV</span></div><div className={styles.screenCopy}><span>وقتِ یک داستان خوب</span><h2>{hero?.title || "سینما، نزدیک‌تر از همیشه"}</h2><span className={styles.demoPlay}><CirclePlay size={18} />شروع تماشا</span></div>
          <div className={styles.demoRail}>{rows.flatMap(row => row.items).filter(item => item.poster).slice(0, 6).map((item, i) => <img key={`${item.id}-${i}`} src={item.poster!} alt={item.title} loading="lazy" width="100" height="150" />)}</div>
        </div><div className={styles.screenStand} /><p className={styles.previewLabel}>پیش‌نمایش چیدمان · عنوان‌ها از آرشیو واقعی سرونما</p></div>
      </section>
      <section className={styles.features} aria-label="ویژگی‌های تلویزیون">{[
        { icon: <Search />, title: "پیدا کن، حتی با نام نزدیک", body: "جستجوی فارسی و انگلیسی، پیشنهاد نام‌های مشابه و فیلتر نوع، ژانر، سال و امتیاز IMDb." },
        { icon: <Tv />, title: "طراحی برای ریموت", body: "دکمه‌های بزرگ و بافاصله، انتخاب واضح با جهت‌ها و بازگشت یک مرحله‌ای. بدون نیاز به موس." },
        { icon: <MonitorPlay />, title: "تماشا، بی‌دردسرتر", body: "انتخاب فصل و قسمت، نوع زیرنویس یا دوبله و سپس کیفیت؛ همراه با بازیابی پخش و انتخاب منبع جایگزین." },
      ].map(feature => <article key={feature.title}>{feature.icon}<h2>{feature.title}</h2><p>{feature.body}</p></article>)}</section>
      <section id="setup" className={styles.setup}><div><span className={styles.kicker}>START SIMPLE</span><h2>از اینجا شروع کن.</h2><p>در این مرحله، رابط تلویزیون و پوستهٔ Android TV آمادهٔ توسعه و آزمایش‌اند. دسترسی هر فیلم به منبع، اینترنت و پشتیبانی دستگاه از قالب فایل بستگی دارد.</p><Link className={styles.primary} href="/tv">باز کردن SarvNema TV <ArrowLeft /></Link></div><ol><li><span>۱</span><div><h3>نسخهٔ تلویزیون را باز کن</h3><p>در مرورگر به <bdi>sarvnema.ir/tv</bdi> برو. برای تست در کامپیوتر، از جهت‌ها و Enter استفاده کن.</p></div></li><li><span>۲</span><div><h3>عنوان و نسخه را انتخاب کن</h3><p>جستجو کن، وارد عنوان شو و برای سریال، فصل و قسمت را انتخاب کن. دوبله یا زیرنویس و کیفیت در همان صفحه‌اند.</p></div></li><li><span>۳</span><div><h3>پخش کن و ادامه بده</h3><p>با OK پخش را کنترل کن؛ با جهت‌ها کنترل‌ها را بیاور و با Back منو را ببند. سابقهٔ تماشا روی همین دستگاه می‌ماند.</p></div></li></ol></section>
      <section className={styles.roadmap}><span className={styles.kicker}>ONE STEP AT A TIME</span><h2>مسیر اپلیکیشن‌های سرونما</h2><div className={styles.stages}><article><span>مرحلهٔ اول · در حال آزمایش</span><h3>Android TV</h3><p>رابط مرورگری و پوستهٔ اندروید برای تست؛ انتشار عمومی APK پس از امضا و تست سخت‌افزاری.</p></article><article><span>مرحلهٔ بعد</span><h3>اندروید و iOS موبایل</h3><p>برنامه‌ریزی‌شده؛ هنوز برای دریافت منتشر نشده است.</p></article></div></section>
      <section className={styles.faq}><h2>قبل از شروع بدان</h2><details><summary>این نسخه نصب می‌شود یا در مرورگر است؟</summary><p>رابط TV مستقیماً در مرورگر باز می‌شود. پوستهٔ Android TV همین تجربه را تمام‌صفحه اجرا می‌کند؛ فایل نصب عمومی پس از امضای نسخه و آزمایش روی دستگاه ارائه می‌شود.</p></details><details><summary>همهٔ فایل‌ها روی همهٔ تلویزیون‌ها پخش می‌شوند؟</summary><p>خیر؛ پشتیبانی از کدک و قالب در هر دستگاه متفاوت است. اگر منبعی پخش نشد، پخش را تازه کن یا کیفیت و منبع دیگری انتخاب کن. بعضی منابع به IP ایران نیاز دارند.</p></details><details><summary>به حساب کاربری یا دسترسی میکروفن نیاز دارم؟</summary><p>برای مرور و جستجوی این نسخه به حساب سرونما یا میکروفن نیازی نیست. جستجوی صوتی و تماشای همزمان در رابط TV این مرحله اضافه نشده‌اند.</p></details></section>
    </main>
  </div>;
}
