import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!user || !token) {
      navigate("/");
      return;
    }

    const res = await api.get(`/notifications/${user.id}`);
    setNotifications(res.data || []);
  };

  const markAllRead = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    await api.put(`/notifications/${user.id}/read-all`);
    loadNotifications();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Notifications
            </h1>
            <p className="text-gray-500 mt-2">
              Booking, message, and account updates.
            </p>
          </div>

          <button
            onClick={markAllRead}
            className="mt-5 md:mt-0 px-6 py-3 rounded-xl bg-[3b71e6] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg"
          >
            Mark all as read
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-14 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h2 className="text-2xl font-bold">No notifications yet</h2>
              <p className="text-gray-500 mt-2">
                Updates will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-6 border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4F1FF] flex items-center justify-center text-3xl">
                    {item.type === "message"
                      ? "💬"
                      : item.type === "booking"
                      ? "🏡"
                      : "🔔"}
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {item.title}
                    </h3>

                    <p className="text-gray-500 mt-1">
                      {item.message}
                    </p>

                    <span className="text-xs text-gray-400 mt-2 block">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!item.is_read && (
                  <div className="w-3 h-3 rounded-full bg-[3b71e6]" />
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}