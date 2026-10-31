import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

test("a matched existing Moviesho title still contributes its new quality", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "sarvnema-moviesho-existing-"));
  try {
    const catalog = path.join(root, "catalog.json"), source = path.join(root, "source.json"), report = path.join(root, "report.json");
    await writeFile(catalog, JSON.stringify({ items: [{ id: "tt1234567", imdbCode: "tt1234567", title: "Example", type: "movie", year: 2026, links: [] }] }));
    await promisify(execFile)(process.execPath, ["--import", pathToFileURL(path.resolve("scripts/tests/fixtures/moviesho-refresh-fetch.mjs")).href, path.resolve("scripts/scrape-moviesho-source.mjs"), catalog, source, report], {
      env: { ...process.env, MOVIESHO_MATCH_CACHE: path.join(root, "cache.json"), MOVIESHO_SITE_REQUEST_INTERVAL_MS: "50" }, timeout: 10000,
    });
    const result = JSON.parse(await readFile(source, "utf8"));
    assert.equal(result.totalTitles, 1);
    assert.equal(result.items[0].imdbCode, "tt1234567");
    assert.equal(result.items[0].links[0].quality, "1080p");
    assert.equal(result.items[0].links[0].sourceProvider, "moviesho");
    assert.equal(JSON.parse(await readFile(report, "utf8")).existingRefreshed, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
