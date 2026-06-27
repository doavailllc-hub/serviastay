import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: <LayoutDashboard size={19} /> },
  { label: "Users", path: "/admin/users", icon: <Users size={19} /> },
  { label: "KYC", path: "/admin/kyc", icon: <ShieldCheck size={19} /> },
  { label: "Properties", path: "/admin/properties", icon: <Building2 size={19} /> },
  { label: "Bookings", path: "/admin/bookings", icon: <CalendarDays size={19} /> },
  { label: "Payments", path: "/admin/payments", icon: <CreditCard size={19} /> },
  { label: "Coupons", path: "/admin/coupons", icon: <Tag size={19} /> },
  { label: "Reviews", path: "/admin/reviews", icon: <MessageSquare size={19} /> },
  { label: "Analytics", path: "/admin/analytics", icon: <BarChart3 size={19} /> },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "null");

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] text-gray-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-100 px-5">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[3b71e6] text-white shadow-sm">
              <ShieldCheck size={23} />
            </div>

            <div className="text-left">
              <h1 className="text-base font-bold tracking-tight">
                Dovail Admin
              </h1>
              <p className="text-xs font-medium text-gray-500">
                Control center
              </p>
            </div>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[3b71e6] text-white shadow-sm"
                    : "text-gray-600 hover:bg-[#F4F0FF] hover:text-[3b71e6]"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => navigate("/")}
            className="mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            <Home size={19} />
            View Website
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="text-lg font-bold tracking-tight md:text-xl">
                Admin Dashboard
              </h2>
              <p className="text-sm text-gray-500">
                Manage your Dovail Stay platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-[#F4F0FF] hover:text-[3b71e6]">
              <Settings size={19} />
            </button>

            <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white py-1.5 pl-2 pr-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[3b71e6] text-sm font-bold text-white">
                {adminUser?.fullname?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div>
                <p className="text-sm font-semibold leading-4">
                  {adminUser?.fullname || "Admin"}
                </p>
                <p className="text-xs text-gray-500">
                  {adminUser?.email || "admin"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)] p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}