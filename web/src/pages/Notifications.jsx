
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) return;

      const res = await axios.get(
        `http://localhost:5000/api/notifications/${user.id}`
      );

      setNotifications(res.data);
    } catch (err) {
      console.log(err);

      // Demo data if API not ready
      setNotifications([
        {
          id: 1,
          icon: "🏡",
          title: "Booking Reminder",
          message:
            "Your Kerala stay starts tomorrow. Get ready for your trip!",
          time: "2 hours ago",
          unread: true,
        },
        {
          id: 2,
          icon: "💬",
          title: "New Message",
          message:
            "You received a message from your host.",
          time: "Today",
          unread: true,
        },
        {
          id: 3,
          icon: "💳",
          title: "Payment Successful",
          message:
            "Your payment has been processed successfully.",
          time: "Yesterday",
          unread: false,
        },
        {
          id: 4,
          icon: "⭐",
          title: "Leave a Review",
          message:
            "Tell everyone about your experience.",
          time: "2 days ago",
          unread: false,
        },
      ]);
    }
  };

  const markAllRead = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (user) {
        await axios.put(
          `http://localhost:5000/api/notifications/read/${user.id}`
        );
      }
    } catch (e) {}

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        unread: false,
      }))
    );
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
              Stay updated with bookings, payments and messages.
            </p>
          </div>

          <button
            onClick={markAllRead}
            className="mt-5 md:mt-0 px-6 py-3 rounded-xl bg-[#8363F5] hover:bg-[#7152E8] text-white font-semibold transition shadow-lg"
          >
            Mark all as read
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-6xl">🔔</div>

              <p className="mt-4 text-gray-500">
                No notifications available.
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
                    {item.icon}
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {item.title}
                    </h3>

                    <p className="text-gray-500 mt-1">
                      {item.message}
                    </p>

                    <span className="text-xs text-gray-400 mt-2 block">
                      {item.time}
                    </span>
                  </div>
                </div>

                {item.unread && (
                  <div className="w-3 h-3 rounded-full bg-[#8363F5]"></div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-to-r from-[#8363F5] to-[#6D4EEB] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-bold">
            Stay updated 🔔
          </h2>

          <p className="mt-3 text-white/90 max-w-2xl">
            We'll notify you about bookings, payments, messages,
            cancellations and important account activities.
          </p>
        </div>
      </main>
    </div>
  );
}
