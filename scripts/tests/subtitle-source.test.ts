import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSubtitleRows, parseSubtitleDownloadUrl } from '../../lib/subtitles';

test('nested release lists preserve rows and every release', () => {
  const html = `<h1><span>Film</span></h1><li class='item good'><span class='language en'>English</span><ul class='scrolllist'><li>Film.1080p.WEB</li><li>Film.720p.WEB</li></ul><a class='download icon-download' href='/subtitles/film/english/123'></a></li>`;
  const rows = parseSubtitleRows(html, 'https://subzone.ir/subtitles/film', 'English');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].releases, ['Film.1080p.WEB', 'Film.720p.WEB']);
});
test('download URLs must come from the matching provider button', () => {
  const page = 'https://subzone.ir/subtitles/film/english/123';
  assert.equal(parseSubtitleDownloadUrl(`<a id="downloadButton" href="/subtitles/film/english/123/download">Download</a>`, page), `${page}/download`);
  assert.equal(parseSubtitleDownloadUrl('<a href="/download">Download</a>', page), null);
  assert.equal(parseSubtitleDownloadUrl('<a id="downloadButton" href="https://evil.test/subtitles/film/english/123/download">Download</a>', page), null);
});
