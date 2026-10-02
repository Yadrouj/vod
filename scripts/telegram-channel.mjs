import { createHash } from 'node:crypto';
import { mkdir, readFile, open, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { audioSources, prepareChannelAudio, channelMessageForm } from './lib/telegram-channel-audio.mjs';
import { writeJsonAtomic } from './atomic-json.mjs';
import {
  hasPublishedSlot,
  publishingWindow,
  recordPublishedSlot,
  scheduleConfig,
  sortVodEventsByTrend,
} from './lib/telegram-publishing-schedule.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const html = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const read = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } };
const directFile = url => { try { return /^https?:$/.test(new URL(url).protocol) && /\.(mp3|m4a|flac|ogg|wav|mp4|mkv|webm|m4v)(?:[?#]|$)/i.test(url); } catch { return false; } };

async function loadTrendRanks(now = Date.now()) {
  const payload = await read('public/data/imdb-trending.json', null);
  const ranks = new Map();
  for (const chart of Object.values(payload?.charts ?? {})) {
    const age = now - Date.parse(chart?.observedAt ?? '');
    if (!Number.isFinite(age) || age < 0 || age > 30 * 86400000) continue;
    for (const item of chart.items ?? []) {
      const code = item?.card?.imdbCode;
      const rank = Number(item?.rank);
      if (!code || !Number.isInteger(rank) || rank < 1 || rank > 100) continue;
      if (!ranks.has(code) || rank < ranks.get(code)) ranks.set(code, rank);
    }
  }
  return ranks;
}

export function selectScheduledEntries(state, pending, now = Date.now(), trendRanks = new Map(), env = process.env) {
  const window = publishingWindow(new Date(now), scheduleConfig(env));
  const selected = [];
  const choose = (type, slot, candidates) => {
    if (!slot || hasPublishedSlot(state, type, slot) || !candidates.length) return;
    selected.push({ entry: candidates[0], type, slot });
  };
  choose('vod', window.vod, sortVodEventsByTrend(pending.filter(({ event }) => event.type === 'vod'), trendRanks));
  choose('music', window.music, pending.filter(({ event }) => event.type === 'music')
    .sort((a, b) => String(b.event.eventAt ?? '').localeCompare(String(a.event.eventAt ?? ''))));
  return { window, selected };
}

export function musicFingerprint(track) {
  return hash((track.sources ?? []).filter(s => s.available !== false && directFile(s.url))
    .map(s => [s.quality ?? '', new URL(s.url).pathname]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

export function discoverPosts(updates, music, previous, now = Date.now()) {
  const initializedAt = previous?.initializedAt || new Date(now).toISOString();
  const earliest = Date.parse(initializedAt) - 7 * 86400000;
  const events = (updates.items ?? []).filter(e => e.status === 'available' && e.imdbCode && e.linksCount > 0
    && Date.parse(e.eventAt) >= earliest && Date.parse(e.eventAt) <= now)
    .map(e => ({ ...e, key: `vod:${e.id}`, type: 'vod' }));
  const fingerprints = {};
  for (const track of music.tracks ?? []) {
    if (track.kind && track.kind !== 'track') continue;
    const sources = (track.sources ?? []).filter(s => s.available !== false && directFile(s.url));
    if (!audioSources({ sources }).length) continue;
    const fingerprint = musicFingerprint(track);
    fingerprints[track.id] = fingerprint;
    if (previous?.music?.[track.id] === fingerprint) continue;
    // Existing archives establish the baseline; newly published music may launch it.
    const published = Date.parse(track.publishedAt || track.addedAt);
    if (!previous && (!Number.isFinite(published) || now - published > 7 * 86400000 || published > now)) continue;
    events.push({ key: `music:${track.id}:${fingerprint}`, type: 'music', musicId: track.id,
      title: track.persianTitle || track.title, artist: track.artists?.map(a => a.name).join('، ') || track.artist?.name,
      eventAt: previous?.music?.[track.id] ? new Date(now).toISOString() : track.publishedAt || track.addedAt || new Date(now).toISOString(),
      imageUrl: track.coverUrl, sources });
  }
  return { initializedAt, music: fingerprints, events: events.filter(e => previous || (Date.parse(e.eventAt) <= now && now - Date.parse(e.eventAt) <= 7 * 86400000)) };
}

export function postHashtags(event, item = {}) {
  const category = event.type === 'music' ? 'موسیقی' : event.kind === 'episode' || event.kind === 'series' ? 'سریال' : 'فیلم';
  const tag = value => String(value || '').normalize('NFKC').replace(/[\u200c\u200d]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 48).replace(/_+$/g, '');
  const names = [item.persianTitle || item.title || event.baseTitle || event.title, item.originalTitle || event.baseTitle];
  return [...new Set(['سرونما', category, ...names.map(tag).filter(Boolean)])].map(value => `#${value}`).join(' ');
}

export function composePost(event, detail, site) {
  const item = detail?.item ?? {};
  const music = event.type === 'music';
  const title = String(item.persianTitle || item.title || event.title).slice(0, 160);
  let files = music ? event.sources : detail?.movieFiles ?? [];
  if (!music && event.season != null) {
    files = (detail?.episodes ?? []).filter(e => event.episode == null || e.episode === event.episode).flatMap(e => e.files ?? []);
  }
  const variants = new Map();
  for (const file of files) {
    const quality = String(file.quality || file.label || 'دانلود').slice(0, 35);
    const group = ({ Dubbed: 'دوبله', SoftSub: 'زیرنویس قابل انتخاب', HardSub: 'زیرنویس چسبیده' })[file.group] || file.group || '';
    const label = [quality, group].filter(Boolean).join(' · ');
    let url;
    try {
      if (music) {
        if (!directFile(file.url)) continue;
        url = new URL('/download/continue', site);
        url.search = new URLSearchParams({ u: Buffer.from(file.url).toString('base64url'), title, quality, musicId: event.musicId });
      } else {
        url = new URL(file.url, site);
        if (url.pathname !== '/download/continue') continue;
        url = new URL(url.pathname + url.search, site);
      }
    } catch { continue; }
    if (!variants.has(label)) variants.set(label, url.href);
  }
  if (!variants.size) throw new Error('No downloadable files for this update');
  const href = new URL(music ? `/music/${encodeURIComponent(event.musicId)}` : `/${encodeURIComponent(event.imdbCode)}`, site).href;
  const intro = music ? '🎧 یه آهنگ برای پلی‌لیستت!' : event.changeType === 'quality-added' ? '🎬 نسخه‌های تازه رسید!' : event.kind === 'episode' ? '📺 قسمت تازه رسید؛ ادامه‌ش رو ببینیم؟' : '🎬 به آرشیو سرونما اضافه شد!';
  const episode = event.season != null ? `فصل ${event.season}${event.episode != null ? ` · قسمت ${event.episode}` : ''}` : '';
  const caption = [intro, '', `<b>${html(title)}</b>`,
    [episode, music ? event.artist : item.year || event.year, item.imdbRating ? `IMDb ${item.imdbRating}` : ''].filter(Boolean).map(html).join(' · '),
    item.genres?.length ? html(item.genres.slice(0, 3).join(' · ')) : '',
    item.overview ? html(String(item.overview).slice(0, 180)) : '',
    '', 'کیفیتی که دوست داری رو از دکمه‌های پایین انتخاب کن 👇',
    'صفحهٔ دانلود باز می‌شه و بعد از ۵ ثانیه می‌ری سراغ فایل.', '',
    'دیدیش یا شنیدیش؟ با یه ری‌اکشن نظرت رو بگو ❤️', '', postHashtags(event, item), '@sarvnema'].filter(x => x !== undefined).join('\n');
  const buttons = [...variants].slice(0, 8).map(([text, url]) => ({ text: `⬇️ ${text}`, url }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  const watch = new URL(music ? `/music/${encodeURIComponent(event.musicId)}` : `/watch/${encodeURIComponent(event.imdbCode)}`, site);
  if (event.season != null) watch.searchParams.set('season', String(event.season));
  if (event.episode != null) watch.searchParams.set('episode', String(event.episode));
  const together = new URL(watch); together.searchParams.set('together', '1');
  rows.push([{ text: music ? '▶️ شنیدن آنلاین' : '▶️ پخش آنلاین', url: watch.href }, { text: music ? '👥 شنیدن همزمان' : '👥 تماشای همزمان', url: together.href }]);
  rows.push([{ text: '📋 اطلاعات و همهٔ کیفیت‌ها', url: `${href}${music ? '' : '#downloads'}` }]);
  return { caption, reply_markup: { inline_keyboard: rows }, imageUrl: event.imageUrl || item.coverUrl || item.backdropUrl || item.posterUrl, title, artist: event.artist, kind: music ? 'MUSIC' : event.kind === 'episode' || event.kind === 'series' ? 'SERIES' : 'FILM' };
}

async function banner(post) {
  const sharp = createRequire(import.meta.url)('sharp');
  let image;
  if (post.imageUrl) { try {
    const response = await fetch(post.imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Banner artwork is unavailable');
    if (Number(response.headers.get('content-length')) > 8 * 1024 * 1024) throw new Error('Banner artwork too large');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > 8 * 1024 * 1024) throw new Error('Banner artwork too large'); chunks.push(chunk); }
    image = await sharp(Buffer.concat(chunks), { limitInputPixels: 40000000 }).resize(1280, 720, { fit: 'cover' }).toBuffer();
  } catch { console.warn('Artwork unavailable; using the branded channel cover'); } }
  if (!image) image = await sharp({ create: { width:1280, height:720, channels:3, background:'#151914' } }).png().toBuffer();
  const overlay = Buffer.from(`<svg width="1280" height="720"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient></defs><rect y="470" width="1280" height="250" fill="url(#g)"/><text x="54" y="658" fill="#ebcf76" font-family="sans-serif" font-size="48" font-weight="bold">SarvNema</text><text x="1226" y="658" text-anchor="end" fill="white" font-family="sans-serif" font-size="28">${post.kind}</text></svg>`);
  return sharp(image).composite([{ input: overlay }]).jpeg({ quality: 88 }).toBuffer();
}

async function telegram(token, method, body) {
  let response;
  try { response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', body: body instanceof FormData ? body : JSON.stringify(body), headers: body instanceof FormData ? undefined : {'content-type':'application/json'}, signal:AbortSignal.timeout(method === 'sendAudio' ? 180000 : 45000) }); }
  catch { throw Object.assign(new Error('Telegram connection interrupted; delivery outcome is unknown'), { uncertain:true }); }
  let result;
  try { result = await response.json(); } catch { throw Object.assign(new Error('Telegram response unreadable; delivery outcome is unknown'), { uncertain:true }); }
  if (!result.ok) throw Object.assign(new Error(`Telegram ${result.error_code}: ${result.description}`), { retryAfter:result.parameters?.retry_after });
  return result.result;
}

export async function runChannel({ publish = false, preview = false, kernelLocked = false } = {}) {
  const now = Date.now();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://sarvnema.ir';
  const api = process.env.BOT_SITE_URL || site;
  const channel = process.env.TELEGRAM_CHANNEL_ID || '@sarvnema';
  const token = process.env.BOT_API_TOKEN;
  const dir = path.resolve(process.env.TELEGRAM_CHANNEL_STATE_DIR || '.media-cache/telegram-channel');
  await mkdir(dir, { recursive:true });
  const lockPath = path.join(dir, `${hash(channel).slice(0,12)}.lock`);
  const lock = kernelLocked ? null : await open(lockPath, 'wx').catch(error => { if (error.code === 'EEXIST') throw new Error('Channel publisher already locked; inspect the existing process before recovering its lock'); throw error; });
  try {
    await lock?.writeFile(JSON.stringify({ pid:process.pid, startedAt:new Date().toISOString() }));
    const stateFile = path.join(dir, `${hash(channel).slice(0,12)}.json`);
    const previous = await read(stateFile, null);
    const dataDir = process.env.VOD_DATA_DIR || 'public/data';
    const [updates, music, library] = await Promise.all([read(path.join(dataDir, 'vod-updates.json'), {items:[]}),read(path.join(dataDir, 'music-index.json'), {tracks:[]}),read(path.join(dataDir, 'melodify-library.json'), {tracks:[]})]);
    music.tracks = [...new Map([...(music.tracks ?? []), ...(library.tracks ?? [])].map(t => [t.id, t])).values()];
    const discovered = discoverPosts(updates, music, preview && !publish ? { music:{} } : previous, now);
    const state = previous || { channel, posts:{}, music:{} };
    state.publishedSlots ??= { vod: {}, music: {} };
    state.publishedSlots.vod ??= {};
    state.publishedSlots.music ??= {};
    state.initializedAt = discovered.initializedAt;
    for (const entry of Object.values(state.posts)) if (entry.status === 'sending') entry.status = 'uncertain';
    for (const event of discovered.events) if (!state.posts[event.key]) state.posts[event.key] = { status:'pending', event };
    state.music = discovered.music;
    const save = () => writeJsonAtomic(stateFile, state);
    if (publish) {
      if (!token) throw new Error('BOT_API_TOKEN is required');
      const me = await telegram(token, 'getMe', {});
      const chat = await telegram(token, 'getChat', {chat_id:channel});
      if (chat.type !== 'channel') throw new Error('Publishing target must be a Telegram channel');
      const member = await telegram(token, 'getChatMember', {chat_id:channel,user_id:me.id});
      if (!(member.status === 'creator' || member.status === 'administrator' && member.can_post_messages)) throw new Error('Bot needs channel administrator permission to post');
      await save();
    }
    const pending = Object.values(state.posts).filter(p => p.status === 'pending' && (!p.retryAt || p.retryAt <= now));
    const trendRanks = await loadTrendRanks(now);
    const scheduled = publish
      ? selectScheduledEntries(state, pending, now, trendRanks)
      : { window: publishingWindow(new Date(now), scheduleConfig()), selected: pending
        .sort((a,b) => String(b.event.eventAt).localeCompare(String(a.event.eventAt)))
        .slice(0, Number(process.env.TELEGRAM_CHANNEL_BATCH_SIZE || 5))
        .map(entry => ({ entry, type: entry.event.type === 'music' ? 'music' : 'vod', slot: null })) };
    for (const { entry, type, slot } of scheduled.selected) {
      try {
        const event = entry.event;
        let detail;
        if (event.type === 'vod') {
          const url = new URL(`/api/bot/title/${encodeURIComponent(event.imdbCode)}`, api);
          url.search = new URLSearchParams({ includeDownloads:'1',maxFiles:'80',...(event.season != null ? {season:String(event.season)} : {}) });
          const response = await fetch(url, { headers: token ? {'x-bot-token':token} : {},signal:AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`Catalog returned ${response.status}`);
          detail = await response.json();
        }
        const post = composePost(event, detail, site);
        const fileId = hash(event.key).slice(0,16);
        const artwork = await banner(post);
        if (preview || !publish) {
          await writeFile(path.join(dir, `${fileId}.jpg`), artwork);
          await writeJsonAtomic(path.join(dir, `${fileId}.preview.json`), {channel,...post});
        }
        if (!publish) { console.log(JSON.stringify({preview:fileId,title:post.title})); continue; }
        let audio;
        try {
        if (type === 'music') audio = await prepareChannelAudio(event);
        const thumbnail = audio ? await createRequire(import.meta.url)('sharp')(artwork).resize(320, 180).jpeg({ quality: 75 }).toBuffer() : null;
        entry.status = 'sending';
        recordPublishedSlot(state, type, slot, { eventKey: event.key, status: 'sending', sentAt: new Date().toISOString() });
        await save();
        const message = channelMessageForm(channel, post, artwork, audio, thumbnail);
        const sent = await telegram(token,message.method,message.body);
        entry.status='sent';entry.messageId=sent.message_id;entry.sentAt=new Date().toISOString();
        recordPublishedSlot(state, type, slot, { eventKey: event.key, messageId: sent.message_id, sentAt: entry.sentAt });
        await save();
        console.log(JSON.stringify({sent:entry.messageId,title:post.title,channel}));
        } finally { await audio?.cleanup(); }
      } catch(error) {
        // A lost acknowledgement is ambiguous: do not duplicate the public post.
        entry.status = error.uncertain && entry.status === 'sending' ? 'uncertain' : 'pending';
        if (entry.status === 'pending' && slot) delete state.publishedSlots[type][slot];
        entry.error=error.message;entry.retryAt=Date.now()+Math.max(300000,(error.retryAfter||0)*1000);
        if (publish) await save();
        console.error(JSON.stringify({key:entry.event.key,status:entry.status,error:entry.error}));
        if (error.uncertain || error.retryAfter) break;
      }
    }
    const summary = {
      pending: pending.length,
      scheduled: scheduled.selected.length,
      window: scheduled.window,
      trendCandidates: trendRanks.size,
      channel,
    };
    if (publish) await writeJsonAtomic(path.join(dir, 'status.json'), { ...summary, checkedAt: new Date().toISOString(), sent: Object.values(state.posts).filter(p => p.status === 'sent').length, uncertain: Object.values(state.posts).filter(p => p.status === 'uncertain').length });
    return summary;
  } finally { if (lock) { await lock.close(); await unlink(lockPath); } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env.local'); } catch { /* Supervisor can inject environment. */ }
  if (process.platform === 'linux' && !process.argv.includes('--lock-held')) {
    const directory = path.resolve(process.env.TELEGRAM_CHANNEL_STATE_DIR || '.media-cache/telegram-channel');
    await mkdir(directory, { recursive: true });
    const child = spawn('flock', ['--nonblock', '--conflict-exit-code', '75', '--no-fork', path.join(directory, 'publisher.flock'), process.execPath, process.argv[1], ...process.argv.slice(2), '--lock-held'], { stdio: 'inherit' });
    child.on('exit', code => { process.exitCode = code ?? 1; });
    child.on('error', () => { console.error('Unable to acquire publisher process lock'); process.exitCode = 1; });
  } else {
  const preview = process.argv.includes('--preview');
  const publish = !preview && (process.argv.includes('--publish') || process.env.TELEGRAM_CHANNEL_ENABLED === '1');
  const cycle = async () => { try { console.log(await runChannel({publish,preview,kernelLocked:process.argv.includes('--lock-held')})); } catch(error) { console.error(error.message); if (!process.argv.includes('--daemon')) process.exitCode=1; } };
  await cycle();
  if (process.argv.includes('--daemon')) {
    const repeat = async () => { await cycle(); setTimeout(repeat, 5*60000); };
    setTimeout(repeat, 5*60000);
  }
  }
}
