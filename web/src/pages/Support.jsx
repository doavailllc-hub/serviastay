import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Headphones,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Send,
  Ticket,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Support() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    category: "Booking",
    message: "",
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const getUser = () =>
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const loadTickets = async () => {
    try {
      setLoading(true);

      const user = getUser();
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const res = await api.get(`/support/tickets/${user.id}`);
      setTickets(res.data || []);
    } catch (err) {
      console.log("Support tickets load failed:", err);
      alert("Support tickets failed to load");
    } finally {
      setLoading(false);
    }
  };

  const submitTicket = async (e) => {
    e.preventDefault();

    const user = getUser();

    if (!form.subject.trim()) {
      alert("Subject is required");
      return;
    }

    if (!form.message.trim()) {
      alert("Message is required");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/support/tickets", {
        user_id: user.id,
        subject: form.subject.trim(),
        category: form.category,
        message: form.message.trim(),
      });

      alert("Support ticket created successfully");

      setForm({
        subject: "",
        category: "Booking",
        message: "",
      });

      loadTickets();
    } catch (err) {
      console.log("Ticket create failed:", err);
      alert(err.response?.data?.message || "Ticket create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((item) => item.status === "Open").length,
      closed: tickets.filter((item) => item.status === "Closed").length,
    };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Support Center
            </h1>

            <p className="mt-2 text-gray-500">
              Get help with bookings, payments, refunds, hosting, and your account.
            </p>
          </div>

          <button
            onClick={loadTickets}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <StatCard
            icon={<Ticket />}
            title="Total Tickets"
            value={stats.total}
            color="text-[3b71e6]"
          />

          <StatCard
            icon={<AlertCircle />}
            title="Open Tickets"
            value={stats.open}
            color="text-yellow-600"
          />

          <StatCard
            icon={<LifeBuoy />}
            title="Resolved"
            value={stats.closed}
            color="text-green-600"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="h-fit rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
                <Headphones />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Ticket
                </h2>

                <p className="text-sm text-gray-500">
                  Tell us what happened. We&apos;ll help you.
                </p>
              </div>
            </div>

            <form onSubmit={submitTicket} className="space-y-4">
              <Field
                label="Subject"
                value={form.subject}
                onChange={(value) => setForm({ ...form, subject: value })}
                placeholder="Example: Payment failed"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Category
                </label>

                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 outline-none focus:ring-2 focus:ring-[3b71e6]"
                >
                  <option>Booking</option>
                  <option>Payment</option>
                  <option>Refund</option>
                  <option>Account</option>
                  <option>Wishlist</option>
                  <option>Host</option>
                  <option>Technical</option>
                  <option>General</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Message
                </label>

                <textarea
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  placeholder="Describe your issue clearly..."
                  className="min-h-36 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[3b71e6]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[3b71e6] font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
              >
                <Send size={18} />
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl bg-[#F4F1FF] p-5">
              <h3 className="font-bold text-gray-900">Quick help</h3>

              <p className="mt-2 text-sm text-gray-600">
                For urgent booking issues, contact your host from Trip Details or Messages.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Your Tickets
              </h2>

              <p className="mt-1 text-gray-500">
                Track the status of your support requests.
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-500">
                Loading tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-14 text-center">
                <div className="mb-4 text-6xl">🎧</div>

                <h3 className="text-2xl font-bold text-gray-900">
                  No tickets yet
                </h3>

                <p className="mt-2 text-gray-500">
                  Create a support ticket when you need help.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-xl border border-gray-300 bg-white px-4 text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[3b71e6]"
      />
    </div>
  );
}

function TicketCard({ ticket }) {
  return (
    <div className="p-6 transition hover:bg-gray-50">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {ticket.subject}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Ticket #{ticket.id} · {ticket.category}
          </p>
        </div>

        <StatusBadge status={ticket.status} />
      </div>

      <p className="line-clamp-3 text-sm leading-6 text-gray-600">
        {ticket.message}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <MessageSquare size={14} />
        {ticket.created_at
          ? new Date(ticket.created_at).toLocaleString()
          : "Date unavailable"}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F1FF] text-[3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || "Open";

  const style =
    value === "Closed"
      ? "bg-green-100 text-green-700"
      : value === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-[#F4F1FF] text-[3b71e6]";

  return (
    <span className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${style}`}>
      {value}
    </span>
  );
}