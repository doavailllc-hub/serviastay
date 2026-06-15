import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  Home,
  LogOut,
  Menu,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

import logo from "../assets/logo.png";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const links = [
    { to: "/admin", label: "Dashboard", icon: <Shield size={20} />, end: true },
    { to: "/admin/analytics", label: "Analytics", icon: <BarChart3 size={20} /> },
    { to: "/admin/users", label: "Users", icon: <Users size={20} /> },
    { to: "/admin/properties", label: "Properties", icon: <Home size={20} /> },
    { to: "/admin/bookings", label: "Bookings", icon: <CalendarDays size={20} /> },
    { to: "/admin/payments", label: "Payments", icon: <Wallet size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7FA]">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-72 border-r border-gray-200 bg-white lg:block">
        <AdminSidebar links={links} logout={logout} user={user} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <img src={logo} alt="Servia Stay" className="h-9 w-auto" />

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <AdminSidebar
              links={links}
              logout={logout}
              user={user}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-gray-200 p-2 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Admin Panel
              </h1>

              <p className="text-sm text-gray-500">
                Manage Servia Stay platform
              </p>
            </div>
          </div>

          <Link
            to="/home"
            className="hidden rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 md:block"
          >
            View Website
          </Link>
        </header>

        <main className="px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminSidebar({ links, logout, user, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-6">
        <Link to="/admin" onClick={onNavigate}>
          <img src={logo} alt="Servia Stay" className="h-10 w-auto" />
        </Link>

        <div className="mt-6 rounded-2xl bg-[#F4F1FF] p-4">
          <p className="text-sm font-bold text-gray-900">
            {user?.fullname || "Admin"}
          </p>
          <p className="mt-1 truncate text-xs text-gray-500">
            {user?.email}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-[#8363F5] px-3 py-1 text-xs font-bold text-white">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#8363F5] text-white shadow-md"
                  : "text-gray-600 hover:bg-[#F4F1FF] hover:text-[#8363F5]"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}