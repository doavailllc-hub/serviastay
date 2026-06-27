import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Globe,
  Lock,
  LogOut,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function AccountSettings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  const getStoredUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const updateStoredUser = (updatedUser) => {
    if (localStorage.getItem("user")) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }

    if (sessionStorage.getItem("user")) {
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const loadUser = async () => {
    try {
      setLoading(true);

      const storedUser = getStoredUser();
      const token = getToken();

      if (!storedUser || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/user/${storedUser.id}`);

      setUser(res.data);

      setForm({
        fullname: res.data.fullname || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
      });

      updateStoredUser(res.data);
    } catch (err) {
      console.log("User load failed:", err);
      alert("Account details failed to load");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!form.fullname.trim()) return "Full name is required";

    if (!form.email.trim()) return "Email is required";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      return "Enter a valid email address";
    }

    if (form.phone && form.phone.trim().length < 7) {
      return "Enter a valid phone number";
    }

    return null;
  };

  const saveProfile = async () => {
    const error = validateForm();

    if (error) {
      alert(error);
      return;
    }

    try {
      setSaving(true);

      await api.put(`/user/${user.id}`, {
        fullname: form.fullname.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      });

      alert("Profile updated successfully");
      setEditOpen(false);
      loadUser();
    } catch (err) {
      console.log("Profile update failed:", err);
      alert(err.response?.data?.message || "Profile update failed");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const settings = [
    {
      icon: <User size={24} className="text-[3b71e6]" />,
      title: "Personal information",
      desc: "Update your name, email and phone number",
      action: () => setEditOpen(true),
    },
    {
      icon: <Shield size={24} className="text-[3b71e6]" />,
      title: "Login & security",
      desc: "Password, devices, and account protection",
      action: () => navigate("/security"),
    },
    {
      icon: <CreditCard size={24} className="text-[3b71e6]" />,
      title: "Payments & payouts",
      desc: "Manage payment methods and payment history",
      action: () => navigate("/payment-methods"),
    },
    {
      icon: <Bell size={24} className="text-[3b71e6]" />,
      title: "Notifications",
      desc: "Booking, payment and message alerts",
      action: () => navigate("/notifications"),
    },
    {
      icon: <Globe size={24} className="text-[3b71e6]" />,
      title: "Language & currency",
      desc: "Choose your preferred language and currency",
      action: () => navigate("/language"),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          Loading account settings...
        </main>
      </div>
    );
  }

  const avatarLetter =
    user?.fullname?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Account settings
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your personal information, security, payments, and preferences.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[3b71e6] text-3xl font-bold text-white">
              {avatarLetter}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.fullname || "User"}
              </h2>

              <p className="mt-1 text-gray-500">{user?.email}</p>

              <p className="mt-1 text-sm text-gray-400">
                {user?.phone || "No phone number"}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-[#F4F1FF] px-3 py-1 text-xs font-bold capitalize text-[3b71e6]">
                {user?.role || "guest"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(true)}
            className="rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white transition hover:bg-[#7152E8]"
          >
            Edit Profile
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {settings.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:shadow-lg"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF]">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>

              <ChevronRight size={22} className="text-gray-400" />
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-red-100 bg-red-50 p-6">
          <h2 className="text-2xl font-bold text-red-600">Danger Zone</h2>

          <p className="mt-2 text-sm text-red-500">
            Logout safely or contact support if you want to deactivate your account.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
            >
              <LogOut size={18} />
              Logout
            </button>

            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600 hover:bg-red-100"
            >
              <Trash2 size={18} />
              Delete Account
            </button>
          </div>
        </div>
      </main>

      {editOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit Profile
              </h2>

              <button
                onClick={() => setEditOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <Field
                label="Full name"
                value={form.fullname}
                onChange={(value) =>
                  setForm({ ...form, fullname: value })
                }
                placeholder="Full name"
              />

              <Field
                label="Email address"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
                placeholder="Email"
              />

              <Field
                label="Phone number"
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                placeholder="Phone number"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setEditOpen(false)}
                className="h-14 flex-1 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="h-14 flex-1 rounded-xl bg-[3b71e6] font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[3b71e6]"
      />
    </div>
  );
}