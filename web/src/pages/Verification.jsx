import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  FileText,
  Home,
  RefreshCw,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Verification() {
  const navigate = useNavigate();

  const [kyc, setKyc] = useState(null);
  const [idProof, setIdProof] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user?.id || !token) {
        navigate("/");
        return;
      }

      const res = await api.get("/kyc/me");
      setKyc(res.data);
    } catch (err) {
      console.log("KYC load failed:", err);
      toast.error("Verification details failed to load");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await api.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data.imageUrl;
  };

  const submitKyc = async () => {
    if (!idProof || !addressProof) {
      toast.error("Please upload both ID proof and address proof");
      return;
    }

    try {
      setUploading(true);

      const idProofUrl = await uploadFile(idProof);
      const addressProofUrl = await uploadFile(addressProof);

      await api.post("/kyc/submit", {
        id_proof: idProofUrl,
        address_proof: addressProofUrl,
      });

      toast.success("KYC submitted for review");
      setIdProof(null);
      setAddressProof(null);
      await loadKyc();
    } catch (err) {
      console.log("KYC submit failed:", err);
      toast.error(err.response?.data?.message || "KYC submit failed");
    } finally {
      setUploading(false);
    }
  };

  const status = kyc?.kyc_status || "Not Submitted";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Host Verification
            </h1>
            <p className="mt-2 text-gray-500">
              Submit your identity and address documents to become a verified
              host.
            </p>
          </div>

          <button
            type="button"
            onClick={loadKyc}
            className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white shadow-lg hover:bg-[#6f43e4]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f0ff] text-[#3b71e6]">
                <ShieldCheck size={28} />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Submit verification documents
                </h2>
                <p className="mt-2 text-gray-500">
                  Upload clear photos or PDF files of your ID proof and address
                  proof.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#FAFAFC] p-8 text-center text-gray-500">
                Loading verification...
              </div>
            ) : status === "Approved" ? (
              <ApprovedCard />
            ) : (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  <UploadBox
                    title="ID Proof"
                    description="Passport, Aadhaar, Emirates ID, driving license, or national ID."
                    file={idProof}
                    onChange={setIdProof}
                  />

                  <UploadBox
                    title="Address Proof"
                    description="Utility bill, bank statement, rental agreement, or official address document."
                    file={addressProof}
                    onChange={setAddressProof}
                  />
                </div>

                {kyc?.kyc_note && (
                  <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
                    <b>Admin note:</b> {kyc.kyc_note}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitKyc}
                  disabled={uploading}
                  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] font-bold text-white shadow-lg hover:bg-[#6f43e4] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:px-8"
                >
                  <Upload size={18} />
                  {uploading ? "Submitting..." : "Submit for Verification"}
                </button>
              </>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <StatusBadge status={status} />

              <h2 className="mt-5 text-2xl font-bold text-gray-900">
                Verification Status
              </h2>

              <p className="mt-2 text-gray-500">
                Current status of your host verification.
              </p>

              <div className="mt-6 space-y-4">
                <Info label="Name" value={kyc?.fullname || "User"} />
                <Info label="Email" value={kyc?.email || "-"} />
                <Info label="Status" value={status} />
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-[#3b71e6] to-[#6f43e4] p-6 text-white shadow-xl">
              <h2 className="text-2xl font-bold">Why verify?</h2>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/90">
                <li>✓ Builds guest trust</li>
                <li>✓ Improves listing credibility</li>
                <li>✓ Helps prevent fake hosts</li>
                <li>✓ Required for professional hosting</li>
              </ul>

              <button
                type="button"
                onClick={() => navigate("/host-dashboard")}
                className="mt-6 flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#3b71e6]"
              >
                <Home size={18} />
                Host Dashboard
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function UploadBox({ title, description, file, onChange }) {
  return (
    <label className="group cursor-pointer rounded-3xl border-2 border-dashed border-gray-200 bg-[#FAFAFC] p-6 transition hover:border-[#3b71e6] hover:bg-[#f7f4ff]">
      <input
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#3b71e6] shadow-sm">
        <FileText size={26} />
      </div>

      <h3 className="mt-5 text-xl font-bold text-gray-900">{title}</h3>
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-semibold text-gray-700">
        {file ? file.name : "Click to upload document"}
      </div>
    </label>
  );
}

function StatusBadge({ status }) {
  const style =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Rejected"
      ? "bg-red-100 text-red-600"
      : status === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-600";

  const Icon =
    status === "Approved" ? BadgeCheck : status === "Rejected" ? XCircle : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${style}`}
    >
      <Icon size={16} />
      {status}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-4">
      <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900">{value || "-"}</p>
    </div>
  );
}

function ApprovedCard() {
  return (
    <div className="rounded-3xl border border-green-100 bg-green-50 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-green-600">
        <BadgeCheck size={34} />
      </div>

      <h3 className="mt-5 text-2xl font-bold text-green-700">
        You are verified
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-green-700/80">
        Your documents have been approved. Your host profile can now show a
        verified badge to guests.
      </p>
    </div>
  );
}