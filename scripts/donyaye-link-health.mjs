import { donyayeLinkKey } from '../lib/donyaye-link-updates.mjs';

export async function probeDonyayeMedia(source, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  if (!donyayeLinkKey(source)) return { state: 'invalid-source' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = source;
    for (let redirect = 0; redirect < 5; redirect++) {
      const url = new URL(current);
      const approved = /^dls\d*\.(?:aparatchi-dlcenter|varzeshha3-uploader)\.top$/i.test(url.hostname)
        || /^st\d+\.cartoonet\.ir$/i.test(url.hostname)
        || /^stream100[78]\.hashureplus\.com$/i.test(url.hostname);
      if (!approved || !/^https?:$/.test(url.protocol) || url.username || url.password) return { state: 'unapproved-redirect' };
      const response = await fetchImpl(current, { redirect: 'manual', signal: controller.signal,
        headers: { Range: 'bytes=0-1023', 'user-agent': 'SarvNema-Link-Refresh/1.0' } });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel(); current = new URL(location, current).href; continue;
      }
      if (![200, 206].includes(response.status)) {
        await response.body?.cancel();
        return { state: [404, 410].includes(response.status) ? 'missing' : 'unverified', status: response.status, finalUrl: current };
      }
      const reader = response.body?.getReader();
      let prefix = Buffer.alloc(0);
      if (reader) try {
        while (prefix.length < 16) {
          const chunk = await reader.read(); if (chunk.done) break;
          prefix = Buffer.concat([prefix, Buffer.from(chunk.value).subarray(0, 16 - prefix.length)]);
        }
      } finally { await reader.cancel(); }
      const valid = prefix.subarray(0, 4).toString('hex') === '1a45dfa3'
        || prefix.toString('ascii', 4, 8) === 'ftyp' || prefix.toString('ascii', 0, 4) === 'RIFF';
      return { state: valid ? 'verified' : 'unverified', status: response.status, finalUrl: current,
        checkedAt: new Date().toISOString(), contentRange: response.headers.get('content-range') };
    }
    return { state: 'redirect-limit' };
  } catch (error) { return { state: 'network-unverified', error: error.message }; }
  finally { clearTimeout(timer); controller.abort(); }
}
