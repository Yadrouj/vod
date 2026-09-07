import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, writeFile, readFile, stat, rm } from "node:fs/promises";
import path from "node:path";

test("rebuilding title pages preserves live files and only replaces changed profiles", async () => {
  const root = path.resolve(".media-cache/title-file-tests");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, "run-"));
  try {
    const titles = path.join(directory, "titles");
    await mkdir(titles);
    const existing = { id: "tt1234567", imdbCode: "tt1234567", title: "Existing", links: [] };
    const file = path.join(titles, "tt1234567.json");
    await writeFile(file, JSON.stringify(existing));
    await writeFile(path.join(titles, "legacy.json"), "{}");
    const before = (await stat(file)).mtimeMs;
    const catalog = path.join(directory, "catalog.json");
    await writeFile(catalog, JSON.stringify({ items: [existing, { id: "tt7654321", title: "New", links: [] }] }));
    const map = path.join(directory, "map.json");
    await promisify(execFile)(process.execPath, ["scripts/build-vod-title-files.mjs", catalog, titles, map]);
    assert.equal((await stat(file)).mtimeMs, before);
    assert.equal(JSON.parse(await readFile(path.join(titles, "tt7654321.json"))).title, "New");
    assert.equal(await readFile(path.join(titles, "legacy.json"), "utf8"), "{}");
    assert.equal(JSON.parse(await readFile(map)).tt1234567, "tt1234567");
  } finally {
    assert.ok(path.resolve(directory).startsWith(root + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});
