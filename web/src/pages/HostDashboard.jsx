import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Home,
  IndianRupee,
  ListChecks,
  Plus,
  Star,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function HostDashboard() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const user = JSON.parse(localStorage.getItem("user") || "null");
      const token = localStorage.getItem("token");

      if (!user || !token) {
        navigate("/");
        return;
      }

      const [listingsRes, bookingsRes] = await Promise.allSettled([
        api.get(`/my-properties/${user.id}`),
        api.get(`/bookings/${user.id}`),
      ]);

      if (listingsRes.status === "fulfilled") {
        setListings(listingsRes.value.data || []);
      } else {
        console.log("Listings load failed:", listingsRes.reason);
        setListings([]);
      }

      if (bookingsRes.status === "fulfilled") {
        setBookings(bookingsRes.value.data || []);
      } else {
        console.log("Bookings load failed:", bookingsRes.reason);
        setBookings([]);
      }

      const authFailed =
        listingsRes.reason?.response?.status === 401 ||
        listingsRes.reason?.response?.status === 403 ||
        bookingsRes.reason?.response?.status === 401 ||
        bookingsRes.reason?.response?.status === 403;

      if (authFailed) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      if (
        listingsRes.status === "rejected" ||
        bookingsRes.status === "rejected"
      ) {
        setLoadError("Some dashboard data could not be loaded.");
      }
    } catch (err) {
      console.log("Dashboard load failed:", err);

      const status = err.response?.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/");
        return;
      }

      setLoadError(err.response?.data?.message || "Dashboard data load failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmedBookings = bookings.filter(
    (item) => item.status !== "Cancelled"
  );

  const totalEarnings = confirmedBookings.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Host</p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
              Manage your listings, reservations and earnings from one place.
            </p>
          </div>

          <button
            onClick={() => navigate("/become-a-host")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            <Plus size={17} />
            Add listing
          </button>
        </header>

        {loadError && (
          <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
            {loadError}
          </div>
        )}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Total earnings"
                value={formatINR(totalEarnings)}
                subtitle="Confirmed revenue"
                icon={<IndianRupee size={18} />}
              />

              <StatCard
                title="Active listings"
                value={listings.length}
                subtitle="Properties you host"
                icon={<Home size={18} />}
              />

              <StatCard
                title="Bookings"
                value={bookings.length}
                subtitle="Guest reservations"
                icon={<CalendarDays size={18} />}
              />
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                    Recent listings
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Latest properties added to your host account.
                  </p>
                </div>

                <button
                  onClick={() => navigate("/host-listings")}
                  className="text-sm font-medium text-[#3b71e6] hover:underline"
                >
                  View all
                </button>
              </div>

              {listings.length === 0 ? (
                <EmptyListing navigate={navigate} />
              ) : (
                <div className="divide-y divide-gray-100">
                  {listings.slice(0, 3).map((listing) => (
                    <ListingRow
                      key={listing.id}
                      listing={listing}
                      navigate={navigate}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                Quick actions
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <QuickAction
                  icon={<Home size={19} />}
                  title="Listings"
                  desc="Manage properties"
                  onClick={() => navigate("/host-listings")}
                />

                <QuickAction
                  icon={<ListChecks size={19} />}
                  title="Reservations"
                  desc="View bookings"
                  onClick={() => navigate("/host-reservations")}
                />

                <QuickAction
                  icon={<CalendarDays size={19} />}
                  title="Calendar"
                  desc="Availability"
                  onClick={() => navigate("/host-calendar")}
                />

                <QuickAction
                  icon={<IndianRupee size={19} />}
                  title="Earnings"
                  desc="View payouts"
                  onClick={() => navigate("/earnings")}
                />

                <QuickAction
                  icon={<Star size={19} />}
                  title="Reviews"
                  desc="Guest feedback"
                  onClick={() => navigate("/host-reviews")}
                />
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-950">
                Hosting tip
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                Keep listings updated with clear photos, accurate pricing and
                fast responses to improve bookings.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>

      <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}

function EmptyListing({ navigate }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center px-5 text-center">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-950">
          No listings yet
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
          Add your first property to start hosting.
        </p>

        <button
          onClick={() => navigate("/become-a-host")}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3b71e6] px-5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
        >
          <Plus size={17} />
          Add listing
        </button>
      </div>
    </div>
  );
}

function ListingRow({ listing, navigate, formatINR }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <img
          src={
            listing.image ||
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
          }
          alt={listing.title || "Listing"}
          className="h-16 w-16 rounded-xl object-cover"
        />

        <div>
          <h3 className="text-sm font-semibold text-gray-950">
            {listing.title || "Untitled listing"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            {listing.location || "Location unavailable"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <span className="text-sm font-medium text-gray-950">
          {formatINR(listing.price)} / night
        </span>

        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          Active
        </span>

        <button
          onClick={() => navigate(`/edit-listing/${listing.id}`)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ff] text-[#3b71e6]">
        {icon}
      </div>

      <p className="text-sm text-gray-500">{title}</p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </h2>

      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </article>
  );
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:bg-gray-50"
    >
      <div className="mb-3 text-[#3b71e6]">{icon}</div>

      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>

      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </button>
  );
}