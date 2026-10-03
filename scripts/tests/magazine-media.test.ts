import test from 'node:test';
import assert from 'node:assert/strict';
import { articleVisuals, safeMediaUrl } from '../../lib/magazine-media';

test('original title stills are deduplicated and preferred over event photos', () => {
  const result = articleVisuals({ title: 'Film', imdbImages: [
    { url: 'https://example.com/event.jpg', caption: 'Actor at an event', width: 1600, height: 900 },
    { url: 'https://example.com/still.jpg', caption: 'Film scene', width: 1600, height: 900 },
  ], movieshoImages: [{ url: 'https://example.com/still.jpg' }] });
  assert.equal(result.images[0].url, 'https://example.com/still.jpg');
  assert.equal(result.images.length, 2);
});
test('expired trailer uses original IMDb video page; interviews never become trailers', () => {
  const result = articleVisuals({ title: 'Film', imdbVideos: [
    { name: 'Cast interview', video_id: 'vi1', playback_urls: [{ url: 'https://example.com/interview.mp4' }] },
    { name: 'Official trailer', video_id: 'vi2', playback_urls: [{ url: 'https://example.com/trailer.mp4?expires=1' }] },
  ] }, Date.parse('2026-10-03T10:00:00Z'));
  assert.equal(result.trailer?.url, null);
  assert.equal(result.trailer?.sourceUrl, 'https://www.imdb.com/video/vi2/');
  assert.equal(articleVisuals({ title: 'Film', imdbVideos: [{ name: 'Cast interview', video_id: 'vi1' }] }).trailer, undefined);
});
test('live trailer can be played inline, invalid image URLs are excluded', () => {
  const result = articleVisuals({ title: 'Film', imdbImages: [{ url: 'javascript:alert(1)' }], imdbVideos: [{ name: 'Teaser', playback_urls: [{ url: 'https://example.com/live.mp4' }] }] });
  assert.equal(result.trailer?.url, 'https://example.com/live.mp4');
  assert.deepEqual(result.images, []);
  for (const url of ['//example.com/x', '/../../x', 'data:x', 'https://example.com/\\x']) assert.equal(safeMediaUrl(url), false);
});
