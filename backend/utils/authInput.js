const MAX_PASSWORD_LENGTH = 128;

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

const validateEmail = (value, missingMessage = 'Email is required') => {
  if (typeof value !== 'string') {
    throw badRequest(missingMessage);
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest('Enter a valid email address');
  }
  return email;
};

const validatePassword = (password, missingMessage) => {
  if (typeof password !== 'string' || password.length === 0) {
    throw badRequest(missingMessage);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw badRequest('Password must be 128 characters or fewer');
  }
  return password;
};

const validateUserLoginInput = (body = {}) => {
  const email = validateEmail(body.email, 'Email and password are required');
  const password = validatePassword(body.password, 'Email and password are required');

  return { email, password };
};

const validateDeliveryLoginInput = (body = {}) => {
  if (typeof body.phone !== 'string') {
    throw badRequest('Delivery phone and password are required');
  }

  const password = validatePassword(body.password, 'Delivery phone and password are required');
  const phone = body.phone
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '');

  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw badRequest('Enter a valid 10-digit delivery phone');
  }

  return { phone, password };
};

const validateForgotPasswordInput = (body = {}) => ({
  email: validateEmail(body.email),
});

const validateResetPasswordInput = (body = {}) => {
  const email = validateEmail(body.email);
  const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
  const newPassword = validatePassword(body.newPassword, 'New password is required');

  if (!/^\d{6}$/.test(otp)) {
    throw badRequest('Enter a valid 6-digit OTP');
  }
  if (newPassword.length < 6) {
    throw badRequest('Password must be at least 6 characters');
  }

  return { email, otp, newPassword };
};

const validateName = (value) => {
  if (typeof value !== 'string') {
    throw badRequest('Please enter your full name');
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 100) {
    throw badRequest('Name must be between 2 and 100 characters');
  }
  return name;
};

const validatePhone = (value) => {
  if (typeof value !== 'string') {
    throw badRequest('Please enter a valid 10-digit phone number');
  }
  const mobile = value
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw badRequest('Please enter a valid 10-digit phone number');
  }
  return mobile;
};

const validateOtp = (value) => {
  const otp = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{6}$/.test(otp)) {
    throw badRequest('Enter a valid 6-digit OTP');
  }
  return otp;
};

const validateRegistrationInput = (body = {}) => {
  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const mobile = validatePhone(body.phone ?? body.mobile);
  const password = validatePassword(body.password, 'Password is required');
  if (password.length < 6) {
    throw badRequest('Password must be at least 6 characters');
  }
  return { name, email, mobile, password };
};

const validateRegistrationEmailInput = (body = {}) => ({
  email: validateEmail(body.email),
});

const validateRegistrationVerificationInput = (body = {}) => ({
  email: validateEmail(body.email),
  otp: validateOtp(body.otp),
});

const validateLegacyRegistrationInput = (body = {}) => ({
  ...validateRegistrationInput(body),
  otp: validateOtp(body.otp),
});

module.exports = {
  MAX_PASSWORD_LENGTH,
  validateDeliveryLoginInput,
  validateForgotPasswordInput,
  validateLegacyRegistrationInput,
  validateRegistrationEmailInput,
  validateRegistrationInput,
  validateRegistrationVerificationInput,
  validateResetPasswordInput,
  validateUserLoginInput,
};
