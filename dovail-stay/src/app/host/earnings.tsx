import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Building2,
  ChevronLeft,
  FileText,
  Home,
  User,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#2DB281";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";
const SUCCESS = "#177a45";
const WARNING = "#a96300";
const DANGER = "#bd3434";

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

  guest_name?: string;
  user_name?: string;
  customer_name?: string;

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
  total_amount?: number | string;
  amount?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;
  payment_method?: string;

  created_at?: string;
};

type EarningsFilter = "all" | "paid" | "pending" | "refunded";

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;

  const possibleKeys = [
    "data",
    "items",
    "results",
    "bookings",
    "reservations",
  ];

  for (const key of possibleKeys) {
    const value = objectPayload[key];

    if (Array.isArray(value)) {
      return value as T[];
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
  if (!value) {
    return "Date unavailable";
  }

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
  reservation.status ||
  reservation.booking_status ||
  "Pending";

const getPaymentStatus = (reservation: ReservationItem) =>
  reservation.payment_status || "Pending";

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

const isCancelled = (reservation: ReservationItem) => {
  const status = normalizeStatus(getReservationStatus(reservation));

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected"
  );
};

const isPaid = (reservation: ReservationItem) => {
  const paymentStatus = normalizeStatus(
    getPaymentStatus(reservation)
  );

  const bookingStatus = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    !isCancelled(reservation) &&
    (paymentStatus === "paid" ||
      paymentStatus === "completed" ||
      bookingStatus === "completed")
  );
};

const isPending = (reservation: ReservationItem) => {
  const paymentStatus = normalizeStatus(
    getPaymentStatus(reservation)
  );

  return (
    !isCancelled(reservation) &&
    !isPaid(reservation) &&
    (paymentStatus === "pending" ||
      paymentStatus === "processing" ||
      paymentStatus === "")
  );
};

const isRefunded = (reservation: ReservationItem) => {
  const paymentStatus = normalizeStatus(
    getPaymentStatus(reservation)
  );

  return (
    paymentStatus === "refunded" ||
    paymentStatus === "partially_refunded" ||
    paymentStatus === "partially refunded"
  );
};

