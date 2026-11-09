import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { escapeXml, sitemapXml } from "../../lib/sitemap-xml";
import config from '../../next.config';
import robots from '../../app/robots';
import { sitemapDate, sitemapUrl, normalizeSitemapEntries } from '../../lib/sitemap-values';

test("sitemap XML preserves image URLs, metadata and escaped query parameters", () => {
  const xml = sitemapXml([{ url: "https://sarvnema.ir/music/a?x=1&y=2", images: ["https://cdn.example/a&b.jpg"], lastModified: new Date("2026-11-01T00:00:00Z"), priority: 0.7, changeFrequency: "weekly" }]);
  assert.ok(xml.includes("x=1&amp;y=2")); assert.ok(xml.includes("a&amp;b.jpg"));
  assert.ok(xml.includes("2026-11-01T00:00:00.000Z")); assert.ok(xml.includes("xmlns:image="));
});

test("one root sitemap index has explicit paged handlers, not conflicting metadata routes", () => {
  assert.equal(existsSync("app/sitemap.ts"), false);
  assert.equal(existsSync("app/sitemap.xml/route.ts"), true);
  assert.equal(existsSync("app/sitemap/[id]/route.ts"), true);
});

test('invalid source timestamps and forbidden XML control characters cannot corrupt a sitemap', () => {
  const xml = sitemapXml([{ url: 'https://sarvnema.ir/a', lastModified: new Date('invalid'), images: ['https://cdn.example/a\u0001.jpg'] }]);
  assert.ok(!xml.includes('Invalid'));
  assert.ok(!xml.includes('<lastmod>'));
  assert.ok(!xml.includes('\u0001'));
  assert.equal(escapeXml('a\u0000&b'), 'a&amp;b');
});

test('root-level parts retain the existing handler and robots only needs the live index', async () => {
  assert.deepEqual(await config.rewrites!(), [{ source: '/sitemap-:id(\\d+).xml', destination: '/sitemap/:id.xml' }]);
  assert.ok((robots().sitemap as string[]).some(url => url.endsWith('/sitemap.xml')));
  assert.ok(!(robots().sitemap as string[]).some(url => /sitemap\/\d/.test(url)));
});

test('Search Console relative image examples become absolute locations', () => {
  const paths = ['/api/publisher-poster/tt0111161', '/media/moviesho/tt33472422/01-5df2280b06.jpg'];
  const xml = sitemapXml([{ url: '/tt0111161', images: paths }]);
  for (const path of paths) assert.ok(xml.includes(`<image:loc>https://sarvnema.ir${path}</image:loc>`));
  assert.equal(sitemapUrl('javascript:alert(1)'), undefined);
  assert.equal(sitemapUrl('https://user:secret@example.com/image.jpg'), undefined);
  assert.equal(sitemapUrl('/broken%ZZ.jpg'), undefined);
  assert.equal(sitemapUrl('//cdn.example/image with space.jpg'), 'https://cdn.example/image%20with%20space.jpg');
});

test('malformed provider years cannot appear as modification dates in any sitemap', () => {
  assert.equal(sitemapDate('0207-01-01T00:00:00.000Z'), undefined);
  assert.equal(sitemapDate('invalid'), undefined);
  assert.equal(sitemapDate('9999-01-01'), undefined);
  const rows = normalizeSitemapEntries([{ url: '/music/example', lastModified: '0207-01-01', images: ['/cover.jpg', 'data:image/png;base64,AAAA'] }]);
  assert.equal(rows[0].lastModified, undefined);
  assert.deepEqual(rows[0].images, ['https://sarvnema.ir/cover.jpg']);
  const [rule] = robots().rules as { allow: string[]; disallow: string[] }[];
  assert.ok(rule.allow.includes('/api/publisher-poster/'));
  assert.ok(rule.disallow.includes('/api/'));
});
