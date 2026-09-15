import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBotNavigation } from "./bot-navigation.mjs";

try {
  const env = await readFile(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
} catch {}

const token = process.env.BALE_BOT_TOKEN;
const apiBase = (process.env.BOT_SITE_URL || "http://localhost:3004").replace(/\/$/, "");
const baleBase = (process.env.BALE_API_BASE_URL || "https://tapi.bale.ai").replace(/\/$/, "");
const bale = token ? `${baleBase}/bot${token}` : "";
const apiToken = process.env.BOT_API_TOKEN || token;
const sessions = new Map();
const PAGE_SIZE = 10;
const navigation = createBotNavigation({ api, send, edit, sendCard, openVod: showTitle, openMusic: showMusicTitle });

async function call(method, body = {}) {
  const response = await fetch(`${bale}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 15_000),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

async function api(path) {
  const response = await fetch(`${apiBase}${path}`, { headers: { "x-bot-token": apiToken }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

const button = (text, callback_data) => ({ text, callback_data });
const link = (text, url) => ({ text, url });
const markup = (rows) => ({ inline_keyboard: rows.filter(row => row.length) });

function mainKeyboard() {
  return markup([
    [button("🎬 فیلم", "list:movies:1"), button("📺 سریال", "list:series:1")],
    [button("🧸 انیمیشن و کودک", "list:animation:1"), button("🏆 ۲۵۰ IMDb", "list:top-imdb:1")],
    [button("🎞 ایرانی قدیمی", "list:old-iranian-films:1"), button("🆕 فیلم‌های ۲۰۲۶", "list:recent-2026:1")],
    [button("🎵 موزیک", "music:1"), button("⚙️ فیلترها", "filters")],
    [button("🔎 جست‌وجو", "search")],
  ]);
}

function sessionFor(chatId) {
  const session = sessions.get(chatId) || {};
  sessions.set(chatId, session);
  return session;
}

async function send(chatId, text, reply_markup = undefined) {
  return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup });
}

async function edit(chatId, messageId, text, reply_markup = undefined) {
  try {
    return await call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup });
  } catch (error) {
    if (/message is not modified/i.test(error.message)) return;
    if (!/there is no text|caption|text.*message/i.test(error.message)) throw error;
    return send(chatId, text, reply_markup);
  }
}

async function sendCard(chatId, item, detailCallback) {
  const rows = [
    [link("🌐 صفحه و دانلود", item.urls.detail), link("▶️ پخش آنلاین", item.urls.watch)],
    [button("جزئیات و کیفیت‌ها", detailCallback || `title:${item.imdbCode}`)],
  ];
  const caption = [
    `<b>${escapeHtml(item.title)}</b>`,
    [item.type === "series" ? "سریال" : "فیلم", item.year || "—", item.imdbRating ? `IMDb ${item.imdbRating}` : null].filter(Boolean).join(" · "),
    escapeHtml((item.genres || []).slice(0, 3).join(" / ") || "ژانر نامشخص"),
  ].join("\n");
  if (item.posterUrl) {
    try {
      return await call("sendPhoto", { chat_id: chatId, photo: item.posterUrl, caption, parse_mode: "HTML", reply_markup: markup(rows) });
    } catch {}
  }
  return send(chatId, caption, markup(rows));
}

async function showTitle(chatId, messageId, id, session) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}`);
  const item = data.item;
  const rows = [[link("🌐 صفحه سایت", item.urls.detail), link("▶️ پخش آنلاین", item.urls.watch)], [link("👥 تماشای همزمان", item.urls.watch)]];
  if (item.type === "series") {
    for (const season of (data.seasons || []).slice(0, 20)) rows.push([button(`فصل ${season.season} · ${season.sourceCount} فایل`, `season:${id}:${season.season}:1`)]);
  } else {
    rows.push([button("⬇️ کیفیت‌ها و دوبله‌ها", `files:${id}:1`)]);
  }
  rows.push([button("⬅️ بازگشت به نتایج", session?.navigation ? "nav:return" : "home")]);
  const text = `<b>${escapeHtml(item.title)}</b>\n${[item.type === "series" ? "سریال" : "فیلم", item.year || "—", item.imdbRating ? `IMDb ${item.imdbRating}` : null].filter(Boolean).join(" · ")}\n${escapeHtml((item.genres || []).join(" / "))}`;
  return edit(chatId, messageId, text, markup(rows));
}

async function showFiles(chatId, messageId, id, page) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?includeDownloads=1&maxFiles=80`);
  const files = data.movieFiles || [];
  const start = (page - 1) * PAGE_SIZE;
  const visible = files.slice(start, start + PAGE_SIZE);
  const rows = visible.map((file) => [link(`⬇️ ${short([file.quality, file.group, file.label].filter(Boolean).join(" · ") || "دانلود", 44)}`, file.url)]);
  rows.push(filePages(`files:${id}`, files.length, page));
  rows.push([button("⬅️ جزئیات", `title:${id}`)]);
  return edit(chatId, messageId, `<b>${escapeHtml(data.item.title)}</b>\nکیفیت، دوبله و زیرنویس را انتخاب کنید:`, markup(rows));
}

async function showSeason(chatId, messageId, id, season, page) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?season=${season}&includeDownloads=1&maxFiles=80`);
  const episodes = data.episodes || [];
  const visible = episodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rows = visible.map((episode) => [button(`${episode.code} · ${short(episode.title, 30)}`, `episode:${id}:${season}:${episode.episode ?? "pack"}:1`)]);
  rows.push(filePages(`season:${id}:${season}`, episodes.length, page));
  rows.push([button("⬅️ فصل‌ها", `title:${id}`)]);
  return edit(chatId, messageId, `<b>${escapeHtml(data.item.title)}</b> · فصل ${season}\nقسمت را انتخاب کنید:`, markup(rows));
}

