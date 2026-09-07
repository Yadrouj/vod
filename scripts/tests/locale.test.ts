import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLocale } from "../../lib/i18n";
test("Persian is the default without disabling the explicit English language choice", () => {
  assert.equal(normalizeLocale("en"), "en");
  for (const value of ["fa", null, undefined, "invalid"]) assert.equal(normalizeLocale(value), "fa");
});
