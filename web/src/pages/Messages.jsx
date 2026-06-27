import { useEffect, useRef, useState } from "react";
import {
  Send,
  Search,
  MessageCircle,
  Circle,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import api from "../api/api";
import { socket, connectSocket } from "../socket/socket";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80";

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
  const [showChatMobile, setShowChatMobile] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
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
          const matched =
            item.other_user_id === msg.sender_id ||
            item.other_user_id === msg.receiver_id;

          if (!matched) return item;

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

    socket.on("typing", ({ sender_id }) => setTypingUser(sender_id));

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
        prev.includes(Number(userId)) ? prev : [...prev, Number(userId)]
      );
    });

    socket.on("user_offline", ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== Number(userId)));
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("message_seen");
      socket.off("user_online");
      socket.off("user_offline");
      clearTimeout(typingTimer.current);
    };
  }, [activeUser, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const loadConversations = async (userId) => {
    try {
      const res = await api.get(`/conversations/${userId}`);
      const data = res.data || [];
      setConversations(data);

      if (!activeUser && data.length > 0) {
        openConversation(data[0], userId, false);
      }
    } catch (err) {
      console.log("Conversation load failed:", err);
    }
  };

  const openConversation = async (
    conversation,
    userId = user?.id,
    openMobile = true
  ) => {
    if (!userId) return;

    setActiveUser(conversation);
    setTypingUser(null);

    if (openMobile) setShowChatMobile(true);

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
    const cleanText = text.trim();

    if (!cleanText || !activeUser || !user) return;

    socket.emit("send_message", {
      sender_id: user.id,
      receiver_id: activeUser.other_user_id,
      property_id: activeUser.property_id || null,
      message: cleanText,
    });

    socket.emit("stop_typing", {
      sender_id: user.id,
      receiver_id: activeUser.other_user_id,
    });

    setText("");
  };

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="min-h-screen bg-[#f8fafc] text-[var(--text-main)]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 md:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-[32px] font-black tracking-[-0.045em] text-[var(--text-main)] md:text-[42px]">
              Messages
            </h1>
            <p className="mt-2 text-[15px] font-medium text-[var(--text-secondary)]">
              Manage guest and host conversations in one clean inbox.
            </p>
          </div>
        </div>

        <div className="h-[calc(100vh-230px)] min-h-[560px] overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_18px_55px_rgba(17,24,39,0.08)]">
          <div className="grid h-full lg:grid-cols-[380px_1fr]">
            <aside
              className={`h-full min-h-0 border-r border-gray-200 bg-white ${
                showChatMobile ? "hidden lg:block" : "block"
              }`}
            >
              <div className="border-b border-gray-100 p-5">
                <div className="flex h-12 items-center gap-3 rounded-full border border-gray-200 bg-[#f8fafc] px-4 transition focus-within:border-[var(--primary)] focus-within:bg-white focus-within:ring-4 focus-within:ring-[rgba(59,113,230,0.10)]">
                  <Search size={17} className="text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages"
                    className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="h-[calc(100%-89px)] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <EmptyConversations />
                ) : (
                  filteredConversations.map((item) => {
                    const selected =
                      activeUser?.other_user_id === item.other_user_id;

                    const online = onlineUsers.includes(
                      Number(item.other_user_id)
                    );

                    return (
                      <button
                        key={item.id}
                        onClick={() => openConversation(item)}
                        className={`group flex w-full gap-3 border-b border-gray-100 px-5 py-4 text-left transition-all duration-200 ${
                          selected
                            ? "bg-[var(--primary-light)]"
                            : "bg-white hover:bg-[#f8fafc]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={item.property_image || FALLBACK_IMAGE}
                            alt={item.other_user_name || "Conversation"}
                            className="h-13 w-13 h-[52px] w-[52px] rounded-[18px] object-cover"
                          />

                          <span
                            className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
                              online ? "text-green-500" : "text-gray-300"
                            }`}
                          >
                            <Circle size={11} fill="currentColor" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-[15px] font-bold text-gray-950">
                              {item.other_user_name || "Guest"}
                            </h3>

                            <span className="shrink-0 text-[11px] font-semibold text-gray-400">
                              {formatTime(item.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm font-medium text-gray-500">
                            {item.message || "No messages yet"}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between gap-3">
                            <p className="truncate text-xs font-medium text-gray-400">
                              {item.property_title || "Dovail Stay conversation"}
                            </p>

                            {Number(item.unread_count) > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-black text-white">
                                {item.unread_count > 99
                                  ? "99+"
                                  : item.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section
              className={`h-full min-h-0 bg-white ${
                showChatMobile ? "flex" : "hidden lg:flex"
              } flex-col`}
            >
              {activeUser ? (
                <>
                  <div className="flex h-[89px] items-center gap-3 border-b border-gray-100 bg-white px-4 md:px-6">
                    <button
                      onClick={() => setShowChatMobile(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 lg:hidden"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    <div className="relative shrink-0">
                      <img
                        src={activeUser.property_image || FALLBACK_IMAGE}
                        alt={activeUser.other_user_name || "User"}
                        className="h-[54px] w-[54px] rounded-[18px] object-cover"
                      />

                      <span
                        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
                          isOnline ? "text-green-500" : "text-gray-300"
                        }`}
                      >
                        <Circle size={11} fill="currentColor" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-lg font-black tracking-[-0.03em] text-gray-950">
                        {activeUser.other_user_name || "Guest"}
                      </h2>

                      <p className="truncate text-sm font-medium text-gray-500">
                        {isOnline ? "Online" : "Offline"} ·{" "}
                        {activeUser.property_title || "Dovail Stay chat"}
                      </p>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f9fc] px-4 py-6 md:px-7">
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <MessageCircle
                            size={48}
                            className="mx-auto mb-3 text-gray-300"
                          />
                          <h3 className="font-heading text-xl font-black tracking-[-0.035em] text-gray-950">
                            Start the conversation
                          </h3>
                          <p className="mt-2 text-sm font-medium text-gray-500">
                            Send a message to continue.
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const mine = Number(msg.sender_id) === Number(user?.id);

                        return (
                          <div
                            key={msg.id || index}
                            className={`flex animate-[fadeIn_.18s_ease-out] ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[430px] rounded-[24px] px-4 py-3 ${
                                mine
                                  ? "bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(59,113,230,0.18)]"
                                  : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {msg.message}
                              </p>

                              <div
                                className={`mt-1.5 flex items-center justify-end gap-1 text-[11px] ${
                                  mine ? "text-white/75" : "text-gray-400"
                                }`}
                              >
                                <span>{formatTime(msg.created_at)}</span>

                                {mine && (
                                  <CheckCheck
                                    size={13}
                                    className={
                                      msg.is_read
                                        ? "text-white"
                                        : "text-white/55"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {typingUser === activeUser.other_user_id && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1 rounded-full bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t border-gray-100 bg-white p-4 md:p-5">
                    <div className="flex items-center gap-3">
                      <input
                        value={text}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Write a message..."
                        className="h-13 h-[52px] flex-1 rounded-full border border-gray-200 bg-[#f8fafc] px-5 text-sm font-medium outline-none transition focus:border-[var(--primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(59,113,230,0.10)]"
                      />

                      <button
                        onClick={sendMessage}
                        disabled={!text.trim()}
                        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_12px_24px_rgba(59,113,230,0.22)] transition-all duration-200 hover:scale-105 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none disabled:hover:scale-100"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyChat />
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyConversations() {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f8fafc]">
          <MessageCircle size={28} className="text-gray-400" />
        </div>
        <h3 className="font-heading text-lg font-black tracking-[-0.035em] text-gray-950">
          No conversations
        </h3>
        <p className="mt-2 text-sm font-medium text-gray-500">
          Your guest and host messages will appear here.
        </p>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f7f9fc] px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-light)]">
          <MessageCircle size={32} className="text-[var(--primary)]" />
        </div>
        <h2 className="font-heading text-2xl font-black tracking-[-0.04em] text-gray-950">
          Select a conversation
        </h2>
        <p className="mt-2 max-w-sm text-sm font-medium text-gray-500">
          Choose a guest or host from the left side to continue messaging.
        </p>
      </div>
    </div>
  );
}