import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { sitemapXml } from "../../lib/sitemap-xml";

test("sitemap XML preserves image URLs, metadata and escaped query parameters", () => {
  const xml = sitemapXml([{ url: "https://sarvnema.ir/music/a?x=1&y=2", images: ["https://cdn.example/a&b.jpg"], lastModified: new Date("2026-11-01T00:00:00Z"), priority: 0.7, changeFrequency: "weekly" }]);
  assert.ok(xml.includes("x=1&amp;y=2")); assert.ok(xml.includes("a&amp;b.jpg"));
  assert.ok(xml.includes("2026-11-01T00:00:00.000Z")); assert.ok(xml.includes("xmlns:image="));
});

test("one root sitemap index has explicit paged handlers, not conflicting metadata routes", () => {
  assert.equal(existsSync("app/sitemap.ts"), false);
  assert.equal(existsSync("app/sitemap.xml/route.ts"), true);
  assert.equal(existsSync("app/sitemap/[id]/route.ts"), true);
});
