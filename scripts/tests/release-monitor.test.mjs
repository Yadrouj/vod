import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReleaseMonitorResult,
  normalizeImdbCandidate,
  summarizeCatalogItem,
} from "../release-monitor-lib.mjs";

const now = new Date("2026-08-12T12:00:00.000Z");
const sourceItem = summarizeCatalogItem({
  id: "tt1234567",
  imdbCode: "tt1234567",
  title: "Example Signal",
  type: "series",
  year: 2026,
  posterUrl: "https://images.example/signal.jpg",
  links: [
    { url: "https://files.example/S01E01.1080p.mkv", quality: "1080p", season: 1, episode: 1, sourceProvider: "f2my" },
    { url: "https://files.example/S01E02.1080p.mkv", quality: "1080p", season: 1, episode: 2, sourceProvider: "f2my" },
  ],
});

test("matches an IMDb discovery by code and marks it available", () => {
  const candidate = normalizeImdbCandidate({ id: "tt1234567", l: "Example Signal", y: 2026, q: "TV Series", releaseDate: "2026-08-12" });
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: { items: {}, updates: [] }, imdbCandidates: [candidate], now });
  assert.equal(result.bootstrap, true);
  assert.equal(result.updates[0].status, "available");
  assert.equal(result.updates[0].href, "/tt1234567");
});

test("keeps a missing IMDb release in the coming-soon queue", () => {
  const candidate = normalizeImdbCandidate({ id: "tt7654321", l: "Future Signal", y: 2026, q: "movie", releaseDate: "2026-08-12" });
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: { items: {}, updates: [] }, imdbCandidates: [candidate], now });
  const update = result.updates.find((item) => item.imdbCode === "tt7654321");
  assert.equal(update.status, "coming-soon");
  assert.match(update.reason, /source scan/i);
});

test("retains the IMDb release date in the update payload", () => {
  const candidate = normalizeImdbCandidate({ id: "tt7654321", l: "Future Signal", y: 2026, q: "movie", releaseDate: "2026-08-12" });
  const result = buildReleaseMonitorResult({ catalogItems: [], previousState: { items: {}, updates: [] }, imdbCandidates: [candidate], now });
  assert.equal(result.updates[0].releaseDate, "2026-08-12");
});

test("decodes IMDb HTML entities before matching a title", () => {
  const candidate = normalizeImdbCandidate({ id: "tt1234567", l: "Matt Preston&#x27;s Plating", y: 2026, q: "TV Series" });
  assert.equal(candidate.title, "Matt Preston's Plating");
});

test("turns a changed series source into a new-episode event", () => {
  const previous = {
    version: 2,
    initializedAt: "2026-08-11T12:00:00.000Z",
    items: {
      [sourceItem.id]: { fingerprint: "old", latestEpisode: { season: 1, episode: 1 }, linksCount: 1 },
    },
    updates: [],
    trackedImdbCodes: [],
  };
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: previous, imdbCandidates: [], now });
  assert.equal(result.updates[0].kind, "episode");
  assert.equal(result.updates[0].season, 1);
  assert.equal(result.updates[0].episode, 2);
});

test("does not promote an undated IMDb series discovery to a fresh available title", () => {
  const candidate = normalizeImdbCandidate({ id: "tt1234567", l: "Example Signal", y: 2026, q: "TV Series" });
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: { version: 2, initializedAt: now.toISOString(), items: { [sourceItem.id]: sourceItem }, updates: [], trackedImdbCodes: [] }, imdbCandidates: [candidate], now });
  assert.equal(result.updates.length, 0);
});

test("does not create a coming-soon card for an undated IMDb series search card", () => {
  const candidate = normalizeImdbCandidate({ id: "tt7654321", l: "Future Signal", y: 2026, q: "TV Series" });
  const result = buildReleaseMonitorResult({ catalogItems: [], previousState: { version: 2, initializedAt: now.toISOString(), items: {}, updates: [], trackedImdbCodes: [] }, imdbCandidates: [candidate], now });
  assert.equal(result.updates.length, 0);
});

function prior(item, overrides = {}) {
  return { version: 2, initializedAt: now.toISOString(), items: { [item.id]: { ...item, ...overrides } }, updates: [], trackedImdbCodes: [] };
}

