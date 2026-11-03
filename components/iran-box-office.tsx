/* eslint-disable @next/next/no-img-element -- Primary-source posters, without a runtime image proxy. */
import type { DailyBoxOfficeMetric, IranBoxOfficeView, CinemaTicketPrice } from '@/lib/iran-box-office';
import styles from './iran-box-office.module.css';

const number = (value: number, digits = 0) => value.toLocaleString('fa-IR', { maximumFractionDigits: digits });
function money(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${number(value / 1_000_000_000, 1)} میلیارد تومان`;
  if (Math.abs(value) >= 1_000_000) return `${number(value / 1_000_000, 1)} میلیون تومان`;
  return `${number(value, 1)} تومان`;
}
const date = (value: string) => new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', month: 'long', day: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
const timestamp = (value: string) => new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function Growth({ metric }: { metric?: DailyBoxOfficeMetric }) {
  if (!metric) return <span className={styles.noComparison}>دادهٔ دو روز موجود نیست</span>;
  const direction = metric.deltaToman > 0 ? styles.up : metric.deltaToman < 0 ? styles.down : styles.flat;
  return <span className={`${styles.growth} ${direction}`}>
    {metric.changePercent === null ? 'مبنای درصدی ندارد' : <bdi dir="ltr">{metric.changePercent > 0 ? '+' : ''}{number(metric.changePercent, 1)}٪</bdi>}
    <small>{metric.deltaToman > 0 ? '+' : metric.deltaToman < 0 ? '−' : ''}{money(Math.abs(metric.deltaToman))}</small>
  </span>;
}
function TicketPrice({ value }: { value: CinemaTicketPrice }) {
  return <a className={styles.ticket} href={value.sourceUrl} target="_blank" rel="noopener noreferrer">
    بلیت: {money(value.minToman)}{value.maxToman !== null && value.maxToman !== value.minToman ? ` تا ${money(value.maxToman)}` : ''}
    <small>نمونهٔ {number(value.sampleSessions)} سانس در {number(value.sampleCinemas)} سینما · مشاهدهٔ منبع ↗</small>
  </a>;
}

export function IranBoxOffice({ data }: { data: IranBoxOfficeView | null }) {
  const usable = data && data.freshness !== 'expired' ? data : null;
  const comparison = usable?.comparison;
  const metrics = new Map(comparison?.films.map(film => [film.id, film]) ?? []);
  const lead = usable?.films[0];
  const hasPrices = usable?.films.some(film => film.ticketPrice);
  const reportedSessions = usable?.films.reduce((total, film) => total + film.scheduleCount, 0) ?? 0;
  const leaderTicketShare = lead && usable && usable.totals.admissions > 0 ? lead.admissions / usable.totals.admissions * 100 : null;
  const ticketsPerSession = usable && reportedSessions > 0 ? usable.totals.admissions / reportedSessions : null;
  const dailyTicketDelta = comparison ? comparison.totals.admissions - comparison.totals.previousAdmissions : null;
  const dailyTicketPercent = comparison && comparison.totals.previousAdmissions > 0 ? (comparison.totals.admissions - comparison.totals.previousAdmissions) / comparison.totals.previousAdmissions * 100 : null;
  return <section id="iran-box-office" className={styles.panel} aria-labelledby="iran-box-office-heading" data-iran-box-office dir="rtl">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>گزارش رسمی گیشه · مستقل از اخبار</p><h2 id="iran-box-office-heading">سینمای ایران، به روایت گیشه</h2>
        <p className={styles.subtitle}>{data ? `فروش تجمیعی اکران ${number(Number(data.source.screeningId))} · همهٔ استان‌ها` : 'فروش، تعداد بلیت و تغییر روزانه؛ فقط با دادهٔ قابل استناد'}</p></div>
      <a className={styles.source} href="https://samfaa.ir/" target="_blank" rel="noopener noreferrer">منبع: سمفا ↗</a>
    </header>
    {!usable ? <p className={styles.notice}>{data?.freshness === 'expired'
      ? `آخرین مشاهده در ${timestamp(data.observedAt)} است و بیش از ۱۴ روز قدمت دارد. نمایش ارقام تا دریافت گزارش معتبر تازه متوقف شده است.`
      : 'گزارش معتبر گیشه هنوز در دسترس نیست. تا دریافت دادهٔ رسمی، رقمی یا رشد روزانه‌ای نمایش نمی‌دهیم.'}</p> : <>
      <div className={styles.asOf}><span className={usable.freshness === 'stale' ? styles.stale : styles.fresh}>{usable.freshness === 'stale' ? 'آخرین گزارش ثبت‌شده؛ نیازمند تازه‌سازی' : 'آخرین مشاهدهٔ منبع'}</span><time dateTime={usable.observedAt}>{timestamp(usable.observedAt)} · به وقت تهران</time></div>
      <div className={styles.summary}>
        <div><span>فروش تجمیعی فیلم‌های گزارش</span><strong>{money(usable.totals.cumulativeToman)}</strong></div>
        <div><span>تعداد بلیت گزارش‌شده</span><strong>{number(usable.totals.admissions)} <small>بلیت</small></strong></div>
        <div><span>{comparison ? `فروش روز کامل ${date(comparison.period.date)}` : 'مقایسهٔ دو روز کامل'}</span><strong>{comparison ? money(comparison.totals.revenueToman) : 'در انتظار دادهٔ قابل مقایسه'}</strong>{comparison && <Growth metric={comparison.totals} />}</div>
      </div>
      <div className={styles.period}><b>تغییر روزانه، نه تغییر فروش تجمیعی</b>
        <p>{comparison ? `مقایسهٔ روز کامل ${date(comparison.period.date)} با ${date(comparison.previousPeriod.date)}؛ هر دو به وقت تهران. فروش امروزِ ناتمام در این مقایسه نیست.` : 'تا تأیید دو درخواست با تاریخ مشخص برای روزهای کامل، درصد رشد روزانه محاسبه نمی‌شود.'}</p>
        {comparison && usable.dailyStatus?.state === 'retained' && <p className={styles.stale}>دریافت مقایسهٔ تازه ناموفق بود؛ مقایسهٔ قبلی با تاریخ اصلی حفظ شده است.</p>}
      </div>
      <ol className={styles.leaders} aria-label="صدرنشین‌های فروش تجمیعی">{usable.films.slice(0, 4).map(film => <li className={styles.film} key={film.id}>
        <div className={styles.poster}>{film.posterUrl ? <img src={film.posterUrl} width={180} height={270} alt={`پوستر ${film.title}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span>پوستر در دسترس نیست</span>}<b aria-label={`رتبهٔ ${number(film.rank)}`}>{number(film.rank)}</b></div>
        <div className={styles.filmCopy}><h3>{film.title}</h3><p>{film.directors.join('، ') || 'کارگردان ثبت نشده'}</p><strong>{money(film.cumulativeToman)}</strong><span className={styles.admissions}>{number(film.admissions)} بلیت</span>
          <div className={styles.daily}><span>تغییر فروش روزانه</span><Growth metric={metrics.get(film.id)} /></div>{film.ticketPrice && <TicketPrice value={film.ticketPrice} />}</div>
      </li>)}</ol>
      <div className={styles.analysis} aria-label="تحلیل مخاطب بر پایهٔ بلیت و سانس"><h3>تحلیل مخاطب؛ فقط به اندازهٔ داده‌ها</h3>
        {lead && usable.totals.cumulativeToman > 0 && <p>«{lead.title}» با سهم {number(lead.cumulativeToman / usable.totals.cumulativeToman * 100, 1)}٪ از فروش تجمیعی فیلم‌های این گزارش در رتبهٔ نخست است.</p>}
        <ul>
          {lead && leaderTicketShare !== null && <li>سهم «{lead.title}» از تعداد بلیت‌های گزارش‌شده: <b>{number(leaderTicketShare, 1)}٪</b>.</li>}
          {ticketsPerSession !== null && <li>میانگین بلیت به ازای هر سانسِ گزارش‌شده: <b>{number(ticketsPerSession, 1)}</b>؛ بر پایهٔ {number(usable.totals.admissions)} بلیت و {number(reportedSessions)} سانس.</li>}
          {comparison && dailyTicketDelta !== null && <li>تغییر تعداد بلیت روز کامل {date(comparison.period.date)} نسبت به {date(comparison.previousPeriod.date)}: <bdi dir="ltr">{dailyTicketDelta > 0 ? '+' : ''}{number(dailyTicketDelta)}</bdi> بلیت{dailyTicketPercent !== null && <> (<bdi dir="ltr">{dailyTicketPercent > 0 ? '+' : ''}{number(dailyTicketPercent, 1)}٪</bdi>)</>}.</li>}
        </ul>
        <p>این ارقام تعداد بلیت‌اند، نه افراد یکتا یا نرخ پُرشدن سالن. داده‌ای برای تحلیل سن، جنسیت یا سایر ویژگی‌های جمعیتی نداریم؛ از قیمت‌های نمونهٔ سینماتیکت نیز مخاطب سراسری استنباط نمی‌شود.</p>
      </div>
      <details className={styles.details}><summary>جدول کامل {number(usable.films.length)} فیلم و تغییر فروش روزانه</summary>
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="جدول گیشه؛ برای دیدن همهٔ ستون‌ها پیمایش کنید"><table className={styles.table}>
          <caption>رتبه‌بندی بر اساس فروش تجمیعی اکران {number(Number(usable.source.screeningId))}؛ مبلغ‌ها به تومان</caption>
          <thead><tr><th scope="col">فیلم / رتبه</th><th scope="col">فروش تجمیعی (تومان)</th><th scope="col">تعداد بلیت</th><th scope="col">{comparison ? `فروش ${date(comparison.period.date)} (تومان)` : 'فروش روز کامل'}</th><th scope="col">تغییر روزانه</th>{hasPrices && <th scope="col">قیمت بلیت</th>}</tr></thead>
          <tbody>{usable.films.map(film => { const daily = metrics.get(film.id); return <tr key={film.id}>
            <th scope="row"><span className={styles.tableTitle}><b>{number(film.rank)}</b>{film.title}</span></th>
            <td>{number(film.cumulativeToman, 1)}</td><td>{number(film.admissions)}</td><td>{daily ? number(daily.revenueToman, 1) : '—'}</td><td><Growth metric={daily} /></td>{hasPrices && <td>{film.ticketPrice ? <TicketPrice value={film.ticketPrice} /> : 'ثبت نشده'}</td>}
          </tr>; })}</tbody>
        </table></div>
      </details>
      <footer className={styles.notes}><p>مبنای سمفا ریال است؛ مبلغ‌ها با تقسیم بر ۱۰ به تومان تبدیل شده‌اند. «تعداد بلیت» به معنی تعداد افراد یکتا نیست. آمار روزهای گذشته نیز ممکن است در منبع اصلاح شود.</p>
        {hasPrices && <p>قیمت بلیت از سینماتیکت: نمونه سانس‌های قابل خرید امروز؛ قیمت بسته به سینما و سانس متفاوت است. این نمونه‌ها مبنای آمار سراسری مخاطبان نیستند.</p>}
        {usable.ticketStatus && ['unavailable', 'partial'].includes(usable.ticketStatus.state) && <p>دریافت بخشی از قیمت‌های بلیت ممکن نشد؛ قیمت ناموجود برآورد یا با نمونهٔ روز قبل جایگزین نمی‌شود.</p>}
        <nav aria-label="منابع آمار گیشه"><a href={usable.source.reportUrl} target="_blank" rel="noopener noreferrer">گزارش تجمیعی سمفا ↗</a>{comparison?.sourceUrls.map((url, i) => <a href={url} key={url} target="_blank" rel="noopener noreferrer">دادهٔ {date(i === 0 ? comparison.period.date : comparison.previousPeriod.date)} ↗</a>)}</nav>
      </footer>
    </>}
  </section>;
}
