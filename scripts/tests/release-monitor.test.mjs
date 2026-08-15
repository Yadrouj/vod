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
