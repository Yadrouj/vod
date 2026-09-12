import test from "node:test";
import assert from "node:assert/strict";
import { downloadGateUrl } from "../../lib/download-gate";
import { parseBotSearchParams } from "../../lib/bot-catalog";

test("bot search accepts the curated section aliases and keeps ten-item pagination", () => {
  const params = parseBotSearchParams(new URLSearchParams("section=top-250&type=movie&limit=10&minImdb=8"));
  assert.equal(params.section, "top-imdb");
  assert.equal(params.type, "movie");
  assert.equal(params.limit, 10);
  assert.equal(params.minImdb, 8);
});

test("bot download links stay on the five-second site gate", () => {
  const url = downloadGateUrl({ url: "https://cdn.example.test/movie.mkv", title: "Example", quality: "1080p" });
  assert.match(url, /^\/download\/continue\?/);
  assert.match(url, /url=https%3A%2F%2Fcdn\.example\.test/);
  assert.match(url, /title=Example/);
});
