import test from "node:test";
import assert from "node:assert/strict";
import { selectFreshReleaseUpdates, type ReleaseUpdate } from "../../lib/release-updates";

const now = new Date("2026-09-07T12:00:00Z");
const item: ReleaseUpdate = {
  id: "update-example", eventAt: "2026-09-07T10:00:00Z", status: "available", kind: "film",
  title: "Example", baseTitle: "Example", imdbCode: "tt1234567", year: 1994,
  releaseDate: null, season: null, episode: null, href: "/tt1234567", imdbUrl: null,
  imageUrl: null, sourceNames: ["f2my"], qualities: ["1080p"], linksCount: 1,
  reason: "New files or qualities were found in a configured source.",
};

test("old generic refresh events cannot appear as fresh titles", () => {
  assert.deepEqual(selectFreshReleaseUpdates([item], 80, now), []);
});
test("an explicit new quality on an old film is a truthful catalog update", () => {
  assert.equal(selectFreshReleaseUpdates([{ ...item, changeType: "quality-added", addedQualities: ["2160p"] }], 80, now).length, 1);
});
test("maintenance, future timestamps and unavailable files are not landing updates", () => {
  assert.equal(selectFreshReleaseUpdates([
    { ...item, changeType: "links-refreshed" },
    { ...item, changeType: "new-title", eventAt: "2026-09-08T12:00:00Z" },
    { ...item, changeType: "new-title", linksCount: 0 },
    { ...item, changeType: "new-title", eventAt: "invalid" },
  ], 80, now).length, 0);
});
test("deduplication keeps the newest verified change, independent of input order", () => {
  const older = { ...item, id: "older", changeType: "new-title" as const, eventAt: "2026-09-06T12:00:00Z" };
  const newer = { ...item, id: "newer", changeType: "quality-added" as const };
  assert.deepEqual(selectFreshReleaseUpdates([older, newer], 80, now).map((entry) => entry.id), ["newer"]);
});
test("a stale coming-soon card does not hide an available title", () => {
  const coming = { ...item, id: "coming", status: "coming-soon" as const, changeType: "coming-soon" as const, eventAt: "2026-09-07T11:00:00Z" };
  const ready = { ...item, id: "available", changeType: "new-title" as const };
  assert.deepEqual(selectFreshReleaseUpdates([coming, ready], 80, now).map((entry) => entry.id), ["available"]);
});
