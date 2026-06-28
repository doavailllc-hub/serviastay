import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Home,
  Map,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const BRAND = "#7E4FF5";

export default function HostType() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <section className="rounded-[40px] border border-gray-200 bg-gradient-to-br from-white via-white to-[#F7F3FF] px-6 py-12 text-center shadow-sm md:px-10 md:py-16">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F3EFFF]">
            <Sparkles size={30} className="text-[#7E4FF5]" />
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.24em] text-gray-400">
            Become a host
          </p>

          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black tracking-tight text-gray-900 md:text-6xl">
            What do you want to host?
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-500">
            Choose whether you want to list a stay or create a complete trip
            package with hotel, transport, pickup and itinerary.
          </p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <HostOption
            icon={<BedDouble size={34} />}
            title="Host a Stay"
            subtitle="List a property, room, resort, villa or apartment."
            image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
            features={[
              "Add rooms and property photos",
              "Set nightly pricing",
              "Receive stay bookings",
              "Manage reservations",
            ]}
            buttonText="List a stay"
            onClick={() => navigate("/add-listing")}
          />

          <HostOption
            icon={<Map size={34} />}
            title="Create Trip Package"
            subtitle="Sell curated travel packages with departures and seats."
            image="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
            features={[
              "Hotel, transport and pickup",
              "Day-wise itinerary",
              "Departure dates and seats",
              "Package booking management",
            ]}
            buttonText="Create package"
            onClick={() => navigate("/add-trip-package")}
            highlighted
          />
        </section>

        <section className="mt-10 rounded-[32px] border border-gray-200 bg-white p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <InfoItem
              icon={<ShieldCheck size={22} />}
              title="Verified hosting"
              text="Keep stays and trip packages organized in one clean dashboard."
            />

            <InfoItem
              icon={<Home size={22} />}
              title="Two business types"
              text="Users can choose between accommodation hosting and travel package selling."
            />

            <InfoItem
              icon={<Sparkles size={22} />}
              title="Easy for customers"
              text="Customers see the right booking flow based on what you create."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HostOption({
  icon,
  title,
  subtitle,
  image,
  features,
  buttonText,
  onClick,
  highlighted,
}) {
  return (
    <article
      className={`group overflow-hidden rounded-[36px] border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
        highlighted ? "border-[#D8CCFF]" : "border-gray-200"
      }`}
    >
      <div className="relative h-72 overflow-hidden bg-gray-100">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#7E4FF5] shadow-lg">
            {icon}
          </div>

          {highlighted && (
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#7E4FF5] shadow-lg">
              Recommended
            </span>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8">
        <h2 className="text-3xl font-black tracking-tight text-gray-900">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>

        <div className="mt-6 space-y-3">
          {features.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 size={19} className="text-[#7E4FF5]" />
              <span className="text-sm font-semibold text-gray-700">
                {item}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClick}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition hover:scale-[1.01]"
          style={{ backgroundColor: BRAND }}
        >
          {buttonText}
          <ArrowRight size={18} />
        </button>
      </div>
    </article>
  );
}

function InfoItem({ icon, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F3EFFF] text-[#7E4FF5]">
        {icon}
      </div>

      <div>
        <h3 className="font-black text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
      </div>
    </div>
  );
}