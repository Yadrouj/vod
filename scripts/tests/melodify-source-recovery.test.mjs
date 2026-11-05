import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryCandidates, isMp3Prefix, retainCompatibleReplacements } from '../melodify-source-recovery.mjs';
const track = (id, title, artist = 'Moein', extra = {}) => ({ id, title, persianTitle: title, kind: 'track', artist: { name: artist, slug: artist }, artists: [{ name: artist, slug: artist }], sources: [{ url: 'https://example.test/song.mp3', provider: 'rozmusic' }], sourceUrl: 'https://example.test/song', ...extra });
test('exact identities preserve recordings, kind, singer and source attribution', () => {
  const library = { tracks: [track('melodify-1', 'Maandegar')] };
  const result = recoveryCandidates(library, { tracks: [track('a', 'Maandegar'), track('b', 'Eshghe Maandegar'), track('c', 'Maandegar', 'Other'), track('d', 'Maandegar Remix'), track('e', 'Maandegar', 'Moein', { kind: 'video' })] });
  assert.equal(result[0].sources.length, 1);
  assert.equal(result[0].sources[0].sourcePageUrl, 'https://example.test/song');
});
test('unavailable, non-MP3 and local library sources are not replacements', () => {
  const result = recoveryCandidates({ tracks: [track('melodify-1', 'A')] }, { tracks: [track('a', 'A', 'Moein', { sources: [{ url: 'https://example.test/a.mp3', provider: 'melodify' }, { url: 'https://example.test/b.mp3', available: false }, { url: 'https://example.test/page' }] })] });
  assert.deepEqual(result[0].sources, []);
});
test('provider headings can include the exact credited artist prefix', () => {
  const result = recoveryCandidates({ tracks: [track('melodify-1', 'Maandegar')] }, { tracks: [track('a', 'Moein - Maandegar')] });
  assert.equal(result[0].sources.length, 1);
});
test('imported filenames may append the exact credited singer without changing versions', () => {
  const imported = track('melodify-1', 'Perfect Ed Sheeran', 'Ed Sheeran', { sources: [{ provider: 'melodify', basePath: 'Perfect Ed Sheeran.mp3' }] });
  const result = recoveryCandidates({ tracks: [imported] }, { tracks: [track('a', 'Perfect', 'Ed Sheeran'), track('b', 'Perfect Remix', 'Ed Sheeran')] });
  assert.equal(result[0].sources.length, 1);
  assert.deepEqual(recoveryCandidates({ tracks: [{ ...imported, title: 'Perfect Live Ed Sheeran', persianTitle: 'Perfect Live Ed Sheeran', sources: [{ provider: 'melodify', basePath: 'Perfect Live Ed Sheeran.mp3' }] }] }, { tracks: [track('a', 'Perfect', 'Ed Sheeran')] })[0].sources, []);
});
test('HTML and empty bytes do not verify as MP3', () => {
  assert.equal(isMp3Prefix(Buffer.from('<html>not audio</html>')), false);
  assert.equal(isMp3Prefix(Buffer.alloc(0)), false);
  assert.equal(isMp3Prefix(Buffer.from('ID3audio')), true);
});
test('explicit bilingual archive credits can normalize an imported filename, not another singer', () => {
  const imported = track('melodify-1', 'Song Singer', 'خواننده', { sources: [{ provider: 'melodify', basePath: 'Song Singer.mp3' }] });
  const source = track('a', 'Song', 'خواننده', { artists: [{ name: 'خواننده', slug: 'known', aliases: ['Singer'] }] });
  assert.equal(recoveryCandidates({ tracks: [imported] }, { tracks: [source] })[0].sources.length, 1);
  assert.equal(recoveryCandidates({ tracks: [imported] }, { tracks: [track('b', 'Song', 'Another Singer')] })[0].sources.length, 0);
});
test('a generic translated title cannot hide a different version in the media filename', () => {
  const library = { tracks: [track('melodify-1', 'Song')] };
  const remix = track('a', 'Song', 'Moein', { sources: [{ url: 'https://example.test/Song%20(Remix).mp3' }] });
  assert.deepEqual(recoveryCandidates(library, { tracks: [remix] })[0].sources, []);
  const live = track('b', 'Song', 'Moein', { sources: [{ url: 'https://example.test/Song.Live.mp3' }] });
  assert.deepEqual(recoveryCandidates(library, { tracks: [live] })[0].sources, []);
});
test('explicit identity review retains only supported replacements without mutating its inputs', () => {
  const original = { a: [{ url: 'original' }, { url: 'remix' }], b: [{ url: 'live' }] };
  assert.deepEqual(retainCompatibleReplacements([{ id: 'a', sources: [{ url: 'original' }] }, { id: 'b', sources: [] }], original), { a: [{ url: 'original' }] });
  assert.equal(original.a.length, 2);
  assert.equal(original.b.length, 1);
});
