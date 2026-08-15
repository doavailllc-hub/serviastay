import { router, useFocusEffect } from "expo-router";
import {
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import api from "../api/api";
import { getStoredUser } from "../services/authService";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const SURFACE = "#f8fafc";
const WHITE = "#ffffff";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80";

type Conversation = {
  id: number | string;
  sender_id?: number | string;
  receiver_id?: number | string;
  other_user_id?: number | string;
  other_user_name?: string;
  property_id?: number | string;
  property_title?: string;
  property_image?: string;
  message?: string;
  is_read?: number | boolean;
  unread_count?: number | string;
  created_at?: string;
};

function formatMessageTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function getUnreadCount(item: Conversation) {
  const count = Number(item.unread_count || 0);

  if (count > 0) return count;

  return item.is_read === 0 || item.is_read === false ? 1 : 0;
}

export default function MessagesScreen() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadConversations = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadFailed(false);

      const storedUser = await getStoredUser();

      if (!storedUser) {
        setUser(null);
        setConversations([]);
        return;
      }

      setUser(storedUser);

      const response = await api.get(
        `/conversations/${storedUser.id}`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setConversations(data);
    } catch (error: any) {
      console.log(
        "Messages load error:",
        error?.response?.data || error?.message || error
      );

      setConversations([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return conversations;

    return conversations.filter((item) => {
      const searchable = [
        item.other_user_name,
        item.property_title,
        item.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [conversations, query]);

  const openConversation = (item: Conversation) => {
    const otherUserId = String(item.other_user_id || "");

    if (!otherUserId) return;

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: otherUserId,
        name: item.other_user_name || "Guest",
        propertyId: String(item.property_id || ""),
        propertyTitle:
          item.property_title || "Dovail Stay conversation",
        image: item.property_image || FALLBACK_IMAGE,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Your conversations</Text>
          <Text style={styles.title}>Messages</Text>
        </View>

        <MessagesSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredPage}>
          <View style={styles.emptyIcon}>
            <MessageCircle size={30} color={THEME} />
          </View>

          <Text style={styles.emptyTitle}>
            Keep conversations in one place
          </Text>

          <Text style={styles.emptyText}>
            Log in to message hosts, receive replies and manage your
            booking conversations.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.secondaryButtonText}>
              Continue exploring
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.list,
          filteredConversations.length === 0 &&
            styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadConversations(true)}
            tintColor={THEME}
            colors={[THEME]}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>
                Your conversations
              </Text>

              <Text style={styles.title}>Messages</Text>

              <Text style={styles.subtitle}>
                Chat with hosts and guests about your reservations.
              </Text>
            </View>

            <View style={styles.searchBox}>
              <Search size={19} color="#80868b" />

              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search conversations"
                placeholderTextColor="#80868b"
                style={styles.searchInput}
                returnKeyType="search"
              />
            </View>

            <Text style={styles.sectionLabel}>
              {filteredConversations.length} conversation
              {filteredConversations.length === 1 ? "" : "s"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            hasQuery={Boolean(query.trim())}
            loadFailed={loadFailed}
            onClear={() => setQuery("")}
            onRetry={() => loadConversations()}
          />
        }
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() => openConversation(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function ConversationRow({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) {
  const unreadCount = getUnreadCount(item);
  const unread = unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.conversationRow,
        unread && styles.conversationUnread,
        pressed && styles.conversationPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.avatarWrap}>
        <Image
          source={{
            uri: item.property_image || FALLBACK_IMAGE,
          }}
          style={styles.avatar}
          resizeMode="cover"
        />

        {unread && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.conversationBody}>
        <View style={styles.nameRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.name,
              unread && styles.nameUnread,
            ]}
          >
            {item.other_user_name || "Guest"}
          </Text>

          <Text
            style={[
              styles.time,
              unread && styles.timeUnread,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.preview,
            unread && styles.previewUnread,
          ]}
        >
          {item.message || "No messages yet"}
        </Text>

        <View style={styles.propertyRow}>
          <Text
            numberOfLines={1}
            style={styles.propertyTitle}
          >
            {item.property_title ||
              "Dovail Stay conversation"}
          </Text>

          {unread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  hasQuery,
  loadFailed,
  onClear,
  onRetry,
}: {
  hasQuery: boolean;
  loadFailed: boolean;
  onClear: () => void;
  onRetry: () => void;
}) {
  let title = "No messages yet";
  let description =
    "Your conversations with hosts and guests will appear here.";
  let buttonText = "Explore stays";
  let action = () => router.push("/");

  if (hasQuery) {
    title = "No matching conversations";
    description =
      "Try another name, property or message keyword.";
    buttonText = "Clear search";
    action = onClear;
  }

  if (loadFailed) {
    title = "Could not load messages";
    description =
      "Check your connection and try loading conversations again.";
    buttonText = "Try again";
    action = onRetry;
  }

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {loadFailed ? (
          <RefreshCw size={28} color={THEME} />
        ) : (
          <MessageCircle size={28} color={THEME} />
        )}
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>

      <Text style={styles.emptyText}>{description}</Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={action}
      >
        <Text style={styles.primaryButtonText}>
          {buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

function MessagesSkeleton() {
  return (
    <View style={styles.skeletonList}>
      <View style={styles.skeletonSearch} />

      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <View style={styles.skeletonAvatar} />

          <View style={styles.skeletonBody}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonShortLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 116,
  },

  emptyList: {
    flexGrow: 1,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 20,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  title: {
    marginTop: 4,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: -1,
    color: TEXT,
  },

  subtitle: {
    marginTop: 7,
    maxWidth: 330,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },

  searchBox: {
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
  },

  sectionLabel: {
    marginTop: 22,
    marginBottom: 6,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  conversationRow: {
    minHeight: 92,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  conversationUnread: {
    backgroundColor: "#fbfdff",
  },

  conversationPressed: {
    opacity: 0.72,
  },

  avatarWrap: {
    position: "relative",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: "#f1f3f4",
  },

  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: THEME,
  },

  conversationBody: {
    flex: 1,
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  name: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  nameUnread: {
    fontFamily: "PlusJakartaSans_700Bold",
  },

  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#9aa0a6",
  },

  timeUnread: {
    fontFamily: "Inter_600SemiBold",
    color: THEME,
  },

  preview: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  previewUnread: {
    fontFamily: "Inter_500Medium",
    color: TEXT,
  },

  propertyRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  propertyTitle: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#9aa0a6",
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  unreadBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: WHITE,
  },

  centeredPage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    flex: 1,
    minHeight: 380,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 9,
    maxWidth: 310,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 24,
    minWidth: 148,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  secondaryButton: {
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
  },

  skeletonList: {
    paddingHorizontal: 18,
  },

  skeletonSearch: {
    height: 54,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: "#eceff1",
  },

  skeletonRow: {
    minHeight: 92,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  skeletonAvatar: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: "#eceff1",
  },

  skeletonBody: {
    flex: 1,
  },

  skeletonTitle: {
    width: "54%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonLine: {
    marginTop: 9,
    width: "82%",
    height: 13,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonShortLine: {
    marginTop: 8,
    width: "46%",
    height: 11,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
  },
});