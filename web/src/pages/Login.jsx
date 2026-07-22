import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, LockKeyhole, Mail, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../api/api";

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const APPLE_SCRIPT =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      const waitForSdk = () => {
        if ((id === "google-identity" && window.google?.accounts?.id) ||
            (id === "apple-identity" && window.AppleID?.auth)) {
          resolve();
        } else {
          window.setTimeout(waitForSdk, 50);
        }
      };
      waitForSdk();
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Unable to load ${id}`));
    document.head.appendChild(script);
  });
}

function randomState() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const otpRefs = useRef([]);

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const otpCode = otp.join("");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
  const appleRedirectUri =
    import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/login`;

  const saveSession = (data) => {
    if (!data?.token || !data?.user) {
      throw new Error("The server did not return a valid session.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/home", { replace: true });
  };

  const finishSocialLogin = async (provider, identityToken, name) => {
    try {
      setError("");
      setSocialLoading(provider);
      const response = await api.post(`/auth/${provider}`, {
        identityToken,
        name: name || undefined,
      });
      saveSession(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          `${provider === "google" ? "Google" : "Apple"} login failed.`
      );
    } finally {
      setSocialLoading("");
    }
  };

  useEffect(() => {
    if (!googleClientId) return;
    let active = true;

    loadScript(GOOGLE_SCRIPT, "google-identity")
      .then(() => {
        if (!active || !googleButtonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => {
            if (response?.credential) {
              finishSocialLogin("google", response.credential);
            } else {
              setError("Google did not return an identity token.");
            }
          },
          cancel_on_tap_outside: true,
          auto_select: false,
        });

        googleButtonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(420, googleButtonRef.current.clientWidth || 420),
        });
        setGoogleReady(true);
      })
      .catch(() => active && setError("Google login could not be loaded."));

    return () => {
      active = false;
      window.google?.accounts?.id?.cancel();
    };
  }, [googleClientId]);

  useEffect(() => {
    if (!appleClientId) return;
    let active = true;

    loadScript(APPLE_SCRIPT, "apple-identity")
      .then(() => {
        if (!active) return;
        window.AppleID.auth.init({
          clientId: appleClientId,
          scope: "name email",
          redirectURI: appleRedirectUri,
          state: randomState(),
          nonce: randomState(),
          usePopup: true,
        });
        setAppleReady(true);
      })
      .catch(() => active && setError("Apple login could not be loaded."));

    return () => {
      active = false;
    };
  }, [appleClientId, appleRedirectUri]);

  useEffect(() => {
    if (step !== "otp" || timer <= 0) return undefined;
    const interval = window.setInterval(
      () => setTimer((value) => Math.max(0, value - 1)),
      1000
    );
    return () => window.clearInterval(interval);
  }, [step, timer]);

  const signInWithApple = async () => {
    if (!appleReady) {
      setError("Apple login is not configured yet.");
      return;
    }

    try {
      setError("");
      setSocialLoading("apple");
      const response = await window.AppleID.auth.signIn();
      const identityToken = response?.authorization?.id_token;
      const appleName = response?.user?.name;
      const name = [appleName?.firstName, appleName?.lastName]
        .filter(Boolean)
        .join(" ");

      if (!identityToken) throw new Error("Apple did not return an identity token.");
      await finishSocialLogin("apple", identityToken, name);
    } catch (err) {
      if (err?.error !== "popup_closed_by_user") {
        setError(err?.error || err?.message || "Apple login failed.");
      }
      setSocialLoading("");
    }
  };

  const sendOtp = async () => {
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await api.post("/auth/send-otp", { email: cleanEmail });
      setOtp(["", "", "", "", "", ""]);
      setTimer(45);
      setStep("otp");
      window.setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code = otpCode) => {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete 6-digit verification code.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const response = await api.post("/auth/verify-otp", {
        email: cleanEmail,
        otp: code,
      });
      saveSession(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setOtp((current) => current.map((item, i) => (i === index ? "" : item)));
      return;
    }

    const next = [...otp];
    digits.slice(0, 6 - index).split("").forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    setOtp(next);

    const nextIndex = Math.min(index + digits.length, 5);
    otpRefs.current[nextIndex]?.focus();
    const code = next.join("");
    if (code.length === 6) verifyOtp(code);
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!loading) step === "email" ? sendOtp() : verifyOtp();
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-gray-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-9">
          <header className="flex items-center justify-between">
            <button
              type="button"
              aria-label={step === "otp" ? "Back to email" : "Back"}
              onClick={() =>
                step === "otp"
                  ? (setStep("email"), setError(""))
                  : navigate(-1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 transition hover:bg-gray-50"
            >
              <ArrowLeft size={19} />
            </button>
            <button
              type="button"
              aria-label="Close login"
              onClick={() => navigate("/home")}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </header>

          <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3b71e6] text-2xl font-black text-white">
            D
          </div>
          <p className="mt-3 font-bold text-[#3b71e6]">Dovail Stay</p>

          <h1 className="mt-7 text-3xl font-bold tracking-tight">
            {step === "email" ? "Log in or sign up" : "Check your email"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {step === "email"
              ? "Continue securely with your email, Google account, or Apple ID."
              : `Enter the 6-digit verification code sent to ${cleanEmail}.`}
          </p>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            {step === "email" ? (
              <label className="flex h-14 items-center gap-3 rounded-2xl border border-gray-300 px-4 focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-blue-100">
                <Mail size={19} className="text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
                />
              </label>
            ) : (
              <div>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => { otpRefs.current[index] = element; }}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={(event) => {
                        event.preventDefault();
                        handleOtpChange(index, event.clipboardData.getData("text"));
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      aria-label={`Verification digit ${index + 1}`}
                      className="h-[52px] w-11 rounded-xl border border-gray-300 text-center text-xl font-bold outline-none focus:border-[#3b71e6] focus:ring-2 focus:ring-blue-100 sm:h-14 sm:w-12"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={timer > 0 || loading}
                  onClick={sendOtp}
                  className="mt-4 text-sm font-semibold text-[#3b71e6] disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {timer > 0 ? `Send again in ${timer}s` : "Send code again"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (step === "otp" && otpCode.length !== 6)}
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#3b71e6] font-bold text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <LockKeyhole size={18} />}
              {step === "email" ? "Continue" : "Verify and continue"}
            </button>
          </form>

          {step === "email" && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                OR
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="relative min-h-11 w-full overflow-hidden rounded-full">
                <div ref={googleButtonRef} className="flex min-h-11 w-full justify-center" />
                {socialLoading === "google" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                )}
                {!googleClientId && (
                  <p className="text-center text-xs text-amber-700">Google login requires VITE_GOOGLE_CLIENT_ID.</p>
                )}
                {googleClientId && !googleReady && !error && (
                  <div className="flex h-11 items-center justify-center text-sm text-gray-500">Loading Google login…</div>
                )}
              </div>

              <button
                type="button"
                disabled={!appleReady || Boolean(socialLoading)}
                onClick={signInWithApple}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {socialLoading === "apple" && <Loader2 size={18} className="animate-spin" />}
                Continue with Apple
              </button>
            </>
          )}

          <p className="mt-6 text-center text-xs leading-5 text-gray-500">
            By continuing, you agree to Dovail Stay’s Terms of Service and Privacy Policy.
          </p>
        </section>
      </div>
    </main>
  );
}