import axios from "axios";

import { getStoredToken } from "../services/sessionStorage";

const api = axios.create({
  baseURL: "https://stay.dovail.com/api",
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

export default api;
