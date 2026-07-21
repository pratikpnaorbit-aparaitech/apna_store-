export const AUTH_SESSION_KEYS = [
  "token",
  "user",
  "dp_token",
  "dp_user",
  "userLocation",
  "savedAddress",
];

// Keep guest shopping state (cart and favorites), but remove every credential
// and user-specific location value so a shared browser cannot reuse them.
export const clearAuthSession = (storage = globalThis.localStorage) => {
  if (!storage) return;
  AUTH_SESSION_KEYS.forEach((key) => storage.removeItem(key));
};
