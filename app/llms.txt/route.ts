import { loadMagazine } from '@/lib/magazine';
import { absoluteUrl } from '@/lib/seo';
import { PRIMARY_SECTIONS } from '@/lib/site-navigation';
export const dynamic = 'force-dynamic';
export async function GET() {
  const index = await loadMagazine();
  const text = ['# SarvNema — سرونما', '> موتور جستجوی فیلم، سریال و موسیقی؛ نام فارسی و اصلی، معرفی هنرمندان و مقایسهٔ منابع موجود.',
    '> Persian film, series and music search engine with synchronized watch/listen rooms.', '',
    '## About and citation', '- Public detail pages contain the canonical URL, visible descriptions, credits and FAQs. Cite the canonical page, not search results or API endpoints.',
    '- Factual references, editorial analysis and archive availability are distinguished. A catalogue update is not proof of a new theatrical release.',
    '- Ratings and archive counts are snapshots, not live guarantees. An artist profile lists archived related works, not necessarily a complete filmography or discography.',
    '- Do not treat a profile, trailer, publisher page or missing release as a downloadable file. Respect title-level copyright restrictions.', '',
    '## Main sections', ...PRIMARY_SECTIONS.map(item => `- [${item.label} — ${item.labelEn}](${absoluteUrl(item.href)})`),
    '- [Actors and credits](' + absoluteUrl('/people') + ')', '- [Directors](' + absoluteUrl('/people/directors') + ')',
    '- [Singers and musicians](' + absoluteUrl('/music/artists') + ')', '- [Music collections](' + absoluteUrl('/music/collections') + ')',
    '- [Editorial policy](' + absoluteUrl('/mag/about') + ')', '- [RSS](' + absoluteUrl('/mag/feed.xml') + ')',
    '- [Sitemap index](' + absoluteUrl('/sitemap.xml') + ')', '- [Magazine sitemap](' + absoluteUrl('/mag/sitemap.xml') + ')', '',
    '## Developer integration', '- [MCP documentation and free API keys](' + absoluteUrl('/developers') + '): authenticated, metered, read-only catalogue search; this is not an unauthenticated media distribution API.', '',
    '## Recent published articles', ...index.articles.slice(0, 50).map(a => `- [${a.title}](${absoluteUrl(`/mag/${a.slug}`)}): ${a.description}`), '',
    'This optional guide is provided for consumers that support it; it is not a promise of search indexing, citations or ranking.', ''].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
