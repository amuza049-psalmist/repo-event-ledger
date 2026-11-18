// Lightweight test runner for core.js — plain Node, no dependencies.
// Run with: node test/core.test.js
"use strict";

const assert = require("assert");
const core = require("../core.js");

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { passed++; console.log("  ✓ " + name); })
    .catch(error => { failed++; console.error("  ✗ " + name + "\n    " + error.message); });
}

(async () => {
  await test("isValidComputerNumber accepts 10 digits starting with 2", () => {
    assert.ok(core.isValidComputerNumber("2024067832"));
  });
  await test("isValidComputerNumber rejects wrong shapes", () => {
    assert.ok(!core.isValidComputerNumber("1024067832"));
    assert.ok(!core.isValidComputerNumber("20240678"));
    assert.ok(!core.isValidComputerNumber("abc"));
  });
  await test("isValidPassword requires unza prefix and length 6+", () => {
    assert.ok(core.isValidPassword("unza123"));
    assert.ok(!core.isValidPassword("secret123"));
    assert.ok(!core.isValidPassword("unza"));
  });
  await test("formatDate handles invalid dates", () => {
    assert.strictEqual(core.formatDate("not-a-date"), "Invalid date");
    assert.ok(core.formatDate("2026-01-01T00:00:00Z").length > 0);
  });
  await test("escapeICS escapes backslashes, commas, semicolons and newlines", () => {
    assert.strictEqual(core.escapeICS("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  });
  await test("parseICS extracts events with escaped text", () => {
    const text = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART:20260301T090000Z", "SUMMARY:Workshop\\, Part 1", "DESCRIPTION:Bring notes", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const items = core.parseICS(text);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].title, "Workshop, Part 1");
    assert.strictEqual(items[0].when, "2026-03-01T09:00:00.000Z");
    assert.strictEqual(items[0].details, "Bring notes");
  });
  await test("parseICS supports all-day dates and folded lines", () => {
    const text = "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260301\r\nSUMMARY:All\r\n  day\r\nEND:VEVENT";
    const items = core.parseICS(text);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].when, "2026-03-01T00:00:00.000Z");
  });
  await test("buildICS escapes fields and parseICS reads them back", () => {
    const ics = core.buildICS([{ id: "x", title: "A,B", details: "d\ne", when: "2026-03-01T09:00:00.000Z" }]);
    assert.ok(ics.includes("SUMMARY:A\\,B"));
    const items = core.parseICS(ics);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].title, "A,B");
  });
  await test("findDueEvent returns only past, unrung events", () => {
    const now = Date.parse("2026-03-01T12:00:00Z");
    const events = [
      { when: "2026-03-01T11:00:00Z" },                    // due
      { when: "2026-03-01T11:30:00Z", alarmedAt: "x" },    // already rung
      { when: "2026-03-01T13:00:00Z" }                     // future
    ];
    assert.strictEqual(core.findDueEvent(events, now), events[0]);
    assert.strictEqual(core.findDueEvent([], now), null);
  });
  await test("sealJson/openJson round-trip with a derived key", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await core.deriveEncryptionKey("unza-test-password", salt);
    const value = { title: "Seminar", when: "2026-03-01T09:00:00Z" };
    const sealed = JSON.parse(await core.sealJson(value, key));
    assert.strictEqual(sealed.version, 2);
    const opened = await core.openJson(sealed, key);
    assert.deepStrictEqual(opened, value);
  });
  await test("openJson fails with the wrong key", async () => {
    const saltA = crypto.getRandomValues(new Uint8Array(16));
    const saltB = crypto.getRandomValues(new Uint8Array(16));
    const keyA = await core.deriveEncryptionKey("unza-password-a", saltA);
    const keyB = await core.deriveEncryptionKey("unza-password-b", saltB);
    const sealed = await core.sealJson({ secret: true }, keyA);
    await assert.rejects(() => core.openJson(sealed, keyB));
  });
  await test("base64 helpers round-trip bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(300));
    assert.deepStrictEqual(core.fromBase64(core.toBase64(bytes)), bytes);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
