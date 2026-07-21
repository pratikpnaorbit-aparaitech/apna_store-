const mongoose = require("mongoose");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIAN_PHONE = /^[6-9]\d{9}$/;

function text(value, field, { required = false, max = 160 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw inputError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw inputError(`${field} must be text`);
  const cleaned = value.trim();
  if (required && !cleaned) throw inputError(`${field} is required`);
  if (cleaned.length > max) throw inputError(`${field} is too long`);
  return cleaned || undefined;
}

function email(value, { required = false } = {}) {
  const cleaned = text(value, "Email", { required, max: 254 });
  if (cleaned && !EMAIL.test(cleaned)) throw inputError("A valid email is required");
  return cleaned?.toLowerCase();
}

function phone(value, { required = false } = {}) {
  const raw = text(value, "Phone number", { required, max: 24 });
  if (!raw) return undefined;
  const normalized = raw.replace(/[\s-]/g, "");
  if (!INDIAN_PHONE.test(normalized)) throw inputError("A valid 10-digit Indian phone number is required");
  return normalized;
}

function boolean(value, field) {
  if (typeof value !== "boolean") throw inputError(`${field} must be true or false`);
  return value;
}

function money(value, field = "Amount") {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || Math.round(number * 100) !== number * 100) {
    throw inputError(`${field} must be a valid non-negative amount`);
  }
  return number;
}

function objectId(value, field) {
  if (!mongoose.isValidObjectId(value)) throw inputError(`A valid ${field} is required`);
  return String(value);
}

function inputError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

module.exports = { text, email, phone, boolean, money, objectId, inputError };
