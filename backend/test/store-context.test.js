const assert = require("node:assert/strict");
const test = require("node:test");

const requireStoreContext = require("../middleware/storeContextMiddleware");

const invoke = (user) => {
  const result = { nextCalled: false, status: null, body: null };
  const req = { user };
  const res = {
    status(code) {
      result.status = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  requireStoreContext(req, res, () => { result.nextCalled = true; });
  return result;
};

test("store context accepts global Super Admin and assigned store roles", () => {
  assert.equal(invoke({ role: "super_admin", storeId: null }).nextCalled, true);
  assert.equal(invoke({ role: "admin", storeId: "store-a" }).nextCalled, true);
  assert.equal(invoke({ role: "staff", storeId: "store-a" }).nextCalled, true);
});

test("store context fails closed for missing identity or store assignment", () => {
  const anonymous = invoke(null);
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.nextCalled, false);

  for (const role of ["admin", "staff"]) {
    const unassigned = invoke({ role, storeId: null });
    assert.equal(unassigned.status, 403);
    assert.match(unassigned.body.message, /No store is assigned/);
    assert.equal(unassigned.nextCalled, false);
  }
});
