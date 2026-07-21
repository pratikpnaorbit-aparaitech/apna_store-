const assert = require("node:assert/strict");
const test = require("node:test");
const { isSellableByExpiry, startOfTomorrow } = require("../utils/productAvailability");

test("products expiring today are blocked while tomorrow remains sellable", () => {
  const now = new Date("2026-07-21T12:00:00+05:30");
  assert.equal(isSellableByExpiry(null, now), true);
  assert.equal(isSellableByExpiry(new Date("2026-07-21T23:59:59+05:30"), now), false);
  assert.equal(isSellableByExpiry(startOfTomorrow(now), now), true);
});
