import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  IndianRupee,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

export default function AdminFinance() {
  const [data, setData] = useState({
    payments: [],
    payouts: [],
    ledger: [],
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadFinance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/finance");
      setData(res.data || { payments: [], payouts: [], ledger: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Finance load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const summary = useMemo(() => {
    const payments = data.payments || [];
    const payouts = data.payouts || [];

    const totalRevenue = payments.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    const platformCommission = Math.round(totalRevenue * 0.1);

    const pendingPayouts = payouts
      .filter((p) => ["Pending", "Approved"].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const paidPayouts = payouts
      .filter((p) => p.status === "Paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      totalRevenue,
      platformCommission,
      pendingPayouts,
      paidPayouts,
      netBalance: totalRevenue - paidPayouts,
    };
  }, [data]);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.payments || [];

    return (data.payments || []).filter((item) =>
      `${item.guest_name || ""} ${item.host_name || ""} ${
        item.property_title || ""
      } ${item.payment_status || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#3b71e6]" size={36} />
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">
              Finance Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Revenue, Payments & Payouts
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Monitor platform revenue, host payouts, payment status and wallet
              ledger from one place.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Download size={16} />
              Export
            </button>

            <button
              onClick={loadFinance}
              className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Stat title="Total Revenue" value={formatINR(summary.totalRevenue)} icon={<IndianRupee />} />
        <Stat title="Commission" value={formatINR(summary.platformCommission)} icon={<CreditCard />} />
        <Stat title="Pending Payouts" value={formatINR(summary.pendingPayouts)} icon={<Wallet />} />
        <Stat title="Paid Payouts" value={formatINR(summary.paidPayouts)} icon={<Wallet />} />
        <Stat title="Net Balance" value={formatINR(summary.netBalance)} icon={<IndianRupee />} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="text-xl font-semibold">Customer Payments</h2>

          <div className="relative w-full md:w-96">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search payments..."
              className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-[#3b71e6]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-3">Booking</th>
                <th>Guest</th>
                <th>Host</th>
                <th>Property</th>
                <th>Total</th>
                <th>Commission</th>
                <th>Host Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map((item) => {
                const total = Number(item.total || 0);
                const commission = Math.round(total * 0.1);
                const hostAmount = total - commission;

                return (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-4 font-semibold">#{item.id}</td>
                    <td>{item.guest_name || "-"}</td>
                    <td>{item.host_name || "-"}</td>
                    <td className="max-w-[220px] truncate">
                      {item.property_title || "-"}
                    </td>
                    <td>{formatINR(total)}</td>
                    <td>{formatINR(commission)}</td>
                    <td>{formatINR(hostAmount)}</td>
                    <td>
                      <StatusBadge status={item.payment_status || item.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
              No payment records found.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Host Payout Queue">
          {(data.payouts || []).length === 0 ? (
            <Empty text="No payout requests found." />
          ) : (
            <div className="space-y-3">
              {(data.payouts || []).slice(0, 10).map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
                >
                  <div>
                    <p className="font-semibold">{payout.host_name || `Host #${payout.host_id}`}</p>
                    <p className="text-sm text-gray-500">
                      Requested {formatINR(payout.amount)}
                    </p>
                  </div>
                  <StatusBadge status={payout.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Wallet Ledger">
          {(data.ledger || []).length === 0 ? (
            <Empty text="No wallet ledger found." />
          ) : (
            <div className="space-y-3">
              {(data.ledger || []).slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 p-4"
                >
                  <div>
                    <p className="font-semibold">{item.description || item.type}</p>
                    <p className="text-sm text-gray-500">
                      Host #{item.host_id} · {formatDate(item.created_at)}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${
                      item.type === "payout" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {item.type === "payout" ? "-" : "+"}
                    {formatINR(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </main>
  );
}

function Stat({ title, value, icon }) {
  return (
    <article className="rounded-[22px] border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
        {icon}
      </div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-2 text-xl font-semibold">{value}</h3>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5">
      <h2 className="mb-5 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "border-green-200 bg-green-50 text-green-700",
    Approved: "border-blue-200 bg-blue-50 text-blue-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    Failed: "border-red-200 bg-red-50 text-red-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Confirmed: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] || "border-gray-200 bg-gray-50 text-gray-600"
      }`}
    >
      {status || "Unknown"}
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