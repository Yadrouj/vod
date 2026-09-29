import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const origin = process.env.LOAD_BASE_URL || "http://localhost:3004";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Use a local test server");
const catalog = JSON.parse(await readFile("public/data/melodify-library.json", "utf8"));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
await mkdir(".media-cache/music-library", { recursive: true });
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(origin).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(`${origin}/music`, { waitUntil: "domcontentloaded", timeout: 120000 });
    const shelf = page.locator(".music-shelf").filter({ has: page.getByRole("heading", { name: "تازه‌های آرشیو", exact: true }) });
    await shelf.locator(".music-card").first().waitFor();
    assert.equal(await shelf.locator('a.music-card[href*="melodify-"]').count(), 12);
    const categories = page.getByRole("navigation", { name: "دسته‌بندی‌های موسیقی" });
    for (const category of catalog.categories) assert.equal(await categories.getByRole("link", { name: category, exact: true }).count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "Mobile and desktop must not overflow horizontally");
    await categories.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.media-cache/music-library/categories-${width}.png` });
    await page.goto(`${origin}/music?added=library`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.locator(".music-grid .music-card").first().waitFor();
    const first = await page.locator(".music-grid .music-card").evaluateAll(links => links.map(link => link.getAttribute("href")));
    assert.equal(first.length, 80);
    assert.ok(first.every(href => href.startsWith("/music/melodify-")));
    await page.getByRole("navigation", { name: "صفحه‌بندی آهنگ‌ها" }).getByRole("link", { name: "بعدی" }).click();
    await page.waitForURL("**page=2");
    await page.locator(".music-grid .music-card").first().waitFor();
    const second = await page.locator(".music-grid .music-card").evaluateAll(links => links.map(link => link.getAttribute("href")));
    assert.equal(second.length, 80);
    assert.ok(second.every(href => !first.includes(href)), "Paging must not repeat the first 80 tracks");
    await page.goto(`${origin}/music?category=Chill`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.locator(".music-grid .music-card").first().waitFor();
    assert.equal(await page.locator(".music-grid .music-card").count(), 80);
    const next = await page.getByRole("navigation", { name: "صفحه‌بندی آهنگ‌ها" }).getByRole("link", { name: "بعدی" }).getAttribute("href");
    assert.ok(next.includes("category=Chill") && next.includes("page=2"));
    await page.goto(`${origin}/music/artists/rezaya`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.locator(".artist-track-copy strong").first().waitFor();
    const songs = catalog.tracks.filter(track => track.artists.some(artist => artist.slug === "rezaya"));
    for (const song of songs) assert.ok(await page.locator(".artist-track-copy strong").filter({ hasText: song.persianTitle }).count() > 0, song.id);
    console.log(JSON.stringify({ width, tags: catalog.categories.length, homepageLibraryTracks: 12, paginatedLibrary: true, singerImportedTracks: songs.length }));
    await context.close();
  }
} finally { await browser.close(); }
