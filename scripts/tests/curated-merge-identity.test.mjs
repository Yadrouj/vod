import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("version merges retain history, refresh signatures, and never confuse same-named movies and series", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-curated-"));
  try {
    const file = path.join(root, "catalog.json"), source = path.join(root, "source.json"), report = path.join(root, "report.json");
    const oldLink = { url: "https://media.example/House.S01E01.720p.mkv?expires=1&md5=old", sourceProvider: "legacy", quality: "720p", season: 1, episode: 1 };
    const retained = { url: "https://other.example/House.S01E01.1080p.mkv", sourceProvider: "other", quality: "1080p", season: 1, episode: 1 };
    const items = [
      { id: "tt0412142", imdbCode: "tt0412142", title: "House", type: "tvSeries", year: 2004, posterUrl: "https://poster.example/house.jpg", links: [oldLink, retained] },
      { id: "tt1111111", imdbCode: "tt1111111", title: "House", type: "movie", year: 2004, links: [] },
      { id: "tt2222222", imdbCode: "tt2222222", title: "House", type: "tvSeries", year: 2004, links: [] },
    ];
    await writeFile(file, JSON.stringify({ totalTitles: 3, totalLinks: 2, items }));
    const newer = { ...items[0], posterUrl: null, links: [{ ...oldLink, sourceProvider: "familymovie", url: oldLink.url.replace("expires=1&md5=old", "expires=9999999999&md5=new") }, { ...oldLink, url: "https://media.example/House.S01E02.2160p.mkv", quality: "2160p", episode: 2 }] };
    await writeFile(source, JSON.stringify({ items: [newer], sourceUrls: ["https://familymovie.tr/"] }));
    await promisify(execFile)(process.execPath, [path.resolve("scripts/merge-curated-vod-source.mjs"), file, source, file, report]);
    const output = JSON.parse(await readFile(file, "utf8"));
    assert.equal(output.items.length, 3);
    const merged = output.items.find(item => item.id === "tt0412142");
    assert.equal(merged.links.length, 3);
    assert.equal(merged.posterUrl, items[0].posterUrl);
    assert.ok(merged.links.some(link => link.url === retained.url));
    assert.ok(merged.links.some(link => link.url.includes("md5=new")));
    assert.ok(!merged.links.some(link => link.url.includes("md5=old")));
    assert.deepEqual(output.items.find(item => item.id === "tt1111111").links, []);
    assert.deepEqual(output.items.find(item => item.id === "tt2222222").links, []);
    assert.equal(JSON.parse(await readFile(report, "utf8")).downloadLinksAdded, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("existing titles retain official player references and deduplicate YouTube videos", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-publisher-"));
  try {
    const file = path.join(root, "catalog.json"), source = path.join(root, "source.json"), report = path.join(root, "report.json");
    const player = { provider: "nfb", embedUrl: "https://www.nfb.ca/film/example/embed/player/" };
    const retained = { videoId: "abcdefghijk", title: "Official archive" };
    const rejected = { url: "https://cdn.example/not-a-video.mp4", verification: { status: 200, contentType: "text/html" } };
    const item = { id: "tt1234567", imdbCode: "tt1234567", title: "Archive Film", year: 1961, type: "movie", links: [], unavailableDownloadLinks: [rejected], youtubeVideos: [retained] };
    await writeFile(file, JSON.stringify({ totalTitles: 1, totalLinks: 0, items: [item] }));
    await writeFile(source, JSON.stringify({ items: [{ ...item, links: [{ url: rejected.url }], publisherPlayer: player, youtubeVideos: [retained, { videoId: "lmnopqrstuv", title: "Restored edition" }] }] }));
    const merge = () => promisify(execFile)(process.execPath, [path.resolve("scripts/merge-curated-vod-source.mjs"), file, source, file, report]);
    await merge(); await merge();
    const output = JSON.parse(await readFile(file, "utf8")).items[0];
    assert.deepEqual(output.publisherPlayer, player);
    assert.deepEqual(output.youtubeVideos.map(video => video.videoId), ["abcdefghijk", "lmnopqrstuv"]);
    assert.equal(output.links.length, 0, "publisher embeds must not become direct downloads");
    assert.deepEqual(output.unavailableDownloadLinks, [rejected], "Nightly merges cannot resurrect a confirmed HTML response as video");
  } finally { await rm(root, { recursive: true, force: true }); }
});
