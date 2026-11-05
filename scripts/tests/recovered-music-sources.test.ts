import assert from 'node:assert/strict';
import test from 'node:test';
import replacements from '../../lib/data/melodify-source-replacements.json';
import { withRecoveredMusicSources } from '../../lib/music-library-merge';
import type { MusicTrack } from '../../lib/music-types';

test('verified external sources preserve library IDs and metadata without duplicate URLs', () => {
  const id = Object.keys(replacements)[0];
  const original = { id, title: 'Original', category: 'Chill', sources: [{ url: 'https://sarvnema.ir/api/music/library/'+id+'.mp3', provider: 'melodify', kind: 'stream', label: 'Local' }] } as MusicTrack;
  const result = withRecoveredMusicSources(original);
  assert.equal(result.id, id);
  assert.equal(result.title, original.title);
  assert.equal(result.category, original.category);
  assert.notEqual(result.sources[0].provider, 'melodify');
  assert.equal(result.sources[0].kind, 'stream');
  assert.equal(result.sources.at(-1)?.provider, 'melodify');
  assert.deepEqual(withRecoveredMusicSources(result), result);
  assert.equal(original.sources.length, 1);
  assert.equal(withRecoveredMusicSources({ ...original, id: 'unknown' }).sources, original.sources);
});

test('every shipped replacement records its source page and successful check date', () => {
  for (const [id, sources] of Object.entries(replacements)) {
    assert.match(id, /^melodify-\d+$/);
    for (const source of sources) {
      assert.match(source.url, /^https:\/\//);
      assert.match(source.sourcePageUrl, /^https:\/\//);
      assert.equal(source.available, true);
      assert.ok(Number.isFinite(Date.parse(source.checkedAt)));
    }
  }
});
