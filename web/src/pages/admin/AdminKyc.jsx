import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

export default function AdminKyc() {
  const [items, setItems] = useState([]);
const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const openDetails = async (item) => {
    try {
      setDetailsLoading(true);
      setSelected({ kyc: item, bank: null, wallet: null, listings: [], payouts: [] });
      setReason(item.rejection_reason || "");

      const { data } = await api.get(`/admin/host-kyc/${item.id}/details`);
      setSelected(data);
      setReason(data.kyc?.rejection_reason || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Details load failed");
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateStatus = async (status) => {
    if (!selected?.kyc?.id) return;

    if (status === "Rejected" && !reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      setActionLoading(true);

      await api.put(`/admin/host-kyc/${selected.kyc.id}/status`, {
        status,
        rejection_reason: reason,
      });

      toast.success(`KYC marked as ${status}`);
      await loadKyc();
      await openDetails({ ...selected.kyc, status });
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const requestReupload = async () => {
    if (!selected?.kyc?.id) return;

    if (!reason.trim()) {
      toast.error("Add mismatch/re-upload reason");
      return;
    }

    try {
      setActionLoading(true);

      await api.put(`/admin/host-kyc/${selected.kyc.id}/request-reupload`, {
        reason,
      });

      toast.success("Re-upload request sent");
      await loadKyc();
      await openDetails({ ...selected.kyc, status: "Rejected" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const okStatus = filter === "All" || item.status === filter;
      const q = query.trim().toLowerCase();

      const okSearch =
        !q ||
        `${item.host_name || ""} ${item.host_email || ""} ${item.host_phone || ""}`
          .toLowerCase()
          .includes(q);

      return okStatus && okSearch;
    });
  }, [items, filter, query]);

  const stats = useMemo(
    () => ({
      pending: items.filter((i) => i.status === "Pending").length,
      approved: items.filter((i) => i.status === "Approved").length,
      rejected: items.filter((i) => i.status === "Rejected").length,
      total: items.length,
    }),
    [items]
  );

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">Admin Trust Center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Host KYC Verification</h1>
            <p className="mt-2 text-sm text-gray-500">
              Review identity documents, bank details, wallet status, listings and send re-upload requests.
            </p>
          </div>

          <button
            onClick={loadKyc}
            className="flex h-11 items-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Pending" value={stats.pending} icon={<ShieldCheck />} />
        <Stat title="Approved" value={stats.approved} icon={<BadgeCheck />} />
        <Stat title="Rejected" value={stats.rejected} icon={<XCircle />} />
        <Stat title="Total" value={stats.total} icon={<User />} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-4">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
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

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-12 text-center text-sm text-gray-500">
            No KYC requests found.
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => openDetails(item)}
                className="rounded-[24px] border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-[#3b71e6] hover:bg-blue-50/30"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{item.host_name || "Host"}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.host_email}</p>
                    <p className="mt-1 text-sm text-gray-500">{item.host_phone || "No phone"}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.status} />
                    <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#3b71e6]">
                      Open profile
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <Drawer
          data={selected}
          loading={detailsLoading}
          reason={reason}
          setReason={setReason}
          actionLoading={actionLoading}
          onClose={() => setSelected(null)}
          onApprove={() => updateStatus("Approved")}
          onReject={() => updateStatus("Rejected")}
          onReupload={requestReupload}
        />
      )}
    </main>
  );
}

