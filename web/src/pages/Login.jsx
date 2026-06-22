import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Apple, X } from "lucide-react";

import api from "../api/api";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demopassword");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email");
      return;
    }

    setError("");
    setStep("password");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/login", {
        email: cleanEmail,
        password,
      });

      if (!res.data?.token || !res.data?.user) {
        setError("Login failed. Please try again.");
        return;
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/home", { replace: true });
    } catch (err) {
      console.log("Login failed:", err);
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="fixed inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="relative w-full max-w-[520px] rounded-[32px] bg-white shadow-2xl">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="absolute right-5 top-5 rounded-full p-2 hover:bg-gray-100"
          >
            <X size={20} />
          </button>

          <div className="px-8 pt-14 text-center">
            <img
              src={logo}
              alt="Dovail Stay"
              className="mx-auto h-12 w-auto object-contain"
            />

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Log in or sign up
            </h1>
          </div>

          <form
            onSubmit={step === "email" ? handleContinue : handleLogin}
            className="px-8 pb-8 pt-7"
          >
            <input
              type="email"
              placeholder="Phone number or email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 w-full rounded-xl border border-gray-400 px-4 text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
            />

            {step === "password" && (
              <input
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-3 h-14 w-full rounded-xl border border-gray-400 px-4 text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 h-14 w-full rounded-xl bg-gradient-to-r from-[#7e4ff5] to-[#d62976] font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Please wait..." : step === "email" ? "Continue" : "Log in"}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-sm text-gray-600">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-6 w-6"
                />
              </button>

              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                <Apple size={24} />
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-bold text-[#7e4ff5] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}