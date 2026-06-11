import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    setUser(storedUser);

    if (storedUser) {
      loadMessages(storedUser.id);
    }
  }, []);

  const loadMessages = async (userId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${userId}`);
      setMessages(res.data);
    } catch (err) {
      console.log("Messages load failed:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await axios.post("http://localhost:5000/api/messages", {
      sender_id: user.id,
      receiver_id: 1,
      property_id: null,
      message: newMessage,
    });

    setNewMessage("");
    loadMessages(user.id);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <h1 className="text-4xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-gray-500">Chat with hosts and guests.</p>

        <div className="mt-10 grid min-h-[620px] grid-cols-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm md:grid-cols-[330px_1fr]">
          <aside className="border-r border-gray-100 bg-white p-5">
            <h2 className="mb-5 text-xl font-bold">Inbox</h2>

            <div className="rounded-2xl bg-[#F4F1FF] p-4">
              <h3 className="font-bold text-gray-900">Staybnb Support</h3>
              <p className="mt-1 text-sm text-gray-500">
                Booking support and host messages
              </p>
            </div>
          </aside>

          <section className="flex flex-col">
            <div className="border-b border-gray-100 p-5">
              <h2 className="text-xl font-bold">Staybnb Support</h2>
              <p className="text-sm text-green-600">Online</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAFAFC] p-6">
              {messages.length === 0 ? (
                <div className="py-20 text-center text-gray-500">
                  No messages yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const mine = msg.sender_id === user?.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm ${
                          mine
                            ? "bg-[#8363F5] text-white"
                            : "bg-white text-gray-800 border border-gray-100"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p
                          className={`mt-2 text-[11px] ${
                            mine ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {msg.created_at}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 border-t border-gray-100 bg-white p-5">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a message..."
                className="h-12 flex-1 rounded-xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-[#8363F5]"
              />

              <button
                onClick={sendMessage}
                className="rounded-xl bg-[#8363F5] px-6 font-semibold text-white hover:bg-[#7152E8]"
              >
                Send
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}