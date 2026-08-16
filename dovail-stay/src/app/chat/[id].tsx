import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Send,
  WifiOff,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputContentSizeChangeEventData,
  View,
} from "react-native";
import { io, Socket } from "socket.io-client";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

const SOCKET_URL = "https://stay.dovail.com";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80";

type ChatParams = {
  id?: string | string[];
  name?: string | string[];
  propertyId?: string | string[];
  propertyTitle?: string | string[];
  image?: string | string[];
};

type ChatMessage = {
  id: number | string;
  sender_id: number | string;
  receiver_id: number | string;
  property_id?: number | string | null;
  message: string;
  is_read?: number | boolean;
  created_at?: string;
  pending?: boolean;
  failed?: boolean;
};

function getParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

function formatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isSameDay(first?: string, second?: string) {
  if (!first || !second) return false;

  const firstDate = new Date(first);
  const secondDate = new Date(second);

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function formatDayLabel(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();

  if (isSameDay(value, today.toISOString())) {
    return "Today";
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(value, yesterday.toISOString())) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

export default function ChatScreen() {
  const params = useLocalSearchParams<ChatParams>();

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherUserId = getParam(params.id);
  const otherName = getParam(params.name, "Guest");
  const propertyId = getParam(params.propertyId);
  const propertyTitle = getParam(
    params.propertyTitle,
    "Dovail Stay"
  );
  const propertyImage = getParam(params.image, FALLBACK_IMAGE);

  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const markMessagesRead = useCallback(
    async (currentUserId: number | string) => {
      if (!otherUserId) return;

      try {
        await api.put(
          `/messages/read/${currentUserId}/${otherUserId}`
        );

        socketRef.current?.emit("message_seen", {
          user_id: Number(currentUserId),
          other_user_id: Number(otherUserId),
        });

        setMessages((current) =>
          current.map((message) =>
            Number(message.receiver_id) === Number(currentUserId) &&
            Number(message.sender_id) === Number(otherUserId)
              ? { ...message, is_read: 1 }
              : message
          )
        );
      } catch (error) {
        console.log("Mark read error:", error);
      }
    },
    [otherUserId]
  );

  const loadChat = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = await getStoredUser();

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      setUser(storedUser);

      const response = await api.get(
        `/messages/${storedUser.id}/${otherUserId}`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setMessages(data);

      await markMessagesRead(storedUser.id);

      setTimeout(() => scrollToBottom(false), 100);
    } catch (error: any) {
      console.log(
        "Chat load error:",
        error?.response?.data || error?.message || error
      );

      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [markMessagesRead, otherUserId, scrollToBottom]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (!user?.id || !otherUserId) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 15000,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      socket.emit("join", Number(user.id));
    };

    const handleDisconnect = () => {
      setConnected(false);
      setOtherTyping(false);
    };

    const handleReceiveMessage = (message: ChatMessage) => {
      const belongsToConversation =
        (Number(message.sender_id) === Number(user.id) &&
          Number(message.receiver_id) === Number(otherUserId)) ||
        (Number(message.sender_id) === Number(otherUserId) &&
          Number(message.receiver_id) === Number(user.id));

      if (!belongsToConversation) return;

      setMessages((current) => {
        const exists = current.some(
          (existing) => String(existing.id) === String(message.id)
        );

        if (exists) {
          return current.map((existing) =>
            String(existing.id) === String(message.id)
              ? { ...message, pending: false, failed: false }
              : existing
          );
        }

        const pendingIndex = current.findIndex(
          (existing) =>
            existing.pending &&
            existing.message === message.message &&
            Number(existing.sender_id) === Number(message.sender_id)
        );

        if (pendingIndex >= 0) {
          const updated = [...current];
          updated[pendingIndex] = {
            ...message,
            pending: false,
            failed: false,
          };
          return updated;
        }

        return [...current, message];
      });

      if (Number(message.sender_id) === Number(otherUserId)) {
        markMessagesRead(user.id);
      }

      setOtherTyping(false);
      scrollToBottom();
    };

    const handleTyping = ({
      sender_id,
    }: {
      sender_id: number;
    }) => {
      if (Number(sender_id) === Number(otherUserId)) {
        setOtherTyping(true);
      }
    };

    const handleStopTyping = ({
      sender_id,
    }: {
      sender_id: number;
    }) => {
      if (Number(sender_id) === Number(otherUserId)) {
        setOtherTyping(false);
      }
    };

    const handleUserOnline = ({
      userId,
    }: {
      userId: number;
    }) => {
      if (Number(userId) === Number(otherUserId)) {
        setOtherOnline(true);
      }
    };

    const handleUserOffline = ({
      userId,
    }: {
      userId: number;
    }) => {
      if (Number(userId) === Number(otherUserId)) {
        setOtherOnline(false);
        setOtherTyping(false);
      }
    };

    const handleMessageSeen = ({
      by,
    }: {
      by: number;
    }) => {
      if (Number(by) !== Number(otherUserId)) return;

      setMessages((current) =>
        current.map((message) =>
          Number(message.sender_id) === Number(user.id)
            ? { ...message, is_read: 1 }
            : message
        )
      );
    };

    const handleMessageError = () => {
      setMessages((current) =>
        current.map((message) =>
          message.pending
            ? {
                ...message,
                pending: false,
                failed: true,
              }
            : message
        )
      );
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("message_seen", handleMessageSeen);
    socket.on("message_error", handleMessageError);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      socket.emit("stop_typing", {
        sender_id: Number(user.id),
        receiver_id: Number(otherUserId),
      });

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("message_seen", handleMessageSeen);
      socket.off("message_error", handleMessageError);

      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    markMessagesRead,
    otherUserId,
    scrollToBottom,
    user?.id,
  ]);

  const handleTextChange = (value: string) => {
    setText(value);

    if (!user?.id || !otherUserId || !socketRef.current) return;

    if (value.trim()) {
      socketRef.current.emit("typing", {
        sender_id: Number(user.id),
        receiver_id: Number(otherUserId),
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("stop_typing", {
          sender_id: Number(user.id),
          receiver_id: Number(otherUserId),
        });
      }, 1200);
    } else {
      socketRef.current.emit("stop_typing", {
        sender_id: Number(user.id),
        receiver_id: Number(otherUserId),
      });
    }
  };

  const sendMessage = async () => {
    const cleanMessage = text.trim();

    if (
      !cleanMessage ||
      !user?.id ||
      !otherUserId ||
      sending
    ) {
      return;
    }

    const temporaryId = `temp-${Date.now()}`;

    const optimisticMessage: ChatMessage = {
      id: temporaryId,
      sender_id: user.id,
      receiver_id: Number(otherUserId),
      property_id: propertyId ? Number(propertyId) : null,
      message: cleanMessage,
      is_read: 0,
      created_at: new Date().toISOString(),
      pending: true,
      failed: false,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setText("");
    setInputHeight(48);
    setSending(true);
    scrollToBottom();

    socketRef.current?.emit("stop_typing", {
      sender_id: Number(user.id),
      receiver_id: Number(otherUserId),
    });

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("send_message", {
          sender_id: Number(user.id),
          receiver_id: Number(otherUserId),
          property_id: propertyId ? Number(propertyId) : null,
          message: cleanMessage,
        });
      } else {
        const response = await api.post("/conversations/start", {
          sender_id: Number(user.id),
          receiver_id: Number(otherUserId),
          property_id: propertyId ? Number(propertyId) : null,
          message: cleanMessage,
        });

        setMessages((current) =>
          current.map((message) =>
            message.id === temporaryId
              ? {
                  ...message,
                  id:
                    response.data?.messageId ||
                    temporaryId,
                  pending: false,
                }
              : message
          )
        );
      }
    } catch (error: any) {
      console.log(
        "Send message error:",
        error?.response?.data || error?.message || error
      );

      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryId
            ? {
                ...message,
                pending: false,
                failed: true,
              }
            : message
        )
      );
    } finally {
      setSending(false);
    }
  };

  const retryMessage = (message: ChatMessage) => {
    setMessages((current) =>
      current.filter(
        (item) => String(item.id) !== String(message.id)
      )
    );

    setText(message.message);

    setTimeout(() => {
      sendMessage();
    }, 50);
  };

  const handleContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>
  ) => {
    const nextHeight = Math.min(
      112,
      Math.max(48, event.nativeEvent.contentSize.height + 20)
    );

    setInputHeight(nextHeight);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingPage}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={TEXT} />
          </Pressable>

          <Image
            source={{ uri: propertyImage }}
            style={styles.headerImage}
          />

          <View style={styles.headerContent}>
            <Text numberOfLines={1} style={styles.headerName}>
              {otherName}
            </Text>

            <Text numberOfLines={1} style={styles.headerStatus}>
              {otherTyping
                ? "Typing..."
                : otherOnline
                  ? "Online"
                  : propertyTitle}
            </Text>
          </View>

          <View
            style={[
              styles.connectionDot,
              connected
                ? styles.connectionDotOnline
                : styles.connectionDotOffline,
            ]}
          />
        </View>

        {!connected && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color="#9a6700" />

            <Text style={styles.offlineText}>
              Reconnecting to live chat…
            </Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, index) =>
            `${item.id}-${index}`
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollToBottom(false)}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyAvatar}>
                <Image
                  source={{ uri: propertyImage }}
                  style={styles.emptyAvatarImage}
                />
              </View>

              <Text style={styles.emptyTitle}>
                Start the conversation
              </Text>

              <Text style={styles.emptyText}>
                Ask {otherName} a question about {propertyTitle}.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine =
              Number(item.sender_id) === Number(user?.id);

            const previousMessage =
              index > 0 ? messages[index - 1] : null;

            const showDayLabel =
              !previousMessage ||
              !isSameDay(
                previousMessage.created_at,
                item.created_at
              );

            return (
              <View>
                {showDayLabel && (
                  <View style={styles.dayLabelWrap}>
                    <Text style={styles.dayLabel}>
                      {formatDayLabel(item.created_at)}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.messageRow,
                    mine
                      ? styles.messageRowMine
                      : styles.messageRowTheirs,
                  ]}
                >
                  <Pressable
                    disabled={!item.failed}
                    onPress={() =>
                      item.failed && retryMessage(item)
                    }
                    style={[
                      styles.bubble,
                      mine
                        ? styles.bubbleMine
                        : styles.bubbleTheirs,
                      item.failed && styles.bubbleFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        mine
                          ? styles.messageTextMine
                          : styles.messageTextTheirs,
                      ]}
                    >
                      {item.message}
                    </Text>

                    <View style={styles.messageMeta}>
                      <Text
                        style={[
                          styles.messageTime,
                          mine
                            ? styles.messageTimeMine
                            : styles.messageTimeTheirs,
                        ]}
                      >
                        {item.failed
                          ? "Tap to retry"
                          : item.pending
                            ? "Sending"
                            : formatTime(item.created_at)}
                      </Text>

                      {mine && !item.failed && (
                        item.pending ? (
                          <Check
                            size={13}
                            color="rgba(255,255,255,0.62)"
                          />
                        ) : Number(item.is_read) === 1 ? (
                          <CheckCheck
                            size={14}
                            color={WHITE}
                          />
                        ) : (
                          <Check
                            size={13}
                            color="rgba(255,255,255,0.72)"
                          />
                        )
                      )}
                    </View>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />

        {otherTyping && (
          <View style={styles.typingRow}>
            <View style={styles.typingBubble}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </View>
        )}

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            onContentSizeChange={handleContentSizeChange}
            placeholder="Write a message"
            placeholderTextColor="#80868b"
            multiline
            maxLength={2000}
            style={[
              styles.input,
              { height: inputHeight },
            ]}
          />

          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
              pressed &&
                text.trim() &&
                styles.sendButtonPressed,
            ]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator
                size="small"
                color={WHITE}
              />
            ) : (
              <Send size={19} color={WHITE} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  page: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  header: {
    minHeight: 70,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPressed: {
    backgroundColor: SURFACE,
  },

  headerImage: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#f1f3f4",
  },

  headerContent: {
    flex: 1,
  },

  headerName: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  headerStatus: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },

  connectionDotOnline: {
    backgroundColor: "#1a9c50",
  },

  connectionDotOffline: {
    backgroundColor: "#c8cdd2",
  },

  offlineBanner: {
    minHeight: 38,
    backgroundColor: "#fff8df",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  offlineText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#7a5500",
  },

  messageList: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },

  emptyChat: {
    flex: 1,
    minHeight: 430,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyAvatar: {
    width: 74,
    height: 74,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f1f3f4",
  },

  emptyAvatarImage: {
    width: "100%",
    height: "100%",
  },

  emptyTitle: {
    marginTop: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    maxWidth: 300,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
  },

  dayLabelWrap: {
    alignItems: "center",
    marginVertical: 14,
  },

  dayLabel: {
    borderRadius: 999,
    backgroundColor: "#e9edf2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  messageRow: {
    marginBottom: 8,
    flexDirection: "row",
  },

  messageRowMine: {
    justifyContent: "flex-end",
  },

  messageRowTheirs: {
    justifyContent: "flex-start",
  },

  bubble: {
    maxWidth: "82%",
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },

  bubbleMine: {
    backgroundColor: THEME,
    borderBottomRightRadius: 7,
  },

  bubbleTheirs: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: WHITE,
    borderBottomLeftRadius: 7,
  },

  bubbleFailed: {
    backgroundColor: "#dc4b4b",
  },

  messageText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },

  messageTextMine: {
    color: WHITE,
  },

  messageTextTheirs: {
    color: TEXT,
  },

  messageMeta: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },

  messageTime: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
  },

  messageTimeMine: {
    color: "rgba(255,255,255,0.72)",
  },

  messageTimeTheirs: {
    color: "#9aa0a6",
  },

  typingRow: {
    paddingHorizontal: 14,
    paddingBottom: 7,
    alignItems: "flex-start",
  },

  typingBubble: {
    height: 34,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    borderBottomLeftRadius: 6,
    backgroundColor: WHITE,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#9aa0a6",
  },

  composer: {
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },

  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: SURFACE,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 11,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
  },

  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#cdd4de",
  },

  sendButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.96 }],
  },
});