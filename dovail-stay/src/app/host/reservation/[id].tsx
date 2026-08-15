import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Building2,
    ChevronLeft,
    FileText,
    Home,
    MessageCircle,
    User,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

const THEME = "#3b71e6";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type ReservationItem = {
  id: number | string;
  booking_id?: number | string;

  property_id?: number | string;
  property_title?: string;
  property_name?: string;
  title?: string;

  guest_id?: number | string;
  user_id?: number | string;
  guest_name?: string;
  user_name?: string;
  customer_name?: string;
  guest_email?: string;
  user_email?: string;
  guest_phone?: string;
  phone?: string;

  checkin?: string;
  checkout?: string;
  check_in?: string;
  check_out?: string;

  guests?: number | string;
  guest_count?: number | string;

  subtotal?: number | string;
  taxes?: number | string;
  discount?: number | string;
  total?: number | string;
  amount?: number | string;
  total_amount?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;
  payment_method?: string;

  coupon_code?: string;
  special_request?: string;
  notes?: string;

  created_at?: string;
};

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;

  for (const key of [
    "data",
    "items",
    "results",
    "bookings",
    "reservations",
  ]) {
    if (Array.isArray(response[key])) {
      return response[key] as T[];
    }
  }

  return [];
};

const normalizeStatus = (value?: string) =>
  String(value || "").trim().toLowerCase();

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getReservationStatus = (reservation: ReservationItem) =>
  reservation.status || reservation.booking_status || "Pending";

const getPropertyTitle = (reservation: ReservationItem) =>
  reservation.property_title ||
  reservation.property_name ||
  reservation.title ||
  `Stay reservation #${reservation.id}`;

const getGuestName = (reservation: ReservationItem) =>
  reservation.guest_name ||
  reservation.user_name ||
  reservation.customer_name ||
  "Guest";

const getGuestEmail = (reservation: ReservationItem) =>
  reservation.guest_email || reservation.user_email || "";

const getGuestPhone = (reservation: ReservationItem) =>
  reservation.guest_phone || reservation.phone || "";

const getCheckin = (reservation: ReservationItem) =>
  reservation.checkin || reservation.check_in;

const getCheckout = (reservation: ReservationItem) =>
  reservation.checkout || reservation.check_out;

const getGuestCount = (reservation: ReservationItem) =>
  toNumber(reservation.guests ?? reservation.guest_count);

const getReservationTotal = (reservation: ReservationItem) =>
  toNumber(
    reservation.total ??
      reservation.total_amount ??
      reservation.amount
  );

const getStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "confirmed" ||
    normalized === "active" ||
    normalized === "upcoming"
  ) {
    return {
      backgroundColor: "#e9f7ef",
      textColor: "#177a45",
    };
  }

  if (normalized === "completed") {
    return {
      backgroundColor: "#eaf1ff",
      textColor: THEME,
    };
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "rejected"
  ) {
    return {
      backgroundColor: "#fdecec",
      textColor: "#bd3434",
    };
  }

  return {
    backgroundColor: "#fff4dc",
    textColor: "#a96300",
  };
};

export default function HostReservationDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const reservationId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    return rawId ? String(rawId) : "";
  }, [params.id]);

  const [reservation, setReservation] =
    useState<ReservationItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReservation = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!reservationId) {
        setError("The reservation ID is missing.");
        return;
      }

      const storedUser = (await getStoredUser()) as StoredUser | null;
      const hostId = storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setError("Please sign in again to view this reservation.");
        return;
      }

      const response = await api.get(`/host/reservations/${hostId}`);
      const reservations = getArrayFromResponse<ReservationItem>(
        response.data
      );

      const selected = reservations.find(
        (item) =>
          String(item.id) === reservationId ||
          String(item.booking_id) === reservationId
      );

      if (!selected) {
        setError(
          "This reservation could not be found or does not belong to your host account."
        );
        return;
      }

      setReservation(selected);
    } catch (requestError) {
      console.error("Load host reservation details error:", requestError);

      setError(
        "We could not load this reservation. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    loadReservation();
  }, [loadReservation]);

  const openGuestChat = () => {
    if (!reservation) return;

    const guestId = reservation.guest_id ?? reservation.user_id;

    if (!guestId) {
      Alert.alert(
        "Guest unavailable",
        "This reservation does not include a guest account ID."
      );
      return;
    }

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(guestId),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>
            Loading reservation details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !reservation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
          </Pressable>

          <Text style={styles.errorHeaderTitle}>Reservation</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FileText size={30} color={THEME} strokeWidth={1.8} />
          </View>

          <Text style={styles.errorTitle}>
            Unable to open reservation
          </Text>

          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable
            onPress={loadReservation}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusTheme = getStatusTheme(
    getReservationStatus(reservation)
  );

  const subtotal = toNumber(reservation.subtotal);
  const taxes = toNumber(reservation.taxes);
  const discount = toNumber(reservation.discount);
  const total = getReservationTotal(reservation);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Reservation details</Text>
          <Text style={styles.headerSubtitle}>
            #{reservation.booking_id || reservation.id}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusTheme.backgroundColor },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusTheme.textColor },
            ]}
          >
            {getReservationStatus(reservation)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.propertyCard}>
          <View style={styles.propertyIcon}>
            <Home size={23} color={THEME} strokeWidth={1.9} />
          </View>

          <View style={styles.propertyContent}>
            <Text style={styles.sectionEyebrow}>STAY</Text>
            <Text style={styles.propertyTitle}>
              {getPropertyTitle(reservation)}
            </Text>

            {reservation.property_id ? (
              <Text style={styles.propertyReference}>
                Property #{reservation.property_id}
              </Text>
            ) : null}
          </View>
        </View>

        <SectionCard
          title="Guest"
          icon={<User size={21} color={THEME} strokeWidth={1.9} />}
        >
          <DetailRow label="Name" value={getGuestName(reservation)} />

          {getGuestEmail(reservation) ? (
            <DetailRow
              label="Email"
              value={getGuestEmail(reservation)}
            />
          ) : null}

          {getGuestPhone(reservation) ? (
            <DetailRow
              label="Phone"
              value={getGuestPhone(reservation)}
            />
          ) : null}

          <DetailRow
            label="Guests"
            value={`${getGuestCount(reservation) || 1}`}
            isLast
          />

          <Pressable
            accessibilityRole="button"
            onPress={openGuestChat}
            style={({ pressed }) => [
              styles.messageButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MessageCircle
              size={18}
              color="#ffffff"
              strokeWidth={2}
            />
            <Text style={styles.messageButtonText}>Message guest</Text>
          </Pressable>
        </SectionCard>

        <SectionCard
          title="Stay dates"
          icon={<Building2 size={21} color={THEME} strokeWidth={1.9} />}
        >
          <View style={styles.dateGrid}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>CHECK-IN</Text>
              <Text style={styles.dateValue}>
                {formatDate(getCheckin(reservation))}
              </Text>
            </View>

            <View style={styles.dateDivider} />

            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>CHECKOUT</Text>
              <Text style={styles.dateValue}>
                {formatDate(getCheckout(reservation))}
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          title="Payment"
          icon={<FileText size={21} color={THEME} strokeWidth={1.9} />}
        >
          <DetailRow
            label="Payment method"
            value={reservation.payment_method || "Not available"}
          />

          <DetailRow
            label="Payment status"
            value={reservation.payment_status || "Pending"}
          />

          {subtotal > 0 ? (
            <DetailRow
              label="Subtotal"
              value={formatCurrency(subtotal)}
            />
          ) : null}

          {taxes > 0 ? (
            <DetailRow label="Taxes" value={formatCurrency(taxes)} />
          ) : null}

          {discount > 0 ? (
            <DetailRow
              label="Discount"
              value={`-${formatCurrency(discount)}`}
            />
          ) : null}

          {reservation.coupon_code ? (
            <DetailRow
              label="Coupon"
              value={reservation.coupon_code}
            />
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Reservation total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(total)}
            </Text>
          </View>
        </SectionCard>

        {reservation.special_request || reservation.notes ? (
          <SectionCard
            title="Guest notes"
            icon={<FileText size={21} color={THEME} strokeWidth={1.9} />}
          >
            <Text style={styles.notesText}>
              {reservation.special_request || reservation.notes}
            </Text>
          </SectionCard>
        ) : null}

        <Text style={styles.footerText}>
          Booking created{" "}
          {reservation.created_at
            ? formatDate(reservation.created_at)
            : "date unavailable"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type SectionCardProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function SectionCard({
  title,
  icon,
  children,
}: SectionCardProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {children}
    </View>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function DetailRow({
  label,
  value,
  isLast = false,
}: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        isLast && styles.lastDetailRow,
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: "#f1f3f5",
  },
  headerContent: {
    flex: 1,
    marginLeft: 4,
    paddingRight: 10,
  },
  headerTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
  },
  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    maxWidth: 96,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  propertyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyContent: {
    flex: 1,
    marginLeft: 13,
  },
  sectionEyebrow: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  propertyTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    lineHeight: 23,
    marginTop: 4,
  },
  propertyReference: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    marginLeft: 11,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "right",
  },
  messageButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  messageButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  dateGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
    borderRadius: 13,
    paddingVertical: 15,
  },
  dateItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  dateDivider: {
    width: 1,
    height: 38,
    backgroundColor: BORDER,
  },
  dateLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
  },
  dateValue: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: 6,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginTop: 4,
  },
  totalLabel: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  totalValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
  },
  notesText: {
    color: TEXT,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  footerText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 14,
  },
  errorHeaderTitle: {
    flex: 1,
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 42,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKGROUND,
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    marginTop: 18,
  },
  errorMessage: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});