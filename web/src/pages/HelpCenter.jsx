import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Home,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";

const helpCards = [
  {
    icon: CalendarDays,
    title: "Booking help",
    desc: "Change dates, cancel reservations, view trips, and contact hosts.",
    keywords: "booking reservation trips cancel date host",
  },
  {
    icon: Home,
    title: "Hosting help",
    desc: "Manage stay listings, trip packages, pricing, availability, and guests.",
    keywords: "host listing property package pricing availability guests",
  },
  {
    icon: CreditCard,
    title: "Payments",
    desc: "Payment methods, Razorpay, refunds, payouts, invoices, and coupons.",
    keywords: "payment razorpay refund payout invoice coupon",
  },
  {
    icon: User,
    title: "Account",
    desc: "Profile, login, password, security, verification, and notifications.",
    keywords: "account profile login password security verification notification",
  },
];

const faqs = [
  {
    q: "How do I cancel a booking?",
    a: "Go to Trips, open your booking, and choose Cancel if the booking policy allows it.",
  },
  {
    q: "When does a host listing go live?",
    a: "New stays and trip packages go live only after admin verification and approval.",
  },
  {
    q: "How do payments work?",
    a: "Online payments are processed securely through Razorpay. Booking is confirmed after payment verification.",
  },
  {
    q: "How do hosts manage reservations?",
    a: "Hosts can accept, decline, check-in, check-out, or cancel reservations from the host dashboard.",
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState(0);

  const filteredCards = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return helpCards;

    return helpCards.filter((card) =>
      `${card.title} ${card.desc} ${card.keywords}`.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24 md:px-8">
        <section className="rounded-[32px] border border-gray-200 bg-[#f8fafd] px-6 py-10 md:px-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#3b71e6]">
              Dovail Stay Help Center
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Hi, how can we help?
            </h1>

            <p className="mt-4 text-base leading-7 text-gray-500">
              Find help for bookings, hosting, payments, verification, refunds,
              payouts, and account settings.
            </p>
          </div>

          <div className="relative mt-8 max-w-3xl">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles..."
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

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {filteredCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.title}
                type="button"
                onClick={() => setQuery(card.title)}
                className="group rounded-[28px] border border-gray-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#3b71e6]">
                    <Icon size={24} />
                  </div>

                  <ChevronRight
                    size={20}
                    className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-[#3b71e6]"
                  />
                </div>

                <h3 className="mt-5 text-xl font-semibold">{card.title}</h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {card.desc}
                </p>
              </button>
            );
          })}
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
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

                    <HelpCircle size={18} className="text-gray-400" />
                  </div>

                  {openFaq === index && (
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      {item.a}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <ContactCard
              icon={<Mail size={20} />}
              title="Email support"
              text="Send us your issue and booking details."
              action="business@dovail.com"
              onClick={() =>
                window.open(
                  "mailto:business@dovail.com?subject=Dovail Stay Support"
                )
              }
            />

            <ContactCard
              icon={<MessageCircle size={20} />}
              title="Messages"
              text="Contact hosts or guests from your inbox."
              action="Open messages"
              onClick={() => navigate("/messages")}
            />

            <ContactCard
              icon={<ShieldCheck size={20} />}
              title="Verification"
              text="Complete host or guest identity verification."
              action="Verify account"
              onClick={() => navigate("/host-verification")}
            />
          </aside>
        </section>

        <section className="mt-10 rounded-[32px] border border-gray-200 bg-[#f8fafd] p-8 md:flex md:items-center md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#3b71e6]">
              <LifeBuoy size={24} />
            </div>

            <h2 className="mt-5 text-2xl font-semibold">Still need help?</h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Our support team can help with bookings, payments, hosting,
              verification, refunds, and account issues.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              window.open("mailto:business@dovail.com?subject=Need Help")
            }
            className="mt-6 h-12 rounded-xl bg-[#3b71e6] px-7 text-sm font-semibold text-white transition hover:bg-[#2f5fc2] md:mt-0"
          >
            Contact Support
          </button>
        </section>

        <section className="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          <Lock size={18} />
          Your account and payment details are handled securely.
        </section>
      </main>
    </div>
  );
}

function ContactCard({ icon, title, text, action, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border border-gray-200 bg-white p-5 text-left transition hover:bg-[#f8fafd] hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#3b71e6]">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
          <p className="mt-3 text-sm font-semibold text-[#3b71e6]">{action}</p>
        </div>
      </div>
    </button>
  );
}