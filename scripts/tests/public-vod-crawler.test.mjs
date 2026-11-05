import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("FJ iOS reports the crawl restriction without requesting protected pages or importing files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-fj-ios-"));
  try {
    const catalog = path.join(root, 'catalog.json');
    await writeFile(catalog, JSON.stringify({ items: [] }));
    await promisify(execFile)(process.execPath, ['--import', pathToFileURL(path.resolve('scripts/tests/fixtures/fj-ios-public-fetch.mjs')).href, 'scripts/scrape-public-vod-sources.mjs'], {
      timeout: 10000, env: { ...process.env, PUBLIC_VOD_CATALOG: catalog, PUBLIC_VOD_WORK_DIR: path.join(root, 'work'), PUBLIC_VOD_SOURCE_IDS: 'fj-ios' },
    });
    const report = JSON.parse(await readFile(path.join(root, 'work', 'report.json'), 'utf8'));
    assert.equal(report.state, 'blocked'); assert.equal(report.sources[0].state, 'robots-blocked');
    assert.equal(report.sources[0].pages, 0); assert.equal(report.titles, 0); assert.equal(report.links, 0);
  } finally { assert.ok(path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), 'sarvnema-fj-ios-'))); await rm(root, { recursive: true, force: true }); }
});

test("full public API pagination resumes after a failed detail and keeps the correct title identities", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-public-vod-"));
  const catalog = path.join(root, "catalog.json");
  try {
    await writeFile(catalog, JSON.stringify({ items: [{ id: "tt1234567", imdbCode: "tt1234567", title: "Fixture Film 1", type: "movie", year: 2026, links: [] }] }));
    const env = { ...process.env, PUBLIC_VOD_WORK_DIR: path.join(root, "work"), PUBLIC_VOD_CATALOG: catalog, PUBLIC_VOD_SOURCE_IDS: "familymovie", PUBLIC_VOD_REQUEST_GAP_MS: "500", PUBLIC_VOD_BUDGET_MS: "30000" };
    const args = ["--import", pathToFileURL(path.resolve("scripts/tests/fixtures/public-vod-fetch.mjs")).href, path.resolve("scripts/scrape-public-vod-sources.mjs"), "--full"];
    const run = promisify(execFile);
    await mkdir(env.PUBLIC_VOD_WORK_DIR);
    const lockFile = path.join(env.PUBLIC_VOD_WORK_DIR, "scrape.lock");
    await writeFile(lockFile, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    await assert.rejects(run(process.execPath, args, { env, timeout: 10000 }));
    await writeFile(lockFile, JSON.stringify({ pid: process.pid, startedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString() }));
    await run(process.execPath, args, { env: { ...env, PUBLIC_VOD_FIXTURE_FAIL_ID: "2" }, timeout: 20000 });
    const first = JSON.parse(await readFile(path.join(env.PUBLIC_VOD_WORK_DIR, "report.json"), "utf8"));
    assert.equal(first.partial, true);
    assert.equal(first.sources[0].state, "partial");
    assert.equal(first.titles, 1);
    assert.equal(JSON.parse(await readFile(path.join(env.PUBLIC_VOD_WORK_DIR, "state.json"), "utf8")).sources.familymovie.fullOffset, 0);
    await run(process.execPath, args, { env, timeout: 20000 });
    const report = JSON.parse(await readFile(path.join(env.PUBLIC_VOD_WORK_DIR, "report.json"), "utf8"));
    const output = JSON.parse(await readFile(path.join(env.PUBLIC_VOD_WORK_DIR, "source.json"), "utf8"));
    assert.equal(report.partial, false);
    assert.equal(report.sources[0].state, "completed");
    assert.equal(report.sources[0].pages, 2);
    assert.equal(output.items.length, 3);
    assert.equal(output.items.find(item => item.title === "Fixture Film 1").id, "tt1234567");
    assert.equal(output.totalLinks, 3);
    assert.ok(output.items.every(item => item.links.length === 1));
    assert.ok(output.items.every(item => item.sourcePageUrl.includes("?movie=")));
    await assert.rejects(readFile(path.join(env.PUBLIC_VOD_WORK_DIR, "scrape.lock")), { code: "ENOENT" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
