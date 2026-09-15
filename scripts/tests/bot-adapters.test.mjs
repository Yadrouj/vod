import test from "node:test";
import assert from "node:assert/strict";

test("real Telegram and Bale handlers use the same reversible menu and corrected search", async () => {
  const previousFetch = globalThis.fetch;
  const env = { BOT_API_TOKEN: "fixture-token", BALE_BOT_TOKEN: "fixture-token", BOT_SITE_URL: "https://site.test" };
  const previousEnv = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const sent = [], apiCalls = [];
  let photoEdit = false;
  const item = { title: "Breaking Bad", imdbCode: "tt0903747", type: "series", imdbRating: 9.5, genres: ["Crime"], urls: { detail: "https://site.test/tt0903747", watch: "https://site.test/watch/tt0903747" } };
  const episodes = Array.from({ length: 12 }, (_, index) => ({ episode: index + 1, code: `S01E${String(index + 1).padStart(2, "0")}`, title: `Episode ${index + 1}`,
    files: Array.from({ length: 11 }, (_, file) => ({ quality: "1080p", group: "SoftSub", label: `Version ${file + 1}`, url: `https://site.test/download/continue?file=${file + 1}` })) }));
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.hostname === "site.test") {
      apiCalls.push(url);
      if (url.pathname === "/api/bot/filters") return Response.json({ totals: { titles: 1 }, matchingTitles: 1, filters: { genres: [{ label: "Crime", value: "Crime", count: 1 }], countries: [], qualities: [], years: [{ label: "2026", value: "2026", count: 1 }, { label: "2024", value: "2024", count: 2 }] } });
      if (url.pathname === "/api/bot/search") return Response.json({ items: [item], mode: "similar", corrections: ["Breaking Bad"], matchedQuery: "Breaking Bad", pagination: { total: 1, page: 1, totalPages: 1 } });
      if (url.pathname === "/api/bot/music") return Response.json({ items: [], pagination: { total: 0, page: 1, totalPages: 1 } });
      if (url.pathname.startsWith("/api/bot/title/")) return Response.json({ item, seasons: [{ season: 1, sourceCount: 1 }], episodes });
      throw Error(`Unexpected fixture API ${url.pathname}`);
    }
    const method = url.pathname.split("/").at(-1);
    assert.ok(["sendMessage", "editMessageText", "editMessageCaption", "answerCallbackQuery"].includes(method), `Unexpected method ${method}; no live requests allowed`);
    const body = JSON.parse(options.body);
    if (method === "editMessageText" && photoEdit) { photoEdit = false; return Response.json({ ok: false, description: "Bad Request: there is no text in the message to edit" }); }
    if (method !== "answerCallbackQuery") sent.push(body);
    return Response.json({ ok: true, result: { message_id: sent.length + 1 } });
  };
  try {
    for (const [index, module] of ["telegram-bot", "bale-bot"].entries()) {
      const { handle } = await import(`../${module}.mjs`);
      sent.length = 0; apiCalls.length = 0;
      const chat = { id: 500 + index, type: "private" }, from = { id: 700 + index };
      const text = value => handle({ message: { chat, from, text: value } });
      const click = async regex => {
        const button = sent.at(-1).reply_markup.inline_keyboard.flat().find(button => regex.test(button.text));
        assert.ok(button, `Missing ${regex} in ${module}`);
        return handle({ callback_query: { id: "fixture", data: button.callback_data, from, message: { chat, message_id: sent.length } } });
      };
      await text("/series");
      assert.match(sent.at(-1).text, /سریال‌ها/);
      await click(/^ژانر:/);
      await click(/^همه \/ بدون/);
      assert.match(sent.at(-1).text, /فیلترها اختیاری/);
      assert.ok(apiCalls.every(url => url.pathname === "/api/bot/filters"));
      await click(/^سال ساخت:/);
      await click(/^2026/);
      await click(/^🎬 نمایش/);
      const request = apiCalls.find(url => url.pathname === "/api/bot/search");
      assert.equal(request.searchParams.get("type"), "series");
      assert.equal(request.searchParams.get("year"), "2026");
      await text("breakng bud");
      assert.match(sent.at(-1).text, /نزدیک‌ترین عبارت: <b>Breaking Bad/);
      photoEdit = true;
      await click(/^📺 Breaking Bad/);
      assert.match(sent.at(-1).text || sent.at(-1).caption, /Breaking Bad/);
      await click(/^فصل 1/);
      await click(/^بعدی/);
      await click(/^S01E11/);
      await click(/^بعدی/);
      const fileLinks = sent.at(-1).reply_markup.inline_keyboard.flat().filter(button => button.url?.includes("/download/continue"));
      assert.equal(fileLinks.length, 1, "Second quality page has the remaining file");
      await click(/^⬅️ قسمت‌ها/);
      assert.ok(sent.at(-1).reply_markup.inline_keyboard.flat().some(button => /^S01E11/.test(button.text)), "Back retains episode page two");
      assert.ok(!sent.at(-1).reply_markup.inline_keyboard.flat().some(button => /^S01E01/.test(button.text)));
      await click(/^⬅️ فصل‌ها/);
      await click(/^⬅️.*نتایج/);
      assert.match(sent.at(-1).text, /breakng bud/);
      await text("/start");
      const buttons = sent.at(-1).reply_markup.inline_keyboard.flat();
      assert.equal(buttons.some(button => button.web_app), module === "telegram-bot");
    }
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previousEnv)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
