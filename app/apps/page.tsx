import Link from "next/link";
import { ArrowLeft, Check, CirclePlay, Download, MonitorPlay, Search, ShieldCheck, Smartphone, Tv } from "lucide-react";
import { titleMetadata } from "@/lib/seo";
import { tvHome } from "@/lib/tv-catalog";
import { appReleaseUrl, bundledAppReleases } from "@/lib/app-releases";
import { BrandLogo } from "@/components/brand-logo";
import styles from "./apps.module.css";
import { mirroredImageUrl } from "@/lib/image-url";

export const metadata = titleMetadata({
  title: "اپلیکیشن سرونما | اندروید موبایل و Android TV",
  description: "اپلیکیشن سرونما برای گوشی، تبلت و تلویزیون اندرویدی؛ جستجوی فیلم، سریال و موسیقی، پخش آنلاین و تجربهٔ آشنای سایت در WebView. راهنمای نصب و انتخاب نسخه.",
  pathname: "/apps", keywords: ["اپلیکیشن سرونما", "سرونما اندروید", "سرونما اندروید تی وی", "SarvNema Android", "Android TV", "اپ فیلم سریال موسیقی"],
});

export default async function ApplicationsPage() {
  const { hero, rows } = await tvHome("fa");
  const posters = rows.flatMap(row => row.items).filter(item => item.poster).slice(0, 6);
  const mobileApk = appReleaseUrl(process.env.ANDROID_MOBILE_APK_URL) || bundledAppReleases.mobile.url;
  const tvApk = appReleaseUrl(process.env.ANDROID_TV_APK_URL) || bundledAppReleases.tv.url;
  const editions = [
    { id: "android-mobile", icon: <Smartphone />, platform: "اندروید موبایل", english: "ANDROID · PHONE & TABLET", description: "همان سرونمایی که می‌شناسی، این‌بار در یک اپ سبک؛ بدون نوار آدرس و با دسترسی به فیلم، سریال و موسیقی.", packageId: "ir.sarvnema.app", href: "/", apk: mobileApk, version: mobileApk === bundledAppReleases.mobile.url ? bundledAppReleases.mobile.version : null,
      features: ["رابط واکنش‌گرای سایت، مناسب لمس و صفحهٔ گوشی", "پخش تمام‌صفحه، چرخش ویدئو و انتخاب فایل زیرنویس", "دانلود و دسترسی اختیاری دوربین و میکروفن برای اتاق‌ها"] },
    { id: "android-tv", icon: <Tv />, platform: "اندروید TV", english: "ANDROID TV · BIG SCREEN", description: "چیدمانی جدا برای فاصلهٔ مبل تا تلویزیون؛ با نوشته‌های خوانا، انتخاب واضح و دکمه‌هایی که با ریموت راحت پیدا می‌شوند.", packageId: "ir.sarvnema.tv", href: "/tv", apk: tvApk, version: tvApk === bundledAppReleases.tv.url ? bundledAppReleases.tv.version : null,
      features: ["انتخاب با جهت‌ها و OK، بدون نیاز به موس", "انتخاب فصل و قسمت، دوبله یا زیرنویس و سپس کیفیت", "کنترل‌های بزرگ پخش و ادامهٔ تماشا روی همین دستگاه"] },
  ];
  return <div className={styles.page} dir="rtl">
    <header className={styles.header}><BrandLogo locale="fa" compact /><nav aria-label="نسخه‌های اپ سرونما"><a href="#android-mobile">موبایل</a><a href="#android-tv">تلویزیون</a><a href="#setup">راهنمای نصب</a></nav></header>
    <main>
      <section className={styles.hero}>
        <div className={styles.copy}><span className={styles.kicker}>SARVNEMA APPS · یک نام، دو تجربه</span><h1>سرونما،<br />از گوشی تا<br /><em>صفحهٔ بزرگ.</em></h1><p>فیلم، سریال و موسیقی را پیدا کن و وارد داستان شو. نسخهٔ موبایل با تجربهٔ آشنای سایت؛ نسخهٔ تلویزیون، طراحی‌شده برای ریموت و تماشا از روی مبل.</p><div className={styles.actions}><a href="#editions" className={styles.primary}><Download />انتخاب نسخهٔ سرونما</a><Link href="/tv" className={styles.secondary}><CirclePlay />امتحان نسخهٔ TV</Link></div><small>نسخه‌های آزمایشی موبایل و TV با لوگو و لودینگ سرونما آمادهٔ دریافت‌اند. این فایل‌ها برای تست و بازخورد هستند، نه نسخهٔ نهایی فروشگاه؛ آزمایش روی دستگاه واقعی هنوز کامل نشده است.</small></div>
        <div className={`${styles.screenWrap} ${styles.devices}`}>
          <div className={styles.screen}>{hero?.backdrop && <img className={styles.screenArt} src={hero.backdrop} alt="" fetchPriority="high" />}<div className={styles.screenShade} />
            <div className={styles.screenBrand}><img src="/brand/sarvnema-mark.svg" width="22" height="28" alt="" />سرونما <span>TV</span></div>
            <div className={styles.screenCopy}><span>وقتِ یک داستان خوب</span><h2>{hero?.title || "سینما، نزدیک‌تر از همیشه"}</h2><span className={styles.demoPlay}><CirclePlay size={18} />شروع تماشا</span></div>
            <div className={styles.demoRail}>{posters.map((item, i) => <img key={`${item.id}-${i}`} src={mirroredImageUrl(item.poster!)} alt="" loading="lazy" width="100" height="150" />)}</div>
          </div><div className={styles.screenStand} />
          <div className={styles.phone} aria-label="پیش‌نمایش چیدمان نسخهٔ موبایل"><div className={styles.phoneCamera} /><div className={styles.phoneBrand}><img src="/brand/sarvnema-mark.svg" alt="" width="20" height="24" /><strong>سرونما</strong><Search size={16} /></div><div className={styles.phoneHero}>{hero?.backdrop && <img src={mirroredImageUrl(hero.backdrop)} alt="" />}<div /><strong>{hero?.title || "داستان بعدی تو"}</strong><span><CirclePlay size={13} />پخش آنلاین</span></div><h3>برای تماشای بعدی</h3><div className={styles.phoneRail}>{posters.slice(0, 3).map((item, i) => <img key={`${item.id}-${i}`} src={mirroredImageUrl(item.poster!)} alt="" width="60" height="90" />)}</div><div className={styles.phoneNav}><MonitorPlay /><Search /><Smartphone /></div></div>
          <p className={styles.previewLabel}>پیش‌نمایش چیدمان · تصویرها و عنوان‌ها از آرشیو واقعی سرونما</p>
        </div>
      </section>
      <section id="editions" className={styles.editions} aria-labelledby="edition-title"><span className={styles.kicker}>CHOOSE YOUR SCREEN</span><h2 id="edition-title">کجا دوست داری تماشا کنی؟</h2><p className={styles.sectionIntro}>نسخهٔ مناسب دستگاهت را انتخاب کن؛ آرشیو از همان سایت سرونما به‌روز می‌شود.</p>
        <div className={styles.editionGrid}>{editions.map(edition => <article key={edition.id} id={edition.id} className={styles.edition} data-app-edition={edition.id}>
          <div className={styles.editionHeading}><img src="/brand/sarvnema-mark.svg" width="52" height="60" alt="لوگوی سرونما" /><div><span>{edition.english}</span><h3>سرونما <small>برای {edition.platform}</small></h3></div>{edition.icon}</div>
          <p>{edition.description}</p><ul>{edition.features.map(feature => <li key={feature}><Check size={18} />{feature}</li>)}</ul>
          <dl className={styles.editionMeta}><div><dt>اندروید</dt><dd>۸ به بالا</dd></div><div><dt>شناسهٔ نصب</dt><dd><code dir="ltr">{edition.packageId}</code></dd></div>{edition.version && <div><dt>نسخهٔ آزمایشی</dt><dd><bdi>{edition.version}</bdi></dd></div>}</dl>
          <div className={styles.releaseStatus} data-release-ready="true"><i />{edition.version ? "نسخهٔ آزمایشی · برای تست و ارسال بازخورد" : "فایل نصب برای دریافت در دسترس است"}</div>
          <div className={styles.editionActions}><a href={edition.apk} download data-app-download={edition.id} className={styles.primary}><Download />دریافت اپ {edition.platform}</a><Link className={styles.secondary} href={edition.href}>باز کردن نسخهٔ وب <ArrowLeft size={18} /></Link></div>
        </article>)}</div>
      </section>
      <section className={styles.features} aria-label="ویژگی‌های سرونما">{[
        { icon: <Search />, title: "پیدا کن، حتی با نام نزدیک", body: "جستجوی فارسی و انگلیسی، پیشنهاد نام‌های مشابه و فیلترهای فیلم و سریال؛ همه از آرشیو خود سرونما." },
        { icon: <MonitorPlay />, title: "از انتخاب تا پخش", body: "انتخاب قسمت، دوبله یا زیرنویس و کیفیت؛ همراه با گزینهٔ تلاش دوباره و منبع جایگزین، در صورت موجود بودن." },
        { icon: <ShieldCheck />, title: "دسترسی، فقط وقتی لازم است", body: "نسخهٔ موبایل برای دوربین و میکروفن از خودت اجازه می‌گیرد. برای جستجو و تماشای عادی به این دسترسی‌ها نیازی نیست." },
      ].map(feature => <article key={feature.title}>{feature.icon}<h2>{feature.title}</h2><p>{feature.body}</p></article>)}</section>
      <section id="setup" className={styles.setup}><div><span className={styles.kicker}>START SIMPLE</span><h2>یک بار نصب کن،<br />هر بار راحت‌تر برگرد.</h2><p>موبایل و تلویزیون دو فایل نصب جدا دارند تا روی یک دستگاه هم قابل نصب باشند. نام و آیکون هر دو «سرونما» است؛ شناسهٔ فنی متفاوت، از تداخل نصب جلوگیری می‌کند.</p><a className={styles.primary} href="#editions">انتخاب نسخه <ArrowLeft /></a></div><ol><li><span>۱</span><div><h3>نسخهٔ مناسب دستگاهت را بردار</h3><p>گوشی و تبلت: اندروید موبایل. تلویزیون و TV Box: نسخهٔ Android TV. فایل‌های فعلی نسخهٔ آزمایشی‌اند و از همین سایت دریافت می‌شوند.</p></div></li><li><span>۲</span><div><h3>فایل APK را باز کن</h3><p>اگر اندروید پرسید، نصب از همان منبع دانلود را اجازه بده. پس از نصب، می‌توانی این اجازه را دوباره خاموش کنی.</p></div></li><li><span>۳</span><div><h3>سرونما را باز کن و پیدا کن</h3><p>موبایل با لمس کار می‌کند؛ تلویزیون با جهت‌ها و OK. برای دریافت آرشیو و پخش، اینترنت لازم است.</p></div></li></ol></section>
      <section className={styles.faq}><h2>قبل از نصب بدان</h2><details><summary>نسخهٔ اندروید واقعاً اپ است یا مرورگر؟</summary><p>یک اپ قابل نصب اندروید با WebView است که خود سایت سرونما را بدون نوار آدرس اجرا می‌کند. نسخهٔ موبایل صفحهٔ اصلی سایت و نسخهٔ تلویزیون مسیر مخصوص TV را باز می‌کند.</p></details><details><summary>چرا نام هر دو اپ یکی است اما شناسه‌ها فرق دارند؟</summary><p>نام نمایشی هر دو «سرونما» است. شناسهٔ موبایل <bdi>ir.sarvnema.app</bdi> و تلویزیون <bdi>ir.sarvnema.tv</bdi> است؛ این تفاوت اجازه می‌دهد نصب یک نسخه، دیگری را جایگزین نکند.</p></details><details><summary>دانلود و زیرنویس در نسخهٔ موبایل چطور کار می‌کند؟</summary><p>صفحهٔ دانلود و شمارش معکوس سایت حفظ می‌شود. در اندروید ۱۰ به بالا، دانلودهای پشتیبانی‌شده به دانلودمنیجر گوشی می‌روند؛ در نسخه‌های قدیمی‌تر از مرورگر استفاده می‌شود. فایل زیرنویس را می‌توان از انتخاب‌گر فایل گوشی انتخاب کرد.</p></details><details><summary>همهٔ فایل‌ها روی همهٔ دستگاه‌ها پخش می‌شوند؟</summary><p>خیر؛ اینترنت، در دسترس بودن منبع و پشتیبانی دستگاه از کدک مؤثرند. اگر نسخه‌ای پخش نشد، منبع یا کیفیت دیگری انتخاب کن. بعضی منابع به IP ایران نیاز دارند.</p></details><details><summary>نسخهٔ آیفون هم آماده است؟</summary><p>اپ iOS هنوز ساخته و منتشر نشده است. فعلاً می‌توانی در مرورگر آیفون از خود سایت سرونما استفاده کنی.</p></details></section>
    </main>
  </div>;
}
