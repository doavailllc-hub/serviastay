import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const navigate = useNavigate();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async () => {
    try {
      setError("");

      if (!fullname || !email || !password || !confirmPassword) {
        setError("All fields are required");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      await axios.post("http://localhost:5000/api/register", {
        fullname,
        email,
        password,
      });

      alert("Account created successfully");
      navigate("/");
    } catch (err) {
      setError("Signup failed. Email may already exist.");
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFC]">
      <div className="w-full lg:w-[42%] flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-[#8363F5] mb-10">
            Staybnb
          </h1>

          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900">
              Create Account
            </h2>

            <p className="text-gray-500 mt-2 mb-8">
              Create your account to start booking amazing stays.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-14 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              {error && (
                <p className="text-sm text-red-500 font-medium">
                  {error}
                </p>
              )}

              <button
                onClick={handleSignup}
                className="w-full h-14 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold text-lg shadow-lg transition"
              >
                Create Account
              </button>
            </div>

            <p className="text-center text-gray-500 mt-6">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-[#8363F5] font-semibold hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600"
          alt="Staybnb"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />

        <div className="absolute bottom-16 left-16 text-white max-w-lg">
          <h2 className="text-6xl font-bold leading-tight">
            Host
            <br />
            Anywhere.
          </h2>

          <p className="mt-4 text-xl text-gray-200">
            Find unique stays and unforgettable experiences around the world.
          </p>
        </div>
      </div>
    </div>
  );
}