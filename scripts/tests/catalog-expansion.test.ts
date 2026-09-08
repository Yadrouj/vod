import test from "node:test";
import assert from "node:assert/strict";
import { parseLrc, activeLyricIndex, geniusSearchUrl } from "../../lib/lyrics-timing";
import { validPublisherPlayer } from "../../lib/publisher-player";
import { parseArchiveVideos, matchLegacyVideo, readLegacyList } from "../scrape-oitn-films.mjs";
import { quarantineLegacyMetadata, legacyMismatch } from "../catalog-evidence.mjs";
import { buildMoodPlaylists } from "../build-mood-playlists.mjs";

test("real LRC offsets, repeated choruses and silence boundaries", () => {
  const cues = parseLrc("[ar:Original fixture]\n[offset:500]\n[00:01.20][00:05.50]A sample line\n[00:03.00]\n[00:08.000]Second sample");
  assert.deepEqual(cues.map(c => c.start), [1.7, 3.5, 6, 8.5]);
  assert.equal(activeLyricIndex(cues, 1), -1);
  assert.equal(activeLyricIndex(cues, 2), 0);
  assert.equal(activeLyricIndex(cues, 4), -1);
  assert.equal(activeLyricIndex(cues, 6), 2);
  assert.equal(cues[0].text, cues[2].text);
  assert.equal(activeLyricIndex([{ text: "first", start: 0 }, { text: "last", start: 3, end: 4 }], 5), -1);
});
test("plain lyrics never fabricate timing and inputs are bounded", () => {
  assert.deepEqual(parseLrc("A line\nA line"), [{text:"A line"},{text:"A line"}]);
  assert.equal(activeLyricIndex(parseLrc("A line"), 100), -1);
  assert.throws(() => parseLrc("x".repeat(65537)));
  assert.throws(() => parseLrc("x\n".repeat(1201)));
  assert.match(geniusSearchUrl("آهنگ & test", "artist"), /^https:\/\/genius.com\/search\?q=artist%20/);
});
test("film embeds are taken from VideoObject, not promotional description links", () => {
  const video = { "@type": "VideoObject", name: "فیلم قدیمی رقاصه شهر | 1349", duration: "PT2H2M59S", embedUrl: "https://www.youtube.com/embed/BtrCB0vgv48", description: "https://www.youtube.com/watch?v=BADBADBADBA" };
  const html = `<script type="application/ld+json">${JSON.stringify({ itemListElement: [video, video, {...video, name:"تریلر", embedUrl:"https://www.youtube.com/embed/TRAILER0000", duration:"PT2M"}] })}</script>`;
  const result = parseArchiveVideos(html);
  assert.equal(result.length, 1);
  assert.equal(result[0].videoId, "BtrCB0vgv48");
  assert.equal(result[0].durationSeconds, 7379);
  const entries = readLegacyList("1349001 رقاصه شهر\n1380001 رقاصه شهر");
  assert.equal(matchLegacyVideo(result[0], entries)?.id, "old-iranian-1349001");
  assert.equal(matchLegacyVideo({...result[0],title:"فیلم کامل رقاصه شهر"}, entries), null);
  assert.equal(matchLegacyVideo({...result[0],title:"فیلم کامل رقاصه شهر | 1350"}, entries), null);
});
test("wrong modern/foreign metadata is quarantined without losing source links", () => {
  const original = { id:"old-iranian-1352017", title:"Retribution", year:2023, imdbRating:7, countries:["United States"], posterUrl:"wrong", links:[{url:"retained"}] };
  const clean = quarantineLegacyMetadata(original,"کیفر");
  assert.equal(clean.year,1973); assert.equal(clean.title,"کیفر"); assert.equal(clean.posterUrl,null);
  assert.deepEqual(clean.links,original.links); assert.equal(original.year,2023);
  assert.equal(legacyMismatch({id:"old-iranian-1352017",year:1973,countries:["Iran"]}),null);
  assert.equal(legacyMismatch({id:"tt123456",year:2023,countries:["USA"]}),null);
});
test("mood playlists are stable, diverse and do not invent language coverage", () => {
  const tracks = Array.from({length:100},(_,i) => ({id:`t${i}`,title:`road sample ${i}`,kind:"track",category:"موسیقی فارسی",coverUrl:`cover${i%20}`,artist:{slug:`a${i%20}`},sources:[{available:true}]}));
  const date = new Date("2026-09-08T00:00:00Z");
  const a = buildMoodPlaylists(tracks,date), b = buildMoodPlaylists(tracks,date);
  assert.deepEqual(a,b); assert.ok(a.playlists.length);
  for(const list of a.playlists) {
    assert.ok(list.artistCount>=4); assert.ok(list.covers.length>=4);
    const chosen = tracks.filter(t=>list.trackIds.includes(t.id));
    for(const track of chosen) {
      assert.ok(chosen.filter(t=>t.artist.slug===track.artist.slug).length<=3);
      assert.ok(chosen.filter(t=>t.coverUrl===track.coverUrl).length<=2);
    }
  }
  assert.ok(!a.playlists.some(p=>p.scope==="korean"));
  assert.equal(buildMoodPlaylists(tracks.map(t=>({...t,coverUrl:"same"})),date).playlists.length,0);
});
test("only exact approved publisher embed URLs are accepted", () => {
  const source = {provider:"nfb" as const,sourceUrl:"https://www.nfb.ca/film/hypersensitive/",embedUrl:"https://www.nfb.ca/film/hypersensitive/embed/player/",checkedAt:"2026-09-08",playbackStatus:"not-tested" as const};
  assert.ok(validPublisherPlayer(source));
  assert.equal(validPublisherPlayer({...source,embedUrl:"https://evil.test/film/hypersensitive/embed/player/"}),null);
  assert.equal(validPublisherPlayer({...source,sourceUrl:"https://www.nfb.ca@evil.test/film/hypersensitive/"}),null);
  assert.equal(validPublisherPlayer({...source,embedUrl:source.embedUrl+"?redirect=https://evil.test"}),null);
});
