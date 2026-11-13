import { readFile } from 'node:fs/promises';
import { writeJsonAtomic } from './atomic-json.mjs';

// A single user-requested release, not an unbounded crawl of the publisher.
const page = 'https://uptune.ir/music/17902/';
const response = await fetch(page, { signal: AbortSignal.timeout(15000) });
if (!response.ok) throw new Error(`Publisher page: HTTP ${response.status}`);
const html = (await response.text()).replace(/\\\//g, '/');
const audio = html.match(/https:\/\/dl\.uptune\.ir\/[^"'<>\s\\]+Susan[^"'<>\s\\]+\.mp3/)?.[0];
const cover = html.match(/https:\/\/uptune\.ir\/wp-content\/uploads\/[^"'<>\s\\]+\/Susan-Karde-Sallakhi\.jpg/)?.[0];
if (!audio || !cover || !html.includes('میخوام برم از این دیار')) throw new Error('Expected release identity or artwork missing');
const media = await fetch(audio, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(15000) });
if (!media.ok || !/audio|octet-stream/i.test(media.headers.get('content-type') || '')) { await media.body?.cancel(); throw new Error('Audio unavailable'); }
const reader = media.body.getReader();
const first = await reader.read();
await reader.cancel();
const bytes = first.value || [];
if (!(bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) && !(bytes[0] === 255 && (bytes[1] & 224) === 224)) throw new Error('Not an MP3 response');
const file = 'lib/data/sousan-collection.json';
const bundle = JSON.parse(await readFile(file, 'utf8'));
const now = new Date().toISOString();
const id = 'editorial-sousan-mikham-beram-az-in-diyar-remix';
const artist = { name: 'سوسن', slug: 'سوسن', aliases: ['sousan', 'soosan', 'susan', 'sosan'], sourceUrl: page };
const ai = /آهنگ هوش مصنوعی/.test(html);
const track = { id, title: 'می‌خوام برم از این دیار (کارد سلاخ؛ ریمیکس)', persianTitle: 'می‌خوام برم از این دیار (کارد سلاخ؛ ریمیکس)', kind: 'track', artist, artists: [artist], coverUrl: cover,
  description: `نسخهٔ معرفی‌شده با نام سوسن در آپ‌تیون، با نام دیگر «کارد سلاخ». ${ai ? 'ناشر این نسخه را در دستهٔ آهنگ هوش مصنوعی قرار داده است؛ انتساب اجرای آن به خوانندهٔ اصلی تأیید نشده است. ' : ''}به انتخاب کاربر در مجموعهٔ ترند اینستاگرام آمده؛ رتبه یا آمار رسمی اینستاگرام نیست.`,
  sourceUrl: page, publishedAt: html.match(/"datePublished"\s*:\s*"([^"<>]+)"/)?.[1] || null, addedAt: bundle.tracks.find(t => t.id === id)?.addedAt || now,
  category: 'ریمیکس', moods: ['سوسن', 'ترند اینستاگرام', ...(ai ? ['بازخوانی هوش مصنوعی'] : [])], folder: { root: 'Music', year: null, month: null, day: null },
  sources: [{ url: audio, quality: '320kbps', label: 'آپ‌تیون · 320kbps', kind: 'stream', provider: 'uptune', sourcePageUrl: page, available: true, checkedAt: now }] };
bundle.tracks = [track, ...bundle.tracks.filter(t => t.id !== id)];
bundle.checkedAt = now;
bundle.collection = { ...bundle.collection, trackIds: bundle.tracks.map(t => t.id), covers: [...new Set(bundle.tracks.map(t => t.coverUrl).filter(Boolean))].slice(0, 4), updatedAt: now,
  description: 'آثار موجود سوسن با نام و لینک ناشر، همراه نسخه‌های ریمیکس؛ نسخهٔ «می‌خوام برم از این دیار» در منبع با برچسب هوش مصنوعی آمده است.' };
await writeJsonAtomic(file, bundle);
console.log(JSON.stringify({ id, page, verifiedAudio: media.status, aiLabel: ai, collectionTracks: bundle.tracks.length }));
