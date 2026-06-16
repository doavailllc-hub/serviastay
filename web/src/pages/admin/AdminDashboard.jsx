import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Home,
  CalendarDays,
  Wallet,
  Shield,
  Trash2,
  RefreshCw,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadAdminData = async () => {
    try {
      setLoading(true);

    const storedUser = JSON.parse(localStorage.getItem("adminUser"));
const token = localStorage.getItem("adminToken");

      if (!storedUser || !token) {
        navigate("/");
        return;
      }

      if (storedUser.role !== "admin") {
        alert("Admin access only");
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

      setStats(statsRes.data);
      setUsers(usersRes.data || []);
      setProperties(propertiesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.log("Admin dashboard load failed:", err);

      if (err.response?.status === 403) {
        alert("Admin access only");
        navigate("/home");
        return;
      }

      alert("Admin dashboard failed to load");
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

  const statCards = [
    {
      title: "Users",
      value: stats?.totalUsers || 0,
      icon: <Users />,
      color: "text-[#8363F5]",
    },
    {
      title: "Listings",
      value: stats?.totalProperties || 0,
      icon: <Home />,
      color: "text-green-600",
    },
    {
      title: "Bookings",
      value: stats?.totalBookings || 0,
      icon: <CalendarDays />,
      color: "text-yellow-600",
    },
    {
      title: "Revenue",
      value: formatINR(stats?.totalRevenue || 0),
      icon: <Wallet />,
      color: "text-red-500",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading admin dashboard...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-gray-500">
              Control users, listings, bookings, revenue, and platform data.
            </p>
          </div>

          <button
            onClick={loadAdminData}
            className="flex items-center gap-2 rounded-xl bg-[#8363F5] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
                {item.icon}
              </div>

              <p className="font-medium text-gray-500">{item.title}</p>

              <h2 className={`mt-2 text-4xl font-bold ${item.color}`}>
                {item.value}
              </h2>
            </div>
          ))}
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            text="Overview"
          />

          <TabButton
            active={tab === "users"}
            onClick={() => setTab("users")}
            text="Users"
          />

          <TabButton
            active={tab === "properties"}
            onClick={() => setTab("properties")}
            text="Properties"
          />

          <TabButton
            active={tab === "bookings"}
            onClick={() => setTab("bookings")}
            text="Bookings"
          />
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b p-6">
                <h2 className="text-2xl font-semibold">Recent Bookings</h2>
              </div>

              {bookings.length === 0 ? (
                <Empty text="No bookings yet." />
              ) : (
                <div className="divide-y">
                  {bookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-3 p-6 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={
                            booking.image ||
                            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"
                          }
                          alt={booking.property_title}
                          className="h-16 w-16 rounded-2xl object-cover"
                        />

                        <div>
                          <h3 className="font-semibold">
                            {booking.property_title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Guest: {booking.guest_name || "Guest"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Host: {booking.host_name || "Host"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-bold text-[#8363F5]">
                          {formatINR(booking.total)}
                        </span>

                        <StatusBadge status={booking.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-semibold">Quick Actions</h2>

              <div className="space-y-3">
                <button
                  onClick={() => setTab("users")}
                  className="h-12 w-full rounded-xl bg-[#8363F5] font-semibold text-white hover:bg-[#7152E8]"
                >
                  Manage Users
                </button>

                <button
                  onClick={() => setTab("properties")}
                  className="h-12 w-full rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                >
                  Review Listings
                </button>

                <button
                  onClick={() => setTab("bookings")}
                  className="h-12 w-full rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                >
                  View Bookings
                </button>
              </div>

              <div className="mt-8 rounded-2xl bg-[#F4F1FF] p-5">
                <Shield className="mb-3 text-[#8363F5]" />

                <h3 className="font-bold">Admin Access</h3>

                <p className="mt-2 text-sm text-gray-600">
                  Only users with role admin can access this dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <Panel title="Users Management">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="border-b text-sm text-gray-500">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Change Role</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-semibold">
                        {user.fullname || "User"}
                      </td>

                      <td className="p-4 text-gray-600">{user.email}</td>

                      <td className="p-4 text-gray-600">
                        {user.phone || "-"}
                      </td>

                      <td className="p-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="p-4">
                        <select
                          value={user.role || "guest"}
                          onChange={(e) =>
                            updateUserRole(user.id, e.target.value)
                          }
                          className="rounded-xl border border-gray-300 px-4 py-2 outline-none"
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
          <Panel title="Properties Management">
            {properties.length === 0 ? (
              <Empty text="No properties found." />
            ) : (
              <div className="divide-y">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex flex-col gap-5 p-5 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex gap-4">
                      <img
                        src={
                          property.image ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"
                        }
                        alt={property.title}
                        className="h-24 w-24 rounded-2xl object-cover"
                      />

                      <div>
                        <h3 className="text-lg font-bold">
                          {property.title}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {property.location}
                        </p>

                        <p className="text-sm text-gray-500">
                          Host: {property.host_name || "Unknown"} ·{" "}
                          {property.host_email || ""}
                        </p>

                        <p className="mt-2 font-bold text-[#8363F5]">
                          {formatINR(property.price)} / night
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteProperty(property.id)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {tab === "bookings" && (
          <Panel title="Bookings Management">
            {bookings.length === 0 ? (
              <Empty text="No bookings found." />
            ) : (
              <div className="divide-y">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="font-bold">{booking.property_title}</h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Guest: {booking.guest_name || "Guest"} · Host:{" "}
                        {booking.host_name || "Host"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {booking.checkin} - {booking.checkout} ·{" "}
                        {booking.guests} guests
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Payment: {booking.payment_method || "cash"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-bold text-[#8363F5]">
                        {formatINR(booking.total)}
                      </span>

                      <StatusBadge status={booking.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}
      </main>
    </div>
  );
}

function TabButton({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#8363F5] text-white"
          : "border border-gray-300 bg-white text-gray-700 hover:border-[#8363F5]"
      }`}
    >
      {text}
    </button>
  );
}

function Panel({ title, children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b p-6">
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>

      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="p-14 text-center text-gray-500">
      <div className="mb-4 text-6xl">📭</div>
      <p>{text}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Pending";

  const style =
    value === "Cancelled"
      ? "bg-red-100 text-red-600"
      : value === "Completed"
      ? "bg-blue-100 text-blue-700"
      : value === "Confirmed"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${style}`}>
      {value}
    </span>
  );
}

function RoleBadge({ role }) {
  const value = role || "guest";

  const style =
    value === "admin"
      ? "bg-red-100 text-red-600"
      : value === "host"
      ? "bg-[#F4F1FF] text-[#8363F5]"
      : "bg-gray-100 text-gray-600";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${style}`}>
      {value}
    </span>
  );
}