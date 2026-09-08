import assert from "node:assert/strict";
import { test } from "node:test";
import { landingPulse } from "../../lib/landing-pulse";
import type { ReleaseUpdatesPayload, ReleaseUpdate } from "../../lib/release-updates";

test("landing pulse counts real weekly releases, not maintenance or future events", () => {
  const now = Date.parse("2026-09-08T10:00:00Z");
  const base = { id: "a", imdbCode: "tt1", eventAt: "2026-09-07T10:00:00Z", status: "available", linksCount: 1, changeType: "new-title" } as ReleaseUpdate;
  const items = [base, base, { ...base, id: "b", imdbCode: "tt2", changeType: "links-refreshed" },
    { ...base, id: "c", imdbCode: "tt3", eventAt: "2026-09-10T10:00:00Z" },
    { ...base, id: "d", imdbCode: "tt4", eventAt: "2026-08-01T10:00:00Z" },
    { ...base, id: "e", imdbCode: "tt5", linksCount: 0 },
    { ...base, id: "f", imdbCode: "tt6", changeType: "new-episode", season: 1, episode: 2 }] as ReleaseUpdate[];
  const result = landingPulse({ items, generatedAt: "2026-09-08T09:00:00Z" } as ReleaseUpdatesPayload, now);
  assert.equal(result.recentCount, 2);
  assert.equal(result.updatedAt, "2026-09-08T09:00:00Z");
});
