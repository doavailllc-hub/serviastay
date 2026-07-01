import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Loader2,
  RefreshCw,
  Send,
  Wallet,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function HostWallet() {
  const [wallet, setWallet] = useState(null);
  const [bank, setBank] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [amount, setAmount] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [bankForm, setBankForm] = useState({
    account_holder: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
  });

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  const formatINR = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const loadWallet = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        toast.error("Please login again");
        return;
      }

   const token = localStorage.getItem("token");

const { data } = await api.get(`/host/wallet/${user.id}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

      setWallet(data.wallet || null);
      setBank(data.bank_account || null);
      setPayouts(data.payouts || []);

      if (data.bank_account) {
        setBankForm({
          account_holder: data.bank_account.account_holder || "",
          bank_name: data.bank_account.bank_name || "",
          account_number: data.bank_account.account_number || "",
          ifsc_code: data.bank_account.ifsc_code || "",
          upi_id: data.bank_account.upi_id || "",
        });
      }
    } catch (err) {
      console.log("Wallet load failed:", err);
      toast.error(err.response?.data?.message || "Wallet load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, []);

  const saveBank = async () => {
    try {
      setSavingBank(true);

const token = localStorage.getItem("token");

await api.post("/host/bank-account", bankForm, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
      toast.success("Bank account saved");
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bank save failed");
    } finally {
      setSavingBank(false);
    }
  };

  const requestPayout = async () => {
    try {
      const payoutAmount = Number(amount);

      if (!payoutAmount || payoutAmount <= 0) {
        toast.error("Enter valid amount");
        return;
      }

      setRequesting(true);
const token = localStorage.getItem("token");

await api.post(
  "/host/payout-request",
  {
    amount: payoutAmount,
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      toast.success("Payout request submitted");
      setAmount("");
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || "Payout request failed");
    } finally {
      setRequesting(false);
    }
  };

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
        <section className="rounded-[28px] border border-[#dadce0] bg-white px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#1a73e8]">
                Host wallet
              </p>
              <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">
                Wallet & Payouts
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6368]">
                Manage available balance, bank details and payout requests.
              </p>
            </div>

            <button
              onClick={loadWallet}
              className="flex h-10 items-center gap-2 rounded-full border border-[#dadce0] bg-white px-5 text-sm font-medium text-[#1a73e8] transition hover:bg-[#f1f5ff]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <WalletCard
            icon={<Wallet />}
            title="Available balance"
            value={formatINR(wallet?.available_balance)}
            highlight
          />

          <WalletCard
            icon={<Clock />}
            title="Pending earnings"
            value={formatINR(wallet?.pending_earnings)}
          />

          <WalletCard
            icon={<Send />}
            title="Pending payouts"
            value={formatINR(wallet?.pending_payouts)}
          />

          <WalletCard
            icon={<IndianRupee />}
            title="Lifetime earnings"
            value={formatINR(wallet?.total_earnings)}
          />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_420px]">
          <div className="rounded-[28px] border border-[#dadce0] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <Building2 className="text-[#1a73e8]" />
              <div>
                <h2 className="text-xl font-medium">Bank account</h2>
                <p className="text-sm text-[#5f6368]">
                  Add UPI or bank details for manual payout processing.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Account holder"
                value={bankForm.account_holder}
                onChange={(v) =>
                  setBankForm({ ...bankForm, account_holder: v })
                }
              />

              <Input
                label="Bank name"
                value={bankForm.bank_name}
                onChange={(v) => setBankForm({ ...bankForm, bank_name: v })}
              />

              <Input
                label="Account number"
                value={bankForm.account_number}
                onChange={(v) =>
                  setBankForm({ ...bankForm, account_number: v })
                }
              />

              <Input
                label="IFSC code"
                value={bankForm.ifsc_code}
                onChange={(v) =>
                  setBankForm({ ...bankForm, ifsc_code: v.toUpperCase() })
                }
              />

              <div className="md:col-span-2">
                <Input
                  label="UPI ID"
                  value={bankForm.upi_id}
                  onChange={(v) => setBankForm({ ...bankForm, upi_id: v })}
                  placeholder="name@upi"
                />
              </div>
            </div>

            <button
              onClick={saveBank}
              disabled={savingBank}
              className="mt-5 h-11 rounded-xl bg-[#3b71e6] px-6 text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:opacity-60"
            >
              {savingBank ? "Saving..." : bank ? "Update bank details" : "Save bank details"}
            </button>
          </div>

          <div className="rounded-[28px] border border-[#dadce0] bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <CreditCard className="text-[#1a73e8]" />
              <div>
                <h2 className="text-xl font-medium">Request payout</h2>
                <p className="text-sm text-[#5f6368]">
                  Available: {formatINR(wallet?.available_balance)}
                </p>
              </div>
            </div>

            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={setAmount}
              placeholder="Enter payout amount"
            />

            <button
              onClick={requestPayout}
              disabled={requesting}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-medium text-white transition hover:bg-[#2f5fc2] disabled:opacity-60"
            >
              {requesting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Request payout
                </>
              )}
            </button>

            <p className="mt-4 text-xs leading-5 text-[#5f6368]">
              Payouts are reviewed by admin. Once approved and paid, the amount
              will appear in your payout history.
            </p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-[#dadce0] bg-white">
          <div className="border-b border-[#dadce0] px-6 py-5">
            <h2 className="text-xl font-medium">Payout history</h2>
          </div>

          {payouts.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#5f6368]">
              No payout requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8fafd] text-[#5f6368]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Method</th>
                    <th className="px-6 py-4 font-medium">Bank / UPI</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef0f3]">
                  {payouts.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fafd]">
                      <td className="px-6 py-4">
                        {new Date(item.requested_at).toLocaleDateString("en-IN")}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {formatINR(item.amount)}
                      </td>

                      <td className="px-6 py-4 capitalize">
                        {item.payout_method || "bank"}
                      </td>

                      <td className="px-6 py-4">
                        {item.upi_id ||
                          `${item.bank_name || "-"} · ${maskAccount(
                            item.account_number
                          )}`}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function WalletCard({ icon, title, value, highlight }) {
  return (
    <article
      className={`rounded-[24px] border bg-white p-5 transition hover:shadow-sm ${
        highlight ? "border-[#3b71e6]" : "border-[#dadce0]"
      }`}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-[#1a73e8]"
        style={{ backgroundColor: "#e8f0fe" }}
      >
        {icon}
      </div>

      <p className="text-sm text-[#5f6368]">{title}</p>
      <h3 className="mt-2 text-3xl font-medium tracking-tight">{value}</h3>
    </article>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#5f6368]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-[#dadce0] bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
      />
    </label>
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