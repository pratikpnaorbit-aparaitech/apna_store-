import axios from "axios";
import { clearAuthSession } from "./session";

export const apiBaseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const createClient = () => axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export const PUBLIC_API = createClient();

export const API = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export const DELIVERY_API = createClient();

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

DELIVERY_API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("dp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = String(error.response?.data?.message || "").toLowerCase();
    const tokenIsInvalid =
      status === 401 ||
      (status === 403 && (
        message.includes("invalid") ||
        message.includes("expired token") ||
        message.includes("account role changed")
      ));

    if (tokenIsInvalid) {
      const isLoginPage = window.location.pathname === "/login";
      if (!isLoginPage) {
        clearAuthSession();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
