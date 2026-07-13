const assert = require("node:assert/strict");
const test = require("node:test");

const authRouter = require("../routes/authRoutes");
const deliveryRouter = require("../routes/deliveryPartnerRoutes");

const routeContracts = (router) => router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test("customer authentication routes are registered", () => {
  const routes = routeContracts(authRouter);
  assert.ok(routes.includes("POST /login"));
  assert.ok(routes.includes("POST /register-app"));
  assert.ok(routes.includes("GET /me"));
});

test("password recovery routes are registered", () => {
  const routes = routeContracts(authRouter);
  assert.ok(routes.includes("POST /forgot-password-otp"));
  assert.ok(routes.includes("POST /reset-password"));
});

test("delivery authentication and session-check routes are registered", () => {
  const routes = routeContracts(deliveryRouter);
  assert.ok(routes.includes("POST /login"));
  assert.ok(routes.includes("GET /my-orders"));
});
