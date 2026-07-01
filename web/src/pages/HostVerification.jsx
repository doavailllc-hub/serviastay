import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  IdCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const DOCS = [
  {
    key: "id_front",
    title: "Government ID front",
    text: "Upload Aadhaar, passport, driving license, or national ID front side.",
    required: true,
  },
  {
    key: "id_back",
    title: "Government ID back",
    text: "Upload the back side if your ID has address or verification details.",
    required: false,
  },
  {
    key: "selfie",
    title: "Selfie photo",
    text: "Upload a clear selfie so we can match your identity.",
    required: true,
  },
  {
    key: "address_proof",
    title: "Address proof",
    text: "Upload utility bill, bank statement, or rental agreement.",
    required: true,
  },
];

export default function HostVerification() {
  const [kyc, setKyc] = useState(null);
  const [files, setFiles] = useState({
    id_front: null,
    id_back: null,
    selfie: null,
    address_proof: null,
  });
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => localStorage.getItem("token"), []);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadKyc = async () => {
    try {
      setLoading(true);

      const { data } = await api.get("/host/kyc", { headers });

      setKyc(data.kyc || null);
    } catch (err) {
      console.log("Host KYC load failed:", err);
      toast.error(err.response?.data?.message || "KYC load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const updateFile = (key, file) => {
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Only image or PDF files are allowed");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size must be below 8MB");
      return;
    }

    setFiles((prev) => ({
      ...prev,
      [key]: file,
    }));

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);

      setPreviews((prev) => ({
        ...prev,
        [key]: url,
      }));
    } else {
      setPreviews((prev) => ({
        ...prev,
        [key]: null,
      }));
    }
  };

  const removeFile = (key) => {
    setFiles((prev) => ({
      ...prev,
      [key]: null,
    }));

    setPreviews((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  const submitKyc = async () => {
    try {
      if (!files.id_front && !kyc?.id_front) {
        toast.error("Government ID front is required");
        return;
      }

      if (!files.selfie && !kyc?.selfie) {
        toast.error("Selfie photo is required");
        return;
      }

      if (!files.address_proof && !kyc?.address_proof) {
        toast.error("Address proof is required");
        return;
      }

      const formData = new FormData();

      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      setSubmitting(true);

      await api.post("/host/kyc", formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("KYC submitted for review");

      setFiles({
        id_front: null,
        id_back: null,
        selfie: null,
        address_proof: null,
      });

      setPreviews({});

      loadKyc();
    } catch (err) {
      console.log("Host KYC submit failed:", err);
      toast.error(err.response?.data?.message || "KYC submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const status = kyc?.status || "Not Submitted";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd]">
        <Navbar />
        <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 pt-24">
          <Loader2 className="animate-spin text-[#3b71e6]" size={36} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#202124]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-8">
        <section className="rounded-[30px] border border-[#dadce0] bg-white px-6 py-7 md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#3b71e6]">
                Host verification
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Identity Verification
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6368]">
                Verify your identity to build guest trust and unlock host
                payouts.
              </p>
            </div>

            <button
              onClick={loadKyc}
              className="flex h-10 items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#3b71e6] transition hover:bg-[#eef4ff]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[370px_1fr]">
          <aside className="space-y-5">
            <StatusCard status={status} kyc={kyc} />

            <section className="rounded-[26px] border border-[#dadce0] bg-white p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#3b71e6]" size={24} />
                <div>
                  <h2 className="text-lg font-semibold">Why verify?</h2>
                  <p className="text-sm text-[#5f6368]">
                    Verified hosts receive higher trust and safer payouts.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3 text-sm text-[#5f6368]">
                <li className="flex gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 text-green-600" />
                  Unlock host payout requests.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 text-green-600" />
                  Show verified host status to guests.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 size={17} className="mt-0.5 text-green-600" />
                  Protect guests and platform safety.
                </li>
              </ul>
            </section>
          </aside>

          <section className="rounded-[30px] border border-[#dadce0] bg-white p-5 md:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Upload documents</h2>
              <p className="mt-1 text-sm text-[#5f6368]">
                Upload clear photos. Blurry or cropped documents may be
                rejected.
              </p>
            </div>

            {status === "Approved" && (
              <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                Your identity is verified. Re-upload only if your details have
                changed.
              </div>
            )}

            {status === "Rejected" && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Rejected: {kyc?.rejection_reason || "Please upload clearer documents."}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {DOCS.map((doc) => (
                <DocumentUpload
                  key={doc.key}
                  doc={doc}
                  file={files[doc.key]}
                  preview={previews[doc.key]}
                  currentUrl={kyc?.[doc.key]}
                  onChange={(file) => updateFile(doc.key, file)}
                  onRemove={() => removeFile(doc.key)}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-[#eef0f3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#5f6368]">
                By submitting, you confirm that the documents are valid and
                belong to you.
              </p>

              <button
                onClick={submitKyc}
                disabled={submitting}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-6 text-sm font-semibold text-white transition hover:bg-[#2f5fc2] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    Submit verification
                  </>
                )}
              </button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function StatusCard({ status, kyc }) {
  const config = {
    "Not Submitted": {
      icon: <AlertCircle size={24} />,
      title: "Not submitted",
      text: "Upload your documents to start verification.",
      classes: "border-yellow-200 bg-yellow-50 text-yellow-700",
    },
    Pending: {
      icon: <Loader2 size={24} className="animate-spin" />,
      title: "Pending review",
      text: "Your documents are under admin review.",
      classes: "border-blue-200 bg-blue-50 text-blue-700",
    },
    Approved: {
      icon: <CheckCircle2 size={24} />,
      title: "Verified host",
      text: "Your identity has been approved.",
      classes: "border-green-200 bg-green-50 text-green-700",
    },
    Rejected: {
      icon: <XCircle size={24} />,
      title: "Rejected",
      text: kyc?.rejection_reason || "Please upload valid documents again.",
      classes: "border-red-200 bg-red-50 text-red-700",
    },
  };

  const item = config[status] || config["Not Submitted"];

  return (
    <section className={`rounded-[26px] border p-6 ${item.classes}`}>
      <div className="flex items-center gap-3">
        {item.icon}
        <div>
          <h2 className="text-lg font-semibold">{item.title}</h2>
          <p className="text-sm opacity-90">{item.text}</p>
        </div>
      </div>

      {kyc?.updated_at && (
        <p className="mt-4 text-xs opacity-80">
          Last updated: {new Date(kyc.updated_at).toLocaleString("en-IN")}
        </p>
      )}
    </section>
  );
}

function DocumentUpload({
  doc,
  file,
  preview,
  currentUrl,
  onChange,
  onRemove,
}) {
  return (
    <article className="rounded-[24px] border border-[#dadce0] bg-[#fbfcff] p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[#3b71e6]">
          <IdCard size={20} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#202124]">
            {doc.title}{" "}
            {doc.required && <span className="text-red-500">*</span>}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#5f6368]">{doc.text}</p>
        </div>
      </div>

      {(preview || currentUrl) && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[#dadce0] bg-white">
          {preview ? (
            <img
              src={preview}
              alt={doc.title}
              className="h-40 w-full object-cover"
            />
          ) : currentUrl?.toLowerCase().endsWith(".pdf") ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-[#5f6368]">
              <FileImage size={20} />
              PDF uploaded
            </div>
          ) : (
            <img
              src={currentUrl}
              alt={doc.title}
              className="h-40 w-full object-cover"
            />
          )}
        </div>
      )}

      <label className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#b8c7f8] bg-white px-4 text-center transition hover:bg-[#eef4ff]">
        <UploadCloud className="mb-2 text-[#3b71e6]" size={26} />
        <p className="text-sm font-semibold text-[#202124]">
          {file ? file.name : "Click to upload"}
        </p>
        <p className="mt-1 text-xs text-[#5f6368]">
          JPG, PNG, WEBP or PDF. Max 8MB.
        </p>

        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      </label>

      {file && (
        <button
          onClick={onRemove}
          className="mt-3 flex h-9 items-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
        >
          <X size={14} />
          Remove selected file
        </button>
      )}
    </article>
  );
}