import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle,
  CreditCard,
  Heart,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
  User,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function Profile() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("about");
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: "about", label: "About me", icon: <User size={19} /> },
    { id: "trips", label: "Trips", icon: <CalendarDays size={19} /> },
    { id: "wishlist", label: "Wishlist", icon: <Heart size={19} /> },
    { id: "reviews", label: "Reviews", icon: <Star size={19} /> },
    { id: "account", label: "Account", icon: <Settings size={19} /> },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const storedUser =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(sessionStorage.getItem("user"));

  const loadProfile = async () => {
    try {
      setLoading(true);

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
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading profile...
        </main>
      </div>
    );
  }

  const avatarLetter =
    user?.fullname?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">Profile</h1>

          <p className="mt-2 text-gray-500">
            Manage your account, trips, saved homes, and travel history.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="h-fit rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[3b71e6] text-4xl font-bold text-white">
                {avatarLetter}
              </div>

              <h2 className="text-2xl font-bold text-gray-900">
                {user?.fullname || "Guest User"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">{user?.email}</p>

              <span className="mt-3 inline-flex rounded-full bg-[#F4F1FF] px-4 py-2 text-xs font-bold capitalize text-[3b71e6]">
                {user?.role || "guest"}
              </span>
            </div>

            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left font-semibold transition ${
                    tab === item.id
                      ? "bg-[3b71e6] text-white shadow-md"
                      : "text-gray-700 hover:bg-[#F4F1FF] hover:text-[3b71e6]"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={logout}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          </aside>

          <section className="min-h-[600px] rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
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

function AboutTab({ user, avatarLetter, stats, formatINR, navigate }) {
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">About me</h2>
          <p className="mt-2 text-gray-500">
            Your public profile and travel summary.
          </p>
        </div>

        <button
          onClick={() => navigate("/account-settings")}
          className="rounded-xl bg-[3b71e6] px-6 py-3 font-semibold text-white hover:bg-[#7152E8]"
        >
          Edit profile
        </button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[3b71e6] text-5xl font-bold text-white">
            {avatarLetter}
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {user?.fullname || "Guest User"}
          </h2>

          <p className="mt-1 text-gray-500">{user?.email}</p>

          <p className="mt-3 text-sm font-semibold capitalize text-[3b71e6]">
            {user?.role || "guest"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Full name" value={user?.fullname || "-"} />
          <InfoCard label="Email" value={user?.email || "-"} />
          <InfoCard label="Phone" value={user?.phone || "-"} />
          <InfoCard label="Role" value={user?.role || "guest"} capitalize />
        </div>
      </div>

      <div className="mb-8 grid gap-5 md:grid-cols-4">
        <StatBox title="Trips" value={stats.trips} icon={<CalendarDays />} />
        <StatBox title="Completed" value={stats.completedTrips} icon={<CheckCircle />} />
        <StatBox title="Wishlist" value={stats.wishlist} icon={<Heart />} />
        <StatBox
          title="Total Spent"
          value={formatINR(stats.totalSpent)}
          icon={<CreditCard />}
        />
      </div>

      <div className="rounded-3xl border border-gray-100 p-6">
        <h3 className="mb-5 text-2xl font-bold">Verification</h3>

        <div className="grid gap-4 md:grid-cols-2">
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
      <h2 className="mb-8 text-3xl font-bold text-gray-900">Trips</h2>

      {trips.length === 0 ? (
        <Empty icon="🧳" text="No trips yet." />
      ) : (
        <div className="space-y-4">
          {trips.slice(0, 6).map((trip) => (
            <div
              key={trip.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-5 transition hover:shadow-md md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="text-lg font-bold">{trip.title}</h3>
                <p className="mt-1 text-gray-500">
                  {trip.checkin} to {trip.checkout}
                </p>
                <p className="mt-2 font-bold text-[3b71e6]">
                  {formatINR(trip.total)}
                </p>
              </div>

              <button
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="rounded-xl bg-[3b71e6] px-5 py-3 font-semibold text-white hover:bg-[#7152E8]"
              >
                View Details
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
      <h2 className="mb-8 text-3xl font-bold text-gray-900">Wishlist</h2>

      {wishlist.length === 0 ? (
        <Empty icon="❤️" text="No saved homes yet." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {wishlist.map((item) => (
            <div
              key={item.wishlist_id || item.id}
              className="overflow-hidden rounded-2xl border border-gray-100 transition hover:shadow-md"
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
                <h3 className="font-bold">{item.title}</h3>

                <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                  <MapPin size={14} />
                  {item.location}
                </p>

                <button
                  onClick={() => navigate(`/reserve/${item.id}`)}
                  className="mt-4 h-11 w-full rounded-xl bg-[3b71e6] font-semibold text-white hover:bg-[#7152E8]"
                >
                  View Property
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ReviewsTab() {
  return (
    <>
      <h2 className="mb-8 text-3xl font-bold text-gray-900">Reviews</h2>
      <Empty icon="⭐" text="Your written reviews will appear here." />
    </>
  );
}

function AccountTab({ navigate, logout }) {
  return (
    <>
      <h2 className="mb-8 text-3xl font-bold text-gray-900">Account</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <AccountAction
          icon={<Settings />}
          title="Account settings"
          text="Update your personal information."
          onClick={() => navigate("/account-settings")}
        />

        <AccountAction
          icon={<CreditCard />}
          title="Payment methods"
          text="Manage payment cards and payment history."
          onClick={() => navigate("/payment-methods")}
        />

        <AccountAction
          icon={<Bell />}
          title="Notifications"
          text="View alerts and booking updates."
          onClick={() => navigate("/notifications")}
        />

        <AccountAction
          icon={<MessageCircle />}
          title="Messages"
          text="Chat with hosts and guests."
          onClick={() => navigate("/messages")}
        />
      </div>

      <div className="mt-10 rounded-3xl border border-red-100 bg-red-50 p-6">
        <h3 className="text-xl font-bold text-red-600">Danger Zone</h3>

        <p className="mt-2 text-sm text-red-500">
          Logout safely or contact support if you want to deactivate your account.
        </p>

        <button
          onClick={logout}
          className="mt-5 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );
}

function InfoCard({ label, value, capitalize }) {
  return (
    <div className="rounded-2xl bg-[#FAFAFC] p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <h3
        className={`mt-1 font-bold text-gray-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </h3>
    </div>
  );
}

function StatBox({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5">
      <div className="mb-3 text-[3b71e6]">{icon}</div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-1 text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  );
}

function VerifyItem({ text, active }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#FAFAFC] p-4">
      <ShieldCheck
        size={22}
        className={active ? "text-green-600" : "text-gray-300"}
      />
      <span className="font-semibold text-gray-700">{text}</span>
    </div>
  );
}

function AccountAction({ icon, title, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-gray-100 p-5 text-left transition hover:shadow-md"
    >
      <div className="mb-3 text-[3b71e6]">{icon}</div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
    </button>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="py-20 text-center">
      <div className="mb-4 text-6xl">{icon}</div>
      <p className="text-gray-500">{text}</p>
    </div>
  );
}