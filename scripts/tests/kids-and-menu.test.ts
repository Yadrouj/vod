import assert from "node:assert/strict";
import test from "node:test";
import { KIDS_ACTIVITIES, KIDS_RESOURCES, kidsEmbedUrl, kidsVisible, parseKidsSettings, safeKidsUrl, sessionSeconds, type KidsSettings } from "../../lib/kids";
import { categoryImageCandidates } from "../../lib/category-images";

const settings: KidsSettings = { version: 1, age: "6-8", approved: [], minutes: 20, audioOnly: false, autoNext: false, salt: "a".repeat(32), pinHash: "b".repeat(64), deadline: 10000 };
test("parent settings roundtrip and malformed data fail closed", () => {
  assert.deepEqual(parseKidsSettings(JSON.stringify(settings)), settings);
  for (const raw of [null, "{", "{}", JSON.stringify({ ...settings, minutes: 999 }), JSON.stringify({ ...settings, approved: [123] }), JSON.stringify({ ...settings, pinHash: "1234" })]) assert.equal(parseKidsSettings(raw), null);
});
test("child visibility requires age and approval, while external resources stay parent-only", () => {
  assert.equal(kidsVisible(KIDS_ACTIVITIES[0], settings), true);
  const video = { ...KIDS_ACTIVITIES[0], id: "movie", kind: "video" as const };
  assert.equal(kidsVisible(video, settings), false);
  assert.equal(kidsVisible(video, { ...settings, approved: ["movie"] }), true);
  assert.equal(kidsVisible(video, { ...settings, age: "0-2", approved: ["movie"] }), false);
  assert.equal(kidsVisible(video, { ...settings, audioOnly: true, approved: ["movie"] }), false);
  for (const item of KIDS_RESOURCES.filter(item => item.kind === "resource")) assert.equal(kidsVisible(item, { ...settings, approved: [item.id] }), false);
  const aparatkidsEmbed = KIDS_RESOURCES.find(item => item.id === "aparatkids-colors-green")!;
  assert.equal(kidsVisible(aparatkidsEmbed, settings), false);
  assert.equal(kidsVisible(aparatkidsEmbed, { ...settings, approved: [aparatkidsEmbed.id] }), true);
});
test("deadline survives reload and stops exactly at expiration", () => {
  const restored = parseKidsSettings(JSON.stringify(settings))!;
  assert.equal(sessionSeconds(restored.deadline, 9001), 1);
  assert.equal(sessionSeconds(restored.deadline, 10000), 0);
  assert.equal(sessionSeconds(restored.deadline, 11000), 0);
});
test("media URLs reject executable, insecure and credential URLs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:pass@example.com", "//example.com"]) assert.equal(safeKidsUrl(value), null);
  assert.equal(safeKidsUrl("https://example.com/a.mp3"), "https://example.com/a.mp3");
});
test("embeds are restricted to exact reviewed resources", () => {
  assert.match(kidsEmbedUrl(KIDS_RESOURCES[0])!, /^https:\/\/www.aparat.com\/video\/video\/embed\//);
  assert.equal(kidsEmbedUrl({ ...KIDS_RESOURCES[0], embedHash: "unknown" }), null);
  assert.equal(kidsEmbedUrl(KIDS_ACTIVITIES[0]), null);
  const aparatkidsEmbed = KIDS_RESOURCES.find(item => item.id === "aparatkids-balashha-1")!;
  assert.match(kidsEmbedUrl(aparatkidsEmbed)!, /videohash\/TFmZp\/vt\/frame$/);
});
test("menu uses a valid small backdrop size and bounded alternate sources", () => {
  const urls = categoryImageCandidates({ backdropUrl: "https://image.tmdb.org/t/p/original/back.jpg", posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg" });
  assert.equal(urls[0], "https://image.tmdb.org/t/p/w300/back.jpg");
  assert.ok(urls.includes("https://image.tmdb.org/t/p/w300/poster.jpg"));
  assert.ok(urls.length <= 4);
  assert.deepEqual(categoryImageCandidates({ backdropUrl: "javascript:bad", posterUrl: null }), []);
  assert.equal(categoryImageCandidates({ backdropUrl: "https://example.com/a.jpg", posterUrl: "https://example.com/a.jpg" }).length, 1);
});
