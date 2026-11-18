import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale } from '@/lib/server-locale';
import { loadVodIndex } from '@/lib/vod-index';
import { tvCard } from '@/lib/tv-catalog';
import { tvCollection, tvCollectionLabel, tvCollectionPage } from '@/lib/tv-collections';
import { TVPoster } from '@/components/tv/tv-cards';
import { TVBack } from '@/components/tv/tv-shell';

export default async function TVCollectionPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { id } = await params;
  const collection = tvCollection(id);
  if (!collection) notFound();
  const [locale, index, query] = await Promise.all([getLocale(), loadVodIndex(), searchParams]);
  const fa = locale === 'fa';
  const result = tvCollectionPage(index.items, id, typeof query.page === 'string' ? query.page : '1');
  const number = (value: number) => value.toLocaleString(locale);
  const href = (page: number) => `/tv/collection/${id}?page=${page}`;
  return <section className="tv-collection-page">
    <TVBack href="/tv#collections">{fa ? 'بازگشت به دسته‌بندی‌ها' : 'Back to collections'}</TVBack>
    <header className="tv-page-heading"><span className="tv-eyebrow">SARVNEMA COLLECTIONS</span>
      <h1>{tvCollectionLabel(collection, locale)}</h1>
      <p>{number(result.total)} {fa ? 'عنوان در آرشیو سرونما' : 'titles in the SarvNema catalog'} · {fa ? 'صفحهٔ' : 'Page'} {number(result.page)} / {number(result.totalPages)}</p>
    </header>
    {result.items.length ? <div className="tv-grid" data-tv-collection-grid={id}>
      {result.items.map((item, index) => <TVPoster key={item.imdbCode || item.id} initial={index === 0} item={tvCard(item, locale)} locale={locale} focusId={`collection-${id}-${item.imdbCode || item.id}`} />)}
    </div> : <p className="tv-empty">{fa ? 'هنوز عنوانی در این دسته نداریم؛ دسته‌های دیگر را ببین.' : 'No titles in this collection yet. Explore another collection.'}</p>}
    {result.totalPages > 1 && <nav className="tv-pagination" aria-label={fa ? 'صفحه‌های آرشیو' : 'Collection pages'}>
      {result.page > 1 && <Link className="tv-button" data-tv-focus="collection-previous" prefetch={false} href={href(result.page - 1)}>{fa ? 'صفحهٔ قبل' : 'Previous page'}</Link>}
      <span>{number(result.page)} / {number(result.totalPages)}</span>
      {result.page < result.totalPages && <Link className="tv-button" data-tv-focus="collection-next" prefetch={false} href={href(result.page + 1)}>{fa ? 'صفحهٔ بعد' : 'Next page'}</Link>}
    </nav>}
  </section>;
}
