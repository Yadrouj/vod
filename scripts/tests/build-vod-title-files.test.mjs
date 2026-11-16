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

test('title rebuild unions repeated records and publisher aliases instead of last-write-wins data loss', async () => {
  const root = path.resolve('.media-cache/title-file-tests');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, 'duplicates-'));
  try {
    const titles = path.join(directory, 'titles');
    const catalog = path.join(directory, 'catalog.json'), mapFile = path.join(directory, 'map.json');
    const page = 'https://publisher.test/east-of-eden';
    const link = (name, quality) => ({ url: `https://cdn.test/${name}.mkv`, quality, group: 'SoftSub', season: 1, episode: 1 });
    const base = { id: 'f2my-east', imdbCode: 'f2my-east', title: 'East of Eden', type: 'series', year: 2026, sourcePageUrl: page, links: [link('one', '1080p')] };
    const alias = { ...base, id: 'familymovie-east', imdbCode: 'familymovie-east', links: [link('two', '720p')] };
    await writeFile(catalog, JSON.stringify({ items: [base, alias, { ...base, links: [link('three', '480p')] }] }));
    await promisify(execFile)(process.execPath, ['scripts/build-vod-title-files.mjs', catalog, titles, mapFile]);
    const map = JSON.parse(await readFile(mapFile, 'utf8'));
    assert.equal(map['f2my-east'], map['familymovie-east']);
    const merged = JSON.parse(await readFile(path.join(titles, `${map['f2my-east']}.json`), 'utf8'));
    assert.equal(merged.links.length, 3);
    assert.deepEqual(new Set(merged.links.map(link => link.quality)), new Set(['1080p', '720p', '480p']));
    const registry = JSON.parse(await readFile(path.join(directory, 'vod-identities.json'), 'utf8'));
    assert.equal(registry.canonicalTitles, 1);
    assert.equal(registry.rawTitles, 3);
    const indexFile = path.join(directory, 'index.json');
    await promisify(execFile)(process.execPath, ['scripts/build-vod-index.mjs', catalog, indexFile, path.join(directory, 'home.json'), path.join(directory, 'old.json')]);
    const index = JSON.parse(await readFile(indexFile, 'utf8'));
    assert.equal(index.totalTitles, 1);
    assert.equal(index.items.length, 1);
    assert.equal(index.items[0].imdbCode, map['f2my-east']);
    assert.equal(index.items[0].linksCount, 3);
    assert.equal('links' in index.items[0], false, 'compact index must never ship the direct file arrays');
  } finally {
    assert.ok(path.resolve(directory).startsWith(root + path.sep));
    await rm(directory, { recursive: true, force: true });
  }
});
