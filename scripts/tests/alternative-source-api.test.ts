import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("verified alternatives reach title playback, room defaults and download APIs without replacing raw data", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-alternative-api-"));
  const previous = process.env.VOD_DATA_DIR;
  process.env.VOD_DATA_DIR = root;
  const id = "tt9999011";
  const regional = { url: `https://dls3.aparatchi-dlcenter.top/DonyayeSerial/${id}/Film.1080p.mp4`, label: "1080p", quality: "1080p", group: "SoftSub", size: null, release: null };
  const alternative = { ...regional, url: "https://sr.moviesho.com/Film.720p.mkv", quality: "720p", sourceProvider: "moviesho", sourceUrl: "https://www.moviesho.com/film/", verifiedAt: new Date().toISOString() };
  try {
    await mkdir(path.join(root, "titles"));
    await writeFile(path.join(root, "titles", id + ".json"), JSON.stringify({ id, imdbCode: id, title: "Fixture", type: "movie", links: [regional], groups: [], qualities: [] }));
    await writeFile(path.join(root, "alternative-source-links.json"), JSON.stringify({ version: 1, items: { [id]: { links: [alternative] } } }));
    const { findVodItem } = await import("../../lib/catalog");
    const { playableLinks } = await import("../../lib/link-labels");
    const { GET: rooms } = await import("../../app/api/watch-party/title/[id]/route");
    const { GET: downloads } = await import("../../app/api/downloads/[id]/route");
    const item = await findVodItem(id);
    assert.ok(item);
    assert.equal(playableLinks(item.links, { includeAlternateFiles: true })[0].url, alternative.url);
    const context = () => ({ params: Promise.resolve({ id }) });
    const media = await (await rooms(new Request("https://sarvnema.ir/api/watch-party/title/" + id), context())).json();
    assert.equal(media.source.url, alternative.url);
    assert.ok(media.sources.some((source: { url: string }) => source.url === regional.url));
    const files = await (await downloads(new Request("https://sarvnema.ir/api/downloads/" + id), context())).json();
    assert.ok(files.files.some((source: { url: string }) => source.url === alternative.url));
  } finally {
    if (previous === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = previous;
    assert.ok(path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "sarvnema-alternative-api-")));
    await rm(root, { recursive: true, force: true });
  }
});
