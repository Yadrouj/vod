import { sitemapPartCount } from '@/app/sitemap';
import { SITE_URL } from '@/lib/seo';
export const dynamic = 'force-dynamic';
const escape = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export async function GET() {
  const count = await sitemapPartCount();
  const urls = [...Array.from({ length: count }, (_, id) => `${SITE_URL}/sitemap/${id}.xml`), `${SITE_URL}/mag/sitemap.xml`];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<sitemap><loc>${escape(url)}</loc></sitemap>`).join('')}</sitemapindex>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
