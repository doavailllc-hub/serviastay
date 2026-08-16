import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, CalendarCheck, CheckCheck, ChevronLeft, MessageCircle } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../api/api";
import { getStoredUser } from "../services/authService";

const THEME = "#2DB281";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";

type NotificationItem = {
  id: number | string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  is_read?: boolean | number;
  created_at?: string;
  conversation_id?: number | string;
  booking_id?: number | string;
  property_id?: number | string;
};

type StoredUser = { id?: number | string; user_id?: number | string };

const isUnread = (item: NotificationItem) =>
  item.is_read === false || item.is_read === 0;

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [markingRead, setMarkingRead] = useState(false);

  const loadNotifications = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      const user = (await getStoredUser()) as StoredUser | null;
      const userId = user?.id ?? user?.user_id;

      if (!userId) {
        router.replace("/login");
        return;
      }

      const response = await api.get(`/notifications/${userId}`);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "We could not load notifications. Pull down to try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications])
  );

  const markAllRead = async () => {
    try {
      setMarkingRead(true);
      const user = (await getStoredUser()) as StoredUser | null;
      const userId = user?.id ?? user?.user_id;
      if (!userId) return;

      await api.put(`/notifications/${userId}/mark-read`);
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "We could not mark notifications as read."
      );
    } finally {
      setMarkingRead(false);
    }
  };

  const openItem = (item: NotificationItem) => {
    if (item.conversation_id) {
      router.push({ pathname: "/chat/[id]", params: { id: String(item.conversation_id) } });
    } else if (item.property_id) {
      router.push({ pathname: "/property/[id]", params: { id: String(item.property_id) } });
    } else if (item.booking_id) {
      router.push({ pathname: "/trip/[id]", params: { id: String(item.booking_id) } });
    }
  };

  const unreadCount = items.filter(isUnread).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark all notifications as read"
          style={[styles.iconButton, unreadCount === 0 && styles.disabled]}
          onPress={markAllRead}
          disabled={unreadCount === 0 || markingRead}
        >
          {markingRead ? <ActivityIndicator size="small" color={THEME} /> : <CheckCheck size={22} color={THEME} />}
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={THEME} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items.length ? styles.list : styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor={THEME} />}
          renderItem={({ item }) => {
            const messageType = item.type?.toLowerCase() === "message";
            const bookingType = item.type?.toLowerCase().includes("booking");
            const Icon = messageType ? MessageCircle : bookingType ? CalendarCheck : Bell;
            return (
              <Pressable style={[styles.card, isUnread(item) && styles.unreadCard]} onPress={() => openItem(item)}>
                <View style={styles.notificationIcon}><Icon size={21} color={THEME} /></View>
                <View style={styles.content}>
                  <Text style={styles.itemTitle}>{item.title || "Dovail Stay update"}</Text>
                  <Text style={styles.message}>{item.message || item.body || "You have a new update."}</Text>
                  <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                </View>
                {isUnread(item) ? <View accessibilityLabel="Unread" style={styles.unreadDot} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Bell size={30} color={THEME} /></View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>Booking, message, payment and account updates will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND },
  header: { minHeight: 72, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: "#fff" },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.35 },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: TEXT },
  subtitle: { marginTop: 2, fontSize: 12, color: MUTED },
  error: { margin: 14, padding: 12, borderRadius: 12, color: "#9f2d2d", backgroundColor: "#fff0f0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 11 },
  emptyList: { flexGrow: 1 },
  card: { padding: 15, borderWidth: 1, borderColor: BORDER, borderRadius: 18, backgroundColor: "#fff", flexDirection: "row", alignItems: "flex-start", gap: 12 },
  unreadCard: { borderColor: "#c9d9fb", backgroundColor: "#f7faff" },
  notificationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#edf3ff" },
  content: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  message: { marginTop: 4, fontSize: 13, lineHeight: 19, color: MUTED },
  date: { marginTop: 8, fontSize: 11, color: "#9299a6" },
  unreadDot: { width: 9, height: 9, marginTop: 5, borderRadius: 5, backgroundColor: THEME },
  empty: { flex: 1, paddingHorizontal: 38, alignItems: "center", justifyContent: "center" },
  emptyIcon: { width: 66, height: 66, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#edf3ff" },
  emptyTitle: { marginTop: 18, fontSize: 20, fontWeight: "700", color: TEXT },
  emptyText: { marginTop: 8, textAlign: "center", fontSize: 14, lineHeight: 21, color: MUTED },
});
