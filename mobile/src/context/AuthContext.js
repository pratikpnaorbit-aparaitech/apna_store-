import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setUnauthorizedHandler } from "../api/client";
import { authStorage } from "../utils/authStorage";

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

  const clearSession = async ({ markLoggedOut = true } = {}) => {
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
    const asyncKeysToClear = [
      "smartstore_cart_v1",
      "smartstore_addresses_v1",
    ];

    delete api.defaults.headers.common.Authorization;
    setUser(null);
    if (markLoggedOut) setAuthEpoch((value) => value + 1);

    await Promise.all([
      ...authKeysToClear.map((key) => authStorage.removeItem(key).catch(() => null)),
      ...asyncKeysToClear.map((key) => AsyncStorage.removeItem(key).catch(() => null)),
    ]);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession({ markLoggedOut: true }));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await authStorage.getItem("auth_token");
        const cached = await authStorage.getItem("auth_user");
        if (!token) return;
        const cachedUser = cached ? JSON.parse(cached) : null;
        if (cachedUser) setUser(cachedUser);

        if (cachedUser?.role === "delivery_partner") {
          await api.get("/delivery-partners/my-orders");
          setUser(cachedUser);
          return;
        }

        const { data } = await api.get("/auth/me");
        setUser(data.user);
        await authStorage.setItem("auth_user", JSON.stringify(data.user));
      } catch {
        await clearSession({ markLoggedOut: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = async (data, sessionUser = data.user) => {
    await authStorage.setItem("auth_token", data.token);
    await authStorage.setItem("auth_user", JSON.stringify(sessionUser));
    await authStorage.setItem("user_role", sessionUser?.role || "user");
    await authStorage.setItem("role", sessionUser?.role || "user");
    setAuthEpoch((value) => value + 1);
    setUser(sessionUser);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
    if (data.user?.role !== "user") throw new Error("Please use a customer account in this app.");
    await persistSession(data, data.user);
  };

  const loginDelivery = async (phone, password) => {
    const { data } = await api.post("/delivery-partners/login", { phone: phone.trim(), password });
    if (!data.token || !data.partner) throw new Error("Delivery login failed. Please try again.");
    await persistSession(data, normalizeDeliveryPartner(data.partner));
  };

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

  const value = useMemo(
    () => ({ user, loading, authEpoch, login, loginDelivery, sendRegistrationOtp, verifyRegistrationOtp, logout }),
    [user, loading, authEpoch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
