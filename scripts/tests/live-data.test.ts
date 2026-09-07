import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test("running loaders see news, music and changed/new title pages without a rebuild", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-live-"));
  const cwd = process.cwd();
  const previousDir = process.env.VOD_DATA_DIR;
  const data = path.join(root, "public", "data");
  const write = async (file: string, value: unknown) => {
    const target = path.join(data, file); await mkdir(path.dirname(target), { recursive: true });
    await writeFile(`${target}.incoming`, JSON.stringify(value)); await rename(`${target}.incoming`, target);
  };
  try {
    process.chdir(root); process.env.VOD_DATA_DIR = data;
    await write("title-map.json", { tt999991: "tt999991" });
    await write("titles/tt999991.json", { id: "tt999991", imdbCode: "tt999991", title: "Before", links: [] });
    await write("vod-news.json", { generatedAt: "before", sources: [], items: [] });
    await write("music-index.json", { tracks: [], artists: [], updatedAt: "before" });
    const { findVodItem } = await import("../../lib/catalog");
    const { loadVodNews } = await import("../../lib/news");
    const { loadMusicIndex } = await import("../../lib/music");
    assert.equal((await findVodItem("tt999991"))?.title, "Before");
    assert.equal((await loadVodNews()).generatedAt, "before");
    assert.equal((await loadMusicIndex()).updatedAt, "before");
    await write("titles/tt999991.json", { id: "tt999991", imdbCode: "tt999991", title: "Updated title", links: [] });
    await write("titles/tt999992.json", { id: "tt999992", imdbCode: "tt999992", title: "New title", links: [] });
    await write("vod-news.json", { generatedAt: "after", sources: [], items: [] });
    await write("music-index.json", { tracks: [], artists: [], updatedAt: "after" });
    const future = Date.now() + 31_000;
    t.mock.method(Date, "now", () => future);
    assert.equal((await findVodItem("tt999991"))?.title, "Updated title", "Changed title works even without slug-map change");
    assert.equal((await findVodItem("tt999992"))?.title, "New title");
    assert.equal((await loadVodNews()).generatedAt, "after");
    assert.equal((await loadMusicIndex()).updatedAt, "after");
  } finally {
    t.mock.restoreAll(); process.chdir(cwd);
    if (previousDir === undefined) delete process.env.VOD_DATA_DIR; else process.env.VOD_DATA_DIR = previousDir;
    await rm(root, { recursive: true, force: true });
  }
});
