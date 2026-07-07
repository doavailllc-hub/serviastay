import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const url = config.url || "";

  const isAdminApi =
    url.startsWith("/admin") || url.includes("/api/admin");

  const adminToken = localStorage.getItem("adminToken");
  const userToken =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const token = isAdminApi ? adminToken : userToken;

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;