test("episode advance is detected even when another provider's fingerprint is unchanged", () => {
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: prior(sourceItem, { latestEpisode: { season: 1, episode: 1 } }), imdbCandidates: [], now });
  assert.equal(result.updates[0].changeType, "new-episode");
  assert.equal(result.updates[0].episode, 2);
});

test("a first series import is an archive addition, not a newly aired episode", () => {
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: { version: 2, initializedAt: now.toISOString(), items: {}, updates: [] }, imdbCandidates: [], now });
  assert.equal(result.updates[0].changeType, "new-title");
  assert.equal(result.updates[0].kind, "series");
  assert.equal(result.updates[0].episode, null);
});

test("a new quality is labelled even with the same link count and source fingerprint", () => {
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: prior(sourceItem, { qualities: ["720p"] }), imdbCandidates: [], now });
  assert.equal(result.updates[0].changeType, "quality-added");
  assert.deepEqual(result.updates[0].addedQualities, ["1080p"]);
});

test("adding a source does not relabel an old film as a new release", () => {
  const film = { ...sourceItem, type: "movie", year: 1994, latestEpisode: null };
  const result = buildReleaseMonitorResult({ catalogItems: [film], previousState: prior(film, { linksCount: 1 }), imdbCandidates: [], now });
  assert.equal(result.updates[0].changeType, "source-added");
  assert.equal(result.updates[0].year, 1994);
  assert.equal(result.updates[0].episode, null);
});

test("URL refreshes and dead-link removal update state without crowding the feed", () => {
  for (const linksCount of [2, 3]) {
    const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState: prior(sourceItem, { fingerprint: "old-token", linksCount }), imdbCandidates: [], now });
    assert.equal(result.updates.length, 0);
    assert.equal(result.state.items[sourceItem.id].fingerprint, sourceItem.fingerprint);
  }
});

test("coming soon disappears once the catalog has source links, even without IMDb discovery", () => {
  const previousState = prior(sourceItem);
  previousState.updates = [{ id: `coming-soon-${sourceItem.imdbCode}`, status: "coming-soon", imdbCode: sourceItem.imdbCode, eventAt: now.toISOString() }];
  const result = buildReleaseMonitorResult({ catalogItems: [sourceItem], previousState, imdbCandidates: [], now });
  assert.equal(result.updates.length, 0);
});

test("a large batch of older source updates cannot evict a new episode", () => {
  const previousState = prior(sourceItem, { latestEpisode: { season: 1, episode: 1 } });
  const movies = Array.from({ length: 240 }, (_, index) => {
    const film = { ...sourceItem, id: `tt${1000000 + index}`, imdbCode: `tt${1000000 + index}`, title: `Old film ${index}`, type: "movie", year: 1994, latestEpisode: null };
    previousState.items[film.id] = { ...film, linksCount: 1 };
    return film;
  });
  const result = buildReleaseMonitorResult({ catalogItems: [...movies, sourceItem], previousState, imdbCandidates: [], now });
  assert.equal(result.updates[0].imdbCode, sourceItem.imdbCode);
  assert.equal(result.updates[0].changeType, "new-episode");
  assert.equal(result.updates.length, 200);
});

test("historical duplicate title rows do not generate phantom quality or source updates", () => {
  const low = summarizeCatalogItem({ id: "tt7777777", imdbCode: "tt7777777", title: "Same movie", type: "movie", links: [{ url: "https://files.test/low.mkv", quality: "720p" }] });
  const high = summarizeCatalogItem({ id: low.id, imdbCode: low.imdbCode, title: low.title, type: "movie", links: [{ url: "https://files.test/high.mkv", quality: "1080p" }] });
  const baseline = buildReleaseMonitorResult({ catalogItems: [low, high], previousState: {}, imdbCandidates: [], now });
  assert.equal(baseline.state.items[low.id].linksCount, 2);
  const repeated = buildReleaseMonitorResult({ catalogItems: [high, low, low], previousState: baseline.state, imdbCandidates: [], now });
  assert.equal(repeated.updates.length, 0);
  assert.equal(repeated.state.items[low.id].linksCount, 2);
  const migrated = buildReleaseMonitorResult({ catalogItems: [low, high], previousState: prior(high), imdbCandidates: [], now });
  assert.equal(migrated.updates.length, 0);
});
