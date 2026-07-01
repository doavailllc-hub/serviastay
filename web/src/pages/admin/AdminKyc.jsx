import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

export default function AdminKyc() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadKyc();
  }, []);

  const loadKyc = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/host-kyc");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "KYC load failed");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (kycId, status) => {
    const reason = notes[kycId] || "";

    if (status === "Rejected" && !reason.trim()) {
      toast.error("Please add rejection reason");
      return;
    }

    try {
      setUpdatingId(kycId);

      await api.put(`/admin/host-kyc/${kycId}/status`, {
        status,
        rejection_reason: reason,
      });

      toast.success(`KYC marked as ${status}`);
      await loadKyc();
    } catch (err) {
      toast.error(err.response?.data?.message || "KYC update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = filter === "All" || item.status === filter;
      const keyword = query.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        `${item.host_name || ""} ${item.host_email || ""} ${
          item.host_phone || ""
        }`
          .toLowerCase()
          .includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [items, filter, query]);

  const stats = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "Pending").length,
      approved: items.filter((item) => item.status === "Approved").length,
      rejected: items.filter((item) => item.status === "Rejected").length,
      total: items.length,
    }),
    [items]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
      </div>
    );
  }

  return (
    <main className="space-y-8">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#3b71e6]">
              Host verification
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              KYC Verification
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review host identity documents, approve verified hosts, and block
              payouts for unverified accounts.
            </p>
          </div>

          <button
            onClick={loadKyc}
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-medium text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="Pending" value={stats.pending} icon={<ShieldCheck />} />
        <StatCard title="Approved" value={stats.approved} icon={<BadgeCheck />} />
        <StatCard title="Rejected" value={stats.rejected} icon={<XCircle />} />
        <StatCard title="Total" value={stats.total} icon={<UserCheck />} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search host name, email, phone..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          >
            <option>All</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
            <option>Not Submitted</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-12 text-center text-sm text-gray-500">
            No KYC requests found.
          </div>
        ) : (
          <div className="grid gap-5">
            {filtered.map((item) => (
              <KycCard
                key={item.id}
                item={item}
                note={notes[item.id] ?? item.rejection_reason ?? ""}
                setNote={(value) =>
                  setNotes((prev) => ({ ...prev, [item.id]: value }))
                }
                updating={updatingId === item.id}
                onApprove={() => updateStatus(item.id, "Approved")}
                onReject={() => updateStatus(item.id, "Rejected")}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function KycCard({ item, note, setNote, updating, onApprove, onReject }) {
  return (
    <article className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-950">
            {item.host_name || "Host"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {item.host_email || "-"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {item.host_phone || "No phone"}
          </p>
        </div>

        <StatusBadge status={item.status || "Not Submitted"} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DocumentBox title="ID Front" url={item.id_front} />
        <DocumentBox title="ID Back" url={item.id_back} />
        <DocumentBox title="Selfie" url={item.selfie} />
        <DocumentBox title="Address Proof" url={item.address_proof} />
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Rejection reason / admin note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Required when rejecting KYC..."
          className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ActionButton
          icon={<BadgeCheck size={16} />}
          label="Approve"
          onClick={onApprove}
          disabled={updating || item.status === "Approved"}
          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
        />

        <ActionButton
          icon={<XCircle size={16} />}
          label="Reject"
          onClick={onReject}
          disabled={updating || item.status === "Rejected"}
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        />
      </div>
    </article>
  );
}

function DocumentBox({ title, url }) {
  const isPdf = String(url || "").toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-2xl border border-gray-200 bg-[#FAFAFC] p-4">
      <div className="mb-3 flex items-center gap-2 text-[#3b71e6]">
        <FileText size={17} />
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>

      {!url ? (
        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-center text-xs text-gray-400">
          No document uploaded
        </div>
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-36 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
        >
          <Eye size={16} className="mr-2" />
          View PDF
        </a>
      ) : (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={title}
              className="h-36 w-full rounded-xl object-cover transition hover:opacity-90"
            />
          </a>

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
          >
            <Eye size={14} />
            Open full
          </a>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <article className="rounded-[22px] border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </article>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Approved: "border-green-200 bg-green-50 text-green-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    "Not Submitted": "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <span
      className={`h-fit rounded-full border px-4 py-2 text-sm font-semibold ${
        styles[status] || styles["Not Submitted"]
      }`}
    >
      {status}
    </span>
  );
}

function ActionButton({ icon, label, onClick, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}