import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  Clock,
  CreditCard,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Payouts() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadPayouts();
  }, []);

  const formatINR = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const loadPayouts = async () => {
    try {
      setLoading(true);

      const user = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/host/payouts/${user.id}`);
      setData(res.data);
    } catch (err) {
      console.log("Payouts load failed:", err);
      alert("Payouts failed to load");
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!amount || Number(amount) <= 0) {
        alert("Enter a valid amount");
        return;
      }

      if (Number(amount) > Number(data?.availableBalance || 0)) {
        alert("Amount is higher than available balance");
        return;
      }

      setRequesting(true);

      await api.post("/host/payouts/request", {
        host_id: user.id,
        amount: Number(amount),
        method,
      });

      alert("Payout request submitted");
      setAmount("");
      loadPayouts();
    } catch (err) {
      console.log("Payout request failed:", err);
      alert("Payout request failed");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading payouts...
        </main>
      </div>
    );
  }

  const history = data?.history || [];

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Host Payouts
            </h1>

            <p className="mt-2 text-gray-500">
              Track earnings, request withdrawals, and view payout history.
            </p>
          </div>

          <button
            onClick={loadPayouts}
            className="flex items-center gap-2 rounded-xl bg-[#3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-4">
          <StatCard
            icon={<Wallet />}
            title="Total Earnings"
            value={formatINR(data?.totalEarnings)}
            color="text-[#3b71e6]"
          />

          <StatCard
            icon={<Banknote />}
            title="Available Balance"
            value={formatINR(data?.availableBalance)}
            color="text-green-600"
          />

          <StatCard
            icon={<Clock />}
            title="Pending Payout"
            value={formatINR(data?.pendingPayout)}
            color="text-yellow-600"
          />

          <StatCard
            icon={<CreditCard />}
            title="Paid Out"
            value={formatINR(data?.paidOut)}
            color="text-gray-900"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-2xl font-semibold">Payout History</h2>
              <p className="mt-1 text-gray-500">
                All withdrawal requests and completed payouts.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="p-14 text-center">
                <div className="mb-4 text-6xl">💸</div>
                <h3 className="text-2xl font-bold">No payouts yet</h3>
                <p className="mt-2 text-gray-500">
                  Your payout requests will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-6 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-bold">
                        {formatINR(item.amount)}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Method: {item.method || "Bank Transfer"}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : ""}
                      </p>
                    </div>

                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
                <Send />
              </div>

              <h2 className="text-2xl font-bold">Request Payout</h2>

              <p className="mt-2 text-gray-500">
                Available balance:{" "}
                <span className="font-bold text-[#3b71e6]">
                  {formatINR(data?.availableBalance)}
                </span>
              </p>

              <div className="mt-6 space-y-4">
                <input
                  value={amount}
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 w-full rounded-xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-[#3b71e6]"
                />

                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="h-14 w-full rounded-xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-[#3b71e6]"
                >
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Razorpay Payout</option>
                </select>

                <button
                  onClick={requestPayout}
                  disabled={requesting}
                  className="h-14 w-full rounded-xl bg-[#3b71e6] font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
                >
                  {requesting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-r from-[#3b71e6] to-[#6D4EEB] p-6 text-white shadow-xl">
              <h2 className="text-2xl font-bold">Payout Notes</h2>

              <p className="mt-3 text-white/90">
                Payout requests are reviewed by admin. Once approved, funds are
                transferred to your selected payment method.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[#3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Pending";

  const style =
    value === "Paid"
      ? "bg-green-100 text-green-700"
      : value === "Rejected"
      ? "bg-red-100 text-red-600"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`rounded-full px-4 py-2 text-sm font-semibold ${style}`}>
      {value}
    </span>
  );
}