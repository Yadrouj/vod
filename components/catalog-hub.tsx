import BrowsePage from '@/app/browse/page';
import { CATALOG_HUBS, type CatalogHub } from '@/lib/site-navigation';
import { titleMetadata } from '@/lib/seo';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export function catalogHubPage(kind: CatalogHub) {
  return async function CatalogHubPage({ searchParams }: Props) {
    const params = await searchParams;
    // Form submissions continue through /browse; the clean hub is the stable
    // entry page, not a second implementation of filtering or pagination.
    return <BrowsePage searchParams={Promise.resolve({ ...params, ...CATALOG_HUBS[kind].params })} />;
  };
}
export function catalogHubMetadata(kind: CatalogHub) {
  const hub = CATALOG_HUBS[kind];
  return titleMetadata({ title: hub.title, description: hub.description, pathname: hub.href });
}
