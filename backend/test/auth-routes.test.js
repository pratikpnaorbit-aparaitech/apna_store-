const assert = require("node:assert/strict");
const test = require("node:test");

const authRouter = require("../routes/authRoutes");
const deliveryRouter = require("../routes/deliveryPartnerRoutes");
const orderRouter = require("../routes/ordersRoutes");
const Order = require("../models/Order");
const Otp = require("../models/Otp");

const routeContracts = (router) => router.stack
  .filter((layer) => layer.route)
  .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path}`));

test("customer authentication routes are registered", () => {
  const routes = routeContracts(authRouter);
  assert.ok(routes.includes("POST /login"));
  assert.ok(routes.includes("POST /register-app"));
  assert.ok(routes.includes("GET /me"));
});

test("verified registration routes are registered without removing the legacy route", () => {
  const routes = routeContracts(authRouter);
  assert.ok(routes.includes("POST /send-registration-otp"));
  assert.ok(routes.includes("POST /verify-registration-otp"));
  assert.ok(routes.includes("POST /register-app"));
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

test("customer order tracking routes are registered", () => {
  const routes = routeContracts(orderRouter);
  assert.ok(routes.includes("GET /:id/tracking"));
  assert.ok(routes.includes("GET /:id/location"));
});

test("tracking and verified registration schema fields are available", () => {
  assert.ok(Order.schema.path("status").enumValues.includes("Picked Up"));
  assert.ok(Order.schema.path("deliveryPartnerLocation.latitude"));
  assert.ok(Order.schema.path("deliveryPartnerLocation.longitude"));
  assert.ok(Order.schema.path("deliveryPartnerLocation.updatedAt"));
  assert.ok(Otp.schema.path("verified"));
  assert.ok(Otp.schema.path("registrationData.passwordHash"));
});
