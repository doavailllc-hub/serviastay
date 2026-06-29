import { useEffect, useRef, useState } from "react";
import { Apple, ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";
import logo from "../assets/logo.png";

const BRAND = "#3b71e6";
const BRAND_HOVER = "#2f5fc2";

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
    <div className="min-h-screen bg-white text-gray-950">
      <main className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 md:px-8">
        <section className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center justify-between">
            {step === "otp" ? (
              <button
                type="button"
                onClick={goBackToEmail}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div className="h-10 w-10" />
            )}

            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="text-center">
              <img
                src={logo}
                alt="Dovail Stay"
                className="mx-auto h-11 w-auto object-contain"
              />

              <p className="mt-6 text-sm font-medium text-gray-500">
                {step === "email" ? "Welcome" : "Verification"}
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
                {step === "email" ? "Log in or sign up" : "Enter the code"}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">
                {step === "email"
                  ? "Use your email address to continue to Dovail Stay."
                  : `We sent a 6-digit code to ${cleanEmail}.`}
              </p>
            </div>

            {step === "email" ? (
              <form onSubmit={sendOtp} className="mt-7">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email address
                </label>

                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    resetMessages();
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                />

                {error && <Alert type="error" message={error} />}
                {success && <Alert type="success" message={success} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Sending code..." : "Continue"}
                </button>

                <Divider />

                <SocialButtons />

                <p className="mt-6 text-center text-xs leading-5 text-gray-500">
                  New users are automatically signed up after email
                  verification. By continuing, you agree to Dovail Stay&apos;s
                  terms and privacy policy.
                </p>
              </form>
            ) : (
              <div className="mt-7">
                <div
                  onPaste={handlePasteOtp}
                  className="grid grid-cols-6 gap-2"
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
                      className="h-12 rounded-xl border border-gray-200 bg-white text-center text-lg font-semibold outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                      aria-label={`OTP digit ${index + 1}`}
                    />
                  ))}
                </div>

                {error && <Alert type="error" message={error} />}
                {success && <Alert type="success" message={success} />}

                <div className="mt-5 text-center text-sm">
                  <span className="text-gray-500">Didn&apos;t get it? </span>

                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={timer > 0 || resending}
                    className="font-medium text-[#3b71e6] hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {timer > 0
                      ? `Send again in ${timer}s`
                      : resending
                      ? "Sending..."
                      : "Send again"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => verifyOtp()}
                  disabled={loading || otpCode.length !== 6}
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Verifying..." : "Verify and continue"}
                </button>

                <button
                  type="button"
                  onClick={goBackToEmail}
                  className="mt-3 h-11 w-full rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Use another email
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Alert({ type, message }) {
  const isSuccess = type === "success";

  return (
    <div
      className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-600"
      }`}
    >
      {isSuccess && <CheckCircle2 size={16} />}
      {message}
    </div>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-sm text-gray-400">or</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        aria-label="Continue with Google"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt=""
          className="h-5 w-5"
        />
        Google
      </button>

      <button
        type="button"
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        aria-label="Continue with Apple"
      >
        <Apple size={20} />
        Apple
      </button>
    </div>
  );
}