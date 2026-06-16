import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://44.212.49.157:5000/api";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem("adminToken");
  const userToken =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const token = adminToken || userToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;