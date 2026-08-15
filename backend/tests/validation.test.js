const test = require("node:test");
const assert = require("node:assert/strict");
const { isIsoDate, isValidDateRange, matchesImageSignature } = require("../utils/validation");

test("booking date ranges reject malformed, past and reversed dates", () => {
  const now = new Date("2026-08-14T12:00:00Z");
  assert.equal(isIsoDate("2026-08-15"), true);
  assert.equal(isIsoDate("15-08-2026"), false);
  assert.equal(isValidDateRange("2026-08-15", "2026-08-17", now), true);
  assert.equal(isValidDateRange("2026-08-13", "2026-08-17", now), false);
  assert.equal(isValidDateRange("2026-08-17", "2026-08-15", now), false);
});

test("image validation checks bytes instead of trusting MIME headers", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00]);
  assert.equal(matchesImageSignature(jpeg, "image/jpeg"), true);
  assert.equal(matchesImageSignature(jpeg, "image/png"), false);
  assert.equal(matchesImageSignature(png, "image/png"), true);
  assert.equal(matchesImageSignature(Buffer.from("not an image"), "image/jpeg"), false);
});
