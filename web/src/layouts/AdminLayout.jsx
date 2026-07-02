import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Home,
  LayoutDashboard,
  Landmark,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
  X,
} from "lucide-react";

const menuSections = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Properties", path: "/admin/properties", icon: Building2 },
      { label: "Bookings", path: "/admin/bookings", icon: CalendarDays },
      { label: "Reviews", path: "/admin/reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Verification",
    items: [
      { label: "KYC Queue", path: "/admin/kyc", icon: ShieldCheck },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Finance Center", path: "/admin/finance", icon: Landmark },
      { label: "Payments", path: "/admin/payments", icon: CreditCard },
      { label: "Payouts", path: "/admin/payouts", icon: Wallet },
    ],
  },
  {
    title: "Support & Growth",
    items: [
      { label: "Support", path: "/admin/support", icon: MessageSquare },
      { label: "Coupons", path: "/admin/coupons", icon: Tag },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
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
    <div className="min-h-screen bg-white text-gray-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/25 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-18 items-center justify-between border-b border-gray-200 px-4 py-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
              <ShieldCheck size={21} />
            </div>

            <div className="text-left">
              <h1 className="text-sm font-semibold tracking-tight text-gray-950">
                Dovail Admin
              </h1>
              <p className="text-xs text-gray-500">Control center</p>
            </div>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

     <nav className="flex-1 overflow-y-auto px-3 py-4">
  {menuSections.map((section) => (
    <div key={section.title} className="mb-5">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
        {section.title}
      </p>

      <div className="space-y-1">
        {section.items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#eef4ff] text-[#3b71e6]"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  ))}
</nav>

        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
          >
            <Home size={18} />
            View website
          </button>

          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h2 className="text-base font-semibold tracking-tight text-gray-950">
                Admin
              </h2>
              <p className="text-xs text-gray-500">
                Manage Dovail Stay platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-semibold text-[#3b71e6]">
                {adminUser?.fullname?.charAt(0)?.toUpperCase() || "A"}
              </div>

              <div>
                <p className="text-sm font-medium leading-4 text-gray-950">
                  {adminUser?.fullname || "Admin"}
                </p>
                <p className="text-xs text-gray-500">
                  {adminUser?.email || "admin"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] bg-white p-4 md:p-6">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}