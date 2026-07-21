import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setUnauthorizedHandler } from "../api/client";
import { authStorage } from "../utils/authStorage";
import { isKnownRole, USER_ACCOUNT_ROLES } from "../navigation/roleConfig";

const AuthContext = createContext(null);

const normalizeDeliveryPartner = (partner = {}) => ({
  id: partner.id || partner._id,
  _id: partner._id || partner.id,
  name: partner.name,
  phone: partner.phone,
  email: partner.email,
  vehicleType: partner.vehicleType,
  vehicleNumber: partner.vehicleNumber,
  storeId: partner.storeId,
  isAvailable: partner.isAvailable,
  role: "delivery_partner",
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEpoch, setAuthEpoch] = useState(0);
  const [pendingIntent, setPendingIntent] = useState(null);

  const clearSession = useCallback(async ({ markLoggedOut = true } = {}) => {
    const authKeysToClear = [
      "auth_token",
      "auth_user",
      "user_role",
      "role",
      "session_role",
      "delivery_partner",
      "delivery_partner_user",
      "delivery_partner_token",
      "delivery_token",
    ];
    const asyncKeysToClear = ["smartstore_addresses_v1"];

    delete api.defaults.headers.common.Authorization;
    setUser(null);
    setPendingIntent(null);
    if (markLoggedOut) setAuthEpoch((value) => value + 1);

    await Promise.all([
      ...authKeysToClear.map((key) => authStorage.removeItem(key).catch(() => null)),
      ...asyncKeysToClear.map((key) => AsyncStorage.removeItem(key).catch(() => null)),
    ]);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession({ markLoggedOut: true }));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    (async () => {
      try {
        const token = await authStorage.getItem("auth_token");
        const cached = await authStorage.getItem("auth_user");
        if (!token) return;
        const cachedUser = cached ? JSON.parse(cached) : null;
        if (cachedUser && isKnownRole(cachedUser.role)) setUser(cachedUser);

        if (cachedUser?.role === "delivery_partner") {
          const { data } = await api.get("/delivery-partners/me");
          const currentPartner = normalizeDeliveryPartner(data.partner);
          setUser(currentPartner);
          await authStorage.setItem("auth_user", JSON.stringify(currentPartner));
          return;
        }

        const { data } = await api.get("/auth/me");
        if (!USER_ACCOUNT_ROLES.includes(data.user?.role)) throw new Error("Unsupported account role");
        setUser(data.user);
        await authStorage.setItem("auth_user", JSON.stringify(data.user));
      } catch {
        await clearSession({ markLoggedOut: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = useCallback(async (data, sessionUser = data.user) => {
    if (!data.token || !sessionUser || !isKnownRole(sessionUser.role)) {
      throw new Error("The server returned an unsupported account session.");
    }
    await authStorage.setItem("auth_token", data.token);
    await authStorage.setItem("auth_user", JSON.stringify(sessionUser));
    await authStorage.setItem("user_role", sessionUser?.role || "user");
    await authStorage.setItem("role", sessionUser?.role || "user");
    setAuthEpoch((value) => value + 1);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const loginDelivery = useCallback(async (phone, password) => {
    const { data } = await api.post("/delivery-partners/login", { phone: phone.trim(), password });
    if (!data.token || !data.partner) throw new Error("Delivery login failed. Please try again.");
    return persistSession(data, normalizeDeliveryPartner(data.partner));
  }, [persistSession]);

  const login = useCallback(async (identifier, password) => {
    const normalized = String(identifier || "").trim();
    if (normalized.includes("@")) {
      const { data } = await api.post("/auth/login", {
        email: normalized.toLowerCase(),
        password,
      });
      if (!USER_ACCOUNT_ROLES.includes(data.user?.role)) {
        throw new Error("This account role is not supported.");
      }
      return persistSession(data, data.user);
    }

    const phone = normalized.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    return loginDelivery(phone, password);
  }, [loginDelivery, persistSession]);

  const sendRegistrationOtp = async ({ name, email, phone, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { data } = await api.post("/auth/send-registration-otp", {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        password,
      });
      return data;
    } catch (error) {
      const routeIsMissing =
        error.response?.status === 404 &&
        /route not found/i.test(String(error.response?.data?.message || ""));
      if (!routeIsMissing) throw error;
      const { data } = await api.post("/auth/registration-otp", {
        email: normalizedEmail,
      });
      return data;
    }
  };

  const verifyRegistrationOtp = async ({ name, email, phone, password }, otp) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = String(otp).trim();
    try {
      const { data } = await api.post("/auth/verify-registration-otp", {
        email: normalizedEmail,
        otp: normalizedOtp,
      });
      await persistSession(data, data.user);
      return data;
    } catch (error) {
      const routeIsMissing =
        error.response?.status === 404 &&
        /route not found/i.test(String(error.response?.data?.message || ""));
      if (!routeIsMissing) throw error;
      await api.post("/auth/register-user", {
        name: name.trim(),
        email: normalizedEmail,
        mobile: phone.trim(),
        password,
        otp: normalizedOtp,
      });
      const { data } = await api.post("/auth/login", {
        email: normalizedEmail,
        password,
      });
      await persistSession(data, data.user);
      return data;
    }
  };

  const logout = async () => {
    await clearSession({ markLoggedOut: true });
  };

  const requestAuthentication = useCallback((intent) => {
    if (!intent?.name) return;
    setPendingIntent({ name: intent.name, params: intent.params });
  }, []);

  const clearPendingIntent = useCallback(() => setPendingIntent(null), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authEpoch,
      pendingIntent,
      login,
      loginDelivery,
      sendRegistrationOtp,
      verifyRegistrationOtp,
      logout,
      requestAuthentication,
      clearPendingIntent,
    }),
    [authEpoch, clearPendingIntent, login, loginDelivery, loading, pendingIntent, requestAuthentication, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
