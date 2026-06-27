import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";

import api from "../../api/api";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email.trim()) return "Admin email is required";
    if (!form.password.trim()) return "Password is required";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email";
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/admin/login", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (!res.data?.token || !res.data?.admin) {
        setError("Invalid admin login response");
        return;
      }

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminUser", JSON.stringify(res.data.admin));

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.log("Admin login failed:", err);
      setError(err.response?.data?.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[3b71e6] via-[#4F46E5] to-[#0F172A]" />

          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-purple-300 blur-3xl" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <ShieldCheck size={30} />
              </div>

              <h1 className="mt-8 max-w-2xl text-6xl font-black leading-tight">
                Servia Stay Admin Control Center
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
                Manage users, hosts, properties, bookings, payments, reviews,
                support requests, and platform security from one professional
                dashboard.
              </p>
            </div>

            <div className="grid max-w-2xl gap-4 md:grid-cols-3">
              <InfoCard title="Secure" text="Role-based admin access" />
              <InfoCard title="Live Data" text="Bookings and revenue" />
              <InfoCard title="Control" text="Full platform management" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[3b71e6] shadow-lg shadow-purple-900/30">
                <Lock size={30} />
              </div>

              <h2 className="text-3xl font-black">Admin Login</h2>

              <p className="mt-2 text-sm text-slate-400">
                Authorized administrators only
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="rounded-3xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl md:p-8"
            >
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <Label text="Admin email" />

                  <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 focus-within:ring-2 focus-within:ring-[3b71e6]">
                    <Mail size={18} className="text-gray-400" />

                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="admin@serviastay.com"
                      autoComplete="email"
                      className="w-full bg-transparent text-gray-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <Label text="Password" />

                  <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 focus-within:ring-2 focus-within:ring-[3b71e6]">
                    <Lock size={18} className="text-gray-400" />

                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                      className="w-full bg-transparent text-gray-900 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-14 w-full rounded-xl bg-[3b71e6] text-lg font-bold text-white shadow-lg shadow-purple-200 transition hover:bg-[#7152E8] disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in to Admin"}
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                Admin access is separated from customer and host accounts.
              </div>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              © {new Date().getFullYear()} Servia Stay Admin. All rights
              reserved.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Label({ text }) {
  return (
    <label className="mb-2 block text-sm font-bold text-gray-700">
      {text}
    </label>
  );
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{text}</p>
    </div>
  );
}