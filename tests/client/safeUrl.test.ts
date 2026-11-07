import { test } from "node:test";
import assert from "node:assert/strict";
import { safeHttpUrl, safeTel } from "../../src/lib/safeUrl.ts";
test("safeHttpUrl şemaları", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,x"), null);
  assert.equal(safeHttpUrl("vbscript:x"), null);
  assert.equal(safeHttpUrl(undefined), null);
  assert.equal(safeHttpUrl("https://maps.google.com/?q=a"), "https://maps.google.com/?q=a");
});
test("safeTel", () => {
  assert.equal(safeTel("+90 212 555 11 22"), "tel:+902125551122");
  assert.equal(safeTel("112"), "tel:112");
  assert.equal(safeTel("javascript:alert(1)"), null);
  assert.equal(safeTel("12;rm"), null);
});
