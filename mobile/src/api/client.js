import axios from "axios";
import { Platform } from "react-native";
import { authStorage } from "../utils/authStorage";

export const PRODUCTION_API_URL = "https://apna-store-ol1t.onrender.com/api";

const normalizeApiUrl = (value) => String(value || "").trim().replace(/\/+$/, "");
const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
const configuredApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const resolvedApiUrl = configuredApiUrl || PRODUCTION_API_URL;

if (!resolvedApiUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required for Smart Store mobile builds.");
}

if (!isDevelopment && /(?:localhost|127\.0\.0\.1|10\.0\.2\.2|loca\.lt)/i.test(resolvedApiUrl)) {
  throw new Error(`Invalid production API URL: ${resolvedApiUrl}`);
}

if (isDevelopment && !configuredApiUrl && Platform.OS !== "web") {
  console.warn(`EXPO_PUBLIC_API_URL is not set. Using production API: ${PRODUCTION_API_URL}`);
}

export const API_URL = resolvedApiUrl;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

api.interceptors.request.use(async (config) => {
  const token = await authStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    if ((status === 401 || status === 403) && hadAuthHeader && !error.config?._handledAuthFailure) {
      error.config._handledAuthFailure = true;
      if (unauthorizedHandler) await unauthorizedHandler();
    }
    return Promise.reject(error);
  },
);

export const messageFromError = (error, fallback = "Something went wrong. Please try again.") => {
  if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (!error.response) return "Unable to connect. Check your internet connection and API URL.";
  return error.response?.data?.message || fallback;
};
