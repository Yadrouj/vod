import { ArrowUpLeft, FileAudio, Film } from 'lucide-react';
import { DownloadButton } from './ui/download-animation';
import type { PublisherDownload } from '@/lib/publisher-download-types';
import type { Locale } from '@/lib/i18n';
import styles from './publisher-downloads.module.css';

export function PublisherDownloads({ downloads, itemId, title, locale }: { downloads: PublisherDownload[]; itemId: string; title: string; locale: Locale }) {
  if (!downloads.length) return null;
  const fa = locale === 'fa';
  return <section className={styles.panel} data-publisher-downloads aria-label={fa ? 'دانلود از ناشر گلوری' : 'Glory publisher downloads'}>
    <header><h2>{fa ? 'نسخه‌های ناشر · گلوری' : 'Publisher releases · Glory'}</h2><p>{fa ? 'فایل کامل و صوت دوبلهٔ جدا مشخص شده‌اند. صوت جدا به‌تنهایی فیلم نیست.' : 'Full videos and separate dub tracks are labelled. An audio track is not a full movie.'}</p></header>
    <div className={styles.list}>{downloads.map(file => <article key={file.url} className={styles.file}>
      <span className={styles.icon} aria-hidden="true">{file.kind === 'dub-audio' ? <FileAudio size={21} /> : <Film size={21} />}</span>
      <div className={styles.info}><strong>{file.kind === 'dub-audio' ? fa ? 'صوت دوبلهٔ جدا' : 'Separate dub audio' : file.kind === 'trailer' ? fa ? 'تریلر' : 'Trailer' : fa ? 'فایل کامل فیلم' : 'Full movie file'}{file.quality && <> · <bdi>{file.quality}</bdi></>}</strong>
        <small>{file.size && <><bdi>{file.size}</bdi> · </>}{file.availability === 'available' ? fa ? 'دسترسی فایل بررسی شده؛ پخش مرورگر تضمین نیست' : 'File checked; browser playback not guaranteed' : file.availability === 'unavailable' ? fa ? 'فایل در بررسی اخیر در دسترس نبود' : 'File unavailable at last check' : fa ? 'لینک ثبت شده؛ دسترسی فایل تأیید نشده' : 'Link recorded; availability unverified'}</small>
        <a href={file.sourceUrl} target="_blank" rel="noopener noreferrer">{fa ? 'صفحهٔ ناشر · گلوری' : 'Publisher page · Glory'}<ArrowUpLeft size={13} aria-hidden="true" /></a>
      </div>
      <DownloadButton href={file.url} itemId={itemId} title={title} quality={file.kind === 'dub-audio' ? fa ? 'صوت دوبلهٔ جدا' : 'Separate dub audio' : file.quality || undefined} label={file.kind === 'dub-audio' ? fa ? 'دانلود صوت' : 'Download audio' : fa ? 'دانلود از ناشر' : 'Publisher download'} />
    </article>)}</div>
  </section>;
}
