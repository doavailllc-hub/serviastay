import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

export default function AdminKyc() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Pending");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState({});

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/kyc");
      setItems(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "KYC load failed");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (userId, status) => {
    try {
      await api.put(`/admin/kyc/${userId}/status`, {
        status,
        note: notes[userId] || "",
      });

      toast.success(`KYC ${status}`);
      loadKyc();
    } catch (err) {
      toast.error(err.response?.data?.message || "KYC update failed");
    }
  };

  const filtered = useMemo(() => {
    let data = [...items];

    if (filter !== "All") {
      data = data.filter((item) => item.kyc_status === filter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((item) =>
        `${item.fullname || ""} ${item.email || ""} ${item.phone || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    return data;
  }, [items, filter, query]);

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            KYC Verification
          </h1>
          <p className="mt-2 text-gray-500">
            Review host identity and address proof documents.
          </p>
        </div>

        <button
          onClick={loadKyc}
          className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-5 py-3 font-bold text-white hover:bg-[#2f5fc2]"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-[1fr_220px]">
        <div className="flex h-12 items-center gap-3 rounded-xl border border-gray-300 px-4">
          <Search size={18} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search host name, email, phone..."
            className="flex-1 outline-none"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-12 rounded-xl border border-gray-300 px-4 outline-none"
        >
          <option>All</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Not Submitted</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-500">
          Loading KYC requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center text-gray-500">
          No KYC requests found.
        </div>
      ) : (
        <div className="grid gap-5">
          {filtered.map((item) => (
            <KycCard
              key={item.id}
              item={item}
              note={notes[item.id] ?? item.kyc_note ?? ""}
              setNote={(value) =>
                setNotes((prev) => ({ ...prev, [item.id]: value }))
              }
              onApprove={() => updateStatus(item.id, "Approved")}
              onReject={() => updateStatus(item.id, "Rejected")}
              onPending={() => updateStatus(item.id, "Pending")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KycCard({ item, note, setNote, onApprove, onReject, onPending }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {item.fullname || "Host"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">{item.email}</p>
          <p className="mt-1 text-sm text-gray-500">{item.phone || "No phone"}</p>
        </div>

        <StatusBadge status={item.kyc_status || "Not Submitted"} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DocumentBox title="ID Proof" url={item.kyc_id_proof} />
        <DocumentBox title="Address Proof" url={item.kyc_address_proof} />
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Admin note for host..."
        className="mt-5 w-full resize-none rounded-2xl border border-gray-300 p-4 text-sm outline-none focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/20"
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton
          icon={<BadgeCheck size={16} />}
          label="Approve"
          onClick={onApprove}
          className="border-green-300 text-green-700 hover:bg-green-50"
        />

        <ActionButton
          icon={<XCircle size={16} />}
          label="Reject"
          onClick={onReject}
          className="border-red-300 text-red-600 hover:bg-red-50"
        />

        <ActionButton
          icon={<ShieldCheck size={16} />}
          label="Mark Pending"
          onClick={onPending}
          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
        />
      </div>
    </div>
  );
}

function DocumentBox({ title, url }) {
  const isPdf = String(url || "").toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-2xl border border-gray-100 bg-[#FAFAFC] p-5">
      <div className="mb-4 flex items-center gap-2 text-[#3b71e6]">
        <FileText size={18} />
        <h4 className="font-bold text-gray-900">{title}</h4>
      </div>

      {!url ? (
        <p className="text-sm text-gray-500">No document uploaded.</p>
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#3b71e6] px-4 py-2 text-sm font-bold text-white hover:bg-[#2f5fc2]"
        >
          <Eye size={16} />
          View PDF
        </a>
      ) : (
        <>
          <img
            src={url}
            alt={title}
            className="h-48 w-full rounded-xl object-cover"
          />

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50"
          >
            <Eye size={16} />
            Open Full
          </a>
        </>
      )}
    </div>
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

  return (
    <span className={`h-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {status}
    </span>
  );
}

function ActionButton({ icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}