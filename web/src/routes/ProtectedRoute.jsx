import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const user =
    localStorage.getItem("user") || sessionStorage.getItem("user");

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  return children;
}