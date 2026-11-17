import test from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../../app/api/subtitles/track/route';
import { parseSubtitleCues } from '../../lib/subtitle-format';

test('live Subzone Persian/English season packs resolve the requested episode, not the first archive member', {
  skip: process.env.LIVE_SUBTITLE_TESTS !== '1', timeout: 60000,
}, async () => {
  for (const [language, path] of [['fa', 'farsi_persian/3505458'], ['en', 'english/3002113']]) {
    const params = new URLSearchParams({ url: `https://subzone.ir/subtitles/breaking-bad-first-season/${path}/download`, language, season: '1', episode: '1' });
    const response = await GET(new Request(`http://localhost/api/subtitles/track?${params}`));
    assert.equal(response.status, 200, response.status === 200 ? '' : await response.text());
    assert.equal(response.headers.get('x-subtitle-language'), language);
    assert.match(response.headers.get('content-disposition') || '', /S01E01/i);
    const text = await response.text();
    assert.ok(text.startsWith('WEBVTT')); assert.ok(parseSubtitleCues(text).length > 100);
    console.log(JSON.stringify({ language, status: response.status, episode: 'S01E01', cues: parseSubtitleCues(text).length }));
  }
});
