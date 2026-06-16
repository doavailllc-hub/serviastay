import { Navigate } from "react-router-dom";

export default function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("adminToken");
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

  if (!token || !adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  if (adminUser.role !== "admin") {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}