import axios from "axios";
import { Platform } from "react-native";
import { authStorage } from "../utils/authStorage";

const platformFallback = Platform.OS === "web"
  ? "http://localhost:5000/api"
  : "http://10.0.2.2:5000/api";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || platformFallback;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await authStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const messageFromError = (error, fallback = "Something went wrong. Please try again.") => {
  if (error.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (!error.response) return "Unable to connect. Check your internet connection and API URL.";
  return error.response?.data?.message || fallback;
};
