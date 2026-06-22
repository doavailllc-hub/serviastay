import { useEffect, useRef, useState } from "react";
import { Apple, ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import logo from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(30);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (step !== "otp") return;

    setTimer(30);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const cleanEmail = email.trim().toLowerCase();

  const sendOtp = async (e) => {
    e?.preventDefault();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await api.post("/auth/send-otp", {
        email: cleanEmail,
      });

      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.log("Send OTP failed:", err);
      setError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0) return;

    try {
      setResending(true);
      setError("");

      await api.post("/auth/send-otp", {
        email: cleanEmail,
      });

      setOtp(["", "", "", "", "", ""]);
      setTimer(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.log("Resend OTP failed:", err);
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = async (finalOtp) => {
    const code = finalOtp || otp.join("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/auth/verify-otp", {
        email: cleanEmail,
        otp: code,
      });

      if (!res.data?.token || !res.data?.user) {
        setError("Verification failed. Please try again.");
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
      console.log("Verify OTP failed:", err);
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setError("");

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const finalCode = nextOtp.join("");
    if (finalCode.length === 6) {
      verifyOtp(finalCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    const nextOtp = ["", "", "", "", "", ""];
    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);

    if (pasted.length === 6) {
      verifyOtp(pasted);
    } else {
      otpRefs.current[pasted.length]?.focus();
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

          {step === "otp" && (
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              className="absolute left-5 top-5 rounded-full p-2 hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="px-8 pt-14 text-center">
            <img
              src={logo}
              alt="Dovail Stay"
              className="mx-auto h-12 w-auto object-contain"
            />

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              {step === "email" ? "Log in or sign up" : "Confirm it’s you"}
            </h1>

            {step === "otp" && (
              <p className="mt-3 text-gray-500">
                We sent a code to{" "}
                <span className="font-semibold uppercase text-gray-700">
                  {cleanEmail}
                </span>
                .
              </p>
            )}
          </div>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="px-8 pb-8 pt-7">
              <input
                type="email"
                placeholder="Phone number or email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="h-14 w-full rounded-xl border border-gray-400 px-4 text-base outline-none focus:border-black focus:ring-1 focus:ring-black"
              />

              {error && <ErrorBox error={error} />}

              <button
                type="submit"
                disabled={loading}
                className="mt-4 h-14 w-full rounded-xl bg-gradient-to-r from-[#7e4ff5] to-[#d62976] font-bold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Continue"}
              </button>

              <Divider />

              <SocialButtons />

              <p className="mt-7 text-center text-xs leading-5 text-gray-500">
                We’ll email you a one-time code. New users are automatically
                signed up after verification.
              </p>
            </form>
          ) : (
            <div className="px-8 pb-8 pt-7">
              <div
                onPaste={handlePasteOtp}
                className="mx-auto flex max-w-[330px] items-center justify-center gap-2 rounded-xl border-2 border-gray-900 px-4 py-4"
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-8 w-8 border-none text-center text-xl font-bold outline-none"
                  />
                ))}
              </div>

              {error && <ErrorBox error={error} />}

              <div className="mt-7 text-center text-sm">
                <span className="text-gray-600">Didn’t get it? </span>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={timer > 0 || resending}
                  className="font-semibold underline disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {timer > 0
                    ? `Send a new code in ${timer}s`
                    : resending
                    ? "Sending..."
                    : "Send a new code"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => verifyOtp()}
                disabled={loading}
                className="mt-8 h-14 w-full rounded-xl bg-[#222] font-bold text-white transition hover:bg-black disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify and continue"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
                className="mt-4 h-14 w-full rounded-xl bg-gray-100 font-bold text-gray-800 hover:bg-gray-200"
              >
                Try another way
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ error }) {
  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
      {error}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-sm text-gray-600">or</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function SocialButtons() {
  return (
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
  );
}