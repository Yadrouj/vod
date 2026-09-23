import test from "node:test";
import assert from "node:assert/strict";
import { audienceRating, rankDiscovery } from "../../lib/discovery-ranking";
import { aggregateFeedback, feedbackOriginAllowed } from "../../lib/discovery-feedback";
import { similarTitles } from "../../lib/suggestions";
import type { VodCard, VodItem } from "../../lib/types";
import type { TrendingTitle } from "../../lib/imdb-trending";

const now = Date.parse("2026-09-23T12:00:00Z");
const card = (id: string, extra: Partial<VodCard> = {}): VodCard => ({ imdbCode: id, id, title: id, type: "movie", imdbRating: 8, imdbVotes: 100000, linksCount: 10, posterUrl: "/poster.jpg", genres: ["Drama"], countries: [], year: 2026, languages: [], backdropUrl: null, runtimeMinutes: 120, overview: null, qualities: [], groups: [], ...extra });
const trend = (item: VodCard, days = 0): TrendingTitle => ({ ...item, popularity: { rank: 1, kind: "movie", current: true, observedAt: new Date(now - days * 86400000).toISOString(), sourceUrl: "https://www.imdb.com/chart/moviemeter/" } });
test("feedback accepts the public proxy origin and local bind address, rejecting foreign origins", () => {
  assert.equal(feedbackOriginAllowed("https://sarvnema.ir", "http://0.0.0.0:3004/api/discovery/feedback"), true);
  assert.equal(feedbackOriginAllowed("http://localhost:3006", "http://0.0.0.0:3006/api/discovery/feedback"), true);
  for (const origin of [null, "null", "https://evil.example", "https://sarvnema.ir.evil.example", "http://localhost:3007"]) {
    assert.equal(feedbackOriginAllowed(origin, "http://0.0.0.0:3006/api/discovery/feedback"), false);
  }
});
test("high-confidence ratings beat tiny perfect samples", () => {
  assert.ok(audienceRating(card("known")) > audienceRating(card("tiny", { imdbRating: 10, imdbVotes: 3 })));
});
test("fresh trends influence ranking and expire instead of staying permanently popular", () => {
  const a = card("a"), b = card("b");
  assert.equal(rankDiscovery([a, b], { now, trends: [trend(b)] })[0].imdbCode, "b");
  assert.equal(rankDiscovery([a, b], { now, trends: [trend(b, 31)] })[0].imdbCode, "a");
});
test("current chart ratings replace stale catalog ratings without modifying catalog", () => {
  const old = card("a", { imdbRating: 6 });
  const ranked = rankDiscovery([old], { now, trends: [trend(card("a", { imdbRating: 9 }))] });
  assert.equal(ranked[0].imdbRating, 9); assert.equal(old.imdbRating, 6);
});
test("feedback and comment engagement affect rank, with expired ballots ignored", () => {
  const ballots = [{ itemId: "b", voter: "one", vote: 1 as const, comment: "Great film", at: now }, { itemId: "a", voter: "two", vote: 1 as const, comment: "", at: now - 31 * 86400000 }];
  const audience = aggregateFeedback(ballots, now);
  assert.equal(audience.b.comments, 1); assert.equal(audience.a, undefined);
  assert.equal(rankDiscovery([card("a"), card("b")], { now, audience })[0].imdbCode, "b");
});
test("deduplicates candidates and excludes titles with no playable links", () => {
  assert.deepEqual(rankDiscovery([card("a"), card("a"), card("b", { linksCount: 0 })]).map(item => item.imdbCode), ["a"]);
});
test("trending cannot insert unrelated genres into similar titles", () => {
  const unrelated = card("b", { genres: ["Comedy"] });
  const source = card("source", { title: "Original Story" }) as unknown as VodItem;
  assert.deepEqual(similarTitles(source, [card("a"), unrelated], { now, trends: [trend(unrelated)] }).map(item => item.imdbCode), ["a"]);
});
