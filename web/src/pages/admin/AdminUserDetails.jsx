import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Star,
  User,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../api/api";

const tabs = [
  "Overview",
  "Bookings",
  "Listings",
  "Wallet",
  "Bank Account",
  "KYC",
  "Reviews",
  "Activity Log",
  "Security",
];

export default function AdminUserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [loading, setLoading] = useState(true);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}/details`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "User details failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const walletSummary = useMemo(() => {
    const earnings = Number(data?.wallet?.earnings || 0);
    const payouts = Number(data?.wallet?.payouts || 0);

    return {
      earnings,
      payouts,
      available: Math.max(0, earnings - payouts),
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#3b71e6]" size={36} />
      </div>
    );
  }

  if (!data?.user) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-gray-500">User not found.</p>
      </div>
    );
  }

  const user = data.user;

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-gray-200 bg-white p-6">
        <button
          onClick={() => navigate("/admin/users")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#3b71e6]"
        >
          <ArrowLeft size={17} />
          Back to users
        </button>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-3xl font-bold text-[#3b71e6]">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={user.fullname}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.fullname?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {user.fullname || "User"}
                </h1>
                <StatusBadge status={user.kyc_status || "Not Submitted"} />
              </div>

              <p className="mt-2 text-sm text-gray-500">{user.email}</p>
              <p className="mt-1 text-sm text-gray-500">
                {user.phone || "No phone"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <SmallBadge>{user.role || "guest"}</SmallBadge>
                <SmallBadge>Joined {formatDate(user.created_at)}</SmallBadge>
              </div>
            </div>
          </div>

          <button
            onClick={loadDetails}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-gray-200 px-5 text-sm font-semibold text-[#3b71e6] hover:bg-blue-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Stat title="Bookings" value={data.bookings?.length || 0} icon={<CalendarDays />} />
        <Stat title="Listings" value={data.listings?.length || 0} icon={<Building2 />} />
        <Stat title="Available Wallet" value={formatINR(walletSummary.available)} icon={<Wallet />} />
        <Stat title="Reviews" value={data.reviews?.length || 0} icon={<Star />} />
      </section>

      <section className="rounded-[28px] border border-gray-200 bg-white p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[#3b71e6] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "Overview" && (
        <Overview data={data} walletSummary={walletSummary} />
      )}

      {activeTab === "Bookings" && <Bookings bookings={data.bookings || []} />}
      {activeTab === "Listings" && <Listings listings={data.listings || []} />}
      {activeTab === "Wallet" && (
        <WalletTab walletSummary={walletSummary} payouts={data.payouts || []} />
      )}
      {activeTab === "Bank Account" && <BankTab bank={data.bank} />}
      {activeTab === "KYC" && <KycTab kyc={data.kyc} />}
      {activeTab === "Reviews" && <ReviewsTab reviews={data.reviews || []} />}
      {activeTab === "Activity Log" && <ActivityTab activity={data.activity || []} />}
      {activeTab === "Security" && <SecurityTab security={data.security} user={user} />}
    </main>
  );
}

function Overview({ data, walletSummary }) {
  const user = data.user;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card title="Account Overview">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Full name" value={user.fullname} />
          <Info label="Email" value={user.email} />
          <Info label="Phone" value={user.phone || "-"} />
          <Info label="Role" value={user.role || "guest"} />
          <Info label="KYC status" value={user.kyc_status || "Not Submitted"} />
          <Info label="Joined" value={formatDate(user.created_at)} />
        </div>
      </Card>

      <Card title="Operational Summary">
        <Info label="Listings" value={data.listings?.length || 0} />
        <Info label="Bookings" value={data.bookings?.length || 0} />
        <Info label="Reviews" value={data.reviews?.length || 0} />
        <Info label="Wallet available" value={formatINR(walletSummary.available)} />
        <Info label="Lifetime earnings" value={formatINR(walletSummary.earnings)} />
        <Info label="Paid payouts" value={formatINR(walletSummary.payouts)} />
      </Card>
    </div>
  );
}

function Bookings({ bookings }) {
  return (
    <Card title="Bookings">
      {bookings.length === 0 ? (
        <Empty text="No bookings found." />
      ) : (
        <div className="divide-y divide-gray-100">
          {bookings.map((item) => (
            <div key={item.id} className="flex gap-4 py-4">
              <img
                src={item.image}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title || "Booking"}</p>
                <p className="truncate text-sm text-gray-500">{item.location}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {item.checkin} → {item.checkout}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatINR(item.total)}</p>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Listings({ listings }) {
  return (
    <Card title="Listings">
      {listings.length === 0 ? (
        <Empty text="No listings found." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 p-3">
              <img
                src={item.image}
                alt=""
                className="h-40 w-full rounded-xl object-cover"
              />
              <p className="mt-3 font-semibold">{item.title}</p>
              <p className="truncate text-sm text-gray-500">{item.location}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-semibold">{formatINR(item.price)}</p>
                <StatusBadge status={item.status || "Published"} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function WalletTab({ walletSummary, payouts }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card title="Wallet Summary">
        <Info label="Available balance" value={formatINR(walletSummary.available)} />
        <Info label="Lifetime earnings" value={formatINR(walletSummary.earnings)} />
        <Info label="Paid payouts" value={formatINR(walletSummary.payouts)} />
      </Card>

      <Card title="Payout Requests">
        {payouts.length === 0 ? (
          <Empty text="No payouts found." />
        ) : (
          <div className="divide-y divide-gray-100">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex justify-between py-3">
                <div>
                  <p className="font-semibold">{formatINR(payout.amount)}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(payout.requested_at || payout.created_at)}
                  </p>
                </div>
                <StatusBadge status={payout.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function BankTab({ bank }) {
  return (
    <Card title="Bank Account">
      {!bank ? (
        <Empty text="No bank account submitted." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Account holder" value={bank.account_holder || bank.account_name} />
          <Info label="Bank name" value={bank.bank_name} />
          <Info label="Account number" value={mask(bank.account_number)} />
          <Info label="IFSC" value={bank.ifsc_code} />
          <Info label="UPI" value={bank.upi_id || "-"} />
          <Info label="Updated" value={formatDate(bank.updated_at)} />
        </div>
      )}
    </Card>
  );
}

function KycTab({ kyc }) {
  return (
    <Card title="KYC Documents">
      {!kyc ? (
        <Empty text="No KYC submitted." />
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between">
            <StatusBadge status={kyc.status} />
            <p className="text-sm text-gray-500">
              Verified: {formatDate(kyc.verified_at)}
            </p>
          </div>

          {kyc.rejection_reason && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {kyc.rejection_reason}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Doc title="ID Front" url={kyc.id_front} />
            <Doc title="ID Back" url={kyc.id_back} />
            <Doc title="Selfie" url={kyc.selfie} />
            <Doc title="Address Proof" url={kyc.address_proof} />
          </div>
        </>
      )}
    </Card>
  );
}

function ReviewsTab({ reviews }) {
  return (
    <Card title="Reviews">
      {reviews.length === 0 ? (
        <Empty text="No reviews found." />
      ) : (
        <div className="divide-y divide-gray-100">
          {reviews.map((review) => (
            <div key={review.id} className="py-4">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-semibold">{review.property_title || "Property"}</p>
                  <p className="mt-1 text-sm text-gray-500">{review.review}</p>
                </div>
                <p className="font-semibold">★ {review.rating}</p>
              </div>

              {review.host_reply && (
                <div className="mt-3 rounded-2xl bg-gray-50 p-3 text-sm">
                  <b>Host reply:</b> {review.host_reply}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ActivityTab({ activity }) {
  return (
    <Card title="Activity Log">
      {activity.length === 0 ? (
        <Empty text="Activity log will appear here." />
      ) : (
        <div className="space-y-3">
          {activity.map((item, index) => (
            <div key={index} className="rounded-2xl border border-gray-100 p-4">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-gray-500">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SecurityTab({ security, user }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Security Checks">
        <Info
          label="Email verified"
          value={security?.email_verified ? "Verified" : "Not verified"}
        />
        <Info
          label="Phone verified"
          value={security?.phone_verified ? "Verified" : "Not verified"}
        />
        <Info label="Last login" value={formatDate(security?.last_login)} />
      </Card>

      <Card title="Admin Actions">
        <button className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50">
          <Lock size={16} />
          Reset Password
        </button>

        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
          Disable Account
        </button>

        <p className="mt-4 text-xs text-gray-500">
          Account actions can be connected to backend APIs later.
        </p>
      </Card>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="rounded-[26px] border border-gray-200 bg-white p-5 shadow-sm">
      {title && <h2 className="mb-5 text-xl font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

function Stat({ title, value, icon }) {
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

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-900">
        {value || "-"}
      </span>
    </div>
  );
}

function Doc({ title, url }) {
  const isPdf = String(url || "").toLowerCase().endsWith(".pdf");

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
      ) : isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-44 items-center justify-center rounded-xl bg-white text-sm font-semibold text-[#3b71e6]"
        >
          Open PDF
        </a>
      ) : (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={title} className="h-44 w-full rounded-xl object-cover" />
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
          >
            <Eye size={14} />
            Open full
          </a>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Approved: "border-green-200 bg-green-50 text-green-700",
    Published: "border-green-200 bg-green-50 text-green-700",
    Confirmed: "border-green-200 bg-green-50 text-green-700",
    Rejected: "border-red-200 bg-red-50 text-red-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
    Pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    Paid: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        styles[status] || "border-gray-200 bg-gray-50 text-gray-600"
      }`}
    >
      {status || "Not Submitted"}
    </span>
  );
}

function SmallBadge({ children }) {
  return (
    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
      {children}
    </span>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
      {text}
    </div>
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
  if (!text) return "-";
  if (text.length <= 4) return text;
  return `XXXX XXXX ${text.slice(-4)}`;
}