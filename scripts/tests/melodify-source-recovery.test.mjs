import test from 'node:test';
import assert from 'node:assert/strict';
import { recoveryCandidates, isMp3Prefix } from '../melodify-source-recovery.mjs';
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
test('HTML and empty bytes do not verify as MP3', () => {
  assert.equal(isMp3Prefix(Buffer.from('<html>not audio</html>')), false);
  assert.equal(isMp3Prefix(Buffer.alloc(0)), false);
  assert.equal(isMp3Prefix(Buffer.from('ID3audio')), true);
});
