import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Home,
  LifeBuoy,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";

const supportTopics = [
  {
    icon: Home,
    title: "Booking support",
    text: "Help with stays, trip packages, cancellations, refunds, and receipts.",
    keywords: "booking stay trip cancellation refund receipt reservation",
  },
  {
    icon: UserCheck,
    title: "Host support",
    text: "Help with listings, verification, reservations, pricing, and payouts.",
    keywords: "host listing verification payout reservation pricing",
  },
  {
    icon: CreditCard,
    title: "Payment support",
    text: "Payment failures, Razorpay, refunds, coupons, invoices, and payout status.",
    keywords: "payment razorpay failed refund coupon invoice payout",
  },
  {
    icon: ShieldCheck,
    title: "Safety & verification",
    text: "Identity verification, account security, suspicious activity, and trust support.",
    keywords: "kyc safety verification security identity suspicious account",
  },
];

const faqs = [
  {
    q: "My payment failed. What should I do?",
    a: "Check if money was debited. If it was debited, wait a few minutes and check your booking status. If the booking is not confirmed, contact support with your payment ID.",
  },
  {
    q: "How do I contact a host?",
    a: "Open your booking or messages page and send a message to the host directly.",
  },
  {
    q: "When will my listing go live?",
    a: "Host listings and trip packages go live only after admin verification and approval.",
  },
  {
    q: "How do refunds work?",
    a: "Refunds depend on the cancellation policy, payment status, and platform review. Eligible refunds are processed through the original payment method.",
  },
];

export default function Support() {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    bookingId: "",
    type: "Booking issue",
    message: "",
  });

  const filteredTopics = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return supportTopics;

    return supportTopics.filter((item) =>
      `${item.title} ${item.text} ${item.keywords}`.toLowerCase().includes(q)
    );
  }, [query]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitSupport = (e) => {
    e.preventDefault();

    const subject = encodeURIComponent(`Dovail Stay Support - ${form.type}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nBooking ID: ${
        form.bookingId || "N/A"
      }\nIssue Type: ${form.type}\n\nMessage:\n${form.message}`
    );

    window.location.href = `mailto:business@dovail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 md:px-8">
        <section className="rounded-[32px] border border-gray-200 bg-[#f8fafd] px-6 py-10 md:px-10">
          <p className="text-sm font-semibold text-[#3b71e6]">
            Dovail Stay Support
          </p>

          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Get help with bookings, hosting, payments and safety.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
            Search support topics or contact our team with your booking details.
          </p>

          <div className="relative mt-8 max-w-3xl">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search support topics..."
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-14 pr-12 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-4 focus:ring-[#3b71e6]/10"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {filteredTopics.map((topic) => {
            const Icon = topic.icon;

            return (
              <button
                key={topic.title}
                type="button"
                onClick={() => setQuery(topic.title)}
                className="group rounded-[28px] border border-gray-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#eef4ff] text-[#3b71e6]">
                    <Icon size={24} />
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#3b71e6]"
                  />
                </div>

                <h3 className="mt-5 text-lg font-semibold">{topic.title}</h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {topic.text}
                </p>
              </button>
            );
          })}
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6">
            <h2 className="text-2xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>

            <div className="mt-5 divide-y divide-gray-100">
              {faqs.map((item, index) => (
                <button
                  key={item.q}
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full py-5 text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm font-semibold text-gray-950">
                      {item.q}
                    </h3>

                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {openFaq === index && (
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      {item.a}
                    </p>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
              <div className="flex gap-3">
                <AlertTriangle size={20} className="text-yellow-700" />

                <p className="text-sm leading-6 text-yellow-800">
                  For urgent safety or legal emergencies, contact local emergency
                  services first. Dovail Stay support is for platform assistance.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-gray-200 bg-white p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#3b71e6]">
              <LifeBuoy size={24} />
            </div>

            <h2 className="mt-5 text-2xl font-semibold tracking-tight">
              Contact support
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Send us your issue with booking ID or account email. This form
              opens your email app with the details filled in.
            </p>

            <form onSubmit={submitSupport} className="mt-6 space-y-4">
              <Input
                label="Full name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                required
              />

              <Input
                label="Booking ID (optional)"
                value={form.bookingId}
                onChange={(e) => updateForm("bookingId", e.target.value)}
              />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Issue type
                </span>

                <select
                  value={form.type}
                  onChange={(e) => updateForm("type", e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                >
                  <option>Booking issue</option>
                  <option>Payment issue</option>
                  <option>Refund request</option>
                  <option>Host support</option>
                  <option>Verification issue</option>
                  <option>Account issue</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Message
                </span>

                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => updateForm("message", e.target.value)}
                  required
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                />
              </label>

              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3b71e6] text-sm font-semibold text-white transition hover:bg-[#2f5fc2]"
              >
                <Mail size={18} />
                Send support request
              </button>
            </form>

            <button
              type="button"
              onClick={() => (window.location.href = "mailto:business@dovail.com")}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <MessageCircle size={18} />
              business@dovail.com
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        {...props}
        className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
      />
    </label>
  );
}