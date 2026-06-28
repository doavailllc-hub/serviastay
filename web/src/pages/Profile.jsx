import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle,
  CreditCard,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

const BRAND = "#3b71e6";

export default function Profile() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("about");
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: "about", label: "About", icon: <User size={17} /> },
    { id: "trips", label: "Trips", icon: <CalendarDays size={17} /> },
    { id: "wishlist", label: "Wishlist", icon: <Heart size={17} /> },
    { id: "reviews", label: "Reviews", icon: <Star size={17} /> },
    { id: "account", label: "Account", icon: <Settings size={17} /> },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getStoredUser = () => {
    try {
      return (
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(sessionStorage.getItem("user") || "null")
      );
    } catch {
      return null;
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);

      const storedUser = getStoredUser();
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!storedUser || !token) {
        navigate("/");
        return;
      }

      const userRes = await api.get(`/user/${storedUser.id}`);
      setUser(userRes.data);

      localStorage.setItem("user", JSON.stringify(userRes.data));

      const [tripsRes, wishlistRes] = await Promise.allSettled([
        api.get(`/bookings/${storedUser.id}`),
        api.get(`/wishlist/${storedUser.id}`),
      ]);

      if (tripsRes.status === "fulfilled") {
        setTrips(tripsRes.value.data || []);
      }

      if (wishlistRes.status === "fulfilled") {
        setWishlist(wishlistRes.value.data || []);
      }
    } catch (err) {
      console.log("Profile load failed:", err);
      alert("Profile failed to load");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const stats = useMemo(() => {
    const completedTrips = trips.filter((item) => item.status === "Completed");
    const totalSpent = trips.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    return {
      trips: trips.length,
      completedTrips: completedTrips.length,
      wishlist: wishlist.length,
      totalSpent,
    };
  }, [trips, wishlist]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-gray-100" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </main>
      </div>
    );
  }

  const avatarLetter =
    user?.fullname?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-8">
        <header className="mb-8">
          <p className="text-sm font-medium text-gray-500">Account</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Profile
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Manage your account, trips, saved homes and travel activity.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
            <div className="border-b border-gray-200 pb-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-xl font-semibold text-[#3b71e6]">
                  {avatarLetter}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-gray-950">
                    {user?.fullname || "Guest User"}
                  </h2>

                  <p className="truncate text-sm text-gray-500">
                    {user?.email || "No email"}
                  </p>

                  <p className="mt-1 text-xs capitalize text-[#3b71e6]">
                    {user?.role || "guest"}
                  </p>
                </div>
              </div>
            </div>

            <nav className="mt-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    tab === item.id
                      ? "bg-[#eef4ff] text-[#3b71e6]"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={logout}
              className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </aside>

          <section className="min-h-[560px] rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            {tab === "about" && (
              <AboutTab
                user={user}
                avatarLetter={avatarLetter}
                stats={stats}
                formatINR={formatINR}
                navigate={navigate}
              />
            )}

            {tab === "trips" && (
              <TripsTab
                trips={trips}
                navigate={navigate}
                formatINR={formatINR}
              />
            )}

            {tab === "wishlist" && (
              <WishlistTab wishlist={wishlist} navigate={navigate} />
            )}

            {tab === "reviews" && <ReviewsTab />}

            {tab === "account" && (
              <AccountTab navigate={navigate} logout={logout} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        )}
      </div>

      {action}
    </div>
  );
}

