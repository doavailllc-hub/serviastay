import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

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
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email.trim()) return "Admin email is required.";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email.";
    if (!form.password.trim()) return "Password is required.";
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
        setError("Invalid admin login response.");
        return;
      }

      localStorage.setItem("adminToken", res.data.token);
      localStorage.setItem("adminUser", JSON.stringify(res.data.admin));

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.log("Admin login failed:", err);
      setError(err.response?.data?.message || "Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 md:px-8">
        <section className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#3b71e6]">
              <ShieldCheck size={25} />
            </div>

            <p className="mt-6 text-sm font-medium text-gray-500">
              Admin access
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Sign in to Admin
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Use your admin credentials to manage Dovail Stay.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-gray-200 bg-white p-6"
          >
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <Field label="Admin email">
                <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
                  <Mail size={17} className="text-gray-400" />

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="admin@dovail.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
                  <Lock size={17} className="text-gray-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-gray-400 transition hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-500">
              Admin access is separate from customer and host accounts.
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Dovail Stay Admin
          </p>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      {children}
    </label>
  );
}