async function showEpisode(chatId, messageId, id, season, episode, page) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?season=${season}&includeDownloads=1&maxFiles=80`);
  const current = (data.episodes || []).find((item) => String(item.episode ?? "pack") === String(episode));
  if (!current) throw new Error("Episode not found");
  const files = current.files || [];
  const visible = files.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rows = visible.map((file) => [link(`⬇️ ${short([file.quality, file.group, file.label].filter(Boolean).join(" · ") || "فایل", 44)}`, file.url)]);
  rows.push(filePages(`episode:${id}:${season}:${episode}`, files.length, page));
  const episodePage = Math.floor((data.episodes || []).indexOf(current) / PAGE_SIZE) + 1;
  rows.push([button("⬅️ قسمت‌ها", `season:${id}:${season}:${episodePage}`)]);
  return edit(chatId, messageId, `<b>${escapeHtml(data.item.title)}</b> · ${current.code}\nکیفیت، دوبله و زیرنویس را انتخاب کنید:`, markup(rows));
}

async function showMusic(chatId, messageId, page) {
  const data = await api(`/api/bot/music?page=${page}&limit=${PAGE_SIZE}`);
  const rows = (data.items || []).map((item) => [button(`🎵 ${short(item.title, 38)}`, `music-title:${item.id}`)]);
  rows.push(filePages("music", data.pagination.total, data.pagination.page));
  rows.push([button("🏠 شروع", "home")]);
  return edit(chatId, messageId, `<b>موزیک و موزیک‌ویدئو</b>\nصفحهٔ ${data.pagination.page} از ${data.pagination.totalPages}`, markup(rows));
}

async function showMusicTitle(chatId, messageId, id, session) {
  const data = await api(`/api/bot/music?id=${encodeURIComponent(id)}`);
  const item = data.item;
  const rows = [[link("🌐 صفحه سایت", item.urls.detail)]];
  for (const source of item.sources || []) rows.push([source.kind === "download" ? link(`⬇️ ${short(source.quality || source.label || "دانلود", 46)}`, source.url) : link("▶️ پخش", source.url)]);
  rows.push([button("⬅️ بازگشت", session?.navigation?.view === "search" ? "nav:return" : "music:1")]);
  return edit(chatId, messageId, `<b>${escapeHtml(item.title)}</b>\n${escapeHtml((item.artists || []).join("، "))}`, markup(rows));
}

export async function handle(update) {
  const message = update.message;
  const query = update.callback_query;
  const chatId = message?.chat?.id ?? query?.message?.chat?.id;
  if (!chatId) return;
  const sessionKey = `${chatId}:${message?.from?.id ?? query?.from?.id ?? chatId}`;
  const session = sessionFor(sessionKey);
  if (message?.text?.startsWith("/start")) {
    sessions.set(sessionKey, {});
    return send(chatId, "🎬 <b>به SarvNema خوش آمدید</b>\nفیلم، سریال، انیمیشن و موزیک را جست‌وجو کن. هر دانلود ابتدا وارد صفحهٔ امن سایت می‌شود و بعد از ۵ ثانیه به منبع اصلی می‌رود.", mainKeyboard());
  }
  const sectionCommand = { "/movies": "movie", "/series": "series", "/animation": "animation", "/top": "top-imdb", "/iranian": "old-iranian-films" }[message?.text?.split(/[ @]/)[0]];
  if (sectionCommand) return navigation.start(chatId, null, session, sectionCommand);
  if (message?.text?.startsWith("/search")) return send(chatId, "نام کامل اثر را بفرستید؛ نزدیک‌ترین عبارت و نتیجه‌ها را پیشنهاد می‌کنم.", markup([[button("🏠 شروع", "home")]]));
  if (message?.text?.startsWith("/help")) return send(chatId, "نام اثر یا خواننده را بفرست تا نزدیک‌ترین عبارت را پیدا کنیم. در بخش فیلم یا سریال، ژانر، سال، کشور و IMDb را اختیاری تنظیم کن و بعد «نمایش نتایج» را بزن. بازگشت، فیلترها و صفحهٔ قبلی را حفظ می‌کند. سریال‌ها با انتخاب فصل و قسمت نمایش داده می‌شوند.", mainKeyboard());
  if (message?.text && !message.text.startsWith("/")) return navigation.search(chatId, null, session, message.text.trim());
  if (!query?.data) return;
  await call("answerCallbackQuery", { callback_query_id: query.id }).catch(() => {});
  const data = query.data;
  const messageId = query.message.message_id;
  if (data.startsWith("nav:")) return navigation.handle(chatId, messageId, session, data);
  if (data === "home") {
    sessions.set(sessionKey, {});
    return edit(chatId, messageId, "🎬 <b>به SarvNema خوش آمدید</b>\nیک بخش را انتخاب کن:", mainKeyboard());
  }
  if (data === "search") {
    session.waitingSearch = true;
    return edit(chatId, messageId, "نام فیلم، سریال، انیمیشن یا خواننده را بفرستید:", markup([[button("لغو", "home")]]));
  }
  if (data === "filters") return session.navigation ? navigation.restore(chatId, messageId, session) : navigation.start(chatId, messageId, session, "movie");
  if (data.startsWith("filter:")) return send(chatId, "این فیلتر مربوط به منوی قبلی است؛ تنظیمات جدید را باز کنید.", markup([[button("تنظیمات", "filters")]]));
  if (data === "noop") return;
  if (data.startsWith("list:")) {
    const [, section] = data.split(":");
    return navigation.start(chatId, messageId, session, section);
  }
  if (data.startsWith("title:")) return showTitle(chatId, messageId, data.slice(6), session);
  if (data.startsWith("files:")) {
    const [, id, page] = data.split(":");
    return showFiles(chatId, messageId, id, Number(page) || 1);
  }
  if (data.startsWith("season:")) {
    const [, id, season, page] = data.split(":");
    return showSeason(chatId, messageId, id, Number(season), Number(page) || 1);
  }
  if (data.startsWith("episode:")) {
    const [, id, season, episode, page] = data.split(":");
    return showEpisode(chatId, messageId, id, Number(season), episode, Number(page) || 1);
  }
  if (data.startsWith("music-title:")) return showMusicTitle(chatId, messageId, data.slice(12), session);
  if (data.startsWith("music:")) return showMusic(chatId, messageId, Number(data.slice(6)) || 1);
}

function filePages(prefix, total, page) {
  return [page > 1 ? button("‹ قبلی", `${prefix}:${page - 1}`) : null,
    page * PAGE_SIZE < total ? button("بعدی ›", `${prefix}:${page + 1}`) : null].filter(Boolean);
}
function short(value, max) { const text = String(value ?? "").replace(/\s+/g, " ").trim(); return text.length > max ? `${text.slice(0, max - 1)}…` : text || "بدون عنوان"; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function format(value) { return new Intl.NumberFormat("fa-IR").format(Number(value) || 0); }

async function configureProfile() {
  try {
    const [vod, music] = await Promise.all([api("/api/bot/filters"), api("/api/bot/music?mode=filters")]);
    const inventory = `آرشیو: ${format(vod.totals.movies)} فیلم · ${format(vod.totals.series)} سریال · ${format(music.totals.tracks)} موزیک`;
    await call("setMyName", { name: "SarvNema | فیلم، سریال و موزیک" });
    await call("setMyShortDescription", { short_description: `جست‌وجوی فیلم، سریال و موزیک · ${format(vod.totals.titles)} عنوان` });
    await call("setMyDescription", { description: `SarvNema؛ فیلم، سریال، انیمیشن و موزیک با جست‌وجو، فیلتر IMDb و دانلود امن. ${inventory}.` });
  } catch (error) {
    console.error(`Bale profile setup skipped: ${error.message}`);
  }
}

async function runBot() {
  if (!token) throw new Error("BALE_BOT_TOKEN is missing from .env.local");
  let offset = 0;
  await configureProfile();
  console.log("SarvNema Bale bot is running...");
  while (true) {
    try {
      const updates = await call("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
      for (const update of updates) {
        offset = update.update_id + 1;
        await handle(update).catch((error) => console.error(error.message));
      }
    } catch (error) {
      console.error(error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await runBot();
