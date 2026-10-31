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
