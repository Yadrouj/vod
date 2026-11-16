import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMusicReleaseBundle } from '../../lib/bundled-music-release';
import { loadMoodPlaylists, loadMoodTracks } from '../../lib/mood-playlists';
import { findMusicArtist, findMusicTrack, loadMusicArtistIndex, loadMusicHomeIndex, loadMusicIndex, loadMusicLandingIndex, musicForArtist, searchMusic } from '../../lib/music';
import { susanRoshanCollections, susanRoshanRelease, susanRoshanTracks } from '../../lib/susan-roshan-collection';

test('imported playlist contains 26 attributed verified MP3s, three albums and a distinct artist', () => {
  assert.equal(susanRoshanTracks.length, 26);
  assert.equal(new Set(susanRoshanTracks.map(track => track.id)).size, 26);
  assert.equal(susanRoshanCollections.length, 4);
  assert.equal(susanRoshanCollections[0].trackIds.length, 26);
  assert.deepEqual(susanRoshanCollections.slice(1).map(collection => collection.trackIds.length), [8, 9, 8]);
  for (const track of susanRoshanTracks) {
    assert.equal(track.artist.name, 'سوزان روشن');
    assert.equal(track.artist.slug, 'سوزان-روشن');
    assert.match(track.persianTitle, /[آ-ی]/);
    assert.match(track.sourceUrl, /^https:\/\/tiarin\.ir\/(album|single)\/\d+\/$/);
    assert.match(track.coverUrl!, /^https:\/\/tiarin\.ir\/wp-content\/uploads\//);
    assert.equal(track.sources[0].provider, 'tiarin');
    assert.equal(track.sources[0].sourcePageUrl, track.sourceUrl);
    assert.equal(track.sources[0].available, true);
    assert.ok(Number.isFinite(Date.parse(track.sources[0].checkedAt!)));
    assert.match(track.sources[0].url, /^https:\/\/dl\.tiarin\.ir\/FRE\/.+\.mp3$/);
    assert.ok(!track.sources.some(source => /vip-dl|\/VIP\//i.test(source.url)));
  }
  assert.equal(susanRoshanTracks.find(track => track.title === 'Hamkelasi')!.publishedAt!.slice(0, 4), '2000');
  assert.equal(susanRoshanTracks.find(track => track.title === 'Hol Shodam')!.publishedAt!.slice(0, 4), '2025');
});

test('collection pages resolve every track and keep Sousan separate from Susan Roshan', async () => {
  const [playlists, tracks] = await Promise.all([loadMoodPlaylists(), loadMoodTracks()]);
  for (const collection of susanRoshanCollections) {
    assert.equal(playlists.playlists.filter(playlist => playlist.id === collection.id).length, 1);
    assert.equal(collection.trackIds.filter(id => tracks.some(track => track.id === id)).length, collection.trackIds.length);
  }
  const oldCollection = playlists.playlists.find(playlist => playlist.id === 'sousan-collection')!;
  assert.ok(oldCollection);
  assert.ok(!oldCollection.trackIds.some(id => susanRoshanCollections[0].trackIds.includes(id)));
  assert.ok(playlists.updatedAt >= susanRoshanRelease.observedAt);
});

test('full search, compact landings and artist pages share playable IDs without duplicates', async () => {
  for (const index of await Promise.all([loadMusicIndex(), loadMusicHomeIndex(), loadMusicLandingIndex(), loadMusicArtistIndex()])) {
    for (const track of susanRoshanTracks) assert.ok(findMusicTrack(index, track.id), `${track.id} missing from ${'scope' in index ? index.scope : 'full'} index`);
    const artist = findMusicArtist(index, 'susan-roshan')!;
    assert.ok(artist);
    assert.equal(artist.slug, 'سوزان-روشن');
    assert.equal(index.artists.filter(profile => profile.slug === artist.slug).length, 1);
    assert.ok(musicForArtist(index, artist.slug).length >= 26);
    const again = applyMusicReleaseBundle(index, susanRoshanRelease);
    assert.equal(again, index, 'overlay is cached and idempotent');
  }
  const full = await loadMusicIndex();
  const ids = new Set(searchMusic(full, 'سوزان روشن').map(track => track.id));
  assert.ok(susanRoshanTracks.every(track => ids.has(track.id)));
});
