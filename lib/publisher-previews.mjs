// Publisher pages sometimes expose only a trailer. Never advertise these as
// full-length releases; signed manifests are not stable downloadable files.
export function isVerifiedPublisherPreview(link) {
  try {
    const page = new URL(link.sourceUrl);
    const media = new URL(link.url);
    return page.hostname === 'zardfilm.in'
      && page.pathname === '/movie/wildwood-2026/'
      && media.hostname === 'www.aparat.com'
      && media.pathname === '/external/chelsea/manifest.m3u8';
  } catch { return false; }
}

export function publisherTrailerUrls(html) {
  const urls = new Set();
  // Explicitly labelled publisher trailer section, ending at its first video.
  // Do not infer trailer status from an arbitrary nearby navigation link.
  const section = /\bid=["']trailers["'][\s\S]*?<\/video>/i.exec(html)?.[0];
  for (const match of (section || '').matchAll(/<(?:source|video)\b[^>]*\bsrc=["']([^"']+)["']/gi)) urls.add(match[1]);
  return urls;
}
