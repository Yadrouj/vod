import Link from 'next/link';
import type { SingerRecording } from '@/lib/creator-profile-types';
import styles from './creator-profiles.module.css';

export function SingerRecordings({recordings}:{recordings:SingerRecording[]}) {
  if (!recordings.length) return null;
  return <section className={`${styles.section} ${styles.portrait}`} data-singer-recordings>
    <h2>چند اثر برای آشنایی بیشتر</h2>
    <p className={styles.note}>نمونه‌هایی از انتشارهای تأییدشده، نه تمام ترانه‌ها یا رتبه‌بندی محبوبیت. مواردی که با آرشیو تطبیق پیدا نکرده‌اند فقط معرفی می‌شوند؛ برای آن‌ها لینکِ پخش یا دانلود نمی‌سازیم. نام، کاور و پیوندِ انتشار از Apple Music / iTunes است.</p>
    <div className={styles.records}>{recordings.map(recording=><article className={styles.record} key={recording.sourceUrl} data-recording-availability={recording.archiveTrackId?'available':'missing'}>
      <a href={recording.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${recording.title} در Apple Music`}><img src={recording.coverUrl} alt={`کاور ${recording.title}`} loading="lazy" decoding="async" /></a>
      <strong dir="auto">{recording.title}</strong><small dir="auto">{recording.album}</small><small>{recording.releasedAt?.slice(0,4)} · {recording.artistName}</small>
      {recording.archiveTrackId ? <Link href={`/music/${recording.archiveTrackId}`}>موجود در سرونما؛ شنیدن و اطلاعات ←</Link> : <mark>در آرشیو سرونما شناسایی نشد</mark>}
      <div><a href={recording.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${recording.title} در Apple Music`}><img className={styles.storeBadge} src="https://tools.applemediaservices.com/api/badges/listen-on-apple-music/badge/en-us?size=250x83" width="130" height="44" alt="Listen on Apple Music" loading="lazy" /></a></div>
    </article>)}</div>
  </section>;
}
