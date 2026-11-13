import { readFile } from 'node:fs/promises';
import { writeJsonAtomic } from './atomic-json.mjs';

const catalogue = JSON.parse(await readFile('public/data/music-index.json', 'utf8'));
const tracks = catalogue.tracks.filter(track => (track.artists || [track.artist]).some(artist => /^(سوسن|sousan|soosan|susan|sosan)$/i.test(artist?.name || '')));
const now = new Date().toISOString();
const page = 'https://avajavan.com/musics/ba-to-che-shab-ha';
const response = await fetch(page, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error('Remix publisher unavailable');
const html = (await response.text()).replace(/\\\//g, '/');
const audio = html.match(/https:\/\/dl\.avajavan\.com\/all\/[^"'<>\s\\]+\.mp3/)?.[0];
const cover = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
if (!audio || !/با تو چه شب/.test(html)) throw new Error('Remix identity or audio link missing');
const verified = [];
for (let index = 0; index < tracks.length; index += 5) {
  const batch = await Promise.all(tracks.slice(index, index + 5).map(async track => {
    try {
      const result = await fetch(track.sources[0].url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      return result.ok && /audio|octet-stream/i.test(result.headers.get('content-type') || '') ? track : null;
    } catch { return null; }
  }));
  verified.push(...batch.filter(Boolean));
}
const check = await fetch(audio, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
if (!check.ok || !/audio/i.test(check.headers.get('content-type') || '')) throw new Error('Remix audio verification failed');
const artist = { name: 'سوسن', slug: 'سوسن', aliases: ['sousan', 'soosan', 'susan', 'sosan'], sourceUrl: 'https://avajavan.com/artists/sosan' };
const remix = { id: 'editorial-sousan-ba-to-che-shabha-remix', title: 'با تو چه شب‌ها (ریمیکس)', persianTitle: 'با تو چه شب‌ها (ریمیکس)', kind: 'track', artist, artists: [artist], coverUrl: cover || null,
  description: 'ریمیکس «با تو چه شب‌ها» از سوسن؛ ناشر آن را با عنوان «ریمیکس ترند» معرفی کرده است. این معرفی به معنی تأیید رتبهٔ رسمی در اینستاگرام نیست.', sourceUrl: page, publishedAt: null, addedAt: now, category: 'ریمیکس', moods: ['سوسن', 'نوستالژی'], folder: { root: 'Music', year: null, month: null, day: null },
  sources: [{ url: audio, label: 'پخش از آواجوان', kind: 'stream', provider: 'avajavan', sourcePageUrl: page, checkedAt: now, available: true }] };
// Keep explicitly imported editorial releases across collection rebuilds.
const saved = JSON.parse(await readFile('lib/data/sousan-collection.json', 'utf8').catch(() => '{"tracks":[]}'));
const all = [...new Map([...saved.tracks.filter(track => track.id.startsWith('editorial-sousan-') && track.id !== remix.id), remix, ...verified].map(track => [track.id, track])).values()];
const collection = { id: 'sousan-collection', title: 'سوسن؛ خاطره‌ها و ریمیکس‌ها', scope: 'persian', mood: 'سوسن', description: 'مجموعهٔ آثار موجود سوسن با نام و لینک ناشر؛ همراه ریمیکس «با تو چه شب‌ها». موجودی فایل‌ها در زمان ساخت مجموعه بررسی شده است.', trackIds: all.map(track => track.id), covers: [...new Set(all.map(track => track.coverUrl).filter(Boolean))].slice(0, 4), artistCount: 1, updatedAt: now, selection: 'curated-mood' };
await writeJsonAtomic('lib/data/sousan-collection.json', { checkedAt: now, tracks: all, collection });
console.log(JSON.stringify({ originalCandidates: tracks.length, verifiedTracks: verified.length, total: all.length, remix: remix.id }));
