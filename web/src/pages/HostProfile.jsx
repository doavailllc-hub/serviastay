import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Home,
  Languages,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import Navbar from "../components/Navbar";
import api from "../api/api";

export default function HostProfile() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [host, setHost] = useState(null);
  const [properties, setProperties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    loadHostProfile();
  }, [id]);

  const formatINR = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const loadHostProfile = async () => {
    try {
      setLoading(true);

      const [hostRes, propertiesRes, reviewsRes] = await Promise.allSettled([
        api.get(`/host/${id}`),
        api.get(`/host/${id}/properties`),
        api.get(`/host/${id}/reviews`),
      ]);

      if (hostRes.status === "fulfilled") {
        setHost(hostRes.value.data);
      }

      if (propertiesRes.status === "fulfilled") {
        setProperties(propertiesRes.value.data || []);
      }

      if (reviewsRes.status === "fulfilled") {
        setReviews(reviewsRes.value.data || []);
      }
    } catch (err) {
      console.log("Host profile failed:", err);
      alert("Host profile failed to load");
      navigate("/home");
    } finally {
      setLoading(false);
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return host?.rating || "5.0";

    const total = reviews.reduce(
      (sum, item) => sum + Number(item.rating || 0),
      0
    );

    return (total / reviews.length).toFixed(1);
  }, [reviews, host]);

  const contactHost = async () => {
    try {
      const user =
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(sessionStorage.getItem("user"));

      if (!user) {
        navigate("/");
        return;
      }

      if (Number(user.id) === Number(id)) {
        alert("This is your own host profile");
        return;
      }

      setChatLoading(true);

      await api.post("/messages", {
        sender_id: user.id,
        receiver_id: id,
        property_id: properties[0]?.id || null,
        message: "Hi, I would like to know more about your listings.",
      });

      navigate("/messages");
    } catch (err) {
      console.log("Contact host failed:", err);
      alert("Unable to contact host");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Loading host profile...
        </main>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-[#FAFAFC]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          Host not found.
        </main>
      </div>
    );
  }

  const avatarLetter =
    host?.fullname?.charAt(0)?.toUpperCase() ||
    host?.email?.charAt(0)?.toUpperCase() ||
    "H";

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-[#8363F5] text-5xl font-bold text-white">
              {avatarLetter}
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              {host.fullname || "Host"}
            </h1>

            <p className="mt-2 text-gray-500">{host.email}</p>

            <div className="mt-5 flex items-center justify-center gap-2 text-lg font-bold">
              <Star size={20} fill="black" />
              {averageRating}
              <span className="text-gray-400">·</span>
              <span>{reviews.length} reviews</span>
            </div>

            <div className="mt-6 rounded-2xl bg-[#F4F1FF] p-4">
              <div className="flex items-center justify-center gap-2 font-bold text-[#8363F5]">
                <BadgeCheck size={20} />
                Superhost
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Experienced host with reliable guest communication.
              </p>
            </div>

            <button
              onClick={contactHost}
              disabled={chatLoading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8363F5] font-semibold text-white hover:bg-[#7152E8] disabled:opacity-60"
            >
              <MessageCircle size={18} />
              {chatLoading ? "Opening chat..." : "Message Host"}
            </button>
          </aside>

          <section className="space-y-8">
            <div className="grid gap-5 md:grid-cols-4">
              <StatCard icon={<Home />} title="Listings" value={properties.length} />
              <StatCard icon={<Star />} title="Rating" value={averageRating} />
              <StatCard icon={<Users />} title="Reviews" value={reviews.length} />
              <StatCard icon={<ShieldCheck />} title="Verified" value="Yes" />
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                About the host
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem icon={<ShieldCheck />} title="Identity verified" />
                <InfoItem icon={<BadgeCheck />} title="Email verified" />
                <InfoItem icon={<MapPin />} title="Based in India" />
                <InfoItem icon={<Languages />} title="Speaks English, Hindi" />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Host listings
              </h2>

              {properties.length === 0 ? (
                <p className="text-gray-500">No listings found.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {properties.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/reserve/${item.id}`)}
                      className="overflow-hidden rounded-2xl border border-gray-100 bg-white text-left transition hover:shadow-lg"
                    >
                      <img
                        src={
                          item.image ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80"
                        }
                        alt={item.title}
                        className="h-52 w-full object-cover"
                      />

                      <div className="p-5">
                        <div className="flex justify-between gap-4">
                          <h3 className="font-bold text-gray-900">
                            {item.title}
                          </h3>

                          <span className="flex items-center gap-1 text-sm font-bold">
                            <Star size={14} fill="black" />
                            {item.rating || "5.0"}
                          </span>
                        </div>

                        <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                          <MapPin size={15} />
                          {item.location}
                        </p>

                        <p className="mt-3 font-bold text-gray-900">
                          {formatINR(item.price)}{" "}
                          <span className="font-normal text-gray-500">
                            / night
                          </span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">
                Guest reviews
              </h2>

              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet.</p>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-gray-100 p-5"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">
                            {review.fullname || "Guest"}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Verified guest
                          </p>
                        </div>

                        <span className="font-bold">⭐ {review.rating}</span>
                      </div>

                      <p className="text-gray-700">{review.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 text-[#8363F5]">{icon}</div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="mt-1 text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  );
}

function InfoItem({ icon, title }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#FAFAFC] p-4">
      <span className="text-[#8363F5]">{icon}</span>
      <span className="font-semibold text-gray-800">{title}</span>
    </div>
  );
}