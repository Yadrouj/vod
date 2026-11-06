import test from 'node:test';
import assert from 'node:assert/strict';
import { fileIdentity } from '../import-moviezland-links.mjs';
import { applyAlternativeSourceUpdates } from '../../lib/alternative-source-links.mjs';
import { readFile } from 'node:fs/promises';

test('matches release year and keeps series episode identity distinct', () => {
  assert.deepEqual(fileIdentity('Pixels.2015.1080p.Dub.Farsi.mkv'), { key: 'pixels', year: 2015 });
  assert.deepEqual(fileIdentity('Friends.S02E03.720p.mkv'), { key: 'friends', season: 2, episode: 3 });
  assert.equal(fileIdentity('unknown.1080p.mkv'), null);
});

test('verified publisher comes first while original Donyaye link remains available', () => {
  const old = { url: 'https://example.org/DonyayeSerial/Pixels.mkv' };
  const added = { url: 'https://dl.moviezland.ir/movies/Pixels.2015.1080p.mkv', sourceProvider: 'moviezland', sourceUrl: 'https://movielandz.com/pixels-2015-film/', verifiedAt: new Date().toISOString() };
  const item = { id: 'tt2120120', links: [old] };
  const result = applyAlternativeSourceUpdates(item, { version: 1, items: { tt2120120: { links: [added] } } });
  assert.deepEqual(result.links, [added, old]);
  assert.deepEqual(item.links, [old]);
  assert.deepEqual(applyAlternativeSourceUpdates({ ...item, id: 'tt9999999' }, { version: 1, items: { tt2120120: { links: [added] } } }).links, [old]);
});

test('import snapshot stays within the supplied title mapping and has verified episode files', async () => {
  const snapshot = JSON.parse(await readFile('lib/data/moviezland-source-links.json', 'utf8'));
  const mapping = JSON.parse(await readFile('lib/data/movielandz-donyaye-match.json', 'utf8'));
  const allowed = new Map(mapping.matches.map(row => [row.imdbCode, row]));
  assert.ok(Object.keys(snapshot.items).length > 0);
  assert.equal(snapshot.items.tt33184638, undefined);
  for (const [id, item] of Object.entries(snapshot.items)) {
    assert.ok(allowed.get(id)?.donyayeSerialSourceUrl);
    for (const link of item.links) {
      assert.equal(new URL(link.url).hostname, 'dl.moviezland.ir');
      assert.ok(Number.isFinite(Date.parse(link.verifiedAt)));
      assert.equal(link.sourceUrl, allowed.get(id).movieLandzPage);
      if (link.season) {
        const identity = fileIdentity(link.fileName);
        assert.equal(identity.season, link.season);
        assert.equal(identity.episode, link.episode);
      }
    }
  }
});
