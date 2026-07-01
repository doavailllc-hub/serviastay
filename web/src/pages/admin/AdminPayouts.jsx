import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/payouts");
      setPayouts(data || []);
    } catch (err) {
      console.log("Admin payouts load failed:", err);
      toast.error(err.response?.data?.message || "Payouts load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const filteredPayouts = useMemo(() => {
    return payouts.filter((item) => {
      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        String(item.host_name || "").toLowerCase().includes(keyword) ||
        String(item.host_email || "").toLowerCase().includes(keyword) ||
        String(item.upi_id || "").toLowerCase().includes(keyword) ||
        String(item.bank_name || "").toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [payouts, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      pending: payouts.filter((item) => item.status === "Pending").length,
      approved: payouts.filter((item) => item.status === "Approved").length,
      paidAmount: payouts
        .filter((item) => item.status === "Paid")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      totalAmount: payouts.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      ),
    };
  }, [payouts]);

  const updateStatus = async (id, status) => {
    const adminNote =
      status === "Rejected"
        ? window.prompt("Reason for rejection?") || ""
        : "";

    try {
      setUpdatingId(id);

      await api.put(`/admin/payouts/${id}/status`, {
        status,
        admin_note: adminNote,
      });

      toast.success(`Payout marked as ${status}`);
      loadPayouts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payout update failed");
    } finally {
      setUpdatingId(null);
    }
  };

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
            <p className="text-sm font-medium text-[#3b71e6]">Admin payouts</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Payout Requests
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Review host payout requests, approve withdrawals, and mark paid
              transfers.
            </p>
          </div>

          <button
            onClick={loadPayouts}
            className="flex h-10 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-medium text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Clock />}
          title="Pending"
          value={stats.pending}
        />
        <StatCard
          icon={<CheckCircle2 />}
          title="Approved"
          value={stats.approved}
        />
        <StatCard
          icon={<IndianRupee />}
          title="Paid"
          value={formatINR(stats.paidAmount)}
        />
        <StatCard
          icon={<Wallet />}
          title="Total requested"
          value={formatINR(stats.totalAmount)}
        />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search host, bank, UPI..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", "Pending", "Approved", "Paid", "Rejected"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    statusFilter === status
                      ? "bg-[#3b71e6] text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>

        {filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No payout requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Host</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Method</th>
                  <th className="px-5 py-4 font-medium">Bank / UPI</th>
                  <th className="px-5 py-4 font-medium">Requested</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredPayouts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {item.host_name || "Host"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.host_email || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-semibold text-[#3b71e6]">
                      {formatINR(item.amount)}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {item.payout_method || "bank"}
                    </td>

                    <td className="px-5 py-4">
                      {item.upi_id ? (
                        <span>{item.upi_id}</span>
                      ) : (
                        <div>
                          <p>{item.bank_name || "-"}</p>
                          <p className="text-xs text-gray-500">
                            {item.account_holder || "-"} ·{" "}
                            {maskAccount(item.account_number)}
                          </p>
                          <p className="text-xs text-gray-500">
                            IFSC: {item.ifsc_code || "-"}
                          </p>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {item.requested_at
                        ? new Date(item.requested_at).toLocaleDateString(
                            "en-IN"
                          )
                        : "-"}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.status === "Pending" && (
                          <>
                            <ActionButton
                              label="Approve"
                              disabled={updatingId === item.id}
                              onClick={() => updateStatus(item.id, "Approved")}
                            />
                            <ActionButton
                              label="Reject"
                              danger
                              disabled={updatingId === item.id}
                              onClick={() => updateStatus(item.id, "Rejected")}
                            />
                          </>
                        )}

                        {item.status === "Approved" && (
                          <ActionButton
                            label="Mark Paid"
                            success
                            disabled={updatingId === item.id}
                            onClick={() => updateStatus(item.id, "Paid")}
                          />
                        )}

                        {["Paid", "Rejected"].includes(item.status) && (
                          <span className="text-xs text-gray-400">
                            No action
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <article className="rounded-[24px] border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-2xl font-semibold">{value}</h3>
    </article>
  );
}

function ActionButton({ label, onClick, disabled, danger, success }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : success
          ? "bg-green-50 text-green-700 hover:bg-green-100"
          : "bg-blue-50 text-[#3b71e6] hover:bg-blue-100"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const value = status || "Pending";

  const styles = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-blue-100 text-blue-700",
    Paid: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  const icons = {
    Pending: <Clock size={14} />,
    Approved: <CheckCircle2 size={14} />,
    Paid: <CheckCircle2 size={14} />,
    Rejected: <XCircle size={14} />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
        styles[value] || styles.Pending
      }`}
    >
      {icons[value]}
      {value}
    </span>
  );
}

function maskAccount(number) {
  if (!number) return "-";
  const value = String(number);
  return value.length <= 4 ? value : `••••${value.slice(-4)}`;
}