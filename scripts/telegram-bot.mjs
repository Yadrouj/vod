import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createBotNavigation } from "./bot-navigation.mjs";
import { miniAppUrl, miniAppButton } from "./telegram-mini-app.mjs";
import { telegramDeliveryLink } from "../lib/telegram-delivery-token.mjs";
import { runDeliveryWorker } from "./telegram-file-delivery.mjs";

try {
  const env = await readFile(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
} catch {}

const token = process.env.BOT_API_TOKEN?.trim();
const apiBase = (process.env.BOT_SITE_URL || "http://localhost:3004").replace(/\/$/, "");
const telegram = token ? `${(process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org").replace(/\/$/, "")}/bot${token}` : "";
const sessions = new Map();
const PAGE_SIZE = 10;
const appUrl = miniAppUrl();
const navigation = createBotNavigation({ api, send, edit, sendCard: sendVodCard, openVod: showVodTitle, openMusic: showMusicTitle });

const profileCommands = [
  { command: "start", description: "شروع و انتخاب محتوا" },
  { command: "search", description: "جست‌وجوی فیلم، سریال و موزیک" },
  { command: "movies", description: "فیلم‌ها و دسته‌بندی‌ها" },
  { command: "series", description: "سریال‌ها، فصل و قسمت" },
  { command: "music", description: "موزیک و موزیک‌ویدئو" },
  { command: "animation", description: "انیمیشن و محتوای کودک" },
  { command: "top", description: "۲۵۰ عنوان برتر IMDb" },
  { command: "iranian", description: "فیلم‌های قدیمی ایرانی" },
  { command: "help", description: "راهنمای استفاده" },
  { command: "app", description: "بازکردن مینی‌اپ سرونما" },
];

let intro = [
  "🎬 <b>به SarvNema خوش آمدید</b>",
  "",
  "فیلم، سریال و موزیک را جست‌وجو کنید؛ پیشنهاد بگیرید، صفحهٔ سایت را ببینید و لینک‌های اصلی دانلود را دریافت کنید.",
  "",
  "برای سریال ابتدا فصل و سپس قسمت را انتخاب می‌کنید؛ بعد لینک تک‌تک فایل‌ها و یک فایل TXT مرتب از همهٔ لینک‌ها را می‌گیرید.",
  "",
  "از کجا شروع کنیم؟",
].join("\n");

const helpText = [
  "<b>راهنمای SarvNema</b>",
  "",
  "• از منو فیلم، سریال یا موزیک را انتخاب کنید.",
  "• در هر بخش ژانر، کشور، سال و IMDb را اختیاری تنظیم کنید؛ سپس «نمایش نتایج» را بزنید و فهرست را ۱۰تایی ورق بزنید.",
  "• بازگشت، فیلترها و صفحهٔ قبلی را حفظ می‌کند. سال‌ها از جدید به قدیم‌اند.",
  "• در صفحهٔ هر عنوان، لینک سایت و فایل‌های اصلی در دسترس‌اند.",
  "• برای سریال: عنوان ← فصل ← قسمت ← لینک‌ها یا فایل TXT.",
  "• با /search یا نوشتن نام اثر، پیشنهادهای نزدیک را دریافت می‌کنید.",
  "",
  "نکته: برای جست‌وجوی زنده در هر گفت‌وگو، نام بات را با @ بنویسید و نام اثر را بعدش وارد کنید.",
].join("\n");

async function configureTelegramProfile() {
  await call("setChatMenuButton", { menu_button: appUrl ? { type: "web_app", text: "سرونما", web_app: { url: appUrl } } : { type: "commands" } });
  const [vod, music] = await Promise.all([api("/api/bot/filters"), api("/api/bot/music?mode=filters")]);
  const inventory = `آرشیو: ${formatNumber(vod.totals.movies)} فیلم · ${formatNumber(vod.totals.series)} سریال · ${formatNumber(music.totals.tracks)} موزیک · ${formatNumber(music.totals.musicVideos)} موزیک‌ویدئو`;
  intro = [
    "🎬 <b>به SarvNema خوش آمدید</b>",
    "",
    "فیلم، سریال، انیمیشن و موزیک را جست‌وجو کنید؛ پیشنهاد بگیرید، آنلاین ببینید و لینک امن دانلود را باز کنید.",
    "",
    `<b>${inventory}</b>`,
    "",
    "برای سریال ابتدا فصل و سپس قسمت را انتخاب می‌کنید.",
    "",
    "از کجا شروع کنیم؟",
  ].join("\n");
  await call("setMyName", { name: "SarvNema | فیلم، سریال و موزیک" });
  await call("setMyShortDescription", {
    short_description: `فیلم، سریال، موزیک و دانلود امن · ${formatNumber(vod.totals.titles)} عنوان`,
  });
  await call("setMyDescription", {
    description: `SarvNema راهی سریع برای پیدا کردن فیلم، سریال، انیمیشن و موزیک است. ${inventory}. نام اثر را جست‌وجو کنید، دسته‌بندی و فیلترها را ببینید، فصل و قسمت سریال را انتخاب کنید و لینک امن سایت را دریافت کنید.`,
  });
  await call("setMyCommands", { commands: profileCommands });
}

async function call(method, body = {}) {
  const response = await fetch(`${telegram}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 15_000),
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

async function callForm(method, form) {
  const response = await fetch(`${telegram}/${method}`, { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

async function api(path) {
  const response = await fetch(`${apiBase}${path}`, { headers: { "x-bot-token": token }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function keyboard(rows) {
  return { inline_keyboard: rows };
}

function b(text, data) {
  return { text, callback_data: data };
}

function urlButton(text, url) {
  return { text, url };
}

function fileButtons(chatId, file, item, episode = "") {
  const delivery = telegramDeliveryLink(Number(chatId), file, item, token, appUrl || "https://sarvnema.ir", episode);
  return [urlButton(short(fileButtonText(file), 45), file.url), ...(delivery ? [urlButton("📎 فایل در تلگرام", delivery)] : [])];
}

function mainKeyboard(chatId) {
  return keyboard([
    [b("🎵 موزیک", "pick:music"), b("🎬 فیلم", "pick:movie"), b("📺 سریال", "pick:series")],
    [b("🧸 انیمیشن و کودک", "section:animation"), b("🏆 ۲۵۰ برتر IMDb", "section:top-imdb")],
    [b("🎞 فیلم ایرانی قدیمی", "section:old-iranian-films"), b("🆕 فیلم‌های ۲۰۲۶", "section:recent-2026")],
    [b("🔎 جست‌وجوی نام اثر", "search")],
    ...(appUrl ? [[miniAppButton(appUrl, Number(chatId) > 0)]] : []),
  ]);
}

function sessionFor(chatId) {
  const current = sessions.get(chatId) ?? {};
  sessions.set(chatId, current);
  return current;
}

async function send(chatId, text, markup = undefined) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: markup,
  });
}

async function edit(chatId, messageId, text, markup = undefined) {
  try {
    return await call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: markup,
    });
  } catch (error) {
    // Result cards use sendPhoto so the poster is visible in Telegram. A
    // callback from such a card must edit its caption instead of its text.
    if (/message is not modified/i.test(error.message)) return;
    if (!/there is no text in the message/i.test(error.message)) throw error;
    // Captions are limited to 1024 characters. A long filter/search view needs
    // its own text message instead of overflowing the existing poster caption.
    if (text.length > 1000) return send(chatId, text, markup);
    return call("editMessageCaption", {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: "HTML",
      reply_markup: markup,
    });
  }
}

async function sendVodCard(chatId, item, detailCallback) {
  const rows = [
    [urlButton("🌐 صفحه سایت", item.urls.detail), urlButton("▶️ پخش آنلاین", item.urls.watch)],
    [b("جزئیات و کیفیت‌ها", detailCallback || `vtitle:${item.imdbCode}`)],
  ];
  const caption = [
    `<b>${escapeHtml(item.title)}</b>`,
    [item.type === "series" ? "سریال" : "فیلم", item.year ?? "—", item.imdbRating ? `IMDb ${item.imdbRating}` : null].filter(Boolean).join(" · "),
    escapeHtml((item.genres ?? []).slice(0, 3).join(" / ") || "ژانر نامشخص"),
  ].join("\n");
  if (item.posterUrl) {
    try {
      return await call("sendPhoto", { chat_id: chatId, photo: item.posterUrl, caption, parse_mode: "HTML", reply_markup: keyboard(rows) });
    } catch {}
  }
  return send(chatId, caption, keyboard(rows));
}

async function sendTextDocument(chatId, filename, content, caption) {
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("caption", caption);
  form.set("document", new Blob([content], { type: "text/plain;charset=utf-8" }), filename);
  return callForm("sendDocument", form);
}

async function showVodTitle(chatId, messageId, id, session) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}`);
  const item = data.item;
  session.lastVodId = id;
  const info = [
    `<b>${escapeHtml(item.title)}</b>`,
    [item.type === "series" ? "سریال" : "فیلم", item.year ?? "—", item.imdbRating ? `IMDb ${item.imdbRating}` : null].filter(Boolean).join(" · "),
    item.genres?.length ? escapeHtml(item.genres.slice(0, 3).join(" / ")) : null,
    item.overview ? `\n${escapeHtml(short(item.overview, 450))}` : null,
  ].filter(Boolean).join("\n");

  const actions = [
    [urlButton("🌐 صفحه در سایت", item.urls.detail), urlButton("▶️ پخش آنلاین", item.urls.watch)],
    [urlButton("👥 تماشای همزمان", item.urls.watch)],
  ];
  if (item.type === "series") {
    const seasonRows = [];
    for (let index = 0; index < (data.seasons ?? []).length; index += 2) {
      seasonRows.push((data.seasons ?? []).slice(index, index + 2).map((season) => b(`فصل ${season.season} (${season.sourceCount})`, `vseason:${id}:${season.season}:1`)));
    }
    actions.push(...seasonRows, [b("⬅️ نتایج", session.navigation ? "nav:return" : "vresults")]);
    await edit(chatId, messageId, `${info}\n\n<b>فصل موردنظر را انتخاب کنید:</b>`, keyboard(actions));
    return;
  }

  actions.push([b("⬇️ فایل‌های دانلود", `vfiles:${id}:1`), b("🧾 دریافت TXT لینک‌ها", `vtxtmovie:${id}`)]);
  actions.push([b("⬅️ نتایج", session.navigation ? "nav:return" : "vresults")]);
  await edit(chatId, messageId, `${info}\n\nفایل‌های موجود را ببینید یا صفحهٔ سایت را باز کنید.`, keyboard(actions));
}

async function getSeasonData(id, season, session) {
  const key = `${id}:${season}`;
  session.seasonData ??= {};
  if (!session.seasonData[key]) {
    session.seasonData[key] = await api(`/api/bot/title/${encodeURIComponent(id)}?season=${season}&includeDownloads=1&maxFiles=80`);
  }
  return session.seasonData[key];
}

async function showSeasonEpisodes(chatId, messageId, id, season, page, session) {
  const data = await getSeasonData(id, season, session);
  const episodes = data.episodes ?? [];
  const totalPages = Math.max(1, Math.ceil(episodes.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(1, page), totalPages);
  const visible = episodes.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const rows = visible.map((episode) => [
    b(`${episode.code} · ${short(episode.title, 36)} (${episode.files.length})`, `vepisode:${id}:${season}:${episode.episode ?? "pack"}:1`),
  ]);
  rows.push(paginationRow("vepage", { page: activePage, totalPages, hasPrevious: activePage > 1, hasNext: activePage < totalPages }, `${id}:${season}`));
  rows.push([b("⬇️ TXT همهٔ فصل", `vtxtseason:${id}:${season}`), b("⬅️ فصل‌ها", `vtitle:${id}`)]);
  await edit(chatId, messageId, [
    `<b>${escapeHtml(data.item.title)}</b>`,
    `فصل ${season} · ${episodes.length} قسمت`,
    `صفحهٔ ${activePage} از ${totalPages}`,
    "",
    "قسمت موردنظر را انتخاب کنید:",
  ].join("\n"), keyboard(rows));
}

async function showEpisodeFiles(chatId, messageId, id, season, episodeValue, page, session) {
  const data = await getSeasonData(id, season, session);
  const episode = (data.episodes ?? []).find((item) => String(item.episode ?? "pack") === String(episodeValue));
  if (!episode) throw new Error("Episode not found");
  const files = episode.files ?? [];
  const totalPages = Math.max(1, Math.ceil(files.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(1, page), totalPages);
  const visible = files.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const rows = visible.map((file) => fileButtons(chatId, file, data.item, episode.code));
  rows.push(paginationRow("vfpage", { page: activePage, totalPages, hasPrevious: activePage > 1, hasNext: activePage < totalPages }, `${id}:${season}:${episodeValue}`));
  rows.push([b("🧾 دریافت TXT همین قسمت", `vtxtepisode:${id}:${season}:${episodeValue}`)]);
  const episodePage = Math.floor((data.episodes ?? []).indexOf(episode) / PAGE_SIZE) + 1;
  rows.push([b("⬅️ قسمت‌ها", `vseason:${id}:${season}:${episodePage}`), urlButton("🌐 صفحه در سایت", data.item.urls.detail)]);
  await edit(chatId, messageId, [
    `<b>${escapeHtml(data.item.title)}</b> · ${episode.code}`,
    escapeHtml(episode.title),
    episode.summary ? `\n${escapeHtml(short(episode.summary, 280))}` : "",
    `\n${files.length} فایل · صفحهٔ ${activePage} از ${totalPages}`,
  ].filter(Boolean).join("\n"), keyboard(rows));
}

async function showMovieFiles(chatId, messageId, id, page) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?includeDownloads=1&maxFiles=80`);
  const files = data.movieFiles ?? [];
  const totalPages = Math.max(1, Math.ceil(files.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(1, page), totalPages);
  const rows = files.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE).map((file) => fileButtons(chatId, file, data.item));
  rows.push(paginationRow("vmfpage", { page: activePage, totalPages, hasPrevious: activePage > 1, hasNext: activePage < totalPages }, id));
  rows.push([b("🧾 دریافت TXT همهٔ لینک‌ها", `vtxtmovie:${id}`)]);
  rows.push([b("⬅️ جزئیات", `vtitle:${id}`), urlButton("🌐 صفحه در سایت", data.item.urls.detail)]);
  await edit(chatId, messageId, [
    `<b>${escapeHtml(data.item.title)}</b>`,
    `${files.length} فایل موجود · صفحهٔ ${activePage} از ${totalPages}`,
    "",
    "کیفیت را انتخاب کنید: دانلود سایت، یا ارسال خود فایل در تلگرام پس از صفحهٔ انتظار پنج‌ثانیه‌ای. انتقال فایل‌های بزرگ زمان بیشتری می‌برد و محدودیت حجم دارد.",
  ].join("\n"), keyboard(rows));
}

async function showMusicCategories(chatId, messageId, session) {
  const data = await api("/api/bot/music?mode=filters");
  session.musicCategories = data.filters.categories;
  session.musicKind = "all";
  session.musicCategory = "";
  session.musicPage = 1;
  const categories = data.filters.categories.slice(0, 18);
  const categoryRows = [];
  for (let index = 0; index < categories.length; index += 2) {
    categoryRows.push(categories.slice(index, index + 2).map((category, offset) => b(`${short(category.label, 18)} (${category.count})`, `mcategory:${index + offset}`)));
  }
  await edit(chatId, messageId, [
    "<b>موزیک و موزیک‌ویدئو</b>",
    `${formatNumber(data.totals.tracks)} اثر · ${formatNumber(data.totals.artists)} هنرمند`,
    "",
    "دستهٔ پیشنهادی را انتخاب کنید:",
  ].join("\n"), keyboard([
    [b(`🎵 همهٔ موزیک‌ها (${formatNumber(data.filters.kinds.find((item) => item.value === "track")?.count ?? 0)})`, "mkind:track"), b(`🎥 موزیک‌ویدئو (${formatNumber(data.filters.kinds.find((item) => item.value === "video")?.count ?? 0)})`, "mkind:video")],
    [b("🆕 تازه‌های موسیقی", "mkind:all"), b("🔎 جست‌وجوی نام", "search")],
    ...categoryRows,
    [b("🏠 شروع", "home")],
  ]));
}

async function showMusicResults(chatId, messageId, session) {
  const params = new URLSearchParams({
    kind: session.musicKind || "all",
    page: String(session.musicPage || 1),
    limit: String(PAGE_SIZE),
  });
  if (session.musicCategory) params.set("category", session.musicCategory);
  const data = await api(`/api/bot/music?${params}`);
  session.musicPage = data.pagination.page;
  const rows = (data.items ?? []).map((item) => [
    b(`${short(item.title, 34)} · ${short((item.artists ?? []).join("، "), 20)}`, `mtitle:${item.id}`),
  ]);
  rows.push(paginationRow("mpage", data.pagination));
  rows.push([b("⬅️ دسته‌بندی‌ها", "mcategories"), b("🔎 جست‌وجوی تازه", "search")]);
  await edit(chatId, messageId, [
    `<b>${session.musicKind === "video" ? "موزیک‌ویدئو" : "موزیک"}</b> · ${formatNumber(data.pagination.total)} نتیجه`,
    `صفحهٔ ${data.pagination.page} از ${data.pagination.totalPages} · هر صفحه ۱۰ اثر`,
    "",
    "برای مشاهدهٔ پخش و لینک‌ها، اثر را انتخاب کنید.",
  ].join("\n"), keyboard(rows));
}

async function showMusicTitle(chatId, messageId, id, session) {
  const data = await api(`/api/bot/music?id=${encodeURIComponent(id)}`);
  const item = data.item;
  const rows = [
    [urlButton("🌐 صفحه در سایت", item.urls.detail), urlButton("↗️ منبع اصلی", item.urls.source)],
  ];
  for (const source of item.sources.slice(0, 8)) {
    rows.push(source.kind === "download" ? fileButtons(chatId, source, item) : [urlButton(short(`▶️ پخش · ${source.quality || source.label || "فایل"}`, 58), source.url)]);
  }
  rows.push([b("🧾 دریافت TXT لینک‌ها", `mtxt:${id}`), b("⬅️ نتایج", session?.navigation?.view === "search" ? "nav:return" : "mresults")]);
  await edit(chatId, messageId, [
    `<b>${escapeHtml(item.title)}</b>`,
    escapeHtml((item.artists ?? []).join("، ") || "هنرمند نامشخص"),
    [item.kind === "video" ? "موزیک‌ویدئو" : "موزیک", item.category].filter(Boolean).join(" · "),
    item.description ? `\n${escapeHtml(short(item.description, 420))}` : "",
    `\n${item.sources.length} لینک ثبت شده`,
  ].filter(Boolean).join("\n"), keyboard(rows));
}

async function sendMovieLinksTxt(chatId, id) {
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?includeDownloads=1&maxFiles=80`);
  const content = makeLinksText(data.item.title, data.movieFiles ?? []);
  return sendTextDocument(chatId, `${safeFilename(data.item.title)}-download-links.txt`, content, `🧾 لینک‌های دانلود ${data.item.title}`);
}

async function sendSeasonLinksTxt(chatId, id, season, session) {
  const data = await getSeasonData(id, season, session);
  const files = (data.episodes ?? []).flatMap((episode) => episode.files.map((file) => ({ ...file, episode: episode.code, title: episode.title })));
  const content = makeLinksText(`${data.item.title} - Season ${season}`, files);
  return sendTextDocument(chatId, `${safeFilename(data.item.title)}-season-${season}-links.txt`, content, `🧾 همهٔ لینک‌های فصل ${season} · ${data.item.title}`);
}

async function sendEpisodeLinksTxt(chatId, id, season, episodeValue, session) {
  const data = await getSeasonData(id, season, session);
  const episode = (data.episodes ?? []).find((item) => String(item.episode ?? "pack") === String(episodeValue));
  if (!episode) throw new Error("Episode not found");
  const content = makeLinksText(`${data.item.title} - ${episode.code}`, episode.files);
  return sendTextDocument(chatId, `${safeFilename(data.item.title)}-${episode.code.toLowerCase()}-links.txt`, content, `🧾 لینک‌های ${episode.code} · ${data.item.title}`);
}

async function sendMusicLinksTxt(chatId, id) {
  const data = await api(`/api/bot/music?id=${encodeURIComponent(id)}`);
  const content = makeLinksText(data.item.title, data.item.sources ?? []);
  return sendTextDocument(chatId, `${safeFilename(data.item.title)}-music-links.txt`, content, `🧾 لینک‌های ${data.item.title}`);
}

async function handleInlineQuery(query) {
  const text = query.query.trim();
  if (text.length < 2) {
    return call("answerInlineQuery", { inline_query_id: query.id, results: [], cache_time: 1, is_personal: true });
  }
  const [vod, music] = await Promise.all([
    api(`/api/bot/search?q=${encodeURIComponent(text)}&sort=relevance&limit=5`),
    api(`/api/bot/music?q=${encodeURIComponent(text)}&limit=5`),
  ]);
  const results = [
    ...(vod.items ?? []).map((item) => ({
      type: "article",
      id: `vod-${item.imdbCode}`,
      title: `🎬 ${item.title}`,
      description: [`IMDb ${item.imdbRating ?? "-"}`, item.year ?? "", item.type === "series" ? "سریال" : "فیلم"].filter(Boolean).join(" · "),
      input_message_content: { message_text: `<b>${escapeHtml(item.title)}</b>\nبرای صفحهٔ اثر و لینک‌ها از دکمهٔ زیر استفاده کنید.`, parse_mode: "HTML" },
      reply_markup: { inline_keyboard: [[urlButton("🌐 صفحه و لینک‌ها در SarvNema", item.urls.detail)]] },
    })),
    ...(music.items ?? []).map((item) => ({
      type: "article",
      id: `music-${item.id}`,
      title: `🎵 ${item.title}`,
      description: short((item.artists ?? []).join("، "), 70),
      input_message_content: { message_text: `<b>${escapeHtml(item.title)}</b>\n${escapeHtml((item.artists ?? []).join("، "))}\nبرای پخش و لینک‌ها از دکمهٔ زیر استفاده کنید.`, parse_mode: "HTML" },
      reply_markup: { inline_keyboard: [[urlButton("🎧 صفحه و لینک‌ها در SarvNema", item.urls.detail)]] },
    })),
  ];
  return call("answerInlineQuery", { inline_query_id: query.id, results, cache_time: 5, is_personal: true });
}

export async function handle(update) {
  if (update.inline_query) return handleInlineQuery(update.inline_query);

  const message = update.message;
  const query = update.callback_query;
  const chatId = message?.chat.id ?? query?.message?.chat.id;
  if (!chatId) return;
  const sessionKey = `${chatId}:${message?.from?.id ?? query?.from?.id ?? chatId}`;
  const session = sessionFor(sessionKey);

  if (message?.text?.startsWith("/start")) {
    sessions.set(sessionKey, {});
    return send(chatId, intro, mainKeyboard(chatId));
  }
  if (message?.text?.startsWith("/help")) return send(chatId, helpText, mainKeyboard(chatId));
  if (message?.text?.startsWith("/app")) return send(chatId, "فیلم، سریال و موسیقی را در اپ سرونما پیدا کنید.", keyboard(appUrl ? [[miniAppButton(appUrl, message.chat.type === "private")]] : [[b("🏠 شروع", "home")]]));
  if (message?.text?.startsWith("/search")) {
    session.waitingSearch = true;
    return send(chatId, "نام فیلم، سریال، خواننده یا موزیک را بفرستید تا ۱۰ پیشنهاد نزدیک نمایش بدهم.", keyboard([[b("لغو", "home")]]));
  }
  if (message?.text?.startsWith("/movies")) {
    session.vodType = "movie";
    return navigation.start(chatId, null, session, "movie");
  }
  if (message?.text?.startsWith("/series")) {
    session.vodType = "series";
    return navigation.start(chatId, null, session, "series");
  }
  if (message?.text?.startsWith("/music")) return send(chatId, "موزیک انتخاب شد.", keyboard([[b("نمایش دسته‌بندی‌ها", "mcategories")]]));
  if (message?.text?.startsWith("/animation")) {
    session.vodType = "movie";
    session.vodSection = "animation";
    session.vodPage = 1;
    return navigation.start(chatId, null, session, "animation");
  }
  if (message?.text?.startsWith("/top")) {
    session.vodType = "movie";
    session.vodSection = "top-imdb";
    session.vodPage = 1;
    return navigation.start(chatId, null, session, "top-imdb");
  }
  if (message?.text?.startsWith("/iranian")) {
    session.vodType = "movie";
    session.vodSection = "old-iranian-films";
    session.vodPage = 1;
    return navigation.start(chatId, null, session, "old-iranian-films");
  }

  if (message?.text && !message.text.startsWith("/")) {
    const text = message.text.trim();
    if (session.waitingSearch || text.length >= 2) {
      session.waitingSearch = false;
      return navigation.search(chatId, null, session, text);
    }
  }

  if (!query?.data) return;
  await call("answerCallbackQuery", { callback_query_id: query.id });
  const messageId = query.message.message_id;
  const data = query.data;

  if (data.startsWith("nav:")) return navigation.handle(chatId, messageId, session, data);
  if (/^(vgenre:|vcountry:|vyear:|vquick:|vpage:)/.test(data) || data === "vcountries") return send(chatId, "این منو قدیمی است؛ از دسته‌بندی جدید استفاده کنید.", keyboard([[b("بازکردن تنظیمات", "vcategories")]]));

  if (data === "home") {
    sessions.set(sessionKey, {});
    return edit(chatId, messageId, intro, mainKeyboard(chatId));
  }
  if (data === "search") {
    session.waitingSearch = true;
    return edit(chatId, messageId, "نام فیلم، سریال، خواننده یا موزیک را بفرستید تا ۱۰ پیشنهاد نزدیک نمایش بدهم.", keyboard([[b("لغو", "home")]]));
  }
  if (data === "pick:music" || data === "mcategories") return showMusicCategories(chatId, messageId, session);
  if (data === "pick:movie" || data === "pick:series") {
    session.vodType = data.slice(5);
    session.vodSection = "";
    return navigation.start(chatId, messageId, session, session.vodType);
  }
  if (data.startsWith("section:")) {
    const requestedSection = data.slice(8);
    session.vodSection = requestedSection === "recent-2026" ? "" : requestedSection;
    session.vodType = requestedSection === "best-series" ? "series" : "movie";
    clearVodFilters(session);
    if (requestedSection === "recent-2026") session.vodYear = "2026";
    session.vodPage = 1;
    return navigation.start(chatId, messageId, session, requestedSection);
  }
  if (data === "vcategories") return navigation.start(chatId, messageId, session, session.vodType || "movie");
  if (data === "vresults") return navigation.restore(chatId, messageId, session);
  if (data === "mresults") return showMusicResults(chatId, messageId, session);

  if (data.startsWith("vtitle:")) return showVodTitle(chatId, messageId, data.slice(7), session);
  if (data.startsWith("vfiles:")) {
    const [, id, page] = data.split(":");
    return showMovieFiles(chatId, messageId, id, Number(page) || 1);
  }
  if (data.startsWith("vmfpage:")) {
    const [, id, page] = data.split(":");
    return showMovieFiles(chatId, messageId, id, Number(page) || 1);
  }
  if (data.startsWith("vseason:")) {
    const [, id, season, page] = data.split(":");
    return showSeasonEpisodes(chatId, messageId, id, Number(season), Number(page) || 1, session);
  }
  if (data.startsWith("vepage:")) {
    const [, id, season, page] = data.split(":");
    return showSeasonEpisodes(chatId, messageId, id, Number(season), Number(page) || 1, session);
  }
  if (data.startsWith("vepisode:")) {
    const [, id, season, episode, page] = data.split(":");
    return showEpisodeFiles(chatId, messageId, id, Number(season), episode, Number(page) || 1, session);
  }
  if (data.startsWith("vfpage:")) {
    const [, id, season, episode, page] = data.split(":");
    return showEpisodeFiles(chatId, messageId, id, Number(season), episode, Number(page) || 1, session);
  }
  if (data.startsWith("vtxtmovie:")) return sendMovieLinksTxt(chatId, data.slice(10));
  if (data.startsWith("vtxtseason:")) {
    const [, id, season] = data.split(":");
    return sendSeasonLinksTxt(chatId, id, Number(season), session);
  }
  if (data.startsWith("vtxtepisode:")) {
    const [, id, season, episode] = data.split(":");
    return sendEpisodeLinksTxt(chatId, id, Number(season), episode, session);
  }

  if (data.startsWith("mkind:")) {
    session.musicKind = data.slice(6);
    session.musicCategory = "";
    session.musicPage = 1;
    return showMusicResults(chatId, messageId, session);
  }
  if (data.startsWith("mcategory:")) {
    session.musicCategory = session.musicCategories?.[Number(data.slice(10))]?.value ?? "";
    session.musicKind = "all";
    session.musicPage = 1;
    return showMusicResults(chatId, messageId, session);
  }
  if (data.startsWith("mpage:")) {
    session.musicPage = Number(data.slice(6)) || 1;
    return showMusicResults(chatId, messageId, session);
  }
  if (data.startsWith("mtitle:")) return showMusicTitle(chatId, messageId, data.slice(7));
  if (data.startsWith("mtxt:")) return sendMusicLinksTxt(chatId, data.slice(5));
}

function clearVodFilters(session) {
  session.vodGenre = "";
  session.vodCountry = "";
  session.vodYear = "";
  session.vodMinImdb = "";
  session.vodSort = "rating";
}

function paginationRow(prefix, pagination, context = "") {
  const previous = pagination.hasPrevious ? b("‹ قبلی", `${prefix}:${context ? `${context}:` : ""}${pagination.page - 1}`) : null;
  const next = pagination.hasNext ? b("بعدی ›", `${prefix}:${context ? `${context}:` : ""}${pagination.page + 1}`) : null;
  return [previous, b(`${pagination.page}/${pagination.totalPages}`, "noop"), next].filter(Boolean);
}

function fileButtonText(file) {
  return [file.episode, file.quality, file.group, file.release, file.size].filter(Boolean).join(" · ") || file.label || file.name || "دریافت فایل";
}

function makeLinksText(title, files) {
  const lines = [`SarvNema download links`, `Title: ${title}`, `Generated: ${new Date().toISOString()}`, ""];
  files.forEach((file, index) => {
    const label = fileButtonText(file);
    lines.push(`${index + 1}. ${label}`);
    if (file.title) lines.push(`   Episode: ${file.title}`);
    lines.push(`   ${file.url}`, "");
  });
  return lines.join("\n");
}

function short(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trim()}…` : text || "بدون عنوان";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeFilename(value) {
  const normalized = String(value ?? "sarvnema").normalize("NFKD").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 72) || "sarvnema";
}

function formatNumber(value) {
  return new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
}

async function runBot() {
  if (!token) throw new Error("BOT_API_TOKEN is missing from .env.local");
  let offset = 0;
  try {
    await configureTelegramProfile();
    console.log("Telegram profile and command menu configured.");
  } catch (error) {
    console.error(`Telegram profile setup skipped: ${error.message}`);
  }

  console.log("SarvNema Telegram bot is running...");
  void runDeliveryWorker({ apiBase, token, telegram, send });
  while (true) {
    try {
      const updates = await call("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query", "inline_query"],
      });
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
