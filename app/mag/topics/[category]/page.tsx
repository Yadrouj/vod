import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MagazineCollection } from '@/components/magazine-collection';
import { MagazineNews } from '@/components/magazine-news';
import { loadMagazine } from '@/lib/magazine';
import { MAGAZINE_TOPICS } from '@/lib/magazine-topics';
import { titleMetadata } from '@/lib/seo';

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const topic = MAGAZINE_TOPICS[category];
  if (!topic) return { title: 'موضوع پیدا نشد', robots: { index: false, follow: true } };
  const index = await loadMagazine();
  return { ...titleMetadata({ title: `${topic.label}؛ مجله سرونما`, description: topic.description, pathname: `/mag/topics/${category}`, keywords: topic.keywords }), robots: { index: index.articles.some(a => a.category === category), follow: true } };
}
export default async function TopicPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!Object.hasOwn(MAGAZINE_TOPICS, category)) notFound();
  return <MagazineCollection index={await loadMagazine()} category={category} news={category === 'releases' ? <MagazineNews /> : undefined} />;
}
