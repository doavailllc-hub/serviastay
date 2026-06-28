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

const BRAND = "#3b71e6";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80";

export default function Messages() {
  const navigate = useNavigate();

  const messagesRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const shouldAutoScroll = useRef(true);

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
      setConversations((prev) =>
        prev.map((item) => {
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
        })
      );

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
    if (!shouldAutoScroll.current) return;

    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const handleMessageScroll = () => {
    const el = messagesRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 120;
  };

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

    shouldAutoScroll.current = true;
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

    shouldAutoScroll.current = true;

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
    <div className="min-h-screen bg-white text-gray-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 md:px-8">
        <header className="mb-6">
          <p className="text-sm font-medium text-gray-500">Inbox</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 md:text-4xl">
            Messages
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Manage guest and host conversations in one place.
          </p>
        </header>

        <div className="h-[calc(100vh-230px)] min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid h-full lg:grid-cols-[360px_1fr]">
            <aside
              className={`h-full min-h-0 border-r border-gray-200 bg-white ${
                showChatMobile ? "hidden lg:block" : "block"
              }`}
            >
              <div className="border-b border-gray-200 p-4">
                <div className="flex h-11 items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 transition focus-within:border-[#3b71e6] focus-within:ring-2 focus-within:ring-[#3b71e6]/10">
                  <Search size={17} className="text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="h-[calc(100%-77px)] overflow-y-auto">
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
                        className={`flex w-full gap-3 border-b border-gray-100 px-4 py-4 text-left transition ${
                          selected
                            ? "bg-[#eef4ff]"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={item.property_image || FALLBACK_IMAGE}
                            alt={item.other_user_name || "Conversation"}
                            className="h-12 w-12 rounded-xl object-cover"
                          />

                          <span
                            className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
                              online ? "text-green-500" : "text-gray-300"
                            }`}
                          >
                            <Circle size={10} fill="currentColor" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="truncate text-sm font-medium text-gray-950">
                              {item.other_user_name || "Guest"}
                            </h3>

                            <span className="shrink-0 text-xs text-gray-400">
                              {formatTime(item.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-gray-500">
                            {item.message || "No messages yet"}
                          </p>

                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className="truncate text-xs text-gray-400">
                              {item.property_title || "Dovail Stay conversation"}
                            </p>

                            {Number(item.unread_count) > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b71e6] px-1.5 text-[11px] font-medium text-white">
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
                  <div className="flex h-[77px] items-center gap-3 border-b border-gray-200 bg-white px-4 md:px-5">
                    <button
                      onClick={() => setShowChatMobile(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100 lg:hidden"
                    >
                      <ArrowLeft size={19} />
                    </button>

                    <div className="relative shrink-0">
                      <img
                        src={activeUser.property_image || FALLBACK_IMAGE}
                        alt={activeUser.other_user_name || "User"}
                        className="h-12 w-12 rounded-xl object-cover"
                      />

                      <span
                        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${
                          isOnline ? "text-green-500" : "text-gray-300"
                        }`}
                      >
                        <Circle size={10} fill="currentColor" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-gray-950">
                        {activeUser.other_user_name || "Guest"}
                      </h2>

                      <p className="truncate text-sm text-gray-500">
                        {isOnline ? "Online" : "Offline"} ·{" "}
                        {activeUser.property_title || "Dovail Stay chat"}
                      </p>
                    </div>
                  </div>

                  <div
                    ref={messagesRef}
                    onScroll={handleMessageScroll}
                    className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white px-4 py-5 md:px-6"
                  >
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <div>
                          <MessageCircle
                            size={44}
                            className="mx-auto mb-3 text-gray-300"
                          />
                          <h3 className="text-xl font-semibold tracking-tight text-gray-950">
                            Start the conversation
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
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
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[420px] rounded-2xl px-4 py-3 ${
                                mine
                                  ? "bg-[#3b71e6] text-white"
                                  : "border border-gray-200 bg-white text-gray-800"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                {msg.message}
                              </p>

                              <div
                                className={`mt-1.5 flex items-center justify-end gap-1 text-xs ${
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
                        <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-3">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t border-gray-200 bg-white p-4">
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
                        className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm outline-none transition focus:border-[#3b71e6] focus:ring-2 focus:ring-[#3b71e6]/10"
                      />

                      <button
                        onClick={sendMessage}
                        disabled={!text.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3b71e6] text-white transition hover:bg-[#2f5fc2] disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <Send size={17} />
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff]">
          <MessageCircle size={26} className="text-[#3b71e6]" />
        </div>

        <h3 className="text-lg font-semibold tracking-tight text-gray-950">
          No conversations
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          Your guest and host messages will appear here.
        </p>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-1 items-center justify-center bg-white px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff]">
          <MessageCircle size={30} className="text-[#3b71e6]" />
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
          Select a conversation
        </h2>

        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Choose a guest or host from the left side to continue messaging.
        </p>
      </div>
    </div>
  );
}