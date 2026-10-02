import { loadMagazine } from '@/lib/magazine';
import { absoluteUrl, SITE_URL } from '@/lib/seo';
export const dynamic = 'force-dynamic';
const escape = (value: string) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
export async function GET() {
  const index = await loadMagazine();
  const entries = index.articles.slice(0, 50).map(article => `<item><title>${escape(article.title)}</title><link>${escape(absoluteUrl(`/mag/${article.slug}`))}</link><guid isPermaLink="true">${escape(absoluteUrl(`/mag/${article.slug}`))}</guid><description>${escape(article.description)}</description><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><category>${escape(article.categoryLabel)}</category></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>مجله سرونما</title><link>${SITE_URL}/mag</link><description>داستان‌های سینما، سریال و موسیقی</description><language>fa-ir</language>${entries}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
