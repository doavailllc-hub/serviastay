import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  User,
  Shield,
  CreditCard,
  Bell,
  Globe,
  ChevronRight,
  X,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AccountSettings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      navigate("/");
      return;
    }

    const res = await axios.get(
      `http://localhost:5000/api/user/${storedUser.id}`
    );

    setUser(res.data);

    setForm({
      fullname: res.data.fullname || "",
      email: res.data.email || "",
      phone: res.data.phone || "",
    });

    localStorage.setItem("user", JSON.stringify(res.data));
  };

  const saveProfile = async () => {
    await axios.put(`http://localhost:5000/api/user/${user.id}`, form);

    alert("Profile updated successfully");
    setEditOpen(false);
    loadUser();
  };

  const settings = [
    {
      icon: <User size={24} className="text-[#8363F5]" />,
      title: "Personal information",
      desc: "Update your name, email and phone number",
      action: () => setEditOpen(true),
    },
    {
      icon: <Shield size={24} className="text-[#8363F5]" />,
      title: "Login & security",
      desc: "Password and account protection",
      action: () => alert("Login security page coming next"),
    },
    {
      icon: <CreditCard size={24} className="text-[#8363F5]" />,
      title: "Payments & payouts",
      desc: "Manage payment methods and payout details",
      action: () => navigate("/payment-methods"),
    },
    {
      icon: <Bell size={24} className="text-[#8363F5]" />,
      title: "Notifications",
      desc: "Booking, payment and message alerts",
      action: () => navigate("/notifications"),
    },
    {
      icon: <Globe size={24} className="text-[#8363F5]" />,
      title: "Language & currency",
      desc: "Choose your preferred language and currency",
      action: () => navigate("/language"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Account settings
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your personal information, security and preferences.
          </p>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#8363F5] text-3xl font-bold text-white">
              {user?.fullname?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {user?.fullname || "User"}
              </h2>

              <p className="text-gray-500">
                {user?.email}
              </p>

              <p className="text-sm text-gray-400 mt-1">
                {user?.phone || "No phone number"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(true)}
            className="rounded-xl bg-[#8363F5] px-6 py-3 font-semibold text-white hover:bg-[#7152E8] transition"
          >
            Edit Profile
          </button>
        </div>

        <div className="space-y-4">
          {settings.map((item, index) => (
            <button
              key={index}
              onClick={item.action}
              className="w-full flex cursor-pointer items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-lg text-left"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF]">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    {item.title}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {item.desc}
                  </p>
                </div>
              </div>

              <ChevronRight size={22} className="text-gray-400" />
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            Your account is secure 🔒
          </h2>

          <p className="mt-3 max-w-2xl text-white/90">
            Staybnb protects your personal information and account activity.
          </p>
        </div>
      </main>

      {editOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">
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
              <input
                value={form.fullname}
                onChange={(e) =>
                  setForm({ ...form, fullname: e.target.value })
                }
                placeholder="Full name"
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="Email"
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="Phone number"
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />
            </div>

            <button
              onClick={saveProfile}
              className="mt-6 w-full h-14 rounded-xl bg-[#8363F5] text-white font-semibold hover:bg-[#7152E8]"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}