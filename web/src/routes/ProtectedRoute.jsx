import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const userRaw =
    localStorage.getItem("user") || sessionStorage.getItem("user");

  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (token && user?.id) return children;
  } catch {
    // Corrupt or stale session data is treated as signed out.
  }

  return <Navigate to="/login" replace state={{ from: location }} />;
}
