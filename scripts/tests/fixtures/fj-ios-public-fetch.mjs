globalThis.fetch = async value => {
  const url = new URL(value);
  if (url.hostname === 'fj-ios.com' && url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /');
  throw new Error('The gated source must never be crawled beyond its robots policy');
};
