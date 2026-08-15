import axios from "axios";

import { getStoredToken } from "../services/sessionStorage";

const DEFAULT_API_URL = "https://stay.dovail.com/api";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_URL = (configuredApiUrl || DEFAULT_API_URL).replace(/\/$/, "");

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.userMessage =
        error.code === "ECONNABORTED"
          ? "The request timed out. Check your connection and try again."
          : "Unable to reach Dovail Stay. Check your connection and try again.";
    } else if (error.response.status >= 500) {
      error.userMessage = "Dovail Stay is temporarily unavailable. Please try again shortly.";
    } else {
      error.userMessage =
        error.response.data?.message || "The request could not be completed.";
    }

    return Promise.reject(error);
  }
);

export default api;
