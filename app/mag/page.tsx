import type { Metadata } from 'next';
import { MagazineCollection } from '@/components/magazine-collection';
import { MagazineNews } from '@/components/magazine-news';
import { IranBoxOffice } from '@/components/iran-box-office';
import { loadIranBoxOffice } from '@/lib/iran-box-office';
import { loadMagazine } from '@/lib/magazine';
import { titleMetadata } from '@/lib/seo';
import { BoxOfficeTabs } from '@/components/box-office-tabs';
import { WorldBoxOffice } from '@/components/world-box-office';
import { loadWorldBoxOffice } from '@/lib/world-box-office';

export const revalidate = 300;
export const metadata: Metadata = titleMetadata({ title: 'مجله سرونما؛ فیلم، سریال، موسیقی و جشنواره‌ها', description: 'هر روز یک مطلب دربارهٔ فیلم، سریال، موسیقی، هنرمندان و جشنواره‌ها؛ با منابع، پیشنهادهای مرتبط و لینک پخش، دانلود و تماشای همزمان.', pathname: '/mag', keywords: ['مجله فیلم و موسیقی', 'اخبار فیلم', 'اخبار سریال', 'پلی لیست موسیقی', 'تماشای همزمان', 'سرونما'] });
export default async function MagazinePage({ searchParams }: { searchParams: Promise<{ category?: string; boxOffice?: string }> }) {
  const [index, query, boxOffice, world] = await Promise.all([loadMagazine(), searchParams, loadIranBoxOffice(), loadWorldBoxOffice()]);
  return <MagazineCollection index={index} category={query.category} boxOffice={!query.category ? <BoxOfficeTabs initial={query.boxOffice} iran={<IranBoxOffice data={boxOffice} />} world={<WorldBoxOffice initial={world} observedNow={Date.now()} />} /> : undefined} news={!query.category || query.category === 'releases' ? <MagazineNews /> : undefined} />;
}
