import test from "node:test";
import assert from "node:assert/strict";
import { compareArchive, identityAliases, musicIdentityAliases } from "../audit-landing-refresh.mjs";
test("refresh audit counts unique additions and explicitly reports lost IDs", () => {
  assert.deepEqual(compareArchive([{id:"a"},{id:"b"}],[{id:"b"},{id:"c"},{id:"c"}],i=>i.id),
    {total:2,added:1,removed:["a"]});
});
test("music audit accepts explicit unique aliases but never hides a primary ID or ambiguity", () => {
  const aliases = musicIdentityAliases([{id:"new",idAliases:["old","shared","other"]}, {id:"other",idAliases:["shared"]}]);
  assert.equal(aliases.get("old"),"new");
  assert.equal(aliases.has("shared"),false);
  assert.equal(aliases.has("other"),false);
});
test("only an explicit registry alias pointing to an existing page explains canonicalization", () => {
  const aliases = identityAliases({ groups: [{ canonicalId: "new", aliases: ["old","new"] }, { canonicalId: "missing", aliases: ["lost"] }] }, new Set(["new"]));
  assert.equal(aliases.get("old"), "new");
  assert.equal(aliases.has("lost"), false);
});
