import Link from 'next/link';
import { restrictionMessage } from '@/lib/content-restrictions.mjs';

export function ContentRestrictionNotice({ locale = 'en' }: { locale?: string }) {
  return <main dir={locale === 'fa' ? 'rtl' : 'ltr'} style={{ minHeight: '70svh', display: 'grid', placeItems: 'center', padding: 24 }}>
    <section role="alert" style={{ maxWidth: 560 }}>
      <h1>{locale === 'fa' ? 'دانلود و پخش غیرفعال است' : 'Downloads and playback disabled'}</h1>
      <p>{restrictionMessage(locale)}</p>
      <Link href="/tt33184638">{locale === 'fa' ? 'بازگشت به صفحهٔ سریال' : 'Back to title details'}</Link>
    </section>
  </main>;
}
