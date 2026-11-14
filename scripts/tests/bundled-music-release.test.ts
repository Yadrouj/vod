import assert from "node:assert/strict";
import test from "node:test";
import { applyMusicReleaseBundle, type MusicReleaseBundle } from "../../lib/bundled-music-release";
import type { MusicArtist, MusicArtistIndex, MusicIndex, MusicLandingIndex, MusicSource, MusicTrack } from "../../lib/music-types";

const before = "2026-11-10T00:00:00.000Z";
const observedAt = "2026-11-12T00:00:00.000Z";
const after = "2026-11-13T00:00:00.000Z";
const singer: MusicArtist = {
  slug: "canonical-singer", name: "Singer", aliases: ["Singer Alias"], sourceUrl: "https://publisher.test/singer",
  coverUrl: "https://publisher.test/singer.jpg", profileImageUrl: "https://publisher.test/profile.jpg",
  bio: "Original biography", profileSourceUrl: "https://publisher.test/biography",
  trackIds: [], trackCount: 10, categories: ["Archive tag"],
};
function source(url: string, changes: Partial<MusicSource> = {}): MusicSource {
  return { url, kind: "stream", label: "Checked publisher", provider: "avajavan", available: true, checkedAt: observedAt, ...changes };
}
function track(id: string, changes: Partial<MusicTrack> = {}): MusicTrack {
  return {
    id, kind: "track", title: `Song ${id}`, persianTitle: `Original ${id}`, artist: singer, artists: [singer],
    coverUrl: null, description: "Original description", sourceUrl: `https://publisher.test/releases/${id}`,
    publishedAt: observedAt, addedAt: observedAt, category: "Pop", moods: ["Chill"],
    folder: { root: "Music", year: "2026", month: "11", day: "12" },
    sources: [source(`https://media.test/${id}.mp3`)], ...changes,
  };
}
function index(changes: Partial<MusicIndex> = {}): MusicIndex {
  return {
    version: 1, source: "multi-source", updatedAt: before, scanned: { musicPages: 0, videoPages: 0, full: true },
    tracks: [], artists: [], categories: [], ...changes,
  };
}
function landing(changes: Partial<MusicLandingIndex> = {}): MusicLandingIndex {
  return { ...index(), scope: "landing", archiveStats: { tracks: 100, artists: 20, videos: 5 }, ...changes };
}
function bundle(tracks: MusicTrack[], newTrackIds = tracks.map(track => track.id)): MusicReleaseBundle {
  return { observedAt, tracks, newTrackIds };
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

test("missing checked releases overlay the full index without replacing originals or extra generic fields", () => {
  const original = track("old", { category: "Classics", moods: ["Original tag"] });
  const base = { ...index({ tracks: [original], artists: [{ ...singer, trackIds: [original.id] }], categories: ["Classics"] }), custom: { retained: true } };
  const release = track("missing");
  const result = applyMusicReleaseBundle(base, bundle([release]));
  assert.deepEqual(result.tracks.map(track => track.id), ["old", "missing"]);
  assert.equal(result.tracks[0], original);
  assert.equal(result.custom, base.custom);
  assert.equal(result.updatedAt, observedAt);
  assert.equal(result.categoryCounts?.Classics, 1);
  assert.equal(result.categoryCounts?.Pop, 1);
  assert.equal(result.categoryCounts?.Chill, 1);
  assert.equal(result.artists[0].trackCount, 11);
  assert.equal(result.artists[0].bio, singer.bio);
  assert.deepEqual(result.artists[0].trackIds, ["old", "missing"]);
});

test("same IDs and both alias directions merge sources, keeping canonical titles, publishers and artist metadata", () => {
  const original = track("canonical", {
    idAliases: ["legacy"], title: "Original title", category: "Archive", moods: ["Original tag"],
    sources: [source("https://original.test/original.m4a", { available: undefined, checkedAt: undefined, playback: false, kind: "download" })],
  });
  const base = index({ tracks: [original], artists: [{ ...singer, trackIds: ["canonical"] }], categoryCounts: { Archive: 1, "Original tag": 1 } });
  for (const release of [
    track("canonical", { title: "Wrong replacement title" }),
    track("legacy", { title: "Wrong alias title" }),
    track("provider-id", { idAliases: ["canonical", "other-alias"], title: "Wrong provider title" }),
  ]) {
    const result = applyMusicReleaseBundle(base, { ...bundle([release], []), artists: [{ ...singer, bio: "Must not overwrite", categories: [] }] });
    assert.equal(result.tracks.length, 1);
    const merged = result.tracks[0];
    assert.equal(merged.id, "canonical");
    assert.equal(merged.title, original.title);
    assert.equal(merged.persianTitle, original.persianTitle);
    assert.equal(merged.sourceUrl, original.sourceUrl);
    assert.equal(merged.description, original.description);
    assert.equal(merged.artist, original.artist);
    assert.equal(merged.sources.at(-1), original.sources[0]);
    assert.equal(merged.sources[0].available, true);
    assert.ok(merged.moods?.includes("Original tag"));
    assert.ok(merged.moods?.includes("Pop"));
    assert.ok(merged.idAliases?.includes("legacy"));
    assert.equal(result.artists[0].bio, singer.bio);
    assert.equal(result.artists[0].profileSourceUrl, singer.profileSourceUrl);
    assert.equal(result.artists[0].trackCount, 10);
    assert.equal(result.categoryCounts?.Pop, 1);
    assert.equal(result.categoryCounts?.Archive, 1);
  }
});

test("primary IDs beat shared aliases and exact media URLs only fall back within the same track kind", () => {
  const a = track("primary", { idAliases: ["shared"] });
  const b = track("shared");
  const c = track("third", { idAliases: ["shared"] });
  const incoming = track("shared", { sources: [source("https://new.test/primary.mp3")] });
  const result = applyMusicReleaseBundle(index({ tracks: [a, b, c] }), bundle([incoming], []));
  assert.equal(result.tracks[0], a);
  assert.equal(result.tracks[1].sources.length, 2);
  assert.equal(result.tracks[2], c);

  const exact = track("provider-id", { sources: [a.sources[0], source("https://new.test/alternative.mp3")] });
  const video = track("video", { kind: "video", sources: [a.sources[0]] });
  const matched = applyMusicReleaseBundle(index({ tracks: [a] }), bundle([exact, video], [video.id]));
  assert.deepEqual(matched.tracks.map(track => track.id), ["primary", "video"]);
  assert.ok(matched.tracks[0].idAliases?.includes("provider-id"));
  assert.equal(matched.tracks[0].sources.length, 2);
});

test("newer failed checks beat stale successful checks, including checks from another timezone", () => {
  const url = "https://media.test/same.mp3";
  const original = track("same", { sources: [source(url, { available: false, checkedAt: after })] });
  const stale = track("same", { sources: [source(url, { checkedAt: observedAt })] });
  const result = applyMusicReleaseBundle(index({ tracks: [original] }), bundle([stale], []));
  assert.equal(result.tracks[0].sources[0], original.sources[0]);
  assert.equal(result.tracks[0].sources[0].available, false);

  const checked = track("same", { sources: [source(url, { checkedAt: "2026-11-12T05:00:00+04:00" })] });
  const failed = track("same", { sources: [source(url, { available: false, checkedAt: "2026-11-12T02:00:00Z", label: "Do not replace publisher" })] });
  const newerFailure = applyMusicReleaseBundle(index({ tracks: [checked] }), bundle([failed], []));
  assert.equal(newerFailure.tracks[0].sources[0].available, false);
  assert.equal(newerFailure.tracks[0].sources[0].label, checked.sources[0].label);
  const serialized = applyMusicReleaseBundle(structuredClone(newerFailure), bundle([checked], []));
  assert.equal(serialized.tracks[0].sources[0].available, false);
});

test("invalid/unverified sources cannot clobber checks or introduce unplayable new releases", () => {
  const original = track("original");
  const invalid = track("original", { sources: [
    source(original.sources[0].url, { checkedAt: "invalid", available: false }),
    source("https://media.test/failed.mp3", { available: false, checkedAt: after }),
    source("https://media.test/unverified.mp3", { checkedAt: undefined }),
  ] });
  const unavailable = track("unavailable", { sources: [source("https://media.test/unavailable.mp3", { available: false })] });
  const unverified = track("unverified", { sources: [source("https://media.test/unverified.mp3", { available: undefined })] });
  const badDate = track("bad-date", { sources: [source("https://media.test/bad.mp3", { checkedAt: "not a timestamp" })] });
  const mixed = track("mixed", { sources: [source("https://media.test/good.mp3"), ...invalid.sources.slice(1)] });
  const contradicted = track("contradicted", { sources: [source("https://media.test/contradicted.mp3"), source("https://media.test/contradicted.mp3", { available: false, checkedAt: after })] });
  const result = applyMusicReleaseBundle(index({ tracks: [original] }), bundle([invalid, unavailable, unverified, badDate, mixed, contradicted]));
  assert.deepEqual(result.tracks.map(track => track.id), ["original", "mixed"]);
  assert.deepEqual(result.tracks[0].sources, original.sources);
  assert.deepEqual(result.tracks[1].sources.map(source => source.url), ["https://media.test/good.mp3"]);
});

test("a new URL's latest check wins independently of source ordering", () => {
  const successful = source("https://media.test/checked.mp3");
  const failed = source(successful.url, { available: false, checkedAt: after });
  for (const sources of [[successful, failed], [failed, successful]]) {
    const release = track("new", { sources });
    const base = index();
    assert.equal(applyMusicReleaseBundle(base, bundle([release])), base);
    const original = track("existing");
    const result = applyMusicReleaseBundle(index({ tracks: [original] }), bundle([{ ...release, id: original.id }], []));
    assert.deepEqual(result.tracks[0].sources, original.sources, "No newly failed URL may be appended");
  }
  const base = landing();
  const result = applyMusicReleaseBundle(base, bundle([
    track("new", { sources: [successful] }), track("new", { sources: [failed] }),
  ]));
  assert.equal(result, base, "A later entry cannot leave an unchecked new track in the overlay");
});

test("song versions and same-named songs by different artists remain distinct", () => {
  const original = track("song", { title: "Same title" });
  const version = track("acoustic", { title: "Same title (Acoustic)", matchKey: original.matchKey });
  const namesake = { ...singer, slug: "different-person" };
  const differentArtist = track("namesake", { title: original.title, artist: namesake, artists: [namesake] });
  const result = applyMusicReleaseBundle(index({ tracks: [original], artists: [singer] }), bundle([version, differentArtist]));
  assert.deepEqual(result.tracks.map(track => track.id), ["song", "acoustic", "namesake"]);
  assert.deepEqual(result.artists.map(artist => artist.slug), [singer.slug, namesake.slug]);
  assert.equal(result.tracks[2].artist.slug, namesake.slug);
});

test("artist indexes include every bounded release and update canonical and normalized alias mappings", () => {
  const old = track("old");
  const base: MusicArtistIndex = {
    ...index({ tracks: [old], artists: [singer], categoryCounts: { Pop: 100, Chill: 100 } }),
    scope: "artist", artistTrackIds: { [singer.slug]: ["old"], "singer-alias": ["old"], unrelated: ["untouched"] },
  };
  const releases = Array.from({ length: 100 }, (_, i) => track(`release-${i}`));
  releases[99] = { ...releases[99], artists: [{ ...singer, aliases: ["New Alias", "علي"] }] };
  const result = applyMusicReleaseBundle(base, bundle(releases));
  assert.equal(result.tracks.length, 101);
  assert.equal(result.artists[0].trackCount, 110);
  assert.equal(result.artists[0].trackIds.length, 100);
  assert.equal(result.categoryCounts?.Pop, 200);
  assert.equal(result.categoryCounts?.Chill, 200);
  for (const alias of [singer.slug, "singer-alias", "new-alias", "علی"]) {
    assert.equal(result.artistTrackIds[alias].filter(id => id.startsWith("release-")).length, 100);
  }
  assert.equal(result.artistTrackIds.unrelated, base.artistTrackIds.unrelated);
  assert.equal(result.artists[0].bio, singer.bio);
  assert.ok(result.artists[0].categories.includes("Archive tag"));
  assert.ok(result.artists[0].categories.includes("Chill"));
});

test("compact counts distinguish genuinely new releases from archive tracks missing only in the selection", () => {
  const base = landing({ artists: [singer], categoryCounts: { Pop: 100, Chill: 100 } });
  const oldArchiveTrack = track("archive-missing");
  const fresh = track("new");
  const video = track("video", { kind: "video" });
  const release = bundle([oldArchiveTrack, fresh, video], [fresh.id, video.id]);
  const result = applyMusicReleaseBundle(base, release);
  assert.equal(result.tracks.length, 3);
  assert.deepEqual(result.archiveStats, { tracks: 101, artists: 20, videos: 6 });
  assert.equal(result.artists[0].trackCount, 12);
  assert.deepEqual(result.artists[0].trackIds, [oldArchiveTrack.id, fresh.id, video.id]);
  assert.equal(result.categoryCounts?.Pop, 102);
  assert.equal(result.categoryCounts?.Chill, 102);
  assert.equal(applyMusicReleaseBundle(base, release), result, "Same snapshot and bundle reuse the cached result");
  assert.equal(applyMusicReleaseBundle(result, release), result);
  assert.deepEqual(applyMusicReleaseBundle(structuredClone(result), structuredClone(release)), result, "Idempotency is not dependent on cache identity");
});

test("equal or newer compact archive snapshots append missing UI tracks without inflating any counts", () => {
  for (const updatedAt of [observedAt, after, "2026-11-12T04:00:00+03:30"]) {
    const base = landing({ updatedAt, artists: [singer], categoryCounts: { Pop: 100, Chill: 100 } });
    const release = bundle([track("new-to-selection")]);
    const result = applyMusicReleaseBundle(base, release);
    assert.equal(result.tracks.length, 1);
    assert.deepEqual(result.archiveStats, base.archiveStats);
    assert.equal(result.artists[0].trackCount, singer.trackCount);
    assert.deepEqual(result.categoryCounts, base.categoryCounts);
    assert.equal(result.updatedAt, updatedAt);
    assert.deepEqual(applyMusicReleaseBundle(structuredClone(result), structuredClone(release)), result);
  }
});

test("already represented new IDs and aliases are never counted as new again", () => {
  const original = track("canonical", { idAliases: ["legacy"] });
  const base = landing({ tracks: [original], artists: [{ ...singer, trackIds: ["legacy"], trackCount: 1 }], categoryCounts: { Pop: 100, Chill: 100 } });
  const result = applyMusicReleaseBundle(base, bundle([track("legacy")], ["legacy"]));
  assert.equal(result.tracks.length, 1);
  assert.deepEqual(result.archiveStats, base.archiveStats);
  assert.equal(result.artists[0].trackCount, 1);
  assert.deepEqual(result.categoryCounts, base.categoryCounts);
});

test("compact artist statistics do not confuse missing existing profiles with new artists", () => {
  const existing = { ...singer, trackIds: ["archived"], trackCount: 10 };
  const newcomer = { ...singer, slug: "newcomer", trackIds: [], trackCount: 0 };
  const releases = [track("existing-singer"), track("new-singer", { artist: newcomer, artists: [newcomer] })];
  const result = applyMusicReleaseBundle(landing({ scope: "home" }), { ...bundle(releases), artists: [existing, newcomer] });
  assert.equal(result.archiveStats.artists, 21);
  assert.equal(result.artists.find(artist => artist.slug === singer.slug)?.trackCount, 11);
  assert.equal(result.artists.find(artist => artist.slug === newcomer.slug)?.trackCount, 1);
  assert.equal(result.artists[0].bio, existing.bio);
});

test("home/landing keep provider-neutral recent and genre samples, all bounded profile IDs, and stable counts", () => {
  const releases = Array.from({ length: 180 }, (_, i) => track(`release-${String(i).padStart(3, "0")}`, {
    addedAt: new Date(Date.parse(observedAt) - i * 60_000).toISOString(),
    category: i < 100 ? "Pop" : i < 150 ? "Classics" : "Remix",
    sources: [source(`https://external.test/${i}.mp3`, { provider: "uptune" })],
  }));
  const release = bundle(releases);
  for (const scope of ["home", "landing"] as const) {
    const result = applyMusicReleaseBundle(landing({ scope, artists: [singer], categoryCounts: { Pop: 100 } }), release);
    assert.ok(result.tracks.length >= 48);
    assert.ok(result.tracks.length < 180);
    for (const recent of releases.slice(0, 48)) assert.ok(result.tracks.some(track => track.id === recent.id));
    for (const category of ["Pop", "Classics", "Remix"]) assert.ok(result.tracks.some(track => track.category === category));
    assert.equal(result.artists[0].trackIds.length, 180);
    assert.equal(result.artists[0].trackCount, 190);
    assert.equal(result.archiveStats.tracks, 280);
    assert.equal(result.categoryCounts?.Pop, 200);
    assert.equal(result.categoryCounts?.Classics, 50);
    assert.equal(result.categoryCounts?.Remix, 30);
    assert.deepEqual(applyMusicReleaseBundle(structuredClone(result), structuredClone(release)), result, "Unselected releases must not accumulate on repeated application");
  }
  assert.equal(applyMusicReleaseBundle(index(), release).tracks.length, 180);
});

test("inputs and original failed/unverified sources remain immutable while verified alternatives are added", () => {
  const failed = source("https://original.test/failed.mp3", { available: false, checkedAt: before });
  const unverified = source("https://original.test/unverified.m4a", { available: undefined, checkedAt: undefined, playback: false, kind: "download" });
  const original = track("original", { sources: [failed, unverified] });
  const base = freeze(index({ tracks: [original], artists: [singer] }));
  const release = freeze(bundle([track(original.id, { sources: [source("https://checked.test/new.mp3"), failed, unverified] }), track("missing")]));
  const snapshot = structuredClone({ base, release });
  const result = applyMusicReleaseBundle(base, release);
  assert.deepEqual({ base, release }, snapshot);
  assert.deepEqual(result.tracks[0].sources.slice(1), [failed, unverified]);
  assert.equal(result.tracks[0].sources[1], failed);
  assert.equal(result.tracks[0].sources[2], unverified);
  assert.notEqual(result.tracks[0].sources[0], release.tracks[0].sources[0]);
  assert.notEqual(result.tracks[1].sources[0], release.tracks[1].sources[0]);
  assert.equal(result.tracks[0].sources[0].available, true);
});

test("duplicate bounded entries merge once and empty or wholly unchecked bundles are no-ops", () => {
  const original = track("new");
  const duplicate = track("new", { sources: [source("https://media.test/second.mp3")] });
  const base = landing({ artists: [singer] });
  const result = applyMusicReleaseBundle(base, bundle([original, duplicate]));
  assert.equal(result.tracks.length, 1);
  assert.equal(result.tracks[0].sources.length, 2);
  assert.equal(result.archiveStats.tracks, 101);
  assert.equal(result.artists[0].trackCount, 11);
  assert.equal(result.categoryCounts?.Pop, 1);
  assert.equal(applyMusicReleaseBundle(base, bundle([])), base);
  assert.equal(applyMusicReleaseBundle(base, bundle([track("unchecked", { sources: [] })])), base);
});

test("archive source indexing is single-pass on cache miss and absent on cache hit", () => {
  let reads = 0;
  const archive = Array.from({ length: 10_000 }, (_, i) => {
    const original = track(`archived-${i}`);
    const sources = original.sources;
    return { ...original, get sources() { reads++; return sources; } };
  });
  const base = index({ tracks: archive, artists: [singer] });
  const release = bundle(Array.from({ length: 180 }, (_, i) => track(`release-${i}`)));
  const result = applyMusicReleaseBundle(base, release);
  assert.equal(reads, archive.length);
  assert.equal(result.tracks.length, archive.length + 180);
  assert.equal(applyMusicReleaseBundle(base, release), result);
  assert.equal(reads, archive.length);
});
