import assert from "node:assert/strict";
import test from "node:test";
import { playableLinks, roomPlayableLinks } from "../../lib/link-labels";
import { preferredPlaybackIndex, recoverySources, samePlaybackEpisode } from "../../lib/playback-help";
import type { VodLink } from "../../lib/types";

const link = (url: string, extra: Partial<VodLink> = {}) => ({ url, label: "Source", group: "SoftSub", quality: "720p", release: null, size: null, ...extra });
const regional = link("https://dls3.aparatchi-dlcenter.top/DonyayeSerial/Film.1080p.mp4", { sourceProvider: "donyayeserial" });
const alternative = link("https://sr.moviesho.com/Film.720p.mkv", { sourceProvider: "moviesho" });

test("MovieLandz stays first even when another provider offers MP4", () => {
  const publisher = link("https://dl.moviezland.ir/movies/Film.720p.mkv", { sourceProvider: "moviezland" });
  const native = link("https://sr.moviesho.com/Film.1080p.mp4", { sourceProvider: "moviesho" });
  for (const select of [playableLinks, roomPlayableLinks]) {
    assert.deepEqual(select([regional, native, publisher]), [publisher, native, regional]);
  }
});

test("a verified mirror precedes unverified alternatives and regional sources", () => {
  const verified = { ...alternative, sourceUrl: 'https://www.moviesho.com/movie/example/', verifiedAt: new Date().toISOString() };
  const unverified = link('https://cdn.example/Film.mp4', { sourceProvider: 'moviesho' });
  for (const select of [playableLinks, roomPlayableLinks]) assert.deepEqual(select([regional, unverified, verified]), [verified, unverified, regional]);
});

test("auto-play prefers conventional audio within provider and episode, without removing 6CH", () => {
  const surround = link('https://cdn.example/Friends.S01E01.1080p.6CH.mkv', { season: 1, episode: 1 });
  const stereo = link('https://cdn.example/Friends.S01E01.720p.mkv', { season: 1, episode: 1 });
  const nextEpisode = link('https://cdn.example/Friends.S01E02.720p.mkv', { season: 1, episode: 2 });
  for (const select of [playableLinks, roomPlayableLinks]) {
    assert.deepEqual(select([surround, nextEpisode, stereo], { isSeries: true }), [stereo, surround, nextEpisode]);
  }
  assert.equal(preferredPlaybackIndex([stereo, surround], undefined, surround.url), 0);
  assert.equal(preferredPlaybackIndex([stereo, surround], surround.url), 1);
  assert.equal(preferredPlaybackIndex([nextEpisode, surround], undefined, surround.url), 1);
  assert.deepEqual(playableLinks([regional, surround]), [surround, regional]);
});

test("alternative providers win even when DonyayeSerial has the native MP4 or higher quality", () => {
  for (const includeAlternateFiles of [false, true]) {
    assert.deepEqual(playableLinks([regional, alternative], { includeAlternateFiles }), [alternative, regional]);
    assert.deepEqual(roomPlayableLinks([regional, alternative], { includeAlternateFiles }), [alternative, regional]);
  }
});

test("browser-native formats remain preferred within the same provider tier", () => {
  const mp4 = link("https://sr.moviesho.com/Film.480p.mp4");
  assert.deepEqual(playableLinks([alternative, regional, mp4], { includeAlternateFiles: true }), [mp4, alternative, regional]);
  assert.deepEqual(roomPlayableLinks([alternative, regional, mp4]), [mp4, regional]);
});

test("first/next episodes stay chronological; alternatives win within each exact episode", () => {
  const ds1 = { ...regional, season: 1, episode: 1 };
  const alt1 = { ...alternative, season: 1, episode: 1 };
  const alt2 = { ...alternative, url: alternative.url.replace('Film', 'Episode2'), season: 1, episode: 2 };
  const ds2 = { ...regional, url: regional.url.replace('Film', 'Episode2'), season: 1, episode: 2 };
  const result = playableLinks([ds2, alt2, ds1, alt1], { isSeries: true, includeAlternateFiles: true });
  assert.deepEqual(result, [alt1, ds1, alt2, ds2]);
  assert.deepEqual(playableLinks([alt2, ds1], { isSeries: true }), [ds1, alt2]);
  assert.deepEqual(recoverySources(ds1, [ds1, alt2, alt1]).map(row => row.link), [alt1]);
});

test("explicit selections win; passive DonyayeSerial history upgrades only within its own episode", () => {
  const sources = [{ ...alternative, season: 1, episode: 1 }, { ...regional, season: 1, episode: 1 }];
  assert.equal(preferredPlaybackIndex(sources), 0);
  assert.equal(preferredPlaybackIndex(sources, regional.url), 1);
  assert.equal(preferredPlaybackIndex(sources, undefined, regional.url), 0);
  assert.equal(preferredPlaybackIndex([sources[0], { ...sources[1], episode: 2 }], undefined, regional.url), 1);
  assert.equal(preferredPlaybackIndex([], "unknown"), -1);
  assert.equal(samePlaybackEpisode({ season: null }, {}), true);
});

test("expired signed links and trailers cannot become the preferred source", () => {
  const expired = { ...alternative, url: alternative.url + '?expires=1' };
  const trailer = link('https://sr.moviesho.com/Film.Trailer.mp4');
  assert.deepEqual(playableLinks([expired, trailer, regional]), [regional]);
  assert.deepEqual(roomPlayableLinks([expired, trailer, regional]), [regional]);
});
