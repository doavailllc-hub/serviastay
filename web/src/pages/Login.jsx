import { useEffect, useRef, useState } from "react";
import { Apple, ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import logo from "../assets/logo.png";

const BRAND = "3b71e6";
const BRAND_DARK = "#6f43e4";

export default function Login() {
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const cleanEmail = email.trim().toLowerCase();
  const otpCode = otp.join("");

  useEffect(() => {
    if (step !== "otp") return;

    setTimer(45);

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

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const sendOtp = async (e) => {
    e?.preventDefault();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      resetMessages();

      await api.post("/auth/send-otp", {
        email: cleanEmail,
      });

      setStep("otp");
      setSuccess("Verification code sent.");
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
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
      resetMessages();

      await api.post("/auth/send-otp", {
        email: cleanEmail,
      });

      setOtp(["", "", "", "", "", ""]);
      setTimer(45);
      setSuccess("New verification code sent.");
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err) {
      console.log("Resend OTP failed:", err);
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const verifyOtp = async (code = otpCode) => {
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    try {
      setLoading(true);
      resetMessages();

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
    resetMessages();

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const finalCode = nextOtp.join("");
    if (finalCode.length === 6) {
      verifyOtp(finalCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const nextOtp = [...otp];
        nextOtp[index] = "";
        setOtp(nextOtp);
        return;
      }

      if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
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
    resetMessages();

    if (pasted.length === 6) {
      verifyOtp(pasted);
    } else {
      otpRefs.current[pasted.length]?.focus();
    }
  };

  const goBackToEmail = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
    resetMessages();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="fixed inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-[520px] overflow-hidden rounded-[32px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="absolute right-5 top-5 z-10 rounded-full p-2 transition hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {step === "otp" && (
            <button
              type="button"
              onClick={goBackToEmail}
              className="absolute left-5 top-5 z-10 rounded-full p-2 transition hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="border-b border-gray-100 px-8 pb-6 pt-14 text-center">
            <img
              src={logo}
              alt="Dovail Stay"
              className="mx-auto h-12 w-auto object-contain"
            />

            <h1 className="mt-6 text-[26px] font-bold tracking-tight text-gray-900">
              {step === "email" ? "Log in or sign up" : "Confirm it’s you"}
            </h1>

            {step === "otp" && (
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                We sent a verification code to{" "}
                <span className="font-semibold text-gray-800">{cleanEmail}</span>.
              </p>
            )}
          </div>

          {step === "email" ? (
            <form onSubmit={sendOtp} className="px-8 pb-8 pt-7">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Email address
              </label>

              <input
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetMessages();
                }}
                className="h-14 w-full rounded-xl border border-gray-400 bg-white px-4 text-base outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              />

              {error && <Alert type="error" message={error} />}
              {success && <Alert type="success" message={success} />}

              <button
                type="submit"
                disabled={loading}
className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[3b71e6] font-bold text-white transition hover:bg-[#6d43e5] disabled:cursor-not-allowed disabled:opacity-60"              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Sending code..." : "Continue"}
              </button>

              <Divider />

              <SocialButtons />

              <p className="mt-7 text-center text-xs leading-5 text-gray-500">
                New users are automatically signed up after email verification.
                By continuing, you agree to Dovail Stay&apos;s terms and privacy
                policy.
              </p>
            </form>
          ) : (
            <div className="px-8 pb-8 pt-7">
              <div
                onPaste={handlePasteOtp}
                className="mx-auto flex max-w-[350px] items-center justify-center gap-2 rounded-2xl border-2 border-gray-900 px-4 py-4"
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="h-9 w-9 border-none bg-transparent text-center text-xl font-bold outline-none"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>

              {error && <Alert type="error" message={error} />}
              {success && <Alert type="success" message={success} />}

              <div className="mt-7 text-center text-sm">
                <span className="text-gray-600">Didn&apos;t get it? </span>
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
                disabled={loading || otpCode.length !== 6}
                className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#222] font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Verifying..." : "Verify and continue"}
              </button>

              <button
                type="button"
                onClick={goBackToEmail}
                className="mt-4 h-14 w-full rounded-xl bg-gray-100 font-bold text-gray-800 transition hover:bg-gray-200"
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

function Alert({ type, message }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-600"
      }`}
    >
      {isSuccess && <CheckCircle2 size={17} />}
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-sm text-gray-500">or</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="flex justify-center gap-4">
      <button
        type="button"
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-300 transition hover:bg-gray-50"
        aria-label="Continue with Google"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="h-6 w-6"
        />
      </button>

      <button
        type="button"
        className="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-300 transition hover:bg-gray-50"
        aria-label="Continue with Apple"
      >
        <Apple size={24} />
      </button>
    </div>
  );
}