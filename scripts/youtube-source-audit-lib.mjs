import { lookup } from 'node:dns/promises';

export function publicYouTubeAddress(address) {
  // DNS failure/filtering is not proof that any catalog video was deleted.
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized.includes(':')) return /^[23][0-9a-f]{0,3}:/.test(normalized);
  const octets = normalized.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const [a, b] = octets;
  return a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 169 && b === 254)
    && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168)
    && !(a === 100 && b >= 64 && b <= 127);
}

export async function youtubeNetworkState({ lookupImpl = lookup } = {}) {
  try {
    const answers = await lookupImpl('www.youtube.com', { all: true });
    return { state: answers.length && answers.every(row => publicYouTubeAddress(row.address)) ? 'public-dns' : 'non-public-dns',
      message: 'DNS reachability only; not proof of video availability, playback or download.' };
  } catch { return { state: 'dns-unverified' }; }
}

export async function probeYouTubeMetadata(videoId, { fetchImpl = fetch } = {}) {
  if (typeof videoId !== 'string' || videoId.length !== 11 || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return { state: 'invalid-id' };
  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('format', 'json'); url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  try {
    const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    if (!response.ok) { await response.body?.cancel(); return { state: 'metadata-unverified', status: response.status }; }
    const reader = response.body?.getReader(), decoder = new TextDecoder(); let text = '', bytes = 0;
    if (reader) try {
      while (bytes <= 65536) {
        const chunk = await reader.read(); if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 65536) return { state: 'response-too-large' };
        text += decoder.decode(chunk.value, { stream: true });
      }
    } finally { await reader.cancel(); }
    const data = JSON.parse(text + decoder.decode());
    return data.provider_name === 'YouTube' && typeof data.title === 'string' && data.title
      ? { state: 'metadata-visible', title: data.title, channel: data.author_name || null }
      : { state: 'metadata-unverified' };
  } catch { return { state: 'network-unverified' }; }
}
