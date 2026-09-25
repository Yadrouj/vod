import test from "node:test";
import assert from "node:assert/strict";
import { localizedTitle } from "@/lib/title-display";

test("uses the curated Persian title when enrichment is missing", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: null }, "fa"), "بلیچ: جنگ خونین هزارساله");
});

test("prefers an enriched Persian title over the curated fallback", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: "بلیچ" }, "fa"), "بلیچ");
});

test("keeps the original title in English", () => {
  assert.equal(localizedTitle({ imdbCode: "tt14986406", title: "Bleach: Thousand-Year Blood War", persianTitle: "بلیچ" }, "en"), "Bleach: Thousand-Year Blood War");
});
