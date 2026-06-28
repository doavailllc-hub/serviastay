import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Map,
} from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const BRAND = "#7E4FF5";

export default function HostType() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-8">
        <section className="mb-10 max-w-3xl">
          <p className="text-sm font-medium text-gray-500">Become a host</p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            What would you like to host?
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-500">
            Choose the hosting type that fits your business. You can list a stay
            or create a complete travel package.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <HostOption
            icon={<BedDouble size={24} />}
            title="Host a stay"
            subtitle="List a room, villa, resort, apartment or property."
            features={[
              "Add property details and photos",
              "Set nightly pricing",
              "Manage stay bookings",
            ]}
            buttonText="List a stay"
            onClick={() => navigate("/add-listing")}
          />

          <HostOption
            icon={<Map size={24} />}
            title="Create a trip package"
            subtitle="Sell complete trips with hotel, transport and itinerary."
            features={[
              "Add pickup, transport and hotel",
              "Create day-wise itinerary",
              "Manage departures and seats",
            ]}
            buttonText="Create package"
            onClick={() => navigate("/add-trip-package")}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-5 md:p-6">
          <p className="text-sm leading-6 text-gray-600">
            Both options will appear in your host dashboard, so you can manage
            bookings, availability, customers and earnings from one place.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function HostOption({ icon, title, subtitle, features, buttonText, onClick }) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-sm md:p-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F0FF] text-[#7E4FF5]">
        {icon}
      </div>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-950">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">{subtitle}</p>

      <div className="mt-6 space-y-3">
        {features.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-[#7E4FF5]"
            />
            <span className="text-sm text-gray-700">{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onClick}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:bg-[#6F42EA]"
        style={{ backgroundColor: BRAND }}
      >
        {buttonText}
        <ArrowRight size={17} />
      </button>
    </article>
  );
}