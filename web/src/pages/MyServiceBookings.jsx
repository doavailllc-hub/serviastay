import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import Navbar from "../components/Navbar";

export default function MyServiceBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
    if (!user?.id) return setLoading(false);
    api.get(`/service-bookings/user/${user.id}`)
      .then((response) => setBookings(response.data || []))
      .catch((err) => toast.error(err.response?.data?.message || "Service bookings failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <h1 className="text-3xl font-bold">My service bookings</h1>
        <p className="mt-2 text-gray-500">Manage services booked for your stays.</p>
        <div className="mt-8 space-y-4">
          {loading && <p>Loading bookings...</p>}
          {!loading && !bookings.length && <div className="rounded-2xl bg-white p-8 text-center">No service bookings yet.</div>}
          {bookings.map((item) => (
            <Link key={item.id} to={`/service-booking/${item.id}`} className="flex gap-4 rounded-2xl border bg-white p-4 text-gray-900 no-underline hover:shadow-md">
              <img src={item.image} alt="" className="h-24 w-24 rounded-xl object-cover" />
              <div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h2 className="font-bold">{item.service_title}</h2><span className="text-sm font-semibold text-[#3b71e6]">{item.status}</span></div>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-500"><CalendarDays size={15} />{String(item.service_date).slice(0, 10)}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-gray-500"><MapPin size={15} />{item.location || "At your stay"}</p>
                <p className="mt-2 font-semibold">{item.currency || "USD"} {Number(item.total || 0).toLocaleString()}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
