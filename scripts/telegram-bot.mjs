import { readFile } from "node:fs/promises";

try {
  const env = await readFile(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
} catch {}

const token = process.env.BOT_API_TOKEN;
const apiBase = process.env.BOT_SITE_URL || "http://localhost:3004";
if (!token) throw new Error("BOT_API_TOKEN is missing from .env.local");
const telegram = `https://api.telegram.org/bot${token}`;
const sessions = new Map();

const profileCommands = [
  { command: "start", description: "شروع و معرفی SarvNema" },
  { command: "search", description: "جست‌وجوی فیلم یا سریال" },
  { command: "movies", description: "نمایش فیلم‌ها" },
  { command: "series", description: "نمایش سریال‌ها" },
  { command: "filters", description: "فیلتر ژانر، کشور، سال و IMDb" },
  { command: "watchtogether", description: "ساخت اتاق تماشای هم‌زمان" },
  { command: "help", description: "راهنمای استفاده" },
];

async function configureTelegramProfile() {
  await call("setMyName", { name: "SarvNema | فیلم و سریال" });
  await call("setMyShortDescription", { short_description: "جست‌وجو و دریافت لینک مستقیم فیلم و سریال با فیلتر IMDb، ژانر، کشور، سال و کیفیت." });
  await call("setMyDescription", { description: "SarvNema مرجع هوشمند جست‌وجوی فیلم و سریال است.\n\nعنوان انگلیسی را بفرستید یا از فیلترهای ژانر، کشور سازنده، سال تولید، زبان، امتیاز IMDb و کیفیت استفاده کنید تا نزدیک‌ترین نتیجه‌ها و لینک‌های دانلود مستقیم را پیدا کنید.\n\nبرای شروع /start را بزنید." });
  await call("setMyCommands", { commands: profileCommands });
  await call("setChatMenuButton", { menu_button: { type: "commands" } });
}

const intro = `🎬 به SarvNema خوش آمدید!

اینجا می‌توانید فیلم و سریال موردنظرتان را با مرتب‌سازی IMDb و فیلترهای دقیق پیدا کنید؛ از ژانر، کشور سازنده، سال تولید، زبان و کیفیت گرفته تا لینک‌های دانلود مستقیم.

ابتدا نوع محتوا را انتخاب کنید:`;

async function call(method, body = {}) {
  const response = await fetch(`${telegram}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || method);
  return data.result;
}

async function api(path) {
  const response = await fetch(`${apiBase}${path}`, { headers: { "x-bot-token": token } });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

function keyboard(rows) { return { inline_keyboard: rows }; }
function mainKeyboard() { return keyboard([[b("🎞 فیلم", "type:movie"), b("📺 سریال", "type:series")], [b("🔎 جست‌وجوی نام انگلیسی", "search")], [b("👥 تماشای هم‌زمان", "watchparty")]]); }
function b(text, data) { return { text, callback_data: data }; }
function countLabel(value, fallback = "همه") { return `${value.label} (${value.count})`; }

async function send(chatId, text, markup) { return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: markup }); }
async function edit(chatId, messageId, text, markup) { return call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: markup }); }

const helpText = `راهنمای SarvNema\n\nاز منوی شروع نوع محتوا را انتخاب کنید و سپس با فیلترهای IMDb، ژانر، کشور و سال نتیجه‌ها را محدود کنید. برای جست‌وجوی مستقیم، نام انگلیسی فیلم یا سریال را ارسال کنید. پس از انتخاب عنوان، کیفیت، حجم و لینک‌های دانلود نمایش داده می‌شود.`;

async function showFilters(chatId, messageId, session) {
  const filters = await api("/api/bot/filters");
  const type = filters.filters.types.find((item) => item.value === session.type) ?? filters.filters.types[0];
  const genres = filters.filters.genres;
  const countries = filters.filters.countries.slice(0, 8);
  const years = filters.filters.years.slice(0, 8);
  const genreRows = [];
  for (let index = 0; index < genres.length; index += 2) {
    genreRows.push(genres.slice(index, index + 2).map((x) => b(countLabel(x), `genre:${x.value}`)));
  }
  const rows = [...genreRows, [b("⏭ بدون دسته‌بندی", "category:any")], [b("🔎 جست‌وجو", "search")]].filter((row) => row.length);
  await edit(chatId, messageId, `مرحله ۲ از ۴ · نوع انتخاب‌شده: <b>${type.label}</b>\n\nدسته‌بندی را انتخاب کنید:`, keyboard(rows));
}

async function showCountries(chatId, messageId, session) {
  const filters = await api("/api/bot/filters");
  const countries = filters.filters.countries.slice(0, 16);
  const rows = [countries.slice(0, 2).map((x) => b(`🌍 ${countLabel(x)}`, `country:${x.value}`)), countries.slice(2, 4).map((x) => b(`🌍 ${countLabel(x)}`, `country:${x.value}`)), countries.slice(4, 6).map((x) => b(`🌍 ${countLabel(x)}`, `country:${x.value}`)), [b("⏭ بدون کشور", "country:any")]].filter((row) => row.length);
  await edit(chatId, messageId, `مرحله ۳ از ۴ · دسته‌بندی: <b>${session.genre ? session.genre : "همه"}</b>\n\nکشور سازنده را انتخاب کنید:`, keyboard(rows));
}

async function showYears(chatId, messageId, session) {
  const filters = await api("/api/bot/filters");
  const years = filters.filters.years.slice(0, 16);
  const rows = [years.slice(0, 4).map((x) => b(`📅 ${countLabel(x)}`, `year:${x.value}`)), years.slice(4, 8).map((x) => b(`📅 ${countLabel(x)}`, `year:${x.value}`)), years.slice(8, 12).map((x) => b(`📅 ${countLabel(x)}`, `year:${x.value}`)), [b("⏭ همه سال‌ها", "year:any")]].filter((row) => row.length);
  await edit(chatId, messageId, `مرحله ۴ از ۴ · کشور: <b>${session.country ? session.country : "همه"}</b>\n\nسال ساخت را انتخاب کنید:`, keyboard(rows));
}

async function showResults(chatId, messageId, session) {
  const params = new URLSearchParams({ type: session.type, sort: "rating", limit: "15" });
  for (const key of ["genre", "country", "year", "minImdb", "language", "quality"]) if (session[key]) params.set(key, session[key]);
  const data = await api(`/api/bot/search?${params}`);
  const rows = (data.items ?? []).slice(0, 15).map((item) => [b(`${item.title} · IMDb ${item.imdbRating ?? "-"}`, `title:${item.imdbCode}`), b("🔗 دانلود", `title:${item.imdbCode}`)]);
  rows.push([b("⬅️ فیلترها", "filters"), b("🔎 جست‌وجوی جدید", "search")]);
  await edit(chatId, messageId, `نتایج مرتب‌شده بر اساس IMDb: <b>${data.total ?? data.items?.length ?? 0}</b> مورد`, keyboard(rows));
}

async function showTitle(chatId, messageId, id, season = "") {
  const seasonQuery = season ? `&season=${encodeURIComponent(season)}` : "";
  const data = await api(`/api/bot/title/${encodeURIComponent(id)}?includeDownloads=1&maxFiles=20${seasonQuery}`);
  const item = data.item;
  const text = `<b>${item.title}</b>\n${item.type} · ${item.year ?? "-"} · IMDb ${item.imdbRating ?? "-"}\n\n${item.overview ?? "اطلاعات تکمیلی موجود نیست."}\n\nکیفیت‌ها و لینک‌های دانلود:`;
  const movieFiles = data.movieFiles ?? [];
  const episodeFiles = (data.episodes ?? []).flatMap((episode) =>
    (episode.files ?? []).map((file) => ({ ...file, label: episode.code }))
  );
  const files = [...movieFiles, ...episodeFiles].slice(0, 40).map((file) => [
    { text: `${file.label ? `${file.label} · ` : ""}${file.quality ?? "File"} ${file.size ?? ""}`.trim(), url: file.url },
  ]);
  const seasonButtons = (data.seasons ?? []).slice(0, 12).map((season) =>
    b(`فصل ${season.season} (${season.episodes ?? 0})`, `season:${id}:${season.season}`)
  );
  const partyButton = /^https:\/\//i.test(apiBase)
    ? { text: "👥 ساخت اتاق تماشای هم‌زمان", url: `${apiBase}/watch/${id}` }
    : { text: "👥 ساخت اتاق تماشای هم‌زمان", callback_data: `party:${id}` };
  const rows = files.length ? files : [[{ text: "لینک دانلودی برای این عنوان ثبت نشده است", callback_data: "results" }]];
  await edit(chatId, messageId, text, keyboard([...rows, ...(seasonButtons.length ? [seasonButtons] : []), [partyButton], [{ text: "🔎 نتیجه‌های دیگر", callback_data: "results" }]]));
}

async function handleInlineQuery(query) {
  const text = query.query.trim();
  if (text.length < 2) return call("answerInlineQuery", { inline_query_id: query.id, results: [], cache_time: 1 });
  const data = await api(`/api/bot/search?q=${encodeURIComponent(text)}&sort=relevance&limit=20`);
  const results = (data.items ?? []).map((item) => ({
    type: "article", id: item.imdbCode, title: item.title,
    description: [`IMDb ${item.imdbRating ?? "-"}`, item.year ?? "", item.genres?.slice(0, 2).join(" / ") ?? ""].filter(Boolean).join(" · "),
    input_message_content: { message_text: `${item.title}\nIMDb ${item.imdbRating ?? "-"}\nبرای مشاهده کیفیت و لینک دانلود روی دکمه بزنید.` },
    reply_markup: { inline_keyboard: [[{ text: "🔗 کیفیت و دانلود", callback_data: `title:${item.imdbCode}` }]] },
  }));
  return call("answerInlineQuery", { inline_query_id: query.id, results, cache_time: 5, is_personal: true });
}

async function handle(update) {
  if (update.inline_query) return handleInlineQuery(update.inline_query);
  const message = update.message;
  const query = update.callback_query;
  const chatId = message?.chat.id ?? query?.message.chat.id;
  if (!chatId) return;
  const session = sessions.get(chatId) ?? {};
  if (message?.text?.startsWith("/start")) { sessions.set(chatId, {}); return send(chatId, intro, mainKeyboard()); }
  if (message?.text?.startsWith("/help")) return send(chatId, helpText, mainKeyboard());
  if (message?.text?.startsWith("/watchtogether")) return send(chatId, "برای ساخت اتاق تماشای هم‌زمان، ابتدا فیلم یا سریال را جست‌وجو کنید؛ سپس وارد جزئیات شوید و گزینه «ساخت اتاق تماشای هم‌زمان» را بزنید.", mainKeyboard());
  if (message?.text?.startsWith("/search")) { session.waitingSearch = true; sessions.set(chatId, session); return send(chatId, "نام انگلیسی فیلم یا سریال را بفرستید:", keyboard([[b("لغو", "start")]])); }
  if (message?.text?.startsWith("/movies") || message?.text?.startsWith("/series")) { session.type = message.text.startsWith("/movies") ? "movie" : "series"; sessions.set(chatId, session); const fake = { message_id: null }; return send(chatId, "نوع محتوا انتخاب شد. فیلترها را انتخاب کنید:", keyboard([[b("نمایش فیلترها", "filters")]])); }
  if (message?.text?.startsWith("/filters")) { session.type ??= "movie"; sessions.set(chatId, session); return send(chatId, "نوع محتوا را انتخاب کنید:", mainKeyboard()); }
  if (message?.text && session.waitingSearch) {
    session.waitingSearch = false; session.query = message.text.trim();
    const data = await api(`/api/bot/search?q=${encodeURIComponent(session.query)}&sort=relevance&limit=15`);
    const rows = (data.items ?? []).map((item) => [b(`${item.title} · IMDb ${item.imdbRating ?? "-"}`, `title:${item.imdbCode}`), b("🔗 دانلود", `title:${item.imdbCode}`)]);
    return send(chatId, `نزدیک‌ترین نتایج برای <b>${session.query}</b>:`, keyboard(rows.length ? rows : [[b("شروع دوباره", "start")]]));
  }
  if (!query) return;
  await call("answerCallbackQuery", { callback_query_id: query.id });
  if (query.data === "start") return edit(chatId, query.message.message_id, intro, mainKeyboard());
  if (query.data === "search") { session.waitingSearch = true; sessions.set(chatId, session); return edit(chatId, query.message.message_id, "نام فیلم یا سریال را به انگلیسی بفرستید تا نزدیک‌ترین نتایج را پیدا کنم:", keyboard([[b("لغو", "start")]])); }
  if (query.data === "watchparty") { session.waitingSearch = true; session.watchPartySearch = true; sessions.set(chatId, session); return edit(chatId, query.message.message_id, "نام انگلیسی فیلم یا سریالی را که می‌خواهید گروهی ببینید ارسال کنید:", keyboard([[b("لغو", "start")]])); }
  if (query.data.startsWith("type:")) { session.type = query.data.slice(5); sessions.set(chatId, session); return showFilters(chatId, query.message.message_id, session); }
  if (query.data === "filters") return showFilters(chatId, query.message.message_id, session);
  if (query.data === "results") return showResults(chatId, query.message.message_id, session);
  if (query.data.startsWith("season:")) {
    const [, id, season] = query.data.split(":");
    return showTitle(chatId, query.message.message_id, id, season);
  }
  if (query.data.startsWith("title:")) return showTitle(chatId, query.message.message_id, query.data.slice(6));
  if (query.data.startsWith("party:")) return edit(chatId, query.message.message_id, `برای ساخت اتاق این عنوان، صفحه زیر را در مرورگر باز کنید:\n${apiBase}/watch/${query.data.slice(6)}`, keyboard([[b("بازگشت", `title:${query.data.slice(6)}`)]]));
  const [key, value] = query.data.split(":");
  if (key === "genre") { session.genre = value === "any" ? "" : value; sessions.set(chatId, session); return showCountries(chatId, query.message.message_id, session); }
  if (key === "category") { session.genre = ""; sessions.set(chatId, session); return showCountries(chatId, query.message.message_id, session); }
  if (key === "country") { session.country = value === "any" ? "" : value; sessions.set(chatId, session); return showYears(chatId, query.message.message_id, session); }
  if (key === "year") { session.year = value === "any" ? "" : value; sessions.set(chatId, session); return showResults(chatId, query.message.message_id, session); }
}

let offset = 0;
try { await configureTelegramProfile(); console.log("Telegram profile and command menu configured."); }
catch (error) { console.error(`Telegram profile setup skipped: ${error.message}`); }
console.log("SarvNema Telegram bot is running...");
while (true) {
  try {
    const updates = await call("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query", "inline_query"] });
    for (const update of updates) { offset = update.update_id + 1; await handle(update).catch((error) => console.error(error.message)); }
  } catch (error) { console.error(error.message); await new Promise((resolve) => setTimeout(resolve, 3000)); }
}
