import test from "node:test";
import assert from "node:assert/strict";
import { preserveMusicIdentities } from "../stable-music-identities.mjs";

test("shared music IDs remain valid through cross-provider deduplication", () => {
  const before = [{ id: "old", kind: "track", matchKey: "artist song", idAliases: ["older"], sources: [] }];
  const incoming = [{ id: "new", kind: "track", matchKey: "artist song", sources: [] }];
  const result = preserveMusicIdentities(before, incoming);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].idAliases, ["older", "old"]);
  assert.equal(incoming[0].idAliases, undefined);
  assert.deepEqual(preserveMusicIdentities(before, result), result);
});
test("audio and music videos never share an identity; missing archive items are retained", () => {
  const old = { id: "old-audio", kind: "track", matchKey: "artist song", sources: [{ url: "https://media.example/file" }] };
  const video = { id: "video", kind: "video", matchKey: old.matchKey, sources: old.sources };
  assert.equal(preserveMusicIdentities([old], [video]).length, 2);
});
test("exact media URL can preserve an ID after a metadata correction without shadowing another primary ID", () => {
  const old = { id: "old", kind: "track", sources: [{ url: "https://media.example/file.mp3" }], idAliases: ["primary"] };
  const current = [{ id: "new", kind: "track", sources: old.sources }, { id: "primary", kind: "track", sources: [] }];
  const result = preserveMusicIdentities([old], current);
  assert.deepEqual(result[0].idAliases, ["old"]);
});

test('a shared playlist URL cannot swallow a different song or its download variants', () => {
  const shared = { url: 'https://media.example/playlist.mp3' };
  const old = { id: 'mashhoor', kind: 'track', title: 'مشهور', matchKey: 'babak mashhoor', sources: [shared, { url: 'https://media.example/mashhoor.mp3' }] };
  const current = { id: 'shahre-sholoogh', kind: 'track', title: 'Shahre Sholoogh', matchKey: 'babak shahre sholoogh', sources: [shared], idAliases: [old.id] };
  const result = preserveMusicIdentities([old], [current]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.find(x => x.id === old.id).sources, old.sources);
  assert.equal(result[0].idAliases, undefined);
});

test('numbered mixes remain distinct even when a provider stripped numbers from matchKey', () => {
  const before = [12, 13].map(n => ({ id: `fusion-${n}`, kind: 'track', title: `Fusion ${n}`, matchKey: 'leeroy fusion', sources: [] }));
  const incoming = [{ id: 'fusion', kind: 'track', title: 'Fusion', matchKey: 'leeroy fusion', sources: [] }];
  const result = preserveMusicIdentities(before, incoming);
  assert.equal(result.length, 3);
  assert.deepEqual(result.map(x => x.id), ['fusion', 'fusion-12', 'fusion-13']);
});

test('genuine cross-provider matches keep every original source and repeated merges are stable', () => {
  const old = { id: 'old', kind: 'track', title: 'Song', matchKey: 'artist song', sources: [{ url: 'https://a.example/a.mp3' }] };
  const next = { id: 'new', kind: 'track', title: 'Song', matchKey: old.matchKey, sources: [{ url: 'https://b.example/b.mp3' }] };
  const result = preserveMusicIdentities([old], [next]);
  assert.equal(result.length, 1); assert.equal(result[0].sources.length, 2);
  assert.deepEqual(result[0].idAliases, ['old']);
  assert.deepEqual(preserveMusicIdentities([old], result), result);
  assert.equal(next.sources.length, 1);
});