const getPaymentTheme = (reservation: ReservationItem) => {
  if (isPaid(reservation)) {
    return {
      label: "Paid",
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (isRefunded(reservation)) {
    return {
      label: "Refunded",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  if (isCancelled(reservation)) {
    return {
      label: "Cancelled",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: getPaymentStatus(reservation),
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

export default function HostEarningsScreen() {
  const router = useRouter();

  const [reservations, setReservations] = useState<ReservationItem[]>(
    []
  );
  const [filter, setFilter] = useState<EarningsFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadEarnings = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const storedUser =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setReservations([]);
        setError(
          "Please sign in again to view your host earnings."
        );
        return;
      }

      const response = await api.get(
        `/host/reservations/${hostId}`
      );

      const hostReservations =
        getArrayFromResponse<ReservationItem>(response.data);

      const sortedReservations = [...hostReservations].sort(
        (first, second) => {
          const firstDate = new Date(
            first.created_at || getCheckin(first) || 0
          ).getTime();

          const secondDate = new Date(
            second.created_at || getCheckin(second) || 0
          ).getTime();

          return secondDate - firstDate;
        }
      );

      setReservations(sortedReservations);
    } catch (requestError) {
      console.error("Load host earnings error:", requestError);

      setReservations([]);
      setError(
        "We could not load your earnings. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEarnings(true);
    }, [loadEarnings])
  );

  const summary = useMemo(() => {
    return reservations.reduce(
      (result, reservation) => {
        const amount = getReservationTotal(reservation);

        result.bookingCount += 1;
        result.grossRevenue += isCancelled(reservation) ? 0 : amount;

        if (isPaid(reservation)) {
          result.paidRevenue += amount;
          result.paidCount += 1;
        }

        if (isPending(reservation)) {
          result.pendingRevenue += amount;
          result.pendingCount += 1;
        }

        if (isRefunded(reservation)) {
          result.refundedRevenue += amount;
          result.refundedCount += 1;
        }

        return result;
      },
      {
        bookingCount: 0,
        paidCount: 0,
        pendingCount: 0,
        refundedCount: 0,
        grossRevenue: 0,
        paidRevenue: 0,
        pendingRevenue: 0,
        refundedRevenue: 0,
      }
    );
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    if (filter === "paid") {
      return reservations.filter(isPaid);
    }

    if (filter === "pending") {
      return reservations.filter(isPending);
    }

    if (filter === "refunded") {
      return reservations.filter(isRefunded);
    }

    return reservations;
  }, [filter, reservations]);

  const refreshEarnings = () => {
    setRefreshing(true);
    loadEarnings(false);
  };

  const openReservation = (reservation: ReservationItem) => {
    router.push({
      pathname: "/host/reservation/[id]",
      params: {
        id: String(reservation.id),
      },
    });
  };

  const renderTransaction = ({
    item,
  }: {
    item: ReservationItem;
  }) => {
    const paymentTheme = getPaymentTheme(item);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openReservation(item)}
        style={({ pressed }) => [
          styles.transactionCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.transactionTopRow}>
          <View style={styles.transactionIcon}>
            <Home size={21} color={THEME} strokeWidth={1.9} />
          </View>

          <View style={styles.transactionContent}>
            <Text style={styles.transactionTitle} numberOfLines={2}>
              {getPropertyTitle(item)}
            </Text>

            <Text style={styles.transactionReference}>
              Reservation #{item.booking_id || item.id}
            </Text>
          </View>

          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor:
                  paymentTheme.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color: paymentTheme.textColor,
                },
              ]}
            >
              {paymentTheme.label}
            </Text>
          </View>
        </View>

        <View style={styles.transactionDetails}>
          <View style={styles.detailItem}>
            <User size={15} color={MUTED} strokeWidth={1.8} />
            <Text style={styles.detailText}>
              {getGuestName(item)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <FileText
              size={15}
              color={MUTED}
              strokeWidth={1.8}
            />
            <Text style={styles.detailText}>
              {getGuestCount(item) || 1}{" "}
              {(getGuestCount(item) || 1) === 1
                ? "guest"
                : "guests"}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>CHECK-IN</Text>
            <Text style={styles.dateValue}>
              {formatDate(getCheckin(item))}
            </Text>
          </View>

          <View style={styles.dateDivider} />

          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>CHECKOUT</Text>
            <Text style={styles.dateValue}>
              {formatDate(getCheckout(item))}
            </Text>
          </View>
        </View>

        <View style={styles.transactionFooter}>
          <View>
            <Text style={styles.methodLabel}>Payment method</Text>
            <Text style={styles.methodValue}>
              {item.payment_method || "Not available"}
            </Text>
          </View>

          <View style={styles.amountArea}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(getReservationTotal(item))}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>
            Loading your earnings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
              strokeWidth={2}
            />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Text style={styles.headerSubtitle}>
              Revenue from stay reservations
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Building2
              size={20}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>
        </View>

        <FlatList
          data={filteredReservations}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTransaction}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredReservations.length === 0 &&
              styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshEarnings}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.primarySummaryCard}>
                <Text style={styles.primarySummaryLabel}>
                  Paid earnings
                </Text>

                <Text style={styles.primarySummaryValue}>
                  {formatCurrency(summary.paidRevenue)}
                </Text>

                <Text style={styles.primarySummarySubtitle}>
                  From {summary.paidCount} paid{" "}
                  {summary.paidCount === 1
                    ? "reservation"
                    : "reservations"}
                </Text>
              </View>

              <View style={styles.summaryGrid}>
                <SummaryCard
                  label="Gross revenue"
                  value={formatCurrency(summary.grossRevenue)}
                  icon={
                    <Building2
                      size={19}
                      color={THEME}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Pending"
                  value={formatCurrency(summary.pendingRevenue)}
                  icon={
                    <FileText
                      size={19}
                      color={WARNING}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Refunded"
                  value={formatCurrency(summary.refundedRevenue)}
                  icon={
                    <FileText
                      size={19}
                      color={DANGER}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Bookings"
                  value={summary.bookingCount}
                  icon={
                    <Home
                      size={19}
                      color={THEME}
                      strokeWidth={1.9}
                    />
                  }
                />
              </View>

              <View style={styles.filterRow}>
                <FilterButton
                  label="All"
                  active={filter === "all"}
                  onPress={() => setFilter("all")}
                />

                <FilterButton
                  label="Paid"
                  active={filter === "paid"}
                  onPress={() => setFilter("paid")}
                />

                <FilterButton
                  label="Pending"
                  active={filter === "pending"}
                  onPress={() => setFilter("pending")}
                />

                <FilterButton
                  label="Refunded"
                  active={filter === "refunded"}
                  onPress={() => setFilter("refunded")}
                />
              </View>

              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => loadEarnings(true)}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.retryButtonText}>
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {filteredReservations.length > 0 ? (
                <View style={styles.listHeadingRow}>
                  <Text style={styles.listHeading}>
                    {filter === "all"
                      ? "Transaction history"
                      : `${filter
                          .charAt(0)
                          .toUpperCase()}${filter.slice(1)} transactions`}
                  </Text>

                  <Text style={styles.listCount}>
                    {filteredReservations.length}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Building2
                    size={30}
                    color={THEME}
                    strokeWidth={1.8}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No earnings found
                </Text>

                <Text style={styles.emptyText}>
                  {filter === "all"
                    ? "Your reservation transactions and host earnings will appear here."
                    : `You do not have any ${filter} transactions.`}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

type SummaryCardProps = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
};

function SummaryCard({
  label,
  value,
  icon,
}: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>{icon}</View>

      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

type FilterButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({
  label,
  active,
  onPress,
}: FilterButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active && styles.activeFilterButton,
        pressed && styles.filterPressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active && styles.activeFilterText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
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
  },
  headerTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
  },
  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  primarySummaryCard: {
    backgroundColor: THEME,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  primarySummaryLabel: {
    color: "#dbe6ff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  primarySummaryValue: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    marginTop: 8,
  },
  primarySummarySubtitle: {
    color: "#e8efff",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 7,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryCard: {
    width: "48.5%",
    minHeight: 122,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
  },
  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  summaryValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 3,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  activeFilterButton: {
    borderColor: THEME,
    backgroundColor: "#edf3ff",
  },
  filterPressed: {
    opacity: 0.72,
  },
  filterText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  activeFilterText: {
    color: THEME,
  },
  errorCard: {
    backgroundColor: "#fff6f6",
    borderWidth: 1,
    borderColor: "#efcccc",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  errorText: {
    color: "#a93737",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: THEME,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 11,
  },
  retryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  listHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listHeading: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  listCount: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  transactionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },
  cardPressed: {
    opacity: 0.8,
  },
  transactionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  transactionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  transactionContent: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },
  transactionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  transactionReference: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  paymentBadge: {
    maxWidth: 90,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  paymentBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  transactionDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 15,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
    borderRadius: 13,
    paddingVertical: 13,
    marginTop: 15,
  },
  dateItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  dateDivider: {
    width: 1,
    height: 34,
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
    fontSize: 12,
    marginTop: 5,
  },
  transactionFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 15,
    paddingTop: 14,
  },
  methodLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  methodValue: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 3,
    textTransform: "capitalize",
  },
  amountArea: {
    alignItems: "flex-end",
  },
  amountLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  amountValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    marginTop: 3,
  },
  emptyState: {
    flex: 1,
    minHeight: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    marginTop: 18,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },
});