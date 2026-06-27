import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Security() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const changePassword = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      alert("All password fields are required");
      return;
    }

    if (form.newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    try {
      setSaving(true);

      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      await api.put(`/user/${user.id}/password`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      alert("Password updated successfully");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.log("Password update failed:", err);
      alert(err.response?.data?.message || "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center gap-5">
          <button
            onClick={() => navigate("/account-settings")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Login & Security
            </h1>

            <p className="mt-2 text-gray-500">
              Manage your password and account protection.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
                <KeyRound />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Change Password
                </h2>

                <p className="text-gray-500">
                  Use a strong password to keep your account secure.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <PasswordField
                label="Current password"
                value={form.currentPassword}
                show={show}
                onChange={(value) =>
                  setForm({ ...form, currentPassword: value })
                }
              />

              <PasswordField
                label="New password"
                value={form.newPassword}
                show={show}
                onChange={(value) => setForm({ ...form, newPassword: value })}
              />

              <PasswordField
                label="Confirm new password"
                value={form.confirmPassword}
                show={show}
                onChange={(value) =>
                  setForm({ ...form, confirmPassword: value })
                }
              />

              <button
                type="button"
                onClick={() => setShow(!show)}
                className="flex items-center gap-2 text-sm font-semibold text-[3b71e6]"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
                {show ? "Hide passwords" : "Show passwords"}
              </button>

              <button
                onClick={changePassword}
                disabled={saving}
                className="h-14 w-full rounded-xl bg-[3b71e6] font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <ShieldCheck className="mb-4 text-green-600" />

              <h3 className="text-xl font-bold text-gray-900">
                Security Tips
              </h3>

              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li>Use at least 6 characters.</li>
                <li>Avoid using your name or email.</li>
                <li>Do not reuse passwords from other websites.</li>
                <li>Logout from shared devices.</li>
              </ul>
            </div>

            <div className="rounded-3xl bg-[#F4F1FF] p-6">
              <Lock className="mb-4 text-[3b71e6]" />

              <h3 className="text-xl font-bold text-gray-900">
                Account Protection
              </h3>

              <p className="mt-3 text-sm text-gray-600">
                Two-factor authentication and device management can be added in
                the next production phase.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PasswordField({ label, value, onChange, show }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:ring-2 focus:ring-[3b71e6]"
      />
    </div>
  );
}