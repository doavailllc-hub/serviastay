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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const requestUrl = error.config?.url || "";
    const isAuthRequest = requestUrl.includes("/auth/") || requestUrl.endsWith("/login");
    const hasUserSession = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (code === "SESSION_REVOKED" || (status === 401 && hasUserSession && !isAuthRequest)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      if (window.location.pathname !== "/login") {
        window.location.assign(`/login?expired=1&from=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
