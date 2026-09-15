import { randomBytes } from "node:crypto";

const labels = { movie: "فیلم‌ها", movies: "فیلم‌ها", series: "سریال‌ها", animation: "انیمیشن", "top-imdb": "۲۵۰ برتر IMDb", "old-iranian-films": "فیلم‌های ایرانی قدیمی", "recent-2026": "فیلم‌های ۲۰۲۶" };
const fields = { genre: ["ژانر", "genres"], country: ["کشور", "countries"], year: ["سال ساخت", "years"], minImdb: ["حداقل IMDb", "scores"], quality: ["کیفیت", "qualities"], sort: ["ترتیب نمایش", "sorts"] };
const sorts = [{ value: "rating", label: "امتیاز IMDb: بیشتر به کمتر" }, { value: "year", label: "سال: جدید به قدیم" }, { value: "title", label: "نام: الفبایی" }];
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const number = value => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
const rowsOf = (items, size = 2) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

/** Shared Telegram/Bale browsing. Only an explicit results action starts a list.
 * Callback values refer to the exact rendered view, never an index in a mutable
 * global facet list. Expired keyboards cannot change another view's filters. */
export function createBotNavigation({ api, send, edit, sendCard, openVod, openMusic }) {
  function params(state) {
    const query = new URLSearchParams({ type: state.type, sort: "rating", ...state.filters });
    if (state.section && !["movie", "movies", "series", "recent-2026"].includes(state.section)) query.set("section", state.section);
    return query;
  }
  function beginView(state) {
    state.revision = randomBytes(6).toString("hex");
    state.actions = [];
    return (text, action) => {
      const index = state.actions.push(action) - 1;
      return { text, callback_data: `nav:${state.revision}:${index}` };
    };
  }
  async function display(chatId, messageId, text, rows) {
    const markup = { inline_keyboard: rows.filter(row => row.length) };
    return messageId ? edit(chatId, messageId, text, markup) : send(chatId, text, markup);
  }
  function summary(state) {
    return Object.entries(fields).map(([key, [label]]) => `${label}: ${escape(key === "sort" ? sorts.find(item => item.value === state.filters.sort)?.label || sorts[0].label : state.filters[key] || "همه")}`).join("\n");
  }
  async function render(chatId, messageId, session) {
    const state = session.navigation;
    if (!state) return display(chatId, messageId, "این منو مربوط به نشست قبلی است؛ بخش دلخواه را دوباره انتخاب کنید.", [[{ text: "🏠 منوی اصلی", callback_data: "home" }]]);
    if (state.view === "search") return renderSearch(chatId, messageId, session);
    if (state.view === "results") return renderResults(chatId, messageId, session);
    const data = await api(`/api/bot/filters?${params(state)}`);
    const b = beginView(state);
    const home = { text: "🏠 منوی اصلی", callback_data: "home" };
    if (state.view === "facet") {
      const [label, key] = fields[state.field];
      let options = state.field === "sort" ? sorts : state.field === "minImdb" ? [9, 8.5, 8, 7.5, 7, 6, 5].map(value => ({ value: String(value), label: `IMDb ${value}+` })) : [...(data.filters[key] || [])];
      if (state.field === "year") options.sort((a, b) => Number(b.value) - Number(a.value));
      const pages = Math.max(1, Math.ceil(options.length / 16));
      state.facetPage = Math.min(Math.max(state.facetPage || 1, 1), pages);
      const visible = options.slice((state.facetPage - 1) * 16, state.facetPage * 16);
      const buttons = visible.map(option => b(`${state.filters[state.field] === option.value ? "✓ " : ""}${option.label}${option.count === undefined ? "" : ` (${number(option.count)})`}`, { kind: "select", field: state.field, value: option.value }));
      const pagination = [];
      if (state.facetPage > 1) pagination.push(b("قبلی", { kind: "facet-page", page: state.facetPage - 1 }));
      if (state.facetPage < pages) pagination.push(b("بعدی", { kind: "facet-page", page: state.facetPage + 1 }));
      return display(chatId, messageId, `<b>آرشیو ← ${labels[state.section]} ← ${label}</b>\n\n${label} را انتخاب کنید؛ سپس به تنظیمات برمی‌گردید.\nصفحهٔ ${number(state.facetPage)} از ${number(pages)}${state.field === "year" ? " · جدید به قدیم" : ""}`, [
        ...(state.field === "sort" ? [] : [[b(`همه / بدون فیلتر ${label}`, { kind: "select", field: state.field, value: "" })]]),
        ...rowsOf(buttons, state.field === "year" ? 4 : 2), pagination,
        [b("⬅️ بازگشت به تنظیمات", { kind: "hub" }), home],
      ]);
    }
    const buttons = Object.entries(fields).filter(([key]) => !(state.section === "recent-2026" && key === "year")).map(([key, [label]]) => b(`${label}: ${key === "sort" ? sorts.find(item => item.value === state.filters.sort)?.label || "IMDb" : state.filters[key] || "همه"}`, { kind: "facet", field: key }));
    return display(chatId, messageId, `<b>آرشیو ← ${labels[state.section]}</b>\n\n${summary(state)}\n\nفیلترها اختیاری‌اند. هرکدام را تغییر بدهید و وقتی آماده بودید «نمایش نتایج» را بزنید.`, [
      ...rowsOf(buttons), [b(`🎬 نمایش ${number(data.matchingTitles ?? data.totals.titles)} نتیجه`, { kind: "results", page: 1 })],
      [b("پاک‌کردن فیلترها", { kind: "clear" }), home],
    ]);
  }
  function resultPaging(b, pagination, kind) {
    return [pagination.hasPrevious ? b("‹ صفحهٔ قبل", { kind, page: pagination.page - 1 }) : null,
      pagination.hasNext ? b("صفحهٔ بعد ›", { kind, page: pagination.page + 1 }) : null].filter(Boolean);
  }
  async function renderResults(chatId, messageId, session) {
    const state = session.navigation;
    const query = params(state);
    query.set("page", String(state.page || 1)); query.set("limit", "10");
    const data = await api(`/api/bot/search?${query}`);
    state.page = data.pagination.page;
    const b = beginView(state);
    await display(chatId, messageId, `<b>${labels[state.section]} ← نتایج</b>\n${summary(state)}\n\n${number(data.pagination.total)} نتیجه · صفحهٔ ${number(state.page)} از ${number(data.pagination.totalPages)}${!data.items.length ? "\nبا این ترکیب نتیجه‌ای نداریم؛ فیلترها را تغییر بدهید." : ""}`, []);
    for (const item of data.items) await sendCard(chatId, item, b("جزئیات و کیفیت‌ها", { kind: "vod", id: item.imdbCode }).callback_data);
    return display(chatId, null, "فهرست ۱۰تایی · فیلترها و صفحهٔ فعلی هنگام بازگشت حفظ می‌شوند.", [resultPaging(b, data.pagination, "results"), [b("⬅️ بازگشت به تنظیمات", { kind: "hub" }), { text: "🏠 منوی اصلی", callback_data: "home" }]]);
  }
  async function renderSearch(chatId, messageId, session) {
    const state = session.navigation;
    const [vod, music] = await Promise.all([
      api(`/api/bot/search?q=${encodeURIComponent(state.query)}&sort=relevance&page=${state.page || 1}&limit=10`),
      api(`/api/bot/music?q=${encodeURIComponent(state.query)}&page=${state.page || 1}&limit=10`),
    ]);
    if (!state.searchKind) state.searchKind = vod.pagination.total ? "vod" : "music";
    const data = state.searchKind === "music" ? music : vod;
    state.page = data.pagination.page;
    const b = beginView(state);
    const corrections = [...new Set(data.corrections || [])].slice(0, 5);
    const rows = [
      [b(`🎬 فیلم و سریال (${number(vod.pagination.total)})`, { kind: "search-kind", value: "vod" }), b(`🎵 موسیقی (${number(music.pagination.total)})`, { kind: "search-kind", value: "music" })],
      ...corrections.map(query => [b(`🔎 ${query}`, { kind: "correction", query })]),
      ...data.items.map(item => [b(`${item.imdbCode ? (item.type === "series" ? "📺" : "🎬") : "🎵"} ${String(item.title).slice(0, 55)}${item.imdbRating ? ` · IMDb ${item.imdbRating}` : ""}`, { kind: item.imdbCode ? "vod" : "music", id: item.imdbCode || item.id })]),
      resultPaging(b, data.pagination, "search-page"),
      [b("⬅️ بازگشت", { kind: "search-back" }), { text: "🔎 جست‌وجوی تازه", callback_data: "search" }, { text: "🏠 منوی اصلی", callback_data: "home" }],
    ];
    const correction = data.mode === "similar" ? `\nنزدیک‌ترین عبارت: <b>${escape(data.matchedQuery)}</b>` : "";
    return display(chatId, messageId, `<b>جست‌وجو: ${escape(state.query)}</b>${correction}\n${number(data.pagination.total)} نتیجه · صفحهٔ ${number(state.page)} از ${number(data.pagination.totalPages)}${!data.items.length ? "\nنام کامل یا چند حرف دیگر را امتحان کنید." : ""}`, rows);
  }
  async function start(chatId, messageId, session, section = "movie") {
    if (!labels[section]) section = "movie";
    session.navigation = { section, type: section === "series" ? "series" : section === "animation" ? "all" : "movie", filters: section === "recent-2026" ? { year: "2026" } : {}, view: "hub", page: 1 };
    return render(chatId, messageId, session);
  }
  async function search(chatId, messageId, session, query) {
    const previous = session.navigation;
    session.navigation = { ...previous, view: "search", query: query.slice(0, 160), searchKind: null, page: 1,
      previous: previous?.view === "search" ? previous.previous : previous ? { ...previous, actions: [], revision: "" } : null };
    return render(chatId, messageId, session);
  }
  async function handle(chatId, messageId, session, data) {
    if (data === "nav:return") return render(chatId, messageId, session);
    const [, revision, key] = data.split(":");
    const state = session.navigation;
    const action = state?.revision === revision && /^\d+$/.test(key || "") ? state.actions?.[Number(key)] : null;
    if (!action) return send(chatId, "این دکمه متعلق به منوی قبلی است؛ از آخرین منو استفاده کنید یا به شروع برگردید.", { inline_keyboard: [[{ text: "🏠 شروع", callback_data: "home" }]] });
    switch (action.kind) {
      case "vod": return openVod(chatId, messageId, action.id, session);
      case "music": return openMusic(chatId, messageId, action.id, session);
      case "facet": state.view = "facet"; state.field = action.field; state.facetPage = 1; break;
      case "facet-page": state.facetPage = action.page; break;
      case "select": state.filters[action.field] = action.value; state.page = 1; state.view = "hub"; break;
      case "hub": state.view = "hub"; break;
      case "clear": state.filters = state.section === "recent-2026" ? { year: "2026" } : {}; state.view = "hub"; state.page = 1; break;
      case "results": state.view = "results"; state.page = action.page; break;
      case "search-page": state.page = action.page; break;
      case "search-kind": state.searchKind = action.value; state.page = 1; break;
      case "correction": state.query = action.query; state.page = 1; break;
      case "search-back":
        if (!state.previous) return display(chatId, messageId, "بخش دلخواه را از منوی اصلی انتخاب کنید.", [[{ text: "🏠 منوی اصلی", callback_data: "home" }]]);
        session.navigation = state.previous; break;
      default: return;
    }
    return render(chatId, messageId, session);
  }
  return { start, search, handle, restore: render };
}
