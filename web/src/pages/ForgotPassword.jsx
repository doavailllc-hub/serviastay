import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail } from "lucide-react";

import api from "../api/api";
import logo from "../assets/logo.png";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sendOtp = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Email is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await api.post("/forgot-password", {
        email: cleanEmail,
      });

      setEmail(cleanEmail);
      setStep("reset");
      setMessage("OTP sent successfully. Check your email.");
    } catch (err) {
      console.log("Forgot password failed:", err);
      setError(err.response?.data?.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      setError("OTP is required");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await api.post("/reset-password", {
        email,
        otp: otp.trim(),
        newPassword,
      });

      alert("Password reset successful. Please login.");
      navigate("/");
    } catch (err) {
      console.log("Reset password failed:", err);
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[42%_58%]">
      <div className="flex min-h-screen items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-10 inline-flex items-center">
            <img
              src={logo}
              alt="Servia Stay"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <form
            onSubmit={step === "email" ? sendOtp : resetPassword}
            className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl"
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#3b71e6]"
            >
              <ArrowLeft size={18} />
              Back to login
            </button>

            <div className="mb-7">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
                {step === "email" ? <Mail /> : <KeyRound />}
              </div>

              <h1 className="text-3xl font-bold text-gray-900">
                {step === "email" ? "Forgot password?" : "Reset password"}
              </h1>

              <p className="mt-2 text-gray-500">
                {step === "email"
                  ? "Enter your email and we will send a reset OTP."
                  : "Enter the OTP and create a new password."}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  disabled={step === "reset"}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#3b71e6] disabled:bg-gray-100"
                />
              </div>

              {step === "reset" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      OTP code
                    </label>

                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6 digit OTP"
                      maxLength={6}
                      className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#3b71e6]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      New password
                    </label>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 pr-20 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#3b71e6]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#3b71e6]"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-sm font-medium text-green-700">
                    {message}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-xl bg-[#3b71e6] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8] disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : step === "email"
                  ? "Send OTP"
                  : "Reset Password"}
              </button>

              {step === "reset" && (
                <button
                  type="button"
                  onClick={(e) => sendOtp(e)}
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-gray-300 bg-white font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600"
          alt="Password reset"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute bottom-16 left-16 max-w-lg text-white">
          <h2 className="text-6xl font-bold leading-tight">
            Reset
            <br />
            Securely.
          </h2>

          <p className="mt-4 text-xl text-gray-200">
            Keep your Servia Stay account protected with secure password recovery.
          </p>
        </div>
      </div>
    </div>
  );
}