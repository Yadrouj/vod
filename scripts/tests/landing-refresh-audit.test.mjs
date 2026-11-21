import test from "node:test";
import assert from "node:assert/strict";
import { compareArchive } from "../audit-landing-refresh.mjs";
test("refresh audit counts unique additions and explicitly reports lost IDs", () => {
  assert.deepEqual(compareArchive([{id:"a"},{id:"b"}],[{id:"b"},{id:"c"},{id:"c"}],i=>i.id),
    {total:2,added:1,removed:["a"]});
});
