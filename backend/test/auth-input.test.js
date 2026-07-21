const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX_PASSWORD_LENGTH,
  validateDeliveryLoginInput,
  validateForgotPasswordInput,
  validateLegacyRegistrationInput,
  validateRegistrationEmailInput,
  validateRegistrationInput,
  validateRegistrationVerificationInput,
  validateResetPasswordInput,
  validateUserLoginInput,
} = require('../utils/authInput');

test('user login input normalizes email without changing the password', () => {
  assert.deepEqual(
    validateUserLoginInput({ email: '  ADMIN@Example.COM ', password: ' pass word ' }),
    { email: 'admin@example.com', password: ' pass word ' },
  );
});

test('user login input rejects missing, malformed and non-primitive values', () => {
  for (const input of [
    {},
    { email: { $ne: null }, password: 'password' },
    { email: 'not-an-email', password: 'password' },
    { email: 'user@example.com', password: { unexpected: true } },
    { email: 'user@example.com', password: 'x'.repeat(MAX_PASSWORD_LENGTH + 1) },
  ]) {
    assert.throws(() => validateUserLoginInput(input), (error) => error.status === 400);
  }
});

test('delivery login input accepts common phone formatting and country code', () => {
  assert.deepEqual(
    validateDeliveryLoginInput({ phone: '+91 98765-43210', password: 'delivery-pass' }),
    { phone: '9876543210', password: 'delivery-pass' },
  );
});

test('delivery login input rejects invalid and query-object phone values', () => {
  for (const input of [
    {},
    { phone: { $ne: null }, password: 'password' },
    { phone: '12345', password: 'password' },
    { phone: '9876543210', password: [] },
  ]) {
    assert.throws(() => validateDeliveryLoginInput(input), (error) => error.status === 400);
  }
});

test('forgot password input normalizes a valid email and rejects query objects', () => {
  assert.deepEqual(
    validateForgotPasswordInput({ email: '  USER@Example.COM ' }),
    { email: 'user@example.com' },
  );
  assert.throws(
    () => validateForgotPasswordInput({ email: { $ne: null } }),
    (error) => error.status === 400,
  );
});

test('reset password input validates email, OTP and password bounds', () => {
  assert.deepEqual(
    validateResetPasswordInput({
      email: ' USER@Example.COM ',
      otp: ' 123456 ',
      newPassword: 'new-password',
    }),
    { email: 'user@example.com', otp: '123456', newPassword: 'new-password' },
  );

  for (const input of [
    { email: { $ne: null }, otp: '123456', newPassword: 'password' },
    { email: 'user@example.com', otp: { $ne: null }, newPassword: 'password' },
    { email: 'user@example.com', otp: '12345', newPassword: 'password' },
    { email: 'user@example.com', otp: '123456', newPassword: {} },
    { email: 'user@example.com', otp: '123456', newPassword: 'short' },
    { email: 'user@example.com', otp: '123456', newPassword: 'x'.repeat(MAX_PASSWORD_LENGTH + 1) },
  ]) {
    assert.throws(() => validateResetPasswordInput(input), (error) => error.status === 400);
  }
});

test('registration input normalizes valid account details', () => {
  assert.deepEqual(
    validateRegistrationInput({
      name: '  Test Customer  ',
      email: ' TEST@Example.COM ',
      phone: '+91 98765-43210',
      password: 'safe password',
    }),
    {
      name: 'Test Customer',
      email: 'test@example.com',
      mobile: '9876543210',
      password: 'safe password',
    },
  );
});

test('registration input rejects malformed, oversized and non-primitive fields', () => {
  const valid = {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '9876543210',
    password: 'password',
  };
  for (const input of [
    {},
    { ...valid, name: { $ne: null } },
    { ...valid, name: 'x'.repeat(101) },
    { ...valid, email: { $ne: null } },
    { ...valid, phone: { $ne: null } },
    { ...valid, password: [] },
    { ...valid, password: 'short' },
    { ...valid, password: 'x'.repeat(MAX_PASSWORD_LENGTH + 1) },
  ]) {
    assert.throws(() => validateRegistrationInput(input), (error) => error.status === 400);
  }
});

test('registration OTP inputs require primitive email and six digits', () => {
  assert.deepEqual(
    validateRegistrationVerificationInput({ email: ' TEST@Example.COM ', otp: ' 123456 ' }),
    { email: 'test@example.com', otp: '123456' },
  );
  assert.deepEqual(
    validateRegistrationEmailInput({ email: ' TEST@Example.COM ' }),
    { email: 'test@example.com' },
  );
  assert.deepEqual(
    validateLegacyRegistrationInput({
      name: 'Test Customer', email: 'test@example.com', mobile: '9876543210', password: 'password', otp: '123456',
    }).otp,
    '123456',
  );
  for (const input of [
    { email: { $ne: null }, otp: '123456' },
    { email: 'test@example.com', otp: { $ne: null } },
    { email: 'test@example.com', otp: '12345' },
  ]) {
    assert.throws(() => validateRegistrationVerificationInput(input), (error) => error.status === 400);
  }
});
