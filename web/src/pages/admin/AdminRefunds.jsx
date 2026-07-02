import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const filters = ["All", "Pending", "Approved", "Rejected", "Paid"];

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState({});
  const [updatingId, setUpdatingId] = useState(null);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/refunds");
      setRefunds(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Refunds load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const updateStatus = async (refundId, status) => {
    const admin_note = notes[refundId] || "";

    if (status === "Rejected" && !admin_note.trim()) {
      toast.error("Admin note is required for rejection");
      return;
    }

    try {
      setUpdatingId(refundId);

      await api.put(`/admin/refunds/${refundId}/status`, {
        status,
        admin_note,
      });

      toast.success(`Refund marked as ${status}`);
      await loadRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || "Refund update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => {
    return refunds.filter((item) => {
      const statusOk = filter === "All" || item.status === filter;
      const q = query.trim().toLowerCase();

      const searchOk =
        !q ||
        `${item.guest_name || ""} ${item.guest_email || ""} ${
          item.property_title || ""
        } ${item.reason || ""}`
          .toLowerCase()
          .includes(q);

      return statusOk && searchOk;
    });
  }, [refunds, filter, query]);

  const stats = useMemo(
    () => ({
      pending: refunds.filter((r) => r.status === "Pending").length,
      approved: refunds.filter((r) => r.status === "Approved").length,
      paid: refunds.filter((r) => r.status === "Paid").length,
      totalAmount: refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    }),
    [refunds]
  );

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
              <RotateCcw size={24} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#3b71e6]">
                Finance Operations
              </p>
              <h1 className="text-3xl font-semibold">Refund Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review refund requests, approve/reject, and mark refunds as paid.
              </p>
            </div>
          </div>

          <button
            onClick={loadRefunds}
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Pending" value={stats.pending} />
        <Stat title="Approved" value={stats.approved} />
        <Stat title="Paid" value={stats.paid} />
        <Stat title="Total Requested" value={formatINR(stats.totalAmount)} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guest, property, reason..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-11 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-[#3b71e6]"
          >
            {filters.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-12 text-center text-sm text-gray-500">
            No refund requests found.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((refund) => (
              <article
                key={refund.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        Refund #{refund.id}
                      </h3>
                      <StatusBadge status={refund.status} />
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {refund.guest_name || "Guest"} · {refund.guest_email}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Booking #{refund.booking_id} ·{" "}
                      {refund.property_title || "Property"}
                    </p>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">
                      <b>Reason:</b> {refund.reason || "-"}
                    </p>

                    {refund.admin_note && (
                      <p className="mt-2 rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">
                        <b>Admin note:</b> {refund.admin_note}
                      </p>
                    )}
                  </div>

                  <div className="text-left lg:text-right">
                    <p className="text-2xl font-semibold">
                      {formatINR(refund.amount)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Requested {formatDate(refund.created_at)}
                    </p>
                  </div>
                </div>

                <textarea
                  value={notes[refund.id] ?? refund.admin_note ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [refund.id]: e.target.value }))
                  }
                  rows={3}
                  placeholder="Admin note, rejection reason, payout note..."
                  className="mt-5 w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6]"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <Action
                    disabled={updatingId === refund.id || refund.status === "Approved"}
                    onClick={() => updateStatus(refund.id, "Approved")}
                    className="border-green-200 bg-green-50 text-green-700"
                    icon={<CheckCircle2 size={16} />}
                  >
                    Approve
                  </Action>

                  <Action
                    disabled={updatingId === refund.id || refund.status === "Rejected"}
                    onClick={() => updateStatus(refund.id, "Rejected")}
                    className="border-red-200 bg-red-50 text-red-700"
                    icon={<XCircle size={16} />}
                  >
                    Reject
                  </Action>

                  <Action
                    disabled={updatingId === refund.id || refund.status === "Paid"}
                    onClick={() => updateStatus(refund.id, "Paid")}
                    className="border-blue-200 bg-blue-50 text-blue-700"
                    icon={<CheckCircle2 size={16} />}
                  >
                    Mark Paid
                  </Action>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ title, value }) {
  return (
    <article className="rounded-[22px] border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </article>
  );
}

function Action({ children, icon, className, ...props }) {
  return (
    <button
      {...props}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    Approved: "border-blue-200 bg-blue-50 text-blue-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Paid: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] || "border-gray-200 bg-gray-50 text-gray-600"
      }`}
    >
      {status || "Pending"}
    </span>
  );
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN");
}