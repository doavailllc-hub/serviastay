import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Home,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import api from "../../api/api";

const BRAND = "#3b71e6";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = JSON.parse(localStorage.getItem("adminUser") || "null");
      const token = localStorage.getItem("adminToken");

      if (!storedUser || !token) {
        navigate("/admin/login");
        return;
      }

      if (storedUser.role !== "admin") {
        navigate("/admin/login");
        return;
      }

      const [statsRes, usersRes, propertiesRes, bookingsRes] =
        await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/users"),
          api.get("/admin/properties"),
          api.get("/admin/bookings"),
        ]);

      setStats(statsRes.data || {});
      setUsers(usersRes.data || []);
      setProperties(propertiesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.log("Admin dashboard load failed:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/admin/login");
        return;
      }

      setError("Admin dashboard failed to load.");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      loadAdminData();
    } catch (err) {
      console.log("Role update failed:", err);
      alert("Role update failed");
    }
  };

  const deleteProperty = async (propertyId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this property?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/admin/properties/${propertyId}`);
      loadAdminData();
    } catch (err) {
      console.log("Property delete failed:", err);
      alert("Property delete failed");
    }
  };

  const statCards = useMemo(
    () => [
      {
        title: "Users",
        value: stats?.totalUsers || 0,
        icon: <Users size={18} />,
      },
      {
        title: "Listings",
        value: stats?.totalProperties || 0,
        icon: <Home size={18} />,
      },
      {
        title: "Bookings",
        value: stats?.totalBookings || 0,
        icon: <CalendarDays size={18} />,
      },
      {
        title: "Revenue",
        value: formatINR(stats?.totalRevenue || 0),
        icon: <Wallet size={18} />,
      },
    ],
    [stats]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-950">
        <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          <LoadingState />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Admin</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage users, listings, bookings and platform revenue.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mb-8 grid gap-4 md:grid-cols-4">
          {statCards.map((item) => (
            <StatCard key={item.title} item={item} />
          ))}
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
            Overview
          </TabButton>

          <TabButton active={tab === "users"} onClick={() => setTab("users")}>
            Users
          </TabButton>

          <TabButton
            active={tab === "properties"}
            onClick={() => setTab("properties")}
          >
            Properties
          </TabButton>

          <TabButton
            active={tab === "bookings"}
            onClick={() => setTab("bookings")}
          >
            Bookings
          </TabButton>
        </div>

        {tab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <Panel
              title="Recent bookings"
              description="Latest reservations across the platform."
            >
              {bookings.length === 0 ? (
                <Empty text="No bookings yet." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {bookings.slice(0, 5).map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold tracking-tight text-gray-950">
                  Quick actions
                </h2>

                <div className="mt-5 space-y-3">
                  <QuickButton onClick={() => setTab("users")}>
                    Manage users
                  </QuickButton>

                  <QuickButton onClick={() => setTab("properties")} secondary>
                    Review listings
                  </QuickButton>

                  <QuickButton onClick={() => setTab("bookings")} secondary>
                    View bookings
                  </QuickButton>
                </div>
              </section>

              <section className="rounded-2xl border border-blue-200 bg-[#eef4ff] p-5">
                <Shield className="mb-3 text-[#3b71e6]" size={20} />

                <h3 className="text-sm font-semibold text-gray-950">
                  Admin access
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Only users with admin role can access this dashboard.
                </p>
              </section>
            </aside>
          </div>
        )}

        {tab === "users" && (
          <Panel title="Users" description="Manage user roles and account access.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-5 py-4 font-medium">User</th>
                    <th className="px-5 py-4 font-medium">Email</th>
                    <th className="px-5 py-4 font-medium">Phone</th>
                    <th className="px-5 py-4 font-medium">Role</th>
                    <th className="px-5 py-4 font-medium">Change role</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm font-medium text-gray-950">
                        {user.fullname || "User"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {user.email || "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {user.phone || "-"}
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={user.role || "guest"}
                          onChange={(e) =>
                            updateUserRole(user.id, e.target.value)
                          }
                          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                        >
                          <option value="guest">guest</option>
                          <option value="host">host</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === "properties" && (
          <Panel title="Properties" description="Review and manage listed stays.">
            {properties.length === 0 ? (
              <Empty text="No properties found." />
            ) : (
              <div className="divide-y divide-gray-100">
                {properties.map((property) => (
                  <PropertyRow
                    key={property.id}
                    property={property}
                    formatINR={formatINR}
                    onDelete={() => deleteProperty(property.id)}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {tab === "bookings" && (
          <Panel title="Bookings" description="View all platform reservations.">
            {bookings.length === 0 ? (
              <Empty text="No bookings found." />
            ) : (
              <div className="divide-y divide-gray-100">
                {bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    formatINR={formatINR}
                    detailed
                  />
                ))}
              </div>
            )}
          </Panel>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-8 w-56 animate-pulse rounded-full bg-gray-100" />
        <div className="mt-4 h-4 w-96 animate-pulse rounded-full bg-gray-100" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>

      <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

function StatCard({ item }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
        {item.icon}
      </div>

      <p className="text-sm text-gray-500">{item.title}</p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        {item.value}
      </h2>
    </article>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-[#eef4ff] text-[#3b71e6]"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-xl font-semibold tracking-tight text-gray-950">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {children}
    </section>
  );
}

function BookingRow({ booking, formatINR, detailed }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {booking.image && (
          <img
            src={booking.image}
            alt={booking.property_title || "Booking"}
            className="h-14 w-14 rounded-xl object-cover"
          />
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            {booking.property_title || "Booking"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Guest: {booking.guest_name || "Guest"} · Host:{" "}
            {booking.host_name || "Host"}
          </p>

          {detailed && (
            <>
              <p className="mt-1 text-sm text-gray-500">
                {booking.checkin} - {booking.checkout} · {booking.guests} guests
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Payment: {booking.payment_method || "cash"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-950">
          {formatINR(booking.total)}
        </span>

        <StatusBadge status={booking.status} />
      </div>
    </div>
  );
}

function PropertyRow({ property, formatINR, onDelete }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={
            property.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"
          }
          alt={property.title || "Property"}
          className="h-16 w-16 rounded-xl object-cover"
        />

        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            {property.title || "Property"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {property.location || "Location unavailable"}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Host: {property.host_name || "Unknown"} · {property.host_email || ""}
          </p>

          <p className="mt-2 text-sm font-semibold text-gray-950">
            {formatINR(property.price)} / night
          </p>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <Trash2 size={16} />
        Delete
      </button>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center px-5 text-center">
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function QuickButton({ children, onClick, secondary }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 w-full rounded-xl text-sm font-medium transition ${
        secondary
          ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
          : "bg-[#3b71e6] text-white hover:bg-[#2f5fc2]"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const value = status || "Pending";

  const style =
    value === "Cancelled"
      ? "border-red-200 bg-red-50 text-red-600"
      : value === "Completed"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : value === "Confirmed"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-yellow-200 bg-yellow-50 text-yellow-700";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      {value}
    </span>
  );
}

function RoleBadge({ role }) {
  const value = role || "guest";

  const style =
    value === "admin"
      ? "border-red-200 bg-red-50 text-red-600"
      : value === "host"
      ? "border-blue-200 bg-[#eef4ff] text-[#3b71e6]"
      : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}>
      {value}
    </span>
  );
}