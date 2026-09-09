import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readLegacyList, normalizePersian } from "../scrape-oitn-films.mjs";

test("reviewed full-film references match catalogue identities without fabricated downloads", async () => {
 const entries = readLegacyList(await readFile("scripts/data/old-iranian-film-list.txt", "utf8"));
 const refs = JSON.parse(await readFile("scripts/data/old-iranian-video-reviewed.json", "utf8")).items;
 assert.equal(new Set(refs.map(ref => ref.videoId)).size, refs.length);
 for (const ref of refs) {
  assert.equal(normalizePersian(entries.find(entry => entry.id === ref.id)?.title), normalizePersian(ref.filmTitle));
  assert.match(ref.videoId, /^[\w-]{11}$/);
  assert.ok(ref.durationSeconds >= 2400);
  assert.equal(ref.playbackStatus, "unavailable");
  const title = JSON.parse(await readFile(`public/data/titles/${ref.id}.json`, "utf8"));
  assert.ok(!title.youtubeVideos.some(video => video.videoId === ref.videoId), "Unavailable videos must not be offered for playback");
  assert.ok(!title.links.some(link => link.url.includes(ref.videoId)), "YouTube is not a direct download file");
 }
});
