import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { authStorage } from "../utils/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await authStorage.getItem("auth_token");
        const cached = await authStorage.getItem("auth_user");
        if (!token) return;
        if (cached) setUser(JSON.parse(cached));
        const { data } = await api.get("/auth/me");
        setUser(data.user);
        await authStorage.setItem("auth_user", JSON.stringify(data.user));
      } catch {
        await authStorage.removeItem("auth_token");
        await authStorage.removeItem("auth_user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistSession = async (data) => {
    await authStorage.setItem("auth_token", data.token);
    await authStorage.setItem("auth_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
    if (data.user?.role !== "user") throw new Error("Please use a customer account in this app.");
    await persistSession(data);
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register-app", { name: name.trim(), email: email.trim().toLowerCase(), password });
    await persistSession(data);
  };

  const logout = async () => {
    await authStorage.removeItem("auth_token");
    await authStorage.removeItem("auth_user");
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
