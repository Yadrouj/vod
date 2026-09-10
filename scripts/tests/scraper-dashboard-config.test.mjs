import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_SCRAPER_DASHBOARD_CONFIG, readScraperDashboardConfig, sanitizeScraperDashboardConfig, writeScraperDashboardConfig } from "../scraper-dashboard-config.mjs";

test("scraper dashboard defaults contain the daily Tehran schedule and known sources", () => {
  const config = sanitizeScraperDashboardConfig(DEFAULT_SCRAPER_DASHBOARD_CONFIG);
  assert.deepEqual(config.schedule, { timeZone: "Asia/Tehran", startHour: 3, endHour: 7, days: [0, 1, 2, 3, 4, 5, 6] });
  assert.ok(config.sources.some((source) => source.id === "f2my" && source.siteUrl.includes("f2my.top")));
});

test("dashboard config is sanitized and atomically roundtrips", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sarvnema-scraper-dashboard-"));
  const file = path.join(directory, "config.json");
  try {
    const saved = await writeScraperDashboardConfig({ schedule: { timeZone: "not-a-time-zone", startHour: 3, endHour: 7, days: [6, 6, 99] }, sources: [{ id: "new source", name: " New source ", siteUrl: "https://example.com/path", enabled: false, kind: "manual", days: [6], startHour: 3, endHour: 7 }] }, file);
    assert.equal(saved.schedule.timeZone, "Asia/Tehran");
    assert.equal(saved.sources[0].id, "new-source");
    assert.equal(saved.sources[0].enabled, false);
    assert.equal((await readScraperDashboardConfig(file)).sources[0].siteUrl, "https://example.com/path");
    assert.match(await readFile(file, "utf8"), /"version": 1/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
