import test from "node:test";
import assert from "node:assert/strict";
import { localizedTitle, persianTitleOrFallback } from "@/lib/title-display";
import { isGenericSourceTitle } from "@/lib/title-display";

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

test("recognizes bare generic labels as invalid localized titles", () => {
  assert.equal(persianTitleOrFallback({ imdbCode: "unknown", title: "The Matrix", persianTitle: "\u0641\u06cc\u0644\u0645" }), null);
  assert.equal(persianTitleOrFallback({ imdbCode: "unknown", title: "The Matrix", persianTitle: "\u062f\u0627\u0646\u0644\u0648\u062f \u0641\u06cc\u0644\u0645" }), null);
});

test("rejects category labels across film, anime, documentary and series", () => {
  for (const label of ["انیمیشن", "دانلود انیمیشن", "دانلود مستند", "دانلود فیلم هندی", "فصل", "دانلود کالکشن فیلم های", "انیمه سریالی", "شبکه سه", "دانلود فیلم کره ای", "تمامی فیلم‌ها", "دانلود فصل اول تا چهارم"]) {
    assert.equal(isGenericSourceTitle(label), true, label);
    assert.equal(localizedTitle({ title: "Original title", persianTitle: label }, "fa"), "Original title", label);
  }
});

test("uses the real Persian animation name on every title surface", () => {
  assert.equal(localizedTitle({ imdbCode: "tt6491484", title: "Tales from Outer Suburbia", persianTitle: "انیمیشن" }, "fa"), "قصه‌هایی از حومه");
});

test("recovers an explicit alias, never guesses from plot prose", () => {
  assert.equal(persianTitleOrFallback({ title: "Example", persianTitle: "دانلود مستند", overview: "سریال Example (خانه دور) محصول سال 2026" }), "خانه دور");
  assert.equal(persianTitleOrFallback({ title: "Example", persianTitle: "فیلم", overview: "Example داستان یک خانواده است." }), null);
  assert.equal(persianTitleOrFallback({ title: "Example", persianTitle: "فیلم", overview: "Example (دوبله فارسی) محصول سال 2026" }), null);
});

test("cleans download prefixes without deleting genuine title words", () => {
  assert.equal(persianTitleOrFallback({ title: "Dumbo", persianTitle: "دانلود فیلم دامبو" }), "دامبو");
  assert.equal(persianTitleOrFallback({ title: "Other", persianTitle: "زندگی یک فیلم است" }), "زندگی یک فیلم است");
  assert.equal(persianTitleOrFallback({ title: "Scary Movie 3", persianTitle: "دانلود فیلم فیلم ترسناک ۳" }), "فیلم ترسناک ۳");
});
