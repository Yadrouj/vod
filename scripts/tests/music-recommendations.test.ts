import assert from 'node:assert/strict';
import test from 'node:test';
import { MusicRelatedIndex } from '../../lib/music-related-index';
import { relatedMusic, normalizeMusicTrack } from '../../lib/music';
import type { MusicIndex, MusicTrack } from '../../lib/music-types';

function track(i: number): MusicTrack {
  const artist = { name: `Artist ${i % 27}`, slug: `artist-${i % 27}`, sourceUrl: '', aliases: [`alias-${i % 19}`] };
  return { id: String(i), title: ['Summer Love', 'Love Love Forever', 'Beautiful Night', 'شب بارانی'][i % 4], persianTitle: '',
    kind: i % 7 ? 'track' : 'video', category: ['Pop', 'Rock', 'Jazz'][i % 3], artist, artists: [artist],
    coverUrl: i % 3 ? 'cover.jpg' : null, sourceUrl: '', description: null,
    publishedAt: i % 5 ? `2026-01-${String(i % 28 + 1).padStart(2, '0')}` : null,
    sources: i % 2 ? [{ url: 'track.mp3', kind: 'stream', label: 'MP3' }] : [],
    folder: { root: 'Music', year: null, month: null, day: null } };
}

function reference(tracks: MusicTrack[], current: MusicTrack, limit: number) {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const artists = new Set(current.artists.flatMap(a => [a.slug, ...(a.aliases ?? [])]));
  const terms = new Set(normalize(current.title).split(' ').filter(term => term.length > 3));
  return tracks.filter(t => t.id !== current.id && t.kind === current.kind).map(t => ({ track: t, score:
    (t.artists.flatMap(a => [a.slug, ...(a.aliases ?? [])]).some(a => artists.has(a)) ? 1000 : 0)
    + (t.category === current.category ? 180 : 0)
    + normalize(t.title).split(' ').filter(term => terms.has(term)).length * 24
    + (t.coverUrl ? 8 : 0) + (t.sources.some(s => s.kind === 'stream') ? 4 : 0),
  })).filter(t => t.score > 0).sort((a, b) => b.score - a.score
    || (b.track.publishedAt ?? '').localeCompare(a.track.publishedAt ?? ''))
    .slice(0, limit).map(t => t.track.id);
}

test('indexed recommendations exactly preserve artist, title, category, date and stable ties', () => {
  const tracks = Array.from({ length: 1200 }, (_, i) => track(i));
  const index = new MusicRelatedIndex(tracks);
  for (const i of [0, 17, 59, 311, 1001]) for (const limit of [1, 12, 30, 1500]) {
    assert.deepEqual(index.related(tracks[i], limit).map(t => t.id), reference(tracks, tracks[i], limit));
  }
  assert.deepEqual(index.related(tracks[0], 0), []);
  assert.deepEqual(new MusicRelatedIndex([]).related(tracks[0], 12), []);
});

test('fallback groups consider candidates beyond the first page and exclude current IDs', () => {
  const tracks = Array.from({ length: 120 }, (_, i) => ({ ...track(i), title: `Song ${i}`, artists: [], kind: 'track' as const }));
  const current = { ...tracks[0], title: 'Unmatched', category: 'Unmatched', artists: [] };
  const index = new MusicRelatedIndex(tracks);
  assert.deepEqual(index.related(current, 12).map(t => t.id), reference(tracks, current, 12));
});

test('catalog replacement invalidates recommendations and retains legacy artist normalization', () => {
  const legacy = { ...track(0), title: 'Real Artist --- Beautiful Night', kind: 'track' as const,
    artists: [{ slug: 'various-artists', name: 'Various Artists', sourceUrl: '' }] };
  const tracks = [legacy, track(1), track(2)];
  const index = { tracks } as MusicIndex;
  assert.deepEqual(relatedMusic(index, legacy).map(t => t.id), reference(tracks.map(normalizeMusicTrack), normalizeMusicTrack(legacy), 12));
  const next = { tracks: [...tracks, { ...track(3), id: 'new', artists: legacy.artists }] } as MusicIndex;
  assert.equal(relatedMusic(index, legacy).some(t => t.id === 'new'), false);
  assert.equal(relatedMusic(next, legacy).some(t => t.id === 'new'), true);
});
