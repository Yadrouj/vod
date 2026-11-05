import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveUrl, nextArchivePage, parseArchiveList } from '../recover-music-archive-lists.mjs';
const archive = { url: 'https://rozmusic.com/tag/singer/', artist: { name: 'Singer', slug: 'singer' } };
test('crawl remains in a known public singer archive', () => {
  assert.equal(archiveUrl('https://evil.test/tag/a'), null);
  assert.equal(archiveUrl('https://rozmusic.com/admin'), null);
  assert.equal(nextArchivePage('<a href="https://evil.test/tag/singer/page/2/">x</a><a href="/tag/singer/page/2/">next</a>', archive.url, archive.url), archive.url + 'page/2/');
  assert.equal(nextArchivePage('<a href="/tag/other/page/2/">x</a>', archive.url, archive.url), null);
});
test('whole list extraction preserves versions and skips unrelated cards/footer files', () => {
  const card = (name, title) => `<article><h2><a href="https://rozmusic.com/song">${name} ${title}</a></h2><audio src="https://dl.rozmusic.com/Singer%20-%20Song%20(Remix).mp3"></audio></article>`;
  const rows = parseArchiveList(card('Singer', 'Song Remix') + card('Other', 'Song') + '<audio src="https://dl.rozmusic.com/footer.mp3"></audio>', archive, archive.url);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, 'Song (Remix)');
  assert.equal(rows[0].persianTitle, 'Song Remix');
  assert.equal(rows[0].sourceUrl, 'https://rozmusic.com/song');
});
