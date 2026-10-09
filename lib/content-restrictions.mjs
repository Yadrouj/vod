// Keep this outside scraped data: catalog refreshes must not undo a takedown.
const ID = 'tt33184638';
const NAME = /(?:^|[^a-z0-9])paris[\s._-]*has[\s._-]*fallen(?=$|[^a-z])/i;
export function contentRestriction(value, depth = 0) {
  if (!value || depth > 4) return null;
  if (typeof value === 'object') {
    for (const field of ['id', 'itemId', 'imdbCode', 'title', 'originalTitle', 'url', 'sourceUrl', 'source', 'sources']) {
      const result = contentRestriction(value[field], depth + 1);
      if (result) return result;
    }
    if (Array.isArray(value)) for (const item of value) {
      const result = contentRestriction(item, depth + 1);
      if (result) return result;
    }
    return null;
  }
  let text = String(value);
  for (let i = 0; i < 2; i++) { try { text = decodeURIComponent(text); } catch { break; } }
  if (/(?:^|[^a-z0-9])tt33184638(?!\d)/i.test(text) || NAME.test(text)) return ID;
  try {
    const url = new URL(text, 'https://sarvnema.ir');
    for (const field of ['url', 'title', 'restricted']) if (contentRestriction(url.searchParams.get(field), depth + 1)) return ID;
    const encoded = url.searchParams.get('u');
    if (encoded && encoded.length < 20000) {
      const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
      if (contentRestriction(new TextDecoder().decode(bytes), depth + 1)) return ID;
    }
  } catch { /* Plain titles and malformed URLs are not download targets. */ }
  return null;
}

export function restrictionMessage(locale = 'en') {
  return locale === 'fa'
    ? 'به‌دلیل گزارش نقض حق نشر که از طرف Cloudflare به ما ارجاع شده، دانلود و پخش آنلاین «Paris Has Fallen» در سرونما غیرفعال شده است.'
    : 'Downloads and online playback of Paris Has Fallen have been disabled on SarvNema following a copyright complaint forwarded by Cloudflare.';
}

export function restrictionUrl() { return 'https://sarvnema.ir/download/continue?restricted=tt33184638'; }
