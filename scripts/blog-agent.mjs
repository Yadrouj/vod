import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { firstMonth } from '../content/magazine/first-month.mjs';
import { tehranClock } from './lib/telegram-publishing-schedule.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';

const read = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } };
const compact = value => String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const synopsis = item => {
  const persian = compact(item.persianOverview);
  const value = (persian.match(/دانلود|بدون سانسور/g)?.length ?? 0) > 1 ? compact(item.overview) : persian || compact(item.overview);
  return value.split(/\s+/).slice(0, 45).join(' ');
};
export const countWords = value => compact(value).split(/\s+/u).filter(Boolean).length;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function parseManuscript(text) {
  const blocks = text.trim().split(/\r?\n\s*\r?\n/u);
  const sections = []; let intro = ''; let current;
  for (const block of blocks) {
    if (/^## /u.test(block)) {
      current = { id: `section-${sections.length + 1}`, title: block.slice(3).trim(), paragraphs: [] };
      sections.push(current);
    } else if (!intro && !current) intro = compact(block);
    else if (current) current.paragraphs.push(compact(block));
    else intro += ` ${compact(block)}`;
  }
  if (!intro || sections.length < 4 || sections.some(s => !s.paragraphs.length)) throw new Error('Article needs an introduction and at least four complete sections');
  return { intro, sections };
}

export function validateArticle(article) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) throw new Error('Invalid article slug');
  const text = [article.intro, ...article.sections.flatMap(s => s.paragraphs), ...article.faqs.flatMap(f => [f.question, f.answer]), ...article.media.map(m => m.description)].join(' ');
  const wordCount = countWords(text);
  if (wordCount < 850 || wordCount > 1500) throw new Error(`${article.slug}: ${wordCount} words; target is 850–1500`);
  if (article.sections.length < 4 || article.keywords.length < 3 || !article.sources.length || article.faqs.length < 2) throw new Error('Editorial fields missing');
  if (/TODO|PLACEHOLDER|لروم ایپسوم|lorem ipsum/i.test(text)) throw new Error('Unfinished manuscript');
  for (const source of article.sources) if (!/^https:\/\//.test(source.url)) throw new Error('Reference must use HTTPS');
  for (const item of article.media) for (const name of ['detail', 'play', 'together', 'download']) if (!item[name].startsWith('/') || item[name].startsWith('//')) throw new Error('Media links must stay on SarvNema');
  return { ...article, wordCount, readingMinutes: Math.max(1, Math.ceil(wordCount / 180)) };
}

