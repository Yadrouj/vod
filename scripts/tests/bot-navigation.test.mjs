import test from "node:test";
import assert from "node:assert/strict";
import { createBotNavigation } from "../bot-navigation.mjs";
import { miniAppUrl, miniAppButton } from "../telegram-mini-app.mjs";

export const filters = { matchingTitles: 21, totals: { titles: 21 }, filters: {
  genres: [{ value: "Drama", label: "Drama", count: 10 }, { value: "Crime", label: "Crime", count: 8 }],
  countries: [{ value: "United States", label: "United States", count: 11 }, { value: "Iran", label: "Iran", count: 5 }],
  years: [2024, 2025, 2023, 2026, ...Array.from({ length: 25 }, (_, i) => 2022 - i)].map((year, i) => ({ value: String(year), label: String(year), count: 100 - i })), qualities: [{ value: "1080p", label: "1080p", count: 3 }],
} };
export const item = { title: "Breaking Bad", imdbCode: "tt0903747", type: "series", year: 2008, imdbRating: 9.5, genres: ["Crime"], urls: { detail: "https://sarvnema.ir/tt0903747", watch: "https://sarvnema.ir/watch/tt0903747" } };
export function apiFixture(raw) {
  const url = new URL(raw, "https://site.test");
  if (url.pathname === "/api/bot/filters") return structuredClone(filters);
  const page = Number(url.searchParams.get("page") || 1);
  if (url.pathname === "/api/bot/music") return { items: [], pagination: { total: 0, page: 1, totalPages: 1 } };
  if (url.pathname === "/api/bot/search") return { items: [item], corrections: url.searchParams.get("q") === "breakng bud" ? ["Breaking Bad"] : [], matchedQuery: "Breaking Bad", mode: url.searchParams.get("q") === "breakng bud" ? "similar" : "exact", pagination: { total: 21, page, totalPages: 3, hasNext: page < 3, hasPrevious: page > 1 } };
  if (url.pathname.startsWith("/api/bot/title/")) return { item, seasons: [{ season: 1, sourceCount: 10 }], episodes: [] };
  throw Error(`Unexpected API: ${url.pathname}`);
}

function harness() {
  const messages = [], calls = [], opened = [];
  const session = {};
  const nav = createBotNavigation({ api: async url => { calls.push(url); return apiFixture(url); },
    send: async (_chat, text, markup) => messages.push({ text, markup }), edit: async (_chat, _id, text, markup) => messages.push({ text, markup }),
    sendCard: async (_chat, item, callback) => messages.push({ item, callback }),
    openVod: async (_chat, _id, id) => opened.push(id), openMusic: async () => {},
  });
  const last = () => messages.at(-1);
  const button = regex => {
    const found = last().markup?.inline_keyboard.flat().find(button => regex.test(button.text));
    assert.ok(found, `Missing button ${regex} in ${last().text}`);
    return found.callback_data;
  };
  const click = regex => nav.handle(1, 1, session, button(regex));
  return { nav, session, messages, calls, opened, last, button, click };
}

test("series → any genre returns to a scoped summary; years are descending and paged", async () => {
  const h = harness();
  await h.nav.start(1, 1, h.session, "series");
  await h.click(/^ژانر:/);
  await h.click(/^همه \/ بدون/);
  assert.equal(h.session.navigation.view, "hub");
  assert.equal(h.session.navigation.type, "series");
  assert.ok(!h.calls.some(url => url.startsWith("/api/bot/search")), "Selection must not automatically show results");
  await h.click(/^سال ساخت:/);
  const years = h.last().markup.inline_keyboard.flat().map(button => button.text.match(/^\d{4}/)?.[0]).filter(Boolean);
  assert.deepEqual(years.slice(0, 4), ["2026", "2025", "2024", "2023"]);
  assert.equal(years.length, 16);
  await h.click(/^بعدی$/);
  assert.equal(h.session.navigation.facetPage, 2);
  await h.click(/^قبلی$/);
  await h.click(/^2026/);
  assert.equal(h.session.navigation.filters.year, "2026");
  await h.click(/^کشور:/);
  await h.click(/^United States/);
  await h.click(/^🎬 نمایش/);
  assert.match(h.calls.at(-1), /type=series/);
  assert.match(h.calls.at(-1), /year=2026/);
  assert.match(h.calls.at(-1), /country=United\+States/);
  await h.click(/^صفحهٔ بعد/);
  assert.equal(h.session.navigation.page, 2);
  const card = h.messages.filter(message => message.callback).at(-1);
  await h.nav.handle(1, 1, h.session, card.callback);
  assert.deepEqual(h.opened, ["tt0903747"]);
  await h.nav.handle(1, 1, h.session, "nav:return");
  assert.equal(h.session.navigation.page, 2);
  await h.click(/^⬅️ بازگشت به تنظیمات/);
  assert.equal(h.session.navigation.filters.year, "2026");
});

test("old keyboards and another session cannot silently choose a different value", async () => {
  const h = harness();
  await h.nav.start(1, 1, h.session, "series");
  await h.click(/^ژانر:/);
  const old = h.button(/^Crime/);
  await h.click(/^⬅️ بازگشت/);
  await h.click(/^کشور:/);
  await h.nav.handle(1, 1, h.session, old);
  assert.match(h.last().text, /منوی قبلی/);
  assert.equal(h.session.navigation.view, "facet");
  assert.deepEqual(h.session.navigation.filters, {});
  await h.nav.handle(2, 1, {}, old);
  assert.match(h.last().text, /منوی قبلی/);
  for (const message of h.messages) for (const button of message.markup?.inline_keyboard.flat() || []) {
    assert.ok(Buffer.byteLength(button.callback_data) <= 64);
  }
});

test("corrections are actionable and title Back restores the original search", async () => {
  const h = harness();
  await h.nav.start(1, 1, h.session, "series");
  await h.nav.search(1, null, h.session, "breakng bud");
  assert.match(h.last().text, /نزدیک‌ترین عبارت: <b>Breaking Bad/);
  await h.click(/^📺 Breaking Bad/);
  await h.nav.handle(1, 1, h.session, "nav:return");
  assert.equal(h.session.navigation.query, "breakng bud");
  await h.click(/^🔎 Breaking Bad/);
  assert.equal(h.session.navigation.query, "Breaking Bad");
  await h.click(/^⬅️ بازگشت$/);
  assert.equal(h.session.navigation.type, "series");
  assert.equal(h.session.navigation.view, "hub");
});

test("Mini App uses public HTTPS, with ordinary URL buttons outside private Telegram chats", () => {
  assert.equal(miniAppUrl({ BOT_SITE_URL: "http://vod-app:3000" }), "https://sarvnema.ir/mini-app");
  for (const url of ["http://sarvnema.ir/mini-app", "https://localhost/mini-app", "https://user:secret@sarvnema.ir/mini-app", "javascript:alert(1)"]) assert.equal(miniAppUrl({ TELEGRAM_MINI_APP_URL: url }), null);
  const url = miniAppUrl({});
  assert.deepEqual(miniAppButton(url, true).web_app, { url });
  assert.equal(miniAppButton(url, false).web_app, undefined);
  assert.equal(miniAppButton(url, false).url, url);
});
