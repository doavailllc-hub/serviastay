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
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: <Users size={20} />,
  },
  {
    label: "Properties",
    path: "/admin/properties",
    icon: <Building2 size={20} />,
  },
  {
    label: "Bookings",
    path: "/admin/bookings",
    icon: <CalendarDays size={20} />,
  },
  {
    label: "Payments",
    path: "/admin/payments",
    icon: <CreditCard size={20} />,
  },
    {
    label: "Reviews",
    path: "/admin/reviews",
    icon: <MessageSquare size={20} />,
  },
  {
    label: "Analytics",
    path: "/admin/analytics",
    icon: <BarChart3 size={20} />,
  },
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
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-100 px-6">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8363F5] text-white">
              <ShieldCheck size={25} />
            </div>

            <div className="text-left">
              <h1 className="text-lg font-black text-gray-900">
                Servia Admin
              </h1>
              <p className="text-xs font-medium text-gray-500">
                Control Center
              </p>
            </div>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 hover:bg-gray-100 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  isActive
                    ? "bg-[#8363F5] text-white shadow-lg shadow-purple-100"
                    : "text-gray-600 hover:bg-[#F4F1FF] hover:text-[#8363F5]"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            onClick={() => navigate("/")}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            <Home size={20} />
            View Website
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="text-xl font-black text-gray-900">
                Admin Dashboard
              </h2>
              <p className="text-sm text-gray-500">
                Manage your Servia Stay platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-[#F4F1FF] hover:text-[#8363F5]">
              <Settings size={20} />
            </button>

            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8363F5] text-sm font-black text-white">
                {adminUser?.fullname?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div>
                <p className="text-sm font-bold">
                  {adminUser?.fullname || "Admin"}
                </p>
                <p className="text-xs text-gray-500">
                  {adminUser?.email || "admin"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)] p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}