export function selectMedia(seed, vod, music, updates, trending, now = new Date()) {
  let films = [];
  const episodeEvents = new Map();
  const selectors = seed.selectors ?? [];
  if (selectors.includes('trends')) {
    const ranks = new Map();
    for (const chart of Object.values(trending?.charts ?? {})) {
      const observed = Date.parse(chart.observedAt);
      if (!Number.isFinite(observed) || observed > now.valueOf() || now.valueOf() - observed > 7 * 86400000) continue;
      for (const item of chart.items ?? []) if (item.card?.imdbCode && item.card.linksCount > 0) ranks.set(item.card.imdbCode, Math.min(ranks.get(item.card.imdbCode) ?? Infinity, item.rank));
    }
    films = (vod.items ?? []).filter(t => ranks.has(t.imdbCode)).sort((a, b) => ranks.get(a.imdbCode) - ranks.get(b.imdbCode)).slice(0, 5);
  } else if (selectors.includes('updates')) {
    for (const event of [...(updates.items ?? [])].filter(e => e.status === 'available' && e.kind === 'episode' && Number.isInteger(e.season) && Number.isInteger(e.episode) && e.season > 0 && e.episode > 0 && Date.parse(e.eventAt) <= now.valueOf() && now.valueOf() - Date.parse(e.eventAt) <= 7 * 86400000).sort((a, b) => b.eventAt.localeCompare(a.eventAt))) {
      if (!episodeEvents.has(event.imdbCode)) episodeEvents.set(event.imdbCode, event);
      if (episodeEvents.size >= 5) break;
    }
    const catalog = new Map((vod.items ?? []).map(t => [t.imdbCode, t]));
    films = [...episodeEvents.keys()].map(id => catalog.get(id)).filter(t => t?.linksCount > 0);
  } else for (const query of selectors.filter(q => !q.startsWith('music-'))) {
    const exact = (vod.items ?? []).find(t => String(t.title).toLowerCase() === query.toLowerCase() && t.linksCount > 0);
    if (exact && !films.some(t => t.imdbCode === exact.imdbCode)) films.push(exact);
  }
  const media = films.map(item => {
    const detail = `/${encodeURIComponent(item.imdbCode)}`;
    const event = episodeEvents.get(item.imdbCode);
    const play = `/watch/${encodeURIComponent(item.imdbCode)}${event ? `?season=${event.season}&episode=${event.episode}` : ''}`;
    const title = compact(item.persianTitle || item.title).replace(/^دانلود\s+(?:فیلم|سریال)\s+/u, '');
    const description = event ? `فصل ${event.season}، قسمت ${event.episode} در به‌روزرسانی ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(event.eventAt))} به عنوان دارای لینک در آرشیو ثبت شد. کیفیت‌های ثبت‌شده: ${(event.qualities ?? []).join('، ')}. این تاریخ مربوط به کشف لینک است، نه لزوماً پخش اولیهٔ قسمت.` : synopsis(item) || 'برای آشنایی با داستان، عوامل و نسخه‌های موجود، صفحهٔ این اثر را باز کنید.';
    return { id: item.imdbCode, kind: /series|tv/i.test(item.type) ? 'series' : 'movie', title, year: item.year, rating: item.imdbRating, image: event?.imageUrl || item.posterUrl || item.backdropUrl, description, detail, play, together: `${play}${event ? '&' : '?'}together=1`, download: `${detail}#downloads` };
  });
  if (selectors.some(q => q.startsWith('music-'))) {
    const artist = selectors.includes('music-ebi') ? /^(ebi|ابی)$/i : selectors.includes('music-googoosh') ? /^(googoosh|گوگوش)$/i : null;
    const songs = (music.tracks ?? []).filter(t => t.kind === 'track' && t.sources?.some(s => s.available !== false) && (!artist || (t.artists ?? [t.artist]).some(a => a && (artist.test(a.name) || artist.test(a.slug)))));
    const unique = new Map();
    for (const track of songs) { if (!artist && unique.has(track.artist?.slug)) continue; unique.set(artist ? track.id : track.artist?.slug, track); if (unique.size >= 5) break; }
    for (const track of unique.values()) {
      const detail = `/music/${encodeURIComponent(track.id)}`;
      media.push({ id: track.id, kind: 'music', title: track.persianTitle || track.title, description: `اثر ${track.artists?.map(a => a.name).join('، ') || track.artist?.name}؛ برچسب‌های آرشیو: ${(track.moods ?? [track.category]).join('، ')}. نسخه و کیفیت را در صفحهٔ آهنگ انتخاب کنید.`, image: track.coverUrl, detail, play: detail, together: `${detail}?together=1`, download: `${detail}#downloads` });
    }
  }
  return media;
}

