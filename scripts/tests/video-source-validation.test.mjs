import test from "node:test";
import assert from "node:assert/strict";
import { isDirectVideoCandidate, isExternalDownloadPage, separateExternalDownloadPages } from "../video-source-validation.mjs";

test("an HTML download app with format=mp4 is not a direct playable media file", () => {
  const page = "https://video.gapfilm.ir/download/ZARDFILM/26497?format=mp4&quality=3";
  assert.equal(isDirectVideoCandidate(page), false);
  assert.equal(isExternalDownloadPage(page), true);
  assert.equal(isDirectVideoCandidate("https://cdn.example/film.mkv?signature=x"), true);
  assert.equal(isDirectVideoCandidate("https://zardfilm.upera.tv/123-1080.mp4?ref=x"), true);
  assert.equal(isDirectVideoCandidate("https://cdn.example/trailers/123.mp4"), false);
});

test("separating external pages retains their metadata and all real download versions", () => {
  const page = { url: "https://video.gapfilm.ir/download/ZARDFILM/1?format=mp4", quality: "1080p", season: 1, episode: 2 };
  const file = { url: "https://cdn.example/film.mkv", quality: "720p", group: "SoftSub" };
  const item = { id: "tt1234567", links: [page,file] };
  const result = separateExternalDownloadPages(item);
  assert.deepEqual(result.item.links,[file]);
  assert.deepEqual(result.item.externalDownloadPages,[page]);
  assert.deepEqual(result.item.qualities,["720p"]);
  assert.equal(item.links.length,2);
  assert.equal(separateExternalDownloadPages(result.item).moved,0);
});

test("only confirmed HTML/deleted media are quarantined, not geo/network errors", () => {
  const links = ["html","deleted","geo","timeout","video"].map(name=>({url:`https://cdn.example/${name}.mp4`}));
  const checks = new Map([[links[0].url,{status:200,contentType:"text/html"}], [links[1].url,{status:404}], [links[2].url,{status:403}], [links[3].url,{error:"timeout"}], [links[4].url,{status:200,contentType:"video/mp4"}]]);
  const result=separateExternalDownloadPages({id:"tt1234567",links},checks);
  assert.equal(result.rejected,2);
  assert.deepEqual(result.item.links,links.slice(2));
  assert.equal(result.item.unavailableDownloadLinks.length,2);
});
