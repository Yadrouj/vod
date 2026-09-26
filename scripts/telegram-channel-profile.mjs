import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { writeJsonAtomic } from './atomic-json.mjs';

try { process.loadEnvFile('.env.local'); } catch { /* Environment may be injected. */ }

const channel = process.env.TELEGRAM_CHANNEL_ID || '@sarvnema';
const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://sarvnema.ir';
const profile = {
  title: 'سرونما | دانلود فیلم و سریال، موسیقی | SarvNema',
  description: [
    '🎬 فیلم و سریال ایرانی و خارجی، انیمیشن و موسیقی',
    'دوبله فارسی و زیرنویس • کیفیت‌های مختلف • تماشای آنلاین و همزمان',
    'آهنگ و موزیک‌ویدئو، تازه‌های آرشیو و راهنمای دانلود',
    '🌐 sarvnema.ir',
    '🔎 @Sarvnema_bot',
  ].join('\n'),
  welcome: [
    '<b>به سرونما خوش اومدی 🌿</b>', '',
    'دنبال یه فیلم برای امشب، قسمت بعدی سریالت یا آهنگ تازه‌ای؟ از دکمه‌های پایین شروع کن.', '',
    '🎬 <b>فیلم و سریال</b> — ایرانی و خارجی، انیمیشن، دوبله فارسی و زیرنویس؛ با کیفیت‌های مختلف.',
    '🎧 <b>موسیقی</b> — آهنگ ایرانی و خارجی، پلی‌لیست و موزیک‌ویدئو.',
    '📺 <b>تازه‌های آرشیو</b> — اینجا از اضافه‌شدن فیلم، قسمت جدید سریال و موسیقی باخبر می‌شی.', '',
    '<b>چطور دانلود کنم؟</b>',
    'زیر هر پست کیفیت دلخواهت رو بزن. صفحهٔ سرونما باز می‌شه و بعد از ۵ ثانیه به فایل می‌رسی. همهٔ کیفیت‌ها و گزینه‌های پخش هم توی صفحهٔ همون اثر هست.', '',
    '🔎 اسم اثر رو به @Sarvnema_bot بفرست؛ یا از جست‌وجوی سایت کمک بگیر.',
    '👥 برای تماشای همزمان، از صفحهٔ اثر وارد اتاق تماشا شو و لینک دعوت رو برای دوستات بفرست.', '',
    '#سرونما #فیلم #سریال #موسیقی #انیمیشن',
    'sarvnema.ir • @sarvnema',
  ].join('\n'),
  reply_markup: { inline_keyboard: [
    [{ text: '🎬 فیلم‌ها', url: new URL('/browse?section=best-movies', site).href }, { text: '📺 سریال‌ها', url: new URL('/browse?section=best-series', site).href }],
    [{ text: '🎧 موسیقی', url: new URL('/music', site).href }, { text: '🧸 دنیای کودک', url: new URL('/kids', site).href }],
    [{ text: '🎞 فیلم‌های قدیمی ایرانی', url: new URL('/browse?section=old-iranian-films', site).href }],
    [{ text: '🔎 جست‌وجو در بات', url: 'https://t.me/Sarvnema_bot?start=channel' }, { text: '🌐 سایت سرونما', url: site }],
  ] },
};

if (profile.title.length > 128 || profile.description.length > 255) throw new Error('Telegram profile exceeds its length limit');
const dir = path.resolve(process.env.TELEGRAM_CHANNEL_STATE_DIR || '.media-cache/telegram-channel');
await mkdir(dir, { recursive: true });
const avatarPath = path.join(dir, 'sarvnema-avatar.jpg');
await sharp('public/brand/sarvnema-telegram.svg').jpeg({ quality: 95 }).toFile(avatarPath);
await writeJsonAtomic(path.join(dir, 'profile.preview.json'), { channel, ...profile });
console.log(JSON.stringify({ channel, title: profile.title, description: profile.description, descriptionLength: profile.description.length, avatarPath }));

if (process.argv.includes('--apply')) {
  const token = process.env.BOT_API_TOKEN;
  if (!token) throw new Error('BOT_API_TOKEN is required');
  const api = async (method, body) => {
    let result;
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: body instanceof FormData ? undefined : { 'content-type': 'application/json' },
        body: body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(30000),
      });
      result = await response.json();
    } catch { throw new Error(`${method}: connection interrupted; verify Telegram before retrying`); }
    if (!result.ok) throw new Error(`${method}: ${result.description}`);
    return result.result;
  };
  const me = await api('getMe', {});
  const chat = await api('getChat', { chat_id: channel });
  const membership = await api('getChatMember', { chat_id: chat.id, user_id: me.id });
  if (chat.type !== 'channel' || !(membership.status === 'creator' || membership.status === 'administrator' && membership.can_change_info)) {
    throw new Error('Bot needs channel permission to change its profile');
  }
  const stateFile = path.join(dir, `profile-${chat.id}.json`);
  let state;
  try { state = JSON.parse(await readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  state ??= { previousProfile: chat, channelId: chat.id };
  const save = () => writeJsonAtomic(stateFile, state);
  await save();
  if (chat.title !== profile.title) await api('setChatTitle', { chat_id: chat.id, title: profile.title });
  if (chat.description !== profile.description) await api('setChatDescription', { chat_id: chat.id, description: profile.description });
  const avatar = await readFile(avatarPath);
  const avatarHash = createHash('sha256').update(avatar).digest('hex');
  if (state.avatarHash !== avatarHash) {
    const body = new FormData();
    body.set('chat_id', String(chat.id));
    body.set('photo', new Blob([avatar], { type: 'image/jpeg' }), 'sarvnema.jpg');
    await api('setChatPhoto', body);
    state.avatarHash = avatarHash;
    await save();
  }
  if (process.argv.includes('--welcome')) {
    if (!(membership.status === 'creator' || membership.can_post_messages && membership.can_edit_messages)) throw new Error('Bot needs posting and pinning permissions');
    if (state.welcomeStatus === 'sending') throw new Error('Previous welcome delivery is uncertain; inspect the channel before retrying');
    if (!state.welcomeMessageId) {
      state.welcomeStatus = 'sending';
      await save();
      const sent = await api('sendMessage', { chat_id: chat.id, text: profile.welcome, parse_mode: 'HTML',
        disable_notification: true, link_preview_options: { is_disabled: true }, reply_markup: profile.reply_markup });
      state.welcomeMessageId = sent.message_id;
      state.welcomeStatus = 'sent';
      await save();
    }
    await api('pinChatMessage', { chat_id: chat.id, message_id: state.welcomeMessageId, disable_notification: true });
  }
  const current = await api('getChat', { chat_id: chat.id });
  if (current.title !== profile.title || current.description !== profile.description || !current.photo) throw new Error('Telegram profile readback did not match');
  console.log(JSON.stringify({ applied: true, channel: current.username, title: current.title, description: current.description,
    photo: Boolean(current.photo), welcomeMessageId: state.welcomeMessageId, pinnedMessageId: current.pinned_message?.message_id,
    availableReactions: current.available_reactions }));
}
