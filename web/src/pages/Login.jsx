import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("demo@gmail.com");
  const [password, setPassword] = useState("demopassword");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setError("");

      const res = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/home");
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-full lg:w-[42%] flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-[#8363F5] mb-10">
            Staybnb
          </h1>

          <div className="border border-gray-200 rounded-2xl shadow-sm p-8 bg-white">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Welcome back
            </h2>

            <div className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              {error && (
                <p className="text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}

              <button
                onClick={handleLogin}
                className="w-full h-14 rounded-xl bg-[#8363F5] text-white font-semibold text-lg hover:bg-[#7152E8] transition"
              >
                Log in
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#F4F1FF] border border-[#8363F5]/20 p-4">
              <p className="text-sm font-semibold text-[#8363F5] mb-2">
                Demo Credentials
              </p>

              <p className="text-sm text-gray-700">
                <strong>Email:</strong> demo@gmail.com
              </p>

              <p className="text-sm text-gray-700">
                <strong>Password:</strong> demopassword
              </p>
            </div>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t"></div>
              <span className="px-3 text-gray-400 text-sm">or</span>
              <div className="flex-1 border-t"></div>
            </div>

            <div className="space-y-3">
              <button className="w-full h-12 border rounded-xl font-medium hover:bg-gray-50 transition">
                Continue with Google
              </button>

              <button className="w-full h-12 border rounded-xl font-medium hover:bg-gray-50 transition">
                Continue with Apple
              </button>
            </div>

            <p className="text-center text-gray-500 mt-6">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#8363F5] font-semibold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1600"
          alt="Staybnb"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/25"></div>

        <div className="absolute bottom-16 left-16 text-white max-w-lg">
          <h2 className="text-6xl font-bold leading-tight">
            Live
            <br />
            Anywhere.
          </h2>

          <p className="mt-4 text-xl text-gray-200">
            Discover unique homes, unforgettable experiences, and places you'll
            love.
          </p>
        </div>
      </div>
    </div>
  );
}