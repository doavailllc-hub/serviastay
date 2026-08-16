import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  MapPin,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

type Trip = {
  id: number | string;
  property_id?: number | string;
  title?: string;
  location?: string;
  image?: string;
  price?: number | string;
  rating?: number | string;
  description?: string;
  property_guests?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  host_name?: string;
  guest_name?: string;
  guest_email?: string;
  checkin?: string;
  checkout?: string;
  guests?: number | string;
  total?: number | string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  razorpay_order_id?: string;
  payment_id?: string;
  created_at?: string;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

function normalizeStatus(value?: string) {
  return String(value || "Pending").trim().toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value?: number | string) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getStatusMeta(status?: string) {
  const normalized = normalizeStatus(status);

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "declined" ||
    normalized === "rejected"
  ) {
    return {
      label: status || "Cancelled",
      icon: XCircle,
      color: "#c62828",
      background: "#fff0f0",
    };
  }

  if (
    normalized === "completed" ||
    normalized === "checked-out" ||
    normalized === "checked out"
  ) {
    return {
      label: status || "Completed",
      icon: CheckCircle2,
      color: "#16803d",
      background: "#ecf8ef",
    };
  }

  if (normalized === "confirmed") {
    return {
      label: "Confirmed",
      icon: CheckCircle2,
      color: "#16803d",
      background: "#ecf8ef",
    };
  }

  return {
    label: status || "Pending",
    icon: Clock3,
    color: THEME,
    background: THEME_LIGHT,
  };
}

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const tripId = getParam(params.id);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);

      const response = await api.get(`/trip/${tripId}`);
      setTrip(response.data);
    } catch (error: any) {
      Alert.alert(
        "Trip unavailable",
        error?.response?.data?.message || "Could not load this booking.",
        [
          {
            text: "Back",
            onPress: () => router.back(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const nights = useMemo(() => {
    if (!trip?.checkin || !trip?.checkout) return 0;

    const start = new Date(`${trip.checkin.slice(0, 10)}T00:00:00`);
    const end = new Date(`${trip.checkout.slice(0, 10)}T00:00:00`);

    return Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000)
    );
  }, [trip?.checkin, trip?.checkout]);

  const statusMeta = getStatusMeta(trip?.status);
  const StatusIcon = statusMeta.icon;

  const messageHost = async () => {
    if (!trip?.property_id || messageLoading) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setMessageLoading(true);

      const propertyResponse = await api.get(
        `/properties/${trip.property_id}`
      );

      const hostId = Number(propertyResponse.data?.user_id);

      if (!hostId) {
        Alert.alert("Host unavailable", "Host information could not be found.");
        return;
      }

      await api.post("/conversations/start", {
        sender_id: user.id,
        receiver_id: hostId,
        property_id: Number(trip.property_id),
        message: `Hi, I’m contacting you about booking #${trip.id}.`,
      });

      router.push("/messages");
    } catch (error: any) {
      Alert.alert(
        "Message failed",
        error?.response?.data?.message || "Could not contact the host."
      );
    } finally {
      setMessageLoading(false);
    }
  };

  const shareReceipt = async () => {
    if (!trip) return;

    await Share.share({
      title: `Dovail Stay booking #${trip.id}`,
      message: [
        `Booking #${trip.id}`,
        trip.title || "Dovail Stay",
        `${formatDate(trip.checkin)} - ${formatDate(trip.checkout)}`,
        `${trip.guests || 1} guests`,
        `Total: ${formatCurrency(trip.total)}`,
        `Status: ${trip.status || "Pending"}`,
        `Payment: ${trip.payment_status || "Pending"}`,
      ].join("\n"),
    });
  };

  const openReview = () => {
    const status = normalizeStatus(trip?.status);

    const reviewAllowed =
      status === "completed" ||
      status === "checked-out" ||
      status === "checked out";

    if (!reviewAllowed) {
      Alert.alert(
        "Review unavailable",
        "You can leave a review after the stay is completed."
      );
      return;
    }

    router.push({
      pathname: "/review/[id]",
      params: {
        id: String(trip?.property_id || ""),
        bookingId: String(trip?.id || ""),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TripSkeleton />
      </SafeAreaView>
    );
  }

  if (!trip) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>

        <Text style={styles.headerTitle}>Trip details</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: trip.image || FALLBACK_IMAGE }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.background },
            ]}
          >
            <StatusIcon size={15} color={statusMeta.color} />

            <Text
              style={[
                styles.statusText,
                { color: statusMeta.color },
              ]}
            >
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>{trip.title || "Dovail Stay"}</Text>

        <View style={styles.locationRow}>
          <MapPin size={15} color={MUTED} />

          <Text style={styles.location}>
            {trip.location || "Location not specified"}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <SummaryItem
            icon={<CalendarDays size={20} color={THEME} />}
            label="Check-in"
            value={formatDate(trip.checkin)}
          />

          <View style={styles.summaryDivider} />

          <SummaryItem
            icon={<CalendarDays size={20} color={THEME} />}
            label="Checkout"
            value={formatDate(trip.checkout)}
          />

          <View style={styles.summaryDivider} />

          <SummaryItem
            icon={<Users size={20} color={THEME} />}
            label="Guests"
            value={`${trip.guests || 1} guest${
              Number(trip.guests || 1) === 1 ? "" : "s"
            }`}
          />
        </View>

        <Text style={styles.sectionTitle}>Booking summary</Text>

        <View style={styles.card}>
          <DetailRow label="Booking ID" value={`#${trip.id}`} />
          <DetailRow label="Nights" value={String(nights)} />
          <DetailRow
            label="Payment method"
            value={
              trip.payment_method === "razorpay"
                ? "Razorpay"
                : "Pay at property"
            }
          />
          <DetailRow
            label="Payment status"
            value={trip.payment_status || "Pending"}
          />
          <DetailRow
            label="Booking status"
            value={trip.status || "Pending"}
          />

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(trip.total)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Property details</Text>

        <View style={styles.card}>
          <DetailRow
            label="Nightly price"
            value={formatCurrency(trip.price)}
          />
          <DetailRow
            label="Maximum guests"
            value={String(trip.property_guests || trip.guests || 1)}
          />
          <DetailRow
            label="Bedrooms"
            value={String(trip.bedrooms || 1)}
          />
          <DetailRow
            label="Bathrooms"
            value={String(trip.bathrooms || 1)}
          />
          <DetailRow
            label="Host"
            value={trip.host_name || "Dovail Host"}
          />
        </View>

        {trip.description ? (
          <>
            <Text style={styles.sectionTitle}>About the stay</Text>

            <Text style={styles.description}>{trip.description}</Text>
          </>
        ) : null}

        <View style={styles.secureBox}>
          <ShieldCheck size={22} color={THEME} />

          <View style={styles.secureContent}>
            <Text style={styles.secureTitle}>Booking protected</Text>

            <Text style={styles.secureText}>
              Your reservation and payment details are securely recorded with
              Dovail Stay.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.actions}>
          <ActionButton
            icon={<MessageCircle size={19} color={THEME} />}
            title="Message host"
            loading={messageLoading}
            onPress={messageHost}
          />

          <ActionButton
            icon={<ReceiptText size={19} color={THEME} />}
            title="Share receipt"
            onPress={shareReceipt}
          />

          <ActionButton
            icon={<Star size={19} color={THEME} />}
            title="Leave a review"
            onPress={openReview}
          />

          <ActionButton
            icon={<Download size={19} color={THEME} />}
            title="Download receipt"
            onPress={() =>
              Alert.alert(
                "Receipt",
                "PDF receipt download will be connected to your receipt API next."
              )
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryIcon}>{icon}</View>

      <View style={styles.summaryContent}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  loading = false,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={THEME} /> : icon}
      <Text style={styles.actionText}>{title}</Text>
    </Pressable>
  );
}

function TripSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonCardLarge} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    color: TEXT,
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 44,
  },

  imageWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
  },

  heroImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f1f3f4",
  },

  statusBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  title: {
    marginTop: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 27,
    lineHeight: 35,
    letterSpacing: -0.7,
    color: TEXT,
  },

  locationRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
  },

  summaryCard: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
  },

  summaryItem: {
    minHeight: 78,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
    textTransform: "uppercase",
  },

  summaryValue: {
    marginTop: 4,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
    color: TEXT,
  },

  summaryDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    lineHeight: 27,
    color: TEXT,
  },

  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    padding: 17,
    gap: 14,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },

  detailLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  detailValue: {
    maxWidth: "55%",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: TEXT,
    textAlign: "right",
  },

  totalDivider: {
    height: 1,
    backgroundColor: BORDER,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  totalValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 23,
    color: MUTED,
  },

  secureBox: {
    marginTop: 24,
    borderRadius: 20,
    backgroundColor: THEME_LIGHT,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  secureContent: {
    flex: 1,
  },

  secureTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  secureText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  actions: {
    gap: 12,
  },

  actionButton: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  skeletonPage: {
    flex: 1,
    padding: 18,
  },

  skeletonImage: {
    width: "100%",
    height: 250,
    borderRadius: 24,
    backgroundColor: "#eceff1",
  },

  skeletonTitle: {
    marginTop: 20,
    width: "72%",
    height: 26,
    borderRadius: 9,
    backgroundColor: "#eceff1",
  },

  skeletonLine: {
    marginTop: 12,
    width: "48%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonCard: {
    marginTop: 22,
    width: "100%",
    height: 210,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },

  skeletonSectionTitle: {
    marginTop: 28,
    width: "45%",
    height: 21,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonCardLarge: {
    marginTop: 12,
    width: "100%",
    height: 250,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },
});