function AboutTab({ user, avatarLetter, stats, formatINR, navigate }) {
  return (
    <>
      <SectionHeader
        title="About"
        description="Your profile details and travel summary."
        action={
          <button
            onClick={() => navigate("/account-settings")}
            className="rounded-xl bg-[#3b71e6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#2f5fc2]"
          >
            Edit profile
          </button>
        }
      />

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="rounded-2xl border border-gray-200 p-5 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef4ff] text-3xl font-semibold text-[#3b71e6]">
            {avatarLetter}
          </div>

          <h3 className="text-base font-semibold text-gray-950">
            {user?.fullname || "Guest User"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">{user?.email || "-"}</p>

          <p className="mt-2 text-xs capitalize text-[#3b71e6]">
            {user?.role || "guest"}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <InfoCard label="Full name" value={user?.fullname || "-"} />
          <InfoCard label="Email" value={user?.email || "-"} />
          <InfoCard label="Phone" value={user?.phone || "-"} />
          <InfoCard label="Role" value={user?.role || "guest"} capitalize />
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <StatBox title="Trips" value={stats.trips} />
        <StatBox title="Completed" value={stats.completedTrips} />
        <StatBox title="Wishlist" value={stats.wishlist} />
        <StatBox title="Total spent" value={formatINR(stats.totalSpent)} />
      </div>

      <div className="mt-6">
        <h3 className="mb-4 text-xl font-semibold tracking-tight text-gray-950">
          Verification
        </h3>

        <div className="grid gap-3 md:grid-cols-2">
          <VerifyItem text="Email verified" active />
          <VerifyItem text="Phone verification" active={Boolean(user?.phone)} />
          <VerifyItem text="Government ID" />
          <VerifyItem text="Selfie verification" />
        </div>
      </div>
    </>
  );
}

function TripsTab({ trips, navigate, formatINR }) {
  return (
    <>
      <SectionHeader
        title="Trips"
        description="Your current and past bookings."
      />

      {trips.length === 0 ? (
        <Empty text="No trips yet." />
      ) : (
        <div className="space-y-3">
          {trips.slice(0, 6).map((trip) => (
            <div
              key={trip.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-base font-semibold text-gray-950">
                  {trip.title || "Trip"}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {trip.checkin} to {trip.checkout}
                </p>

                <p className="mt-2 text-sm font-medium text-[#3b71e6]">
                  {formatINR(trip.total)}
                </p>
              </div>

              <button
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-[#3b71e6]"
              >
                View details
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function WishlistTab({ wishlist, navigate }) {
  return (
    <>
      <SectionHeader
        title="Wishlist"
        description="Homes you saved for later."
      />

      {wishlist.length === 0 ? (
        <Empty text="No saved homes yet." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {wishlist.map((item) => (
            <button
              key={item.wishlist_id || item.id}
              onClick={() => navigate(`/reserve/${item.id}`)}
              className="overflow-hidden rounded-2xl border border-gray-200 text-left transition hover:bg-gray-50"
            >
              <img
                src={
                  item.image ||
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=700&q=80"
                }
                alt={item.title}
                className="h-44 w-full object-cover"
              />

              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-950">
                  {item.title}
                </h3>

                <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  {item.location}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ReviewsTab() {
  return (
    <>
      <SectionHeader
        title="Reviews"
        description="Reviews you have written will appear here."
      />

      <Empty text="No reviews yet." />
    </>
  );
}

function AccountTab({ navigate, logout }) {
  return (
    <>
      <SectionHeader
        title="Account"
        description="Manage account settings, payments and notifications."
      />

      <div className="grid gap-3 md:grid-cols-2">
        <AccountAction
          icon={<Settings size={18} />}
          title="Account settings"
          text="Update your personal information."
          onClick={() => navigate("/account-settings")}
        />

        <AccountAction
          icon={<CreditCard size={18} />}
          title="Payment methods"
          text="Manage cards and payment history."
          onClick={() => navigate("/payment-methods")}
        />

        <AccountAction
          icon={<Bell size={18} />}
          title="Notifications"
          text="View alerts and booking updates."
          onClick={() => navigate("/notifications")}
        />

        <AccountAction
          icon={<MessageCircle size={18} />}
          title="Messages"
          text="Chat with hosts and guests."
          onClick={() => navigate("/messages")}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
        <h3 className="text-base font-semibold text-red-700">Logout</h3>

        <p className="mt-2 text-sm leading-6 text-red-600">
          This will end your current session on this device.
        </p>

        <button
          onClick={logout}
          className="mt-4 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );
}

function InfoCard({ label, value, capitalize }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>

      <h3
        className={`mt-1 text-sm font-medium text-gray-950 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function StatBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-1 text-xl font-semibold text-gray-950">{value}</h3>
    </div>
  );
}

function VerifyItem({ text, active }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 p-4">
      <ShieldCheck
        size={19}
        className={active ? "text-green-600" : "text-gray-300"}
      />

      <span className="text-sm font-medium text-gray-700">{text}</span>
    </div>
  );
}

function AccountAction({ icon, title, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-gray-200 p-4 text-left transition hover:bg-gray-50"
    >
      <div className="mb-3 text-[#3b71e6]">{icon}</div>

      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
    </button>
  );
}

function Empty({ text }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center">
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}