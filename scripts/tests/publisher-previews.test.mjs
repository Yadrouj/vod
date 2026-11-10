import test from 'node:test';
import assert from 'node:assert/strict';
import { isVerifiedPublisherPreview, publisherTrailerUrls } from '../../lib/publisher-previews.mjs';

test('verified Wildwood preview is not a full movie', () => {
  const link = { sourceUrl: 'https://zardfilm.in/movie/wildwood-2026/', url: 'https://www.aparat.com/external/chelsea/manifest.m3u8?q=signed' };
  assert.equal(isVerifiedPublisherPreview(link), true);
  assert.equal(isVerifiedPublisherPreview({ ...link, url: 'https://example.com/movie.mp4' }), false);
  assert.equal(isVerifiedPublisherPreview({ ...link, sourceUrl: 'https://zardfilm.in/movie/another-film/' }), false);
});

test('only sources inside explicit trailer section are classified', () => {
  const urls = publisherTrailerUrls('<a href="#trailers">Trailer</a><video src="full.mp4"></video><div id="trailers"><video><source src="preview.m3u8"></video></div><video src="episode.mp4"></video>');
  assert.deepEqual([...urls], ['preview.m3u8']);
  assert.equal(publisherTrailerUrls('<a href="#trailers">Trailer</a><video src="full.mp4"></video>').size, 0);
});
