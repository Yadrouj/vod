// Imported explicitly by the isolated Linux CLI test. No real news/network IO.
const at = new Date(Date.now() - 3600_000).toUTCString();
const body = '<rss><channel>' + Array.from({ length: 10 }, (_, index) => `<item><title>خبر سینما نمونه ${index}</title><link>https://news-fixture.invalid/${index}</link><pubDate>${at}</pubDate></item>`).join('') + '</channel></rss>';
globalThis.fetch = async () => new Response(body, { headers: { 'content-type': 'application/rss+xml' } });
