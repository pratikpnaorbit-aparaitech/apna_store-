export const ROLES = Object.freeze({
  USER: "user",
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  STAFF: "staff",
  DELIVERY_PARTNER: "delivery_partner",
});

export const USER_ACCOUNT_ROLES = Object.freeze([
  ROLES.USER,
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.STAFF,
]);

export const ROLE_LABELS = Object.freeze({
  [ROLES.USER]: "Customer",
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ADMIN]: "Store Admin",
  [ROLES.STAFF]: "Store Staff",
  [ROLES.DELIVERY_PARTNER]: "Delivery Partner",
});

const permissions = Object.freeze({
  [ROLES.USER]: ["browse", "checkout", "orders", "profile", "addresses"],
  [ROLES.SUPER_ADMIN]: ["dashboard", "users", "stores", "inventory", "orders", "delivery", "reports", "support"],
  [ROLES.ADMIN]: ["dashboard", "inventory", "orders", "billing", "customers", "staff", "suppliers", "reports"],
  [ROLES.STAFF]: ["dashboard", "inventory.read", "billing", "customers"],
  [ROLES.DELIVERY_PARTNER]: ["deliveries", "location", "delivery_otp"],
});

export const isKnownRole = (role) => Object.values(ROLES).includes(role);
export const hasPermission = (role, permission) => permissions[role]?.includes(permission) || false;
