const assert = require('node:assert/strict');
const test = require('node:test');

const { createCorsOptions } = require('../config/cors');

const evaluateOrigin = (options, origin) => new Promise((resolve) => {
  options.origin(origin, (error, allowed) => resolve({ error, allowed }));
});

test('default CORS policy allows production Web, local Web and native clients', async () => {
  const options = createCorsOptions(null);

  for (const origin of [
    'https://apnastore.aparaitech.org',
    'http://localhost:5173',
    'http://127.0.0.1:19006',
    undefined,
  ]) {
    const result = await evaluateOrigin(options, origin);
    assert.equal(result.error, null);
    assert.equal(result.allowed, true);
  }

  assert.ok(options.methods.includes('PATCH'));
  assert.ok(options.allowedHeaders.includes('Idempotency-Key'));
  assert.equal(options.credentials, true);
});

test('default CORS policy blocks unknown browser origins', async () => {
  const result = await evaluateOrigin(createCorsOptions(null), 'https://untrusted.example');

  assert.equal(result.allowed, undefined);
  assert.equal(result.error?.status, 403);
  assert.equal(result.error?.message, 'Origin not allowed by CORS');
});

test('configured CORS origins are trimmed and replace the defaults', async () => {
  const options = createCorsOptions(' https://admin.example , http://localhost:4000 ');
  const configured = await evaluateOrigin(options, 'https://admin.example');
  const defaultOrigin = await evaluateOrigin(options, 'https://apnastore.aparaitech.org');

  assert.equal(configured.allowed, true);
  assert.equal(configured.error, null);
  assert.equal(defaultOrigin.error?.status, 403);
});
