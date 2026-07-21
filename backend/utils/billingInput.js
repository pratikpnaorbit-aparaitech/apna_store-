const mongoose = require("mongoose");

const inputError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const normalizePhone = (value) => {
  if (value == null || value === "") return "";
  if (typeof value !== "string" && typeof value !== "number")
    throw inputError("Customer phone must be a 10-digit number");
  const digits = String(value).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits))
    throw inputError("Customer phone must be a valid 10-digit number");
  return digits;
};

const normalizeBillingItems = (items) => {
  if (!Array.isArray(items) || !items.length) throw inputError("Cart is empty");
  if (items.length > 100) throw inputError("A bill cannot contain more than 100 product lines");
  const seen = new Set();
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.productId !== "string")
      throw inputError("Every bill item must contain a valid product ID");
    const productId = item.productId.trim();
    if (!mongoose.isValidObjectId(productId)) throw inputError("Every bill item must contain a valid product ID");
    if (seen.has(productId)) throw inputError("Duplicate product lines are not allowed");
    seen.add(productId);
    const qty = Number(item.qty);
    if ((typeof item.qty !== "number" && typeof item.qty !== "string") || item.qty === "" || !Number.isInteger(qty) || qty < 1 || qty > 100000)
      throw inputError("Product quantity must be a positive whole number");
    return { productId, qty };
  });
};

const normalizeNewCustomer = (value, required) => {
  if (value == null && !required) return null;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw inputError("New customer details are invalid");
  if (typeof value.name !== "string") throw inputError("Customer name must be text");
  const name = value.name.trim();
  if (required && (name.length < 2 || name.length > 120))
    throw inputError("Customer name must be between 2 and 120 characters");
  let email = "";
  if (value.email != null && value.email !== "") {
    if (typeof value.email !== "string") throw inputError("Customer email must be text");
    email = value.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw inputError("Enter a valid customer email");
  }
  return { name, email };
};

const validateBillingInput = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw inputError("Invalid billing request");
  if (typeof body.paymentMode !== "string") throw inputError("Choose a valid payment mode");
  const paymentMode = body.paymentMode.trim().toUpperCase();
  if (!["CASH", "UPI", "CARD", "WALLET"].includes(paymentMode))
    throw inputError("Choose a valid payment mode");
  if (body.joinLoyalty != null && typeof body.joinLoyalty !== "boolean")
    throw inputError("Loyalty selection must be true or false");
  const joinLoyalty = body.joinLoyalty === true;
  const phone = normalizePhone(body.phone);
  if (joinLoyalty && !phone) throw inputError("A phone number is required to join loyalty");
  const newCustomer = normalizeNewCustomer(body.newCustomer, joinLoyalty);
  let cashReceived = null;
  if (paymentMode === "CASH") {
    if ((typeof body.cashReceived !== "number" && typeof body.cashReceived !== "string") || body.cashReceived === "")
      throw inputError("Cash received is required");
    cashReceived = Number(body.cashReceived);
    if (!Number.isFinite(cashReceived) || cashReceived < 0 || cashReceived > 100000000)
      throw inputError("Cash received is invalid");
  }
  let storeId = "";
  if (body.storeId != null && body.storeId !== "") {
    if (typeof body.storeId !== "string" || !mongoose.isValidObjectId(body.storeId.trim()))
      throw inputError("Choose a valid store");
    storeId = body.storeId.trim();
  }
  return {
    paymentMode,
    items: normalizeBillingItems(body.items),
    phone,
    joinLoyalty,
    newCustomer,
    cashReceived,
    storeId,
  };
};

module.exports = { normalizeBillingItems, normalizePhone, validateBillingInput };
