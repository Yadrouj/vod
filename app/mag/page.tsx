import type { Metadata } from 'next';
import { MagazineCollection } from '@/components/magazine-collection';
import { MagazineNews } from '@/components/magazine-news';
import { loadMagazine } from '@/lib/magazine';
import { titleMetadata } from '@/lib/seo';

export const revalidate = 300;
export const metadata: Metadata = titleMetadata({ title: 'مجله سرونما؛ فیلم، سریال، موسیقی و جشنواره‌ها', description: 'هر روز یک مطلب دربارهٔ فیلم، سریال، موسیقی، هنرمندان و جشنواره‌ها؛ با منابع، پیشنهادهای مرتبط و لینک پخش، دانلود و تماشای همزمان.', pathname: '/mag', keywords: ['مجله فیلم و موسیقی', 'اخبار فیلم', 'اخبار سریال', 'پلی لیست موسیقی', 'تماشای همزمان', 'سرونما'] });
export default async function MagazinePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [index, query] = await Promise.all([loadMagazine(), searchParams]);
  return <MagazineCollection index={index} category={query.category} news={!query.category || query.category === 'releases' ? <MagazineNews /> : undefined} />;
}