export async function prepareQueue({ dataDir = process.env.VOD_DATA_DIR || 'public/data', contentDir = 'content/magazine', now = new Date() } = {}) {
  const [vod, music, library, updates, trending] = await Promise.all([
    read(path.join(dataDir, 'vod-index.json'), { items: [] }), read(path.join(dataDir, 'music-index.json'), { tracks: [] }), read(path.join(dataDir, 'melodify-library.json'), { tracks: [] }), read(path.join(dataDir, 'vod-updates.json'), { items: [] }), read(path.join(dataDir, 'imdb-trending.json'), {}),
  ]);
  music.tracks = [...new Map([...(library.tracks ?? []), ...(music.tracks ?? [])].map(t => [t.id, t])).values()];
  const drafts = [];
  for (const seed of firstMonth) {
    const manuscript = await readFile(path.join(contentDir, seed.manuscript), 'utf8');
    const body = parseManuscript(manuscript);
    const faqs = [
      { question: 'از این مطلب چطور به پخش و دانلود برسم؟', answer: 'پایین مطلب، آثار مرتبطِ موجود در آرشیو سرونما نمایش داده می‌شوند. با «پخش آنلاین» وارد پلیر می‌شوید؛ «دانلود و کیفیت‌ها» نسخه‌های موجود را نشان می‌دهد. بعد از انتخاب فایل، صفحهٔ اختصاصی دانلود پنج ثانیه می‌ماند و سپس لینک اصلی را باز می‌کند. اگر اثری فعلاً کارت ندارد، نامش را در جست‌وجوی سایت بررسی کنید.' },
      { question: seed.category === 'music' ? 'می‌توانم آهنگ را همراه دوستانم بشنوم؟' : 'می‌توانم این اثر را همراه دوستانم ببینم؟', answer: seed.category === 'music' ? 'بله؛ از صفحهٔ آهنگ، گزینهٔ شنیدن همزمان را باز کنید، اتاق بسازید و لینک دعوت را برای دوستانتان بفرستید. هرکس پخش را روی دستگاه خودش دریافت می‌کند. انتخاب کیفیت و بازبودن منبع برای همهٔ اعضا مهم است؛ قبل از شروع یک بخش کوتاه را امتحان کنید.' : 'در آثار دارای منبع قابل پخش، گزینهٔ تماشای همزمان امکان ساخت اتاق و دعوت دوستان را دارد. برای سریال، فصل و قسمت را یکسان انتخاب کنید. زیرنویس و کیفیت هر نفر می‌تواند متناسب با دستگاهش تنظیم شود؛ شروع، توقف و جابه‌جایی زمان در اتاق هماهنگ می‌شود.' },
    ];
    const media = selectMedia(seed, vod, music, updates, trending, now);
    const sources = [...seed.sources];
    if (seed.selectors.includes('trends')) for (const chart of Object.values(trending?.charts ?? {})) {
      const observed = Date.parse(chart.observedAt);
      if (media.length && Number.isFinite(observed) && observed <= now.valueOf() && now.valueOf() - observed <= 7 * 86400000 && /^https:\/\/www\.imdb\.com\/chart\//.test(chart.sourceUrl ?? '')) sources.push({ title: 'فهرست محبوبیت IMDb · زمان مشاهدهٔ رتبه‌ها', url: chart.sourceUrl, checkedAt: chart.observedAt });
    }
    const article = validateArticle({ ...seed, ...body, sources, description: body.intro.slice(0, 170), author: 'تحریریه سرونما', faqs, media, publishedAt: '', modifiedAt: now.toISOString() });
    drafts.push({ ...article, manuscriptHash: hash(manuscript), preparedAt: now.toISOString() });
  }
  return drafts;
}

export function chooseDailyDraft(drafts, state, now, hour = 9) {
  const clock = tehranClock(now);
  if (clock.hour < hour || state.publishedDates?.[clock.dateKey]) return null;
  return drafts.find(d => !state.publishedSlugs?.[d.slug]) || null;
}

export async function runBlogAgent({ publish = false, validate = false, kernelLocked = false, bootstrap = false, indexing = true, now = new Date(), stateDir = process.env.BLOG_STATE_DIR || '.media-cache/blog-agent', dataDir = process.env.VOD_DATA_DIR || 'public/data', contentDir = 'content/magazine' } = {}) {
  if (validate) publish = false;
  const directory = path.resolve(stateDir);
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, 'agent.lock');
  const lock = kernelLocked ? null : await open(lockPath, 'wx');
  try {
    const drafts = await prepareQueue({ dataDir, contentDir, now });
    const stateFile = path.join(directory, 'state.json');
    const state = await read(stateFile, { publishedDates: {}, publishedSlugs: {} });
    state.publishedDates ??= {}; state.publishedSlugs ??= {}; state.indexedSlugs ??= {};
    if (publish) {
      const keyFile = path.join(directory, 'indexnow.json');
      if (!await read(keyFile, null)) await writeJsonAtomic(keyFile, { key: randomBytes(16).toString('hex') });
    }
    const indexFile = path.join(dataDir, 'magazine.json');
    const index = await read(indexFile, { version: 1, articles: [], updatedAt: '' });
    for (const a of index.articles) { state.publishedSlugs[a.slug] = a.publishedAt; state.publishedDates[tehranClock(a.publishedAt).dateKey] = a.slug; }
    const hour = Number(process.env.BLOG_PUBLISH_HOUR || 9);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('BLOG_PUBLISH_HOUR must be an integer from 0 to 23');
    const draft = chooseDailyDraft(drafts, state, now, bootstrap && !index.articles.length ? 0 : hour);
    if (publish && draft) {
      const article = { ...draft, publishedAt: now.toISOString(), modifiedAt: now.toISOString() };
      delete article.manuscript; delete article.manuscriptHash; delete article.preparedAt; delete article.selectors; delete article.primaryKeyword;
      index.articles.push(article); index.updatedAt = now.toISOString();
      await writeJsonAtomic(indexFile, index);
      state.publishedSlugs[draft.slug] = article.publishedAt;
      state.publishedDates[tehranClock(now).dateKey] = draft.slug;
      await writeJsonAtomic(stateFile, state);
      state.indexingPending = [...new Set([...(state.indexingPending ?? []), `/mag/${draft.slug}`, `/mag/topics/${draft.category}`, '/mag'])];
      await writeJsonAtomic(stateFile, state);
      console.log(JSON.stringify({ published: draft.slug, words: draft.wordCount, url: `https://sarvnema.ir/mag/${draft.slug}` }));
    }
    if (publish) {
      const unindexed = index.articles.filter(a => !state.indexedSlugs[a.slug]);
      if (unindexed.length) state.indexingPending = [...new Set([...(state.indexingPending ?? []), ...unindexed.flatMap(a => [`/mag/${a.slug}`, `/mag/topics/${a.category}`]), '/mag'])];
    }
    if (publish && indexing && state.indexingPending?.length && (!Number.isFinite(Date.parse(state.indexingRetryAt)) || now.valueOf() - Date.parse(state.indexingRetryAt) >= 15 * 60_000)) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sarvnema.ir').replace(/\/$/, '');
      const { key } = await read(path.join(directory, 'indexnow.json'), {});
      try {
        const keyLocation = `${site}/indexnow-key.txt`;
        const check = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
        if (!check.ok || (await check.text()).trim() !== key) throw new Error('Public IndexNow key is not deployed yet');
        const response = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: new URL(site).hostname, key, keyLocation, urlList: state.indexingPending.map(url => new URL(url, site).href) }), signal: AbortSignal.timeout(15000) });
        if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned ${response.status}`);
        state.indexingPending = []; state.lastIndexing = { status: response.status, submittedAt: now.toISOString() }; delete state.indexingError;
        for (const article of index.articles) state.indexedSlugs[article.slug] = now.toISOString();
      } catch (error) { state.indexingError = error.message; console.warn(error.message); }
      state.indexingRetryAt = now.toISOString();
      await writeJsonAtomic(stateFile, state);
    }
    if (!validate) {
      await writeJsonAtomic(path.join(directory, 'queue.json'), { preparedAt: now.toISOString(), drafts });
      await writeJsonAtomic(path.join(directory, 'calendar.json'), { timeZone: 'Asia/Tehran', hour: Number(process.env.BLOG_PUBLISH_HOUR || 9), topics: drafts.map((d, i) => ({ day: i + 1, slug: d.slug, title: d.title, category: d.categoryLabel, primaryKeyword: d.primaryKeyword, keywords: d.keywords, words: d.wordCount, status: state.publishedSlugs[d.slug] ? 'published' : 'queued' })) });
    }
    const remaining = drafts.filter(d => !state.publishedSlugs[d.slug]);
    const result = { checkedAt: now.toISOString(), published: index.articles.length, queued: remaining.length, next: remaining[0]?.slug || null, timeZone: 'Asia/Tehran', hour, exhausted: remaining.length === 0, indexingPending: state.indexingPending?.length || 0, indexingError: state.indexingError || null, minWords: Math.min(...drafts.map(d => d.wordCount)), maxWords: Math.max(...drafts.map(d => d.wordCount)) };
    if (!validate) await writeJsonAtomic(path.join(directory, 'status.json'), result);
    return result;
  } finally { if (lock) { await lock.close(); await unlink(lockPath); } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env.local'); } catch { /* Injected by supervisor. */ }
  if (process.platform === 'linux' && !process.argv.includes('--lock-held')) {
    const directory = path.resolve(process.env.BLOG_STATE_DIR || '.media-cache/blog-agent'); await mkdir(directory, { recursive: true });
    const child = spawn('flock', ['--nonblock', '--conflict-exit-code', '75', '--no-fork', path.join(directory, 'agent.flock'), process.execPath, process.argv[1], ...process.argv.slice(2), '--lock-held'], { stdio: 'inherit' });
    child.on('exit', code => { process.exitCode = code ?? 1; }); child.on('error', () => { process.exitCode = 1; });
  } else {
    const cycle = async () => { try { console.log(await runBlogAgent({ publish: !process.argv.includes('--validate') && (process.argv.includes('--publish') || process.env.BLOG_ENABLED === '1'), validate: process.argv.includes('--validate'), kernelLocked: process.argv.includes('--lock-held'), bootstrap: process.argv.includes('--bootstrap'), indexing: !process.argv.includes('--no-indexing') })); } catch (error) { console.error(error.message); if (!process.argv.includes('--daemon')) process.exitCode = 1; } };
    await cycle();
    if (process.argv.includes('--daemon')) { const repeat = async () => { await cycle(); setTimeout(repeat, 5 * 60_000); }; setTimeout(repeat, 5 * 60_000); }
  }
}
