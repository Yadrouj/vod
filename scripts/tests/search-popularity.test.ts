import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("search interest aggregates seven Tehran days without retaining query or visitor identities", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "sarvnema-search-"));
  const previous = process.env.SEARCH_POPULARITY_DIR; process.env.SEARCH_POPULARITY_DIR = root;
  try {
    const { recordSearchSelection, searchCounts } = await import("../../lib/search-popularity");
    const now = Date.parse("2026-11-01T13:00:00Z");
    await recordSearchSelection("tt0412142", now); await recordSearchSelection("tt0412142", now);
    const value = JSON.parse(await readFile(path.join(root, "counts.json"), "utf8"));
    assert.deepEqual(value, { version: 1 as const, days: { "2026-11-01": { tt0412142: 2 } } });
    assert.deepEqual(searchCounts(value, now), { tt0412142: 2 });
    assert.deepEqual(searchCounts(value, now + 7 * 86400000), {});
    assert.deepEqual(searchCounts({ version: 1, days: { "2026-11-01": { fake: -4, invalid: NaN } } }, now), {});
  } finally { if (previous === undefined) delete process.env.SEARCH_POPULARITY_DIR; else process.env.SEARCH_POPULARITY_DIR = previous; await rm(root, { recursive: true, force: true }); }
});
