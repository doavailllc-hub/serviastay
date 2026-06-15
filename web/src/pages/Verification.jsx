import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Verification() {
  const navigate = useNavigate();

  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVerification();
  }, []);

  const getUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const loadVerification = async () => {
    try {
      setLoading(true);

      const user = getUser();
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/user/${user.id}/verification`);
      setVerification(res.data);
    } catch (err) {
      console.log("Verification load failed:", err);
      alert("Verification details failed to load");
    } finally {
      setLoading(false);
    }
  };

  const progress = useMemo(() => {
    if (!verification) return 0;

    const checks = [
      verification.email_verified,
      verification.phone_verified,
      verification.id_verified,
      verification.selfie_verified,
    ];

    const done = checks.filter(Boolean).length;

    return Math.round((done / checks.length) * 100);
  }, [verification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          Loading verification...
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center gap-5">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-100"
          >
            <ArrowLeft size={22} />
          </button>

          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Verification
            </h1>

            <p className="mt-2 text-gray-500">
              Complete trust checks to improve guest and host confidence.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Account Trust Score
              </h2>

              <p className="mt-1 text-gray-500">
                Complete all verification steps for a trusted profile.
              </p>
            </div>

            <button
              onClick={loadVerification}
              className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold text-gray-700">
              Verification progress
            </span>

            <span className="font-bold text-[#8363F5]">
              {progress}%
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-[#8363F5]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <VerificationCard
            icon={<Mail />}
            title="Email verification"
            desc="Confirm your email address to receive booking updates and account alerts."
            active={Boolean(verification?.email_verified)}
            actionText="Verify Email"
          />

          <VerificationCard
            icon={<Phone />}
            title="Phone verification"
            desc="Verify your phone number so hosts and support can reach you when required."
            active={Boolean(verification?.phone_verified)}
            actionText="Verify Phone"
          />

          <VerificationCard
            icon={<FileText />}
            title="Government ID"
            desc="Upload and verify your government ID for higher trust and secure hosting."
            active={Boolean(verification?.id_verified)}
            actionText="Upload ID"
          />

          <VerificationCard
            icon={<UserRoundCheck />}
            title="Selfie verification"
            desc="Match your profile with a selfie to help keep the community safe."
            active={Boolean(verification?.selfie_verified)}
            actionText="Verify Selfie"
          />
        </div>

        <div className="mt-8 rounded-3xl bg-[#F4F1FF] p-6">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="text-[#8363F5]" />
            <h3 className="text-xl font-bold text-gray-900">
              Why verification matters
            </h3>
          </div>

          <p className="leading-7 text-gray-600">
            Verified profiles help hosts and guests feel safer before bookings,
            reduce fake accounts, and improve trust across the platform.
          </p>
        </div>
      </main>
    </div>
  );
}

function VerificationCard({ icon, title, desc, active, actionText }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#8363F5]">
          {icon}
        </div>

        {active ? (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
            <CheckCircle size={16} />
            Verified
          </span>
        ) : (
          <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700">
            Pending
          </span>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-900">{title}</h2>

      <p className="mt-2 min-h-14 text-sm leading-6 text-gray-500">
        {desc}
      </p>

      <button
        type="button"
        disabled={active}
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold ${
          active
            ? "cursor-not-allowed bg-green-100 text-green-700"
            : "bg-[#8363F5] text-white hover:bg-[#7152E8]"
        }`}
      >
        {active ? (
          <>
            <BadgeCheck size={18} />
            Completed
          </>
        ) : (
          actionText
        )}
      </button>
    </div>
  );
}