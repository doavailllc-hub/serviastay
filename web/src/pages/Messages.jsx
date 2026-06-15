import { useEffect, useRef, useState } from "react";
import {
  Send,
  Search,
  MessageCircle,
  Circle,
  CheckCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import api from "../api/api";
import { socket, connectSocket } from "../socket/socket";

export default function Messages() {
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");

    if (!storedUser || !token) {
      navigate("/");
      return;
    }

    setUser(storedUser);
    connectSocket(storedUser.id);
    loadConversations(storedUser.id);

    socket.on("receive_message", (msg) => {
      setConversations((prev) => {
        const exists = prev.some(
          (item) =>
            item.other_user_id === msg.sender_id ||
            item.other_user_id === msg.receiver_id
        );

        if (!exists) return prev;

        return prev.map((item) => {
          if (
            item.other_user_id === msg.sender_id ||
            item.other_user_id === msg.receiver_id
          ) {
            return {
              ...item,
              message: msg.message,
              created_at: msg.created_at,
              unread_count:
                msg.receiver_id === storedUser.id &&
                activeUser?.other_user_id !== msg.sender_id
                  ? Number(item.unread_count || 0) + 1
                  : item.unread_count,
            };
          }

          return item;
        });
      });

      const isActiveConversation =
        activeUser &&
        (msg.sender_id === activeUser.other_user_id ||
          msg.receiver_id === activeUser.other_user_id);

      if (isActiveConversation) {
        setMessages((prev) => [...prev, msg]);

        if (msg.receiver_id === storedUser.id) {
          markMessagesRead(storedUser.id, activeUser.other_user_id);
          socket.emit("message_seen", {
            user_id: storedUser.id,
            other_user_id: activeUser.other_user_id,
          });
        }
      } else {
        loadConversations(storedUser.id);
      }
    });

    socket.on("typing", ({ sender_id }) => {
      setTypingUser(sender_id);
    });

    socket.on("stop_typing", ({ sender_id }) => {
      setTypingUser((current) => (current === sender_id ? null : current));
    });

    socket.on("message_seen", ({ by }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.receiver_id === by ? { ...msg, is_read: true } : msg
        )
      );
    });

    socket.on("user_online", ({ userId }) => {
      setOnlineUsers((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
    });

    socket.on("user_offline", ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("message_seen");
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [activeUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const loadConversations = async (userId) => {
    try {
      const res = await api.get(`/conversations/${userId}`);
      const data = res.data || [];
      setConversations(data);

      if (!activeUser && data.length > 0) {
        openConversation(data[0], userId);
      }
    } catch (err) {
      console.log("Conversation load failed:", err);
    }
  };

  const openConversation = async (conversation, userId = user?.id) => {
    if (!userId) return;

    setActiveUser(conversation);
    setTypingUser(null);

    try {
      const res = await api.get(
        `/messages/${userId}/${conversation.other_user_id}`
      );

      setMessages(res.data || []);

      await markMessagesRead(userId, conversation.other_user_id);

      socket.emit("message_seen", {
        user_id: userId,
        other_user_id: conversation.other_user_id,
      });

      loadConversations(userId);
    } catch (err) {
      console.log("Messages load failed:", err);
    }
  };

  const markMessagesRead = async (userId, otherUserId) => {
    try {
      await api.put(`/messages/read/${userId}/${otherUserId}`);
    } catch (err) {
      console.log("Mark read failed:", err);
    }
  };

  const handleTyping = (value) => {
    setText(value);

    if (!activeUser || !user) return;

    socket.emit("typing", {
      sender_id: user.id,
      receiver_id: activeUser.other_user_id,
    });

    clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      socket.emit("stop_typing", {
        sender_id: user.id,
        receiver_id: activeUser.other_user_id,
      });
    }, 900);
  };

  const sendMessage = () => {
    if (!text.trim() || !activeUser || !user) return;

    socket.emit("send_message", {
      sender_id: user.id,
      receiver_id: activeUser.other_user_id,
      property_id: activeUser.property_id || null,
      message: text.trim(),
    });

    socket.emit("stop_typing", {
      sender_id: user.id,
      receiver_id: activeUser.other_user_id,
    });

    setText("");
  };

  const filteredConversations = conversations.filter((item) => {
    const value = `${item.other_user_name || ""} ${
      item.property_title || ""
    } ${item.message || ""}`.toLowerCase();

    return value.includes(search.toLowerCase());
  });

  const isOnline =
    activeUser && onlineUsers.includes(Number(activeUser.other_user_id));

  return (
    <div className="min-h-screen bg-[#FAFAFC]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-500">
            Chat with guests and hosts in real time.
          </p>
        </div>

        <div className="grid h-[720px] overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
          <aside className="border-r border-gray-100">
            <div className="border-b p-5">
              <div className="flex h-12 items-center gap-3 rounded-full bg-[#FAFAFC] px-4">
                <Search size={18} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <div className="h-[660px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="mx-auto mb-3" size={42} />
                  No conversations yet.
                </div>
              ) : (
                filteredConversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openConversation(item)}
                    className={`flex w-full gap-4 border-b p-5 text-left transition hover:bg-[#FAFAFC] ${
                      activeUser?.other_user_id === item.other_user_id
                        ? "bg-[#F4F1FF]"
                        : ""
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={
                          item.property_image ||
                          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                        }
                        alt=""
                        className="h-14 w-14 rounded-2xl object-cover"
                      />

                      <span
                        className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white ${
                          onlineUsers.includes(Number(item.other_user_id))
                            ? "text-green-500"
                            : "text-gray-300"
                        }`}
                      >
                        <Circle size={12} fill="currentColor" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3">
                        <h3 className="truncate font-bold">
                          {item.other_user_name}
                        </h3>

                        {item.unread_count > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#8363F5] px-2 text-xs font-bold text-white">
                            {item.unread_count}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {item.message}
                      </p>

                      <p className="mt-1 truncate text-xs text-gray-400">
                        {item.property_title || "Staybnb conversation"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex flex-col">
            {activeUser ? (
              <>
                <div className="flex items-center gap-4 border-b p-5">
                  <div className="relative">
                    <img
                      src={
                        activeUser.property_image ||
                        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                      }
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover"
                    />

                    <span
                      className={`absolute -bottom-1 -right-1 rounded-full border-2 border-white ${
                        isOnline ? "text-green-500" : "text-gray-300"
                      }`}
                    >
                      <Circle size={12} fill="currentColor" />
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      {activeUser.other_user_name}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {isOnline ? "Online" : "Offline"} ·{" "}
                      {activeUser.property_title || "Staybnb chat"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAFAFC] p-6">
                  {messages.map((msg) => {
                    const mine = msg.sender_id === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${
                          mine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-3xl px-5 py-3 ${
                            mine
                              ? "bg-[#8363F5] text-white"
                              : "border border-gray-100 bg-white text-gray-800"
                          }`}
                        >
                          <p className="text-sm leading-6">{msg.message}</p>

                          <div
                            className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${
                              mine ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {mine && (
                              <CheckCheck
                                size={13}
                                className={
                                  msg.is_read
                                    ? "text-green-200"
                                    : "text-white/60"
                                }
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {typingUser === activeUser.other_user_id && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-gray-100 bg-white px-5 py-3 text-sm text-gray-500">
                        Typing...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                <div className="flex gap-3 border-t bg-white p-5">
                  <input
                    value={text}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Write a message..."
                    className="h-12 flex-1 rounded-xl border border-gray-300 px-4 outline-none focus:ring-2 focus:ring-[#8363F5]"
                  />

                  <button
                    onClick={sendMessage}
                    className="flex h-12 items-center gap-2 rounded-xl bg-[#8363F5] px-6 font-semibold text-white hover:bg-[#7152E8]"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-gray-500">
                <div>
                  <MessageCircle className="mx-auto mb-4" size={60} />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Select a conversation
                  </h2>
                  <p className="mt-2">
                    Choose a guest or host to start messaging.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}