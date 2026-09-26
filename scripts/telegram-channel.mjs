import { createHash } from 'node:crypto';
import { mkdir, readFile, open, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { writeJsonAtomic } from './atomic-json.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const html = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const read = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } };
const directFile = url => { try { return /^https?:$/.test(new URL(url).protocol) && /\.(mp3|m4a|flac|ogg|wav|mp4|mkv|webm|m4v)(?:[?#]|$)/i.test(url); } catch { return false; } };

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
    const sources = (track.sources ?? []).filter(s => s.available !== false && directFile(s.url));
    if (!sources.length) continue;
    const fingerprint = musicFingerprint(track);
    fingerprints[track.id] = fingerprint;
    if (previous?.music?.[track.id] === fingerprint) continue;
    // Existing archives establish the baseline; newly published music may launch it.
    const published = Date.parse(track.publishedAt);
    if (!previous && (!Number.isFinite(published) || now - published > 7 * 86400000 || published > now)) continue;
    events.push({ key: `music:${track.id}:${fingerprint}`, type: 'music', musicId: track.id,
      title: track.persianTitle || track.title, artist: track.artists?.map(a => a.name).join('، ') || track.artist?.name,
      eventAt: previous?.music?.[track.id] ? new Date(now).toISOString() : track.publishedAt || new Date(now).toISOString(),
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
    '', 'کیفیتی که دوست داری رو از دکمه‌های پایین انتخاب کن 👇',
    'صفحهٔ دانلود باز می‌شه و بعد از ۵ ثانیه می‌ری سراغ فایل.', '',
    'دیدیش یا شنیدیش؟ با یه ری‌اکشن نظرت رو بگو ❤️', '', postHashtags(event, item), '@sarvnema'].filter(x => x !== undefined).join('\n');
  const buttons = [...variants].slice(0, 8).map(([text, url]) => ({ text: `⬇️ ${text}`, url }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([{ text: music ? '🎵 پخش و همهٔ کیفیت‌ها' : '▶️ تماشا و همهٔ کیفیت‌ها', url: href }]);
  return { caption, reply_markup: { inline_keyboard: rows }, imageUrl: event.imageUrl || item.coverUrl || item.backdropUrl || item.posterUrl, title, kind: music ? 'MUSIC' : event.kind === 'episode' || event.kind === 'series' ? 'SERIES' : 'FILM' };
}

async function banner(post) {
  const sharp = createRequire(import.meta.url)('sharp');
  let image;
  if (post.imageUrl) {
    const response = await fetch(post.imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Banner artwork is unavailable');
    if (Number(response.headers.get('content-length')) > 8 * 1024 * 1024) throw new Error('Banner artwork too large');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > 8 * 1024 * 1024) throw new Error('Banner artwork too large'); chunks.push(chunk); }
    image = await sharp(Buffer.concat(chunks), { limitInputPixels: 40000000 }).resize(1280, 720, { fit: 'cover' }).toBuffer();
  } else image = await sharp({ create: { width:1280, height:720, channels:3, background:'#151914' } }).png().toBuffer();
  const overlay = Buffer.from(`<svg width="1280" height="720"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></linearGradient></defs><rect y="470" width="1280" height="250" fill="url(#g)"/><text x="54" y="658" fill="#ebcf76" font-family="sans-serif" font-size="48" font-weight="bold">SarvNema</text><text x="1226" y="658" text-anchor="end" fill="white" font-family="sans-serif" font-size="28">${post.kind}</text></svg>`);
  return sharp(image).composite([{ input: overlay }]).jpeg({ quality: 88 }).toBuffer();
}

async function telegram(token, method, body) {
  let response;
  try { response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:'POST', body: body instanceof FormData ? body : JSON.stringify(body), headers: body instanceof FormData ? undefined : {'content-type':'application/json'}, signal:AbortSignal.timeout(45000) }); }
  catch { throw Object.assign(new Error('Telegram connection interrupted; delivery outcome is unknown'), { uncertain:true }); }
  let result;
  try { result = await response.json(); } catch { throw Object.assign(new Error('Telegram response unreadable; delivery outcome is unknown'), { uncertain:true }); }
  if (!result.ok) throw Object.assign(new Error(`Telegram ${result.error_code}: ${result.description}`), { retryAfter:result.parameters?.retry_after });
  return result.result;
}

export async function runChannel({ publish = false, preview = false } = {}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://sarvnema.ir';
  const api = process.env.BOT_SITE_URL || site;
  const channel = process.env.TELEGRAM_CHANNEL_ID || '@sarvnema';
  const token = process.env.BOT_API_TOKEN;
  const dir = path.resolve(process.env.TELEGRAM_CHANNEL_STATE_DIR || '.media-cache/telegram-channel');
  await mkdir(dir, { recursive:true });
  const lockPath = path.join(dir, `${hash(channel).slice(0,12)}.lock`);
  const lock = await open(lockPath, 'wx').catch(error => { if (error.code === 'EEXIST') throw new Error('Channel publisher already locked; inspect the existing process before recovering its lock'); throw error; });
  try {
    await lock.writeFile(JSON.stringify({ pid:process.pid, startedAt:new Date().toISOString() }));
    const stateFile = path.join(dir, `${hash(channel).slice(0,12)}.json`);
    const previous = await read(stateFile, null);
    const [updates, music] = await Promise.all([read('public/data/vod-updates.json', {items:[]}),read('public/data/music-index.json', {tracks:[]})]);
    const discovered = discoverPosts(updates, music, preview && !publish ? { music:{} } : previous);
    const state = previous || { channel, posts:{}, music:{} };
    state.initializedAt = discovered.initializedAt;
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
    const pending = Object.values(state.posts).filter(p => p.status === 'pending' && (!p.retryAt || p.retryAt <= Date.now()))
      .sort((a,b) => String(b.event.eventAt).localeCompare(String(a.event.eventAt))).slice(0, Number(process.env.TELEGRAM_CHANNEL_BATCH_SIZE || 5));
    for (const entry of pending) {
      try {
        const event = entry.event;
        let detail;
        if (event.type === 'vod') {
          const url = new URL(`/api/bot/title/${encodeURIComponent(event.imdbCode)}`, api);
          url.search = new URLSearchParams({ includeDownloads:'1',maxFiles:'80',...(event.season != null ? {season:String(event.season)} : {}) });
          const response = await fetch(url, { headers: token ? {authorization:`Bearer ${token}`} : {},signal:AbortSignal.timeout(30000) });
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
        entry.status = 'sending'; await save();
        const body = new FormData();
        body.set('chat_id',channel);body.set('caption',post.caption);body.set('parse_mode','HTML');body.set('reply_markup',JSON.stringify(post.reply_markup));
        body.set('photo',new Blob([new Uint8Array(artwork)],{type:'image/jpeg'}),'sarvnema.jpg');
        const sent = await telegram(token,'sendPhoto',body);
        entry.status='sent';entry.messageId=sent.message_id;entry.sentAt=new Date().toISOString();await save();
        console.log(JSON.stringify({sent:entry.messageId,title:post.title,channel}));
        await new Promise(resolve => setTimeout(resolve,1100));
      } catch(error) {
        // A lost acknowledgement is ambiguous: do not duplicate the public post.
        entry.status = error.uncertain && entry.status === 'sending' ? 'uncertain' : 'pending';
        entry.error=error.message;entry.retryAt=Date.now()+Math.max(300000,(error.retryAfter||0)*1000);
        if (publish) await save();
        console.error(JSON.stringify({key:entry.event.key,status:entry.status,error:entry.error}));
        if (error.uncertain || error.retryAfter) break;
      }
    }
    return { pending:pending.length, channel };
  } finally { await lock.close(); await unlink(lockPath); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.loadEnvFile('.env.local'); } catch { /* Supervisor can inject environment. */ }
  const preview = process.argv.includes('--preview');
  const publish = !preview && (process.argv.includes('--publish') || process.env.TELEGRAM_CHANNEL_ENABLED === '1');
  const cycle = async () => { try { console.log(await runChannel({publish,preview})); } catch(error) { console.error(error.message); if (!process.argv.includes('--daemon')) process.exitCode=1; } };
  await cycle();
  if (process.argv.includes('--daemon')) setInterval(cycle, 5*60000);
}