function Drawer({
  data,
  loading,
  reason,
  setReason,
  actionLoading,
  onClose,
  onApprove,
  onReject,
  onReupload,
}) {
  const kyc = data.kyc || {};
  const bank = data.bank;
  const wallet = data.wallet || {};
  const listings = data.listings || [];
  const payouts = data.payouts || [];

  const earnings = Number(wallet.earnings || 0);
  const payoutsTotal = Number(wallet.payouts || 0);
  const available = Math.max(0, earnings - payoutsTotal);

  return (
    <div className="fixed inset-0 z-[100] bg-black/40">
      <aside className="ml-auto h-full w-full max-w-6xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[#3b71e6]">Host profile</p>
            <h2 className="text-2xl font-semibold">{kyc.fullname || kyc.host_name || "Host"}</h2>
          </div>

          <button onClick={onClose} className="rounded-full border border-gray-200 p-2 hover:bg-gray-50">
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <Loader2 className="animate-spin text-[#3b71e6]" size={34} />
          </div>
        ) : (
          <div className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
            <section className="space-y-4">
              <Card>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-bold text-[#3b71e6]">
                    {(kyc.fullname || "H").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold">{kyc.fullname || "Host"}</h3>
                    <p className="text-sm text-gray-500">{kyc.email}</p>
                    <p className="text-sm text-gray-500">{kyc.phone || "No phone"}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <Info label="Host ID" value={kyc.host_id} />
                  <Info label="KYC Status" value={<StatusBadge status={kyc.status} />} />
                  <Info label="Joined" value={formatDate(kyc.host_created_at)} />
                  <Info label="Verified At" value={formatDate(kyc.verified_at)} />
                </div>
              </Card>

              <Card title="Wallet">
                <Info label="Available" value={formatINR(available)} />
                <Info label="Lifetime earnings" value={formatINR(earnings)} />
                <Info label="Paid payouts" value={formatINR(payoutsTotal)} />
              </Card>

              <Card title="Bank account">
                {bank ? (
                  <>
                    <Info label="Holder" value={bank.account_holder || bank.account_name || "-"} />
                    <Info label="Bank" value={bank.bank_name || "-"} />
                    <Info label="Account" value={mask(bank.account_number)} />
                    <Info label="IFSC" value={bank.ifsc_code || "-"} />
                    <Info label="UPI" value={bank.upi_id || "-"} />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No bank details submitted.</p>
                )}
              </Card>
            </section>

            <section className="space-y-6">
              <Card title="KYC Documents">
                <div className="grid gap-4 md:grid-cols-2">
                  <Doc title="ID Front" url={kyc.id_front} />
                  <Doc title="ID Back" url={kyc.id_back} />
                  <Doc title="Selfie" url={kyc.selfie} />
                  <Doc title="Address Proof" url={kyc.address_proof} />
                </div>
              </Card>

              <Card title="Admin Decision">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Reason for rejection or re-upload request..."
                  className="w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none focus:border-[#3b71e6]"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <Action onClick={onApprove} disabled={actionLoading} className="bg-green-600 text-white">
                    Approve
                  </Action>
                  <Action onClick={onReject} disabled={actionLoading} className="bg-red-600 text-white">
                    Reject
                  </Action>
                  <Action onClick={onReupload} disabled={actionLoading} className="bg-[#3b71e6] text-white">
                    Request Re-upload / Mismatch
                  </Action>
                </div>
              </Card>

              <Card title="Listings">
                {listings.length ? (
                  <div className="grid gap-3">
                    {listings.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                        <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{item.title}</p>
                          <p className="truncate text-sm text-gray-500">{item.location}</p>
                        </div>
                        <p className="text-sm font-semibold">{formatINR(item.price)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No listings found.</p>
                )}
              </Card>

              <Card title="Recent Payouts">
                {payouts.length ? (
                  <div className="space-y-2">
                    {payouts.map((payout) => (
                      <div key={payout.id} className="flex justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                        <span>{formatINR(payout.amount)}</span>
                        <span>{payout.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No payout requests found.</p>
                )}
              </Card>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm">
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

function Stat({ title, value, icon }) {
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

function Doc({ title, url }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-[#3b71e6]">
        <FileText size={17} />
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>

      {!url ? (
        <div className="flex h-44 items-center justify-center rounded-xl bg-white text-sm text-gray-400">
          No file uploaded
        </div>
      ) : (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={title} className="h-44 w-full rounded-xl object-cover" />
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold"
          >
            <Eye size={14} />
            Open full
          </a>
        </>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-900">{value || "-"}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Approved: "border-green-200 bg-green-50 text-green-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || "border-gray-200 bg-gray-50 text-gray-600"}`}>
      {status || "Not Submitted"}
    </span>
  );
}

function Action({ children, className, ...props }) {
  return (
    <button
      {...props}
      className={`rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function formatINR(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN");
}

function mask(value) {
  const text = String(value || "");
  if (text.length <= 4) return text || "-";
  return `XXXX XXXX ${text.slice(-4)}`;
}