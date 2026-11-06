import test from "node:test";
import assert from "node:assert/strict";
import { localizedTitle, persianTitleOrFallback } from "@/lib/title-display";

test("uses the curated Persian title when enrichment is missing", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: null }, "fa"), "بلیچ: جنگ خونین هزارساله");
});

test("prefers an enriched Persian title over the curated fallback", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: "بلیچ" }, "fa"), "بلیچ");
});

test("keeps the original title in English", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: "بلیچ" }, "en"), "Bleach: Thousand-Year Blood War");
});

test("does not display generic provider SEO text as a film title", () => {
  assert.equal(localizedTitle({ imdbCode: "tt2120120", title: "Pixels", persianTitle: "دانلود فیلم" }, "fa"), "پیکسل");
});

test("uses real titles when a source stores a download label or season label", () => {
  assert.equal(localizedTitle({ imdbCode: "tt5491994", title: "Planet Earth II", persianTitle: "دانلود" }, "fa"), "سیاره زمین ۲");
  assert.equal(localizedTitle({ imdbCode: "tt9253866", title: "Our Planet", persianTitle: "فصل دوم" }, "fa"), "سیاره ما");
});

test("sanitizes the title at the catalog boundary", () => {
  assert.equal(persianTitleOrFallback({ imdbCode: "tt5491994", title: "Planet Earth II", persianTitle: "دانلود" }), "سیاره زمین ۲");
  assert.equal(persianTitleOrFallback({ imdbCode: "tt9253866", title: "Our Planet", persianTitle: "فصل دوم" }), "سیاره ما");
});
