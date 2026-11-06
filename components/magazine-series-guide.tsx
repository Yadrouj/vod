import Link from 'next/link';
import type { MagazineSeriesGuide as Guide } from '@/lib/magazine-types';
import styles from './magazine.module.css';

export function MagazineSeriesGuide({ guide, id }: { guide: Guide; id: string }) {
  const seasons = [...new Set(guide.episodes.map(row => row.season))];
  const rated = guide.episodes.filter(row => row.rating !== null);
  const high = [...rated].sort((a, b) => b.rating! - a.rating!)[0];
  const low = [...rated].sort((a, b) => a.rating! - b.rating!)[0];
  const date = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(new Date(guide.checkedAt));
  return <>
    <section id="series-cast"><h2>بازیگران و پروفایل آن‌ها در سرونما</h2>
      <div className={styles.seriesCast}>{guide.cast.map(person => <Link key={person.id} href={`/person/${person.id}`}>
        {person.image && <img src={person.image} alt="" width={64} height={80} loading="lazy" decoding="async" />}
        <span><strong dir="auto">{person.name}</strong><small>پروفایل و آثار مرتبط ←</small></span>
      </Link>)}</div>
    </section>
    <section id="series-episode-ratings"><h2>امتیاز IMDb قسمت‌به‌قسمت</h2>
      <p>تاریخ بررسی: {date} · {guide.ratedCount.toLocaleString('fa-IR')} قسمت با امتیاز ثبت‌شده. منبع هر عدد با کلیک روی آن باز می‌شود؛ داده‌ها از صفحات نمایه‌شدهٔ IMDb و آرشیوهای ارجاع‌دهنده به آن گرفته شده‌اند و ممکن است با امتیاز لحظه‌ای تفاوت داشته باشند. امتیاز تأییدنشده با «—» مشخص است.</p>
      {seasons.map(season => <details className={styles.episodeSeason} key={season}>
        <summary>فصل {season.toLocaleString('fa-IR')} · {guide.episodes.filter(row => row.season === season).length.toLocaleString('fa-IR')} قسمت</summary>
        <ol className={styles.episodeRatings}>{guide.episodes.filter(row => row.season === season).map(row => <li key={row.episode}>
          <span>قسمت {row.episode.toLocaleString('fa-IR')}</span>
          <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`امتیاز IMDb فصل ${season} قسمت ${row.episode}`} title={new URL(row.sourceUrl).hostname === 'www.imdb.com' ? 'منبع: IMDb' : `امتیاز IMDb به نقل از ${new URL(row.sourceUrl).hostname}`} dir="ltr">{row.rating === null ? '—' : `${row.rating.toFixed(1)} / 10`}</a>
          <Link href={`/watch/${id}?season=${season}&episode=${row.episode}`}>پخش</Link>
          <Link href={`/${id}?season=${season}&episode=${row.episode}#downloads`}>نسخه‌ها</Link>
        </li>)}</ol>
      </details>)}
    </section>
    <section id="series-audience"><h2>برداشت از رأی و نظر کاربران</h2>
      {guide.audienceSample && <aside><p>{guide.audienceSample.summary}</p><small>نمونه‌ای محدود از یک گفت‌وگو؛ نمایندهٔ همهٔ بینندگان نیست. متن منبع ممکن است اسپویل داشته باشد.</small><p><a href={guide.audienceSample.url} target="_blank" rel="noopener noreferrer">دیدن گفت‌وگو و نظرهای اصلی ↗</a></p></aside>}
      {high && low && <p>در داده‌های ثبت‌شده، فصل {high.season.toLocaleString('fa-IR')} قسمت {high.episode.toLocaleString('fa-IR')} با امتیاز {high.rating!.toLocaleString('fa-IR')} در بالای جدول و فصل {low.season.toLocaleString('fa-IR')} قسمت {low.episode.toLocaleString('fa-IR')} با {low.rating!.toLocaleString('fa-IR')} در پایین آن قرار دارد. این اختلاف، تفاوت استقبال رأی‌دهندگان را نشان می‌دهد؛ علت آن را باید در نقدهای متنی و خود اثر جست‌وجو کرد.</p>}
      <p>امتیاز کل سریال از رأی مستقل به خود مجموعه محاسبه می‌شود و میانگین حسابی قسمت‌ها نیست. رأی‌دهندگان هر قسمت نیز الزاماً یک گروه ثابت نیستند؛ پس از این جدول نمی‌توان درصد رضایت همهٔ بینندگان یا نظر قطعی مخاطبان فارسی‌زبان را نتیجه گرفت.</p>
      <a href={guide.audienceUrl} target="_blank" rel="noopener noreferrer">خواندن نقدهای متنی کاربران در IMDb ↗</a>
    </section>
  </>;
}
