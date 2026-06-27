import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, MessageCircle, CalendarCheck, Star, X } from "lucide-react";
import api from "../api/api";
import { socket, connectSocket } from "../socket/socket";

function getStoredUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(sessionStorage.getItem("user") || "null")
    );
  } catch {
    return null;
  }
}

function iconFor(type) {
  if (type === "message") return <MessageCircle size={18} />;
  if (type === "booking") return <CalendarCheck size={18} />;
  if (type === "review") return <Star size={18} />;
  return <CheckCircle2 size={18} />;
}

export default function NotificationBell() {
  const ref = useRef(null);
  const user = getStoredUser();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      const [listRes, countRes] = await Promise.all([
        api.get(`/notifications/${user.id}`),
        api.get(`/notifications/${user.id}/unread-count`),
      ]);

      setNotifications(listRes.data || []);
      setCount(Number(countRes.data?.count || 0));
    } catch (err) {
      console.log("Notifications load failed:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    connectSocket(user.id);

    const onNotification = (data) => {
      if (Number(data.user_id) !== Number(user.id)) return;
      loadNotifications();
    };

    socket.on("notification", onNotification);

    return () => {
      socket.off("notification", onNotification);
    };
  }, [user?.id]);

  useEffect(() => {
    function closeOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const markRead = async () => {
    if (!user?.id) return;

    try {
      await api.put(`/notifications/${user.id}/mark-read`);
      setCount(0);
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: 1,
        }))
      );
    } catch (err) {
      console.log("Mark read failed:", err);
    }
  };

  if (!user?.id) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) loadNotifications();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white transition hover:bg-gray-50"
      >
        <Bell size={19} />

        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[3b71e6] px-1 text-[11px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[999] w-[360px] overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold">Notifications</h3>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <X size={17} />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto text-gray-300" size={36} />
                <p className="mt-3 font-semibold">No notifications yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Updates about bookings and messages will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-3 border-b border-gray-100 px-5 py-4 ${
                    item.is_read ? "bg-white" : "bg-[#f6f2ff]"
                  }`}
                >
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[3b71e6] shadow-sm">
                    {iconFor(item.type)}
                  </div>

                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {item.title || "Notification"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                      {item.message || item.body || ""}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={markRead}
              className="h-12 w-full border-t border-gray-100 text-sm font-bold text-[3b71e6] hover:bg-gray-50"
            >
              Mark all as read
            </button>
          )}
        </div>
      )}
    </div>
  );
}