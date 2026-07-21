const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

const text = (value, label, { required = false, maxLength = 200 } = {}) => {
  if (value == null || value === "") {
    if (required) throw badRequest(`${label} is required`);
    return "";
  }
  if (typeof value !== "string") throw badRequest(`${label} must be text`);
  const normalized = value.trim();
  if (required && !normalized) throw badRequest(`${label} is required`);
  if (normalized.length > maxLength) throw badRequest(`${label} is too long`);
  return normalized;
};

const normalizePaymentMethod = (value) => {
  if (value != null && typeof value !== "string") throw badRequest("Invalid payment method");
  const method = String(value || "COD").trim().toLowerCase();
  if (["cod", "cash", "cash_on_delivery", "cash on delivery"].includes(method)) return "COD";
  if (["razorpay", "online", "upi", "card"].includes(method)) return "Razorpay";
  throw badRequest("Invalid payment method");
};

const normalizeAddress = (value, customerLocation) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw badRequest("A complete delivery address is required");
  }
  const normalized = {
    name: text(value.name, "Recipient name", { maxLength: 120 }) || "Customer",
    phone: text(value.phone, "Phone", { maxLength: 18 }).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
    street: text(value.street ?? value.address, "Street address", { required: true, maxLength: 300 }),
    city: text(value.city, "City", { maxLength: 100 }),
    state: text(value.state, "State", { maxLength: 100 }),
    pincode: text(value.pincode ?? value.pinCode, "PIN code", { maxLength: 6 }),
  };
  if (normalized.street.length < 5) throw badRequest("A complete delivery address is required");
  if (normalized.phone && !/^[6-9]\d{9}$/.test(normalized.phone)) throw badRequest("Enter a valid 10-digit delivery phone");
  if (normalized.pincode && !/^\d{6}$/.test(normalized.pincode)) throw badRequest("Enter a valid 6-digit PIN code");
  if (!normalized.city && !normalized.pincode && !customerLocation) {
    throw badRequest("Please add city, PIN code, or use current location for delivery");
  }
  return normalized;
};

const normalizeCustomerLocation = (value) => {
  if (value == null || value === "") return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw badRequest("Customer location is invalid");
  const latitude = Number(value.latitude ?? value.lat);
  const longitude = Number(value.longitude ?? value.lng);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw badRequest("Customer location is invalid");
  }
  return { latitude, longitude };
};

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || !items.length) throw badRequest("Order items are required");
  if (items.length > 100) throw badRequest("An order cannot contain more than 100 product lines");
  const seen = new Set();
  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.productId !== "string") {
      throw badRequest("Every order item must contain a valid product ID");
    }
    const productId = item.productId.trim();
    if (!productId) throw badRequest("Every order item must contain a valid product ID");
    if (seen.has(productId)) throw badRequest("Duplicate product lines are not allowed");
    seen.add(productId);
    const quantity = Number(item.quantity);
    if ((typeof item.quantity !== "number" && typeof item.quantity !== "string") || item.quantity === "" || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      throw badRequest("Product quantity must be a positive whole number");
    }
    return { productId, quantity };
  });
};

const normalizeCouponCode = (value) => {
  if (value == null || value === "") return "";
  if (typeof value !== "string") throw badRequest("Coupon code must be text");
  return value.trim().toUpperCase().slice(0, 40);
};

const ADMIN_STATUS_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Preparing", "Cancelled"],
  Preparing: ["Cancelled"],
  "Picked Up": [],
  "Out for Delivery": [],
  Delivered: [],
  Cancelled: [],
};

const canAdminTransition = (currentStatus, nextStatus) => (
  Boolean(ADMIN_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus))
);

const canDeliveryTransition = (currentStatus, nextStatus) => (
  (nextStatus === "Picked Up" && ["Confirmed", "Preparing"].includes(currentStatus)) ||
  (nextStatus === "Out for Delivery" && currentStatus === "Picked Up")
);

module.exports = {
  ADMIN_STATUS_TRANSITIONS,
  canAdminTransition,
  canDeliveryTransition,
  normalizeAddress,
  normalizeCouponCode,
  normalizeCustomerLocation,
  normalizeOrderItems,
  normalizePaymentMethod,
};
