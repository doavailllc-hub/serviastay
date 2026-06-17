import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const userRaw =
    localStorage.getItem("user") || sessionStorage.getItem("user");

  let user = null;

  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }

  if (!token || !user?.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}