import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Apple } from "lucide-react";

import api from "../api/api";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("token", res.data.token);
      storage.setItem("user", JSON.stringify(res.data.user));

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
            onSubmit={handleLogin}
            className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl"
          >
            <div className="mb-7">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back
              </h1>
              <p className="mt-2 text-gray-500">
                Log in to manage your bookings, wishlists, and stays.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[#8363F5] focus:ring-2 focus:ring-[#8363F5]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 pr-20 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[#8363F5] focus:ring-2 focus:ring-[#8363F5]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8363F5]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 accent-[#8363F5]"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                    onClick={() => navigate("/forgot-password")}
                  className="text-sm font-semibold text-[#8363F5] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-xl bg-[#8363F5] text-lg font-semibold text-white shadow-lg transition hover:bg-[#7152E8] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Log in"}
              </button>
            </div>

            <div className="my-6 flex items-center">
              <div className="flex-1 border-t" />
              <span className="px-3 text-sm text-gray-400">or</span>
              <div className="flex-1 border-t" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="h-5 w-5"
                />
                Continue with Google
              </button>

              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                <Apple size={21} />
                Continue with Apple
              </button>
            </div>

            <p className="mt-6 text-center text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-[#8363F5] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600"
          alt="Luxury stay"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/35" />

        <div className="absolute bottom-16 left-16 max-w-lg text-white">
          <h2 className="text-6xl font-bold leading-tight">
            Live
            <br />
            Anywhere.
          </h2>

          <p className="mt-4 text-xl text-gray-200">
            Discover unique homes, unforgettable experiences, and places
            you&apos;ll love.
          </p>
        </div>
      </div>
    </div>
  );
}