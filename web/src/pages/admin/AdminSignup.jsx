import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";

import api from "../../api/api";

export default function AdminSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
    secretKey: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.fullname.trim()) return "Full name is required";
    if (!form.email.trim()) return "Admin email is required";
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.secretKey.trim()) return "Admin secret key is required";
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      await api.post("/admin/signup", {
        fullname: form.fullname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        secretKey: form.secretKey.trim(),
      });

      alert("Admin account created successfully");
      navigate("/admin/login", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Admin signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[3b71e6]">
              <ShieldCheck size={30} />
            </div>

            <h1 className="text-3xl font-black">Create Admin Account</h1>
            <p className="mt-2 text-sm text-slate-400">
              Protected admin registration
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="rounded-3xl border border-white/10 bg-white p-6 text-gray-900 shadow-2xl md:p-8"
          >
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <InputBox
                icon={<User size={18} />}
                label="Full name"
                value={form.fullname}
                placeholder="Servia Admin"
                onChange={(value) => updateForm("fullname", value)}
              />

              <InputBox
                icon={<Mail size={18} />}
                label="Admin email"
                type="email"
                value={form.email}
                placeholder="admin@serviastay.com"
                onChange={(value) => updateForm("email", value)}
              />

              <div>
                <Label text="Password" />

                <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 focus-within:ring-2 focus-within:ring-[3b71e6]">
                  <Lock size={18} className="text-gray-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    placeholder="Minimum 8 characters"
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

              <InputBox
                icon={<Lock size={18} />}
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                placeholder="Repeat password"
                onChange={(value) => updateForm("confirmPassword", value)}
              />

              <InputBox
                icon={<ShieldCheck size={18} />}
                label="Admin secret key"
                type="password"
                value={form.secretKey}
                placeholder="Enter private admin key"
                onChange={(value) => updateForm("secretKey", value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-xl bg-[3b71e6] text-lg font-bold text-white shadow-lg transition hover:bg-[#7152E8] disabled:opacity-60"
              >
                {loading ? "Creating admin..." : "Create Admin"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/login")}
              className="mt-6 w-full text-sm font-semibold text-[3b71e6]"
            >
              Already have admin access? Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function InputBox({ icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <Label text={label} />
      <div className="flex h-14 items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 focus-within:ring-2 focus-within:ring-[3b71e6]">
        <span className="text-gray-400">{icon}</span>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-gray-900 outline-none"
        />
      </div>
    </div>
  );
}

function Label({ text }) {
  return <label className="mb-2 block text-sm font-bold text-gray-700">{text}</label>;
}