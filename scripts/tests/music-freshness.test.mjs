import test from "node:test";
import assert from "node:assert/strict";
import { compareMusicFreshness, publishedMusicTime } from "../../lib/music-freshness.mjs";

test("new releases precede old artwork-rich tracks; scrape timestamps never become releases", () => {
  const now = Date.parse("2026-11-21T10:00:00Z");
  const items = [{ id: "old", publishedAt: "2020-01-01", coverUrl: "/old.jpg" },
    { id: "new", publishedAt: "2026-11-20", coverUrl: null },
    { id: "future", publishedAt: "2099-01-01" }, { id: "import", addedAt: "2026-11-21" }];
  assert.deepEqual([...items].sort((a,b) => compareMusicFreshness(a,b,now)).slice(0,2).map(t=>t.id), ["new","old"]);
  for (const item of items.slice(2)) assert.equal(publishedMusicTime(item,now),0);
});
