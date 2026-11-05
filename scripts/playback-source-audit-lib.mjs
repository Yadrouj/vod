// Read-only checks: a valid prefix is file availability, NOT a playback pass.
// Never follow a scraped redirect to an arbitrary/private host or login service.
const mediaHosts = /(?:^|\.)(?:abrtech\.top|tmk51\.ir\.cdn\.ir|moviesho\.com|musitraf\.com|upera\.tv|aparatchi-dlcenter\.top|varzeshha3-uploader\.top|cartoonet\.ir|yserver675mufdv\.top|zxupload6137hgv\.fun|ymizban324qwe\.top|tarahipro\.ir|mihandownload\.com|salamcinama\.ir|giamaramilla\.top|funofilm\.ir|filmeno\.net|zardfilm\.com|downloadsara\.pw|cinemasoren\.ir|aparat\.com)$/i;
// Exact CDN redirects observed during the audit, not arbitrary sibling hosts.
const observedEdges = new Set(['stream1007.hashureplus.com', 'stream1008.hashureplus.com', 'moviesho1.deemano.ir', 'moviesho.deemano.ir']);

export function approvedMediaAuditUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password
      && (!url.port || ['80', '443'].includes(url.port)) && (mediaHosts.test(url.hostname) || observedEdges.has(url.hostname));
  } catch { return false; }
}

export function mediaPrefixType(prefix) {
  if (prefix.subarray(0, 4).toString('hex') === '1a45dfa3') return 'matroska/webm';
  if (prefix.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  if (prefix.toString('ascii', 0, 4) === 'RIFF') return 'riff';
  if (prefix.toString('utf8').trimStart().startsWith('#EXTM3U')) return 'hls-manifest';
  return null;
}

export async function probePlaybackMedia(source, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
  const redirects = [];
  let current = source;
  try {
    for (let hop = 0; hop < 5; hop++) {
      if (!approvedMediaAuditUrl(current)) return { state: 'unapproved-host', redirects };
      const response = await fetchImpl(current, { redirect: 'manual', signal: controller.signal,
        headers: { Range: 'bytes=0-4095', 'user-agent': 'SarvNema-Playback-Audit/1.0' } });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        const next = new URL(location, current).href;
        redirects.push({ from: current, to: next, status: response.status });
        current = next; continue;
      }
      if (![200, 206].includes(response.status)) {
        await response.body?.cancel();
        return { state: [404, 410].includes(response.status) ? 'missing-sample' : 'http-unverified',
          status: response.status, finalUrl: current, redirects };
      }
      const reader = response.body?.getReader(); let prefix = Buffer.alloc(0);
      if (reader) try {
        while (prefix.length < 4096) {
          const part = await reader.read(); if (part.done) break;
          prefix = Buffer.concat([prefix, Buffer.from(part.value).subarray(0, 4096 - prefix.length)]);
        }
      } finally { await reader.cancel(); }
      const format = mediaPrefixType(prefix);
      return { state: format ? 'media-prefix-verified' : 'not-media', format,
        status: response.status, finalUrl: current, redirects, sampledBytes: prefix.length,
        contentRange: response.headers.get('content-range'), contentType: response.headers.get('content-type'),
        codecs: [...new Set(prefix.toString('latin1').match(/(?:V_(?:MPEG4\/ISO\/AVC|MPEGH\/ISO\/HEVC|AV1|VP[89])|A_(?:AAC|AC3|EAC3|DTS|OPUS|VORBIS))/g) || [])] };
    }
    return { state: 'redirect-limit', redirects };
  } catch (error) { return { state: 'network-unverified', error: error.message, redirects }; }
  finally { clearTimeout(timer); controller.abort(); }
}

// Stable, bounded sampling; different titles precede more qualities of one title.
export function addPlaybackSample(samples, sample, limit) {
  if (samples.some(row => row.url === sample.url)) return;
  samples.push(sample);
  samples.sort((a, b) => stableHash(a.url) - stableHash(b.url) || a.url.localeCompare(b.url));
  const titles = new Set(), diverse = [], remaining = [];
  for (const row of samples) {
    if (titles.has(row.itemId)) remaining.push(row);
    else { titles.add(row.itemId); diverse.push(row); }
  }
  samples.splice(0, samples.length, ...[...diverse, ...remaining].slice(0, limit));
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}
