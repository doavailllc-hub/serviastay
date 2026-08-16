import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
    Building2,
    ChevronLeft,
    FileText,
    MessageCircle,
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

type TripBooking = {
  id: number | string;
  booking_id?: number | string;

  experience_id?: number | string;
  trip_id?: number | string;

  host_id?: number | string;
  experience_host_id?: number | string;

  title?: string;
  experience_title?: string;
  trip_title?: string;
  package_name?: string;

  user_id?: number | string;
  guest_id?: number | string;
  traveler_id?: number | string;

  guest_name?: string;
  user_name?: string;
  traveler_name?: string;
  customer_name?: string;

  guest_email?: string;
  user_email?: string;
  traveler_email?: string;

  guest_phone?: string;
  phone?: string;

  booking_date?: string;
  departure_date?: string;
  travel_date?: string;
  created_at?: string;

  departure_id?: number | string;

  guests?: number | string;
  travelers?: number | string;
  guest_count?: number | string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;

  status?: string;
  booking_status?: string;

  payment_status?: string;
  payment_method?: string;

  pickup_note?: string;
  pickup_location?: string;
  special_request?: string;
};

type BookingFilter =
  | "all"
  | "upcoming"
  | "completed"
  | "cancelled";

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;

  const possibleKeys = [
    "data",
    "items",
    "results",
    "bookings",
    "tripBookings",
    "experienceBookings",
    "reservations",
  ];

  for (const key of possibleKeys) {
    const value = response[key];

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

const getTripTitle = (booking: TripBooking) =>
  booking.experience_title ||
  booking.trip_title ||
  booking.package_name ||
  booking.title ||
  `Trip booking #${booking.id}`;

const getGuestName = (booking: TripBooking) =>
  booking.guest_name ||
  booking.traveler_name ||
  booking.user_name ||
  booking.customer_name ||
  "Traveler";

const getGuestEmail = (booking: TripBooking) =>
  booking.guest_email ||
  booking.traveler_email ||
  booking.user_email ||
  "";

const getGuestPhone = (booking: TripBooking) =>
  booking.guest_phone || booking.phone || "";

const getTravelDate = (booking: TripBooking) =>
  booking.departure_date ||
  booking.travel_date ||
  booking.booking_date;

const getGuestCount = (booking: TripBooking) =>
  toNumber(
    booking.guests ??
      booking.travelers ??
      booking.guest_count
  );

const getBookingTotal = (booking: TripBooking) =>
  toNumber(
    booking.total ??
      booking.total_amount ??
      booking.amount
  );

const getBookingStatus = (booking: TripBooking) =>
  booking.status || booking.booking_status || "Pending";

const isCancelled = (booking: TripBooking) => {
  const status = normalizeStatus(getBookingStatus(booking));

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected"
  );
};

const isCompleted = (booking: TripBooking) => {
  const status = normalizeStatus(getBookingStatus(booking));

  if (status === "completed") {
    return true;
  }

  const travelDate = getTravelDate(booking);

  if (!travelDate || isCancelled(booking)) {
    return false;
  }

  const date = new Date(travelDate);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
};

const isUpcoming = (booking: TripBooking) => {
  if (isCancelled(booking) || isCompleted(booking)) {
    return false;
  }

  const travelDate = getTravelDate(booking);

  if (!travelDate) {
    const status = normalizeStatus(
      getBookingStatus(booking)
    );

    return (
      status === "confirmed" ||
      status === "pending" ||
      status === "upcoming"
    );
  }

  const date = new Date(travelDate);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.getTime() >= Date.now();
};

const getStatusTheme = (booking: TripBooking) => {
  const status = normalizeStatus(
    getBookingStatus(booking)
  );

  if (
    status === "confirmed" ||
    status === "active" ||
    status === "upcoming"
  ) {
    return {
      label: getBookingStatus(booking),
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      backgroundColor: "#E8F7F1",
      textColor: THEME,
    };
  }

  if (isCancelled(booking)) {
    return {
      label: "Cancelled",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: getBookingStatus(booking),
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

const getPaymentTheme = (paymentStatus?: string) => {
  const normalized = normalizeStatus(paymentStatus);

  if (
    normalized === "paid" ||
    normalized === "completed"
  ) {
    return {
      label: "Paid",
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (
    normalized === "failed" ||
    normalized === "refunded" ||
    normalized === "cancelled"
  ) {
    return {
      label: paymentStatus || "Failed",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: paymentStatus || "Pending",
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

export default function HostTripReservationsScreen() {
  const router = useRouter();

  const [bookings, setBookings] = useState<TripBooking[]>(
    []
  );
  const [filter, setFilter] =
    useState<BookingFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBookings = useCallback(
    async (showLoader = true) => {
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
          setBookings([]);
          setError(
            "Please sign in again to view your trip reservations."
          );
          return;
        }

        /*
         * Use the host trip-bookings endpoint from your
         * completed web backend.
         */
        const response = await api.get("/host/package-bookings");

        const loadedBookings =
          getArrayFromResponse<TripBooking>(
            response.data
          );

        const ownBookings = loadedBookings.filter(
          (booking) => {
            const bookingHostId =
              booking.host_id ??
              booking.experience_host_id;

            if (
              bookingHostId === null ||
              bookingHostId === undefined
            ) {
              return true;
            }

            return (
              String(bookingHostId) === String(hostId)
            );
          }
        );

        const sorted = [...ownBookings].sort(
          (first, second) => {
            const firstDate = new Date(
              getTravelDate(first) ||
                first.created_at ||
                0
            ).getTime();

            const secondDate = new Date(
              getTravelDate(second) ||
                second.created_at ||
                0
            ).getTime();

            return secondDate - firstDate;
          }
        );

        setBookings(sorted);
      } catch (requestError) {
        console.error(
          "Load host trip reservations error:",
          requestError
        );

        setBookings([]);
        setError(
          "We could not load your trip reservations. Check your connection and try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadBookings(true);
    }, [loadBookings])
  );

  const summary = useMemo(() => {
    return bookings.reduce(
      (result, booking) => {
        result.total += 1;

        if (isUpcoming(booking)) {
          result.upcoming += 1;
        }

        if (isCompleted(booking)) {
          result.completed += 1;
        }

        if (isCancelled(booking)) {
          result.cancelled += 1;
        }

        const paymentStatus = normalizeStatus(
          booking.payment_status
        );

        if (
          !isCancelled(booking) &&
          (paymentStatus === "paid" ||
            paymentStatus === "completed")
        ) {
          result.revenue += getBookingTotal(booking);
        }

        return result;
      },
      {
        total: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0,
      }
    );
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (filter === "upcoming") {
      return bookings.filter(isUpcoming);
    }

    if (filter === "completed") {
      return bookings.filter(isCompleted);
    }

    if (filter === "cancelled") {
      return bookings.filter(isCancelled);
    }

    return bookings;
  }, [bookings, filter]);

  const refreshBookings = () => {
    setRefreshing(true);
    loadBookings(false);
  };

  const openBookingDetails = (booking: TripBooking) => {
    router.push({
      pathname: "/host/trip-reservation/[id]",
      params: {
        id: String(booking.id),
      },
    });
  };

  const openGuestChat = (booking: TripBooking) => {
    const guestId =
      booking.guest_id ??
      booking.traveler_id ??
      booking.user_id;

    if (!guestId) {
      return;
    }

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(guestId),
      },
    });
  };

  const renderBooking = ({
    item,
  }: {
    item: TripBooking;
  }) => {
    const statusTheme = getStatusTheme(item);
    const paymentTheme = getPaymentTheme(
      item.payment_status
    );

    const guestId =
      item.guest_id ??
      item.traveler_id ??
      item.user_id;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openBookingDetails(item)}
        style={({ pressed }) => [
          styles.bookingCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tripIcon}>
            <Building2
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.tripContent}>
            <Text
              style={styles.tripTitle}
              numberOfLines={2}
            >
              {getTripTitle(item)}
            </Text>

            <Text style={styles.bookingReference}>
              Booking #{item.booking_id || item.id}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusTheme.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusTheme.textColor,
                },
              ]}
            >
              {statusTheme.label}
            </Text>
          </View>
        </View>

        <View style={styles.guestRow}>
          <View style={styles.guestAvatar}>
            <User
              size={18}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.guestContent}>
            <Text style={styles.guestName}>
              {getGuestName(item)}
            </Text>

            {getGuestEmail(item) ? (
              <Text
                style={styles.guestDetail}
                numberOfLines={1}
              >
                {getGuestEmail(item)}
              </Text>
            ) : getGuestPhone(item) ? (
              <Text
                style={styles.guestDetail}
                numberOfLines={1}
              >
                {getGuestPhone(item)}
              </Text>
            ) : (
              <Text style={styles.guestDetail}>
                Traveler information
              </Text>
            )}
          </View>

          {guestId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Message ${getGuestName(
                item
              )}`}
              onPress={(event) => {
                event.stopPropagation();
                openGuestChat(item);
              }}
              style={({ pressed }) => [
                styles.messageButton,
                pressed &&
                  styles.messageButtonPressed,
              ]}
            >
              <MessageCircle
                size={18}
                color={THEME}
                strokeWidth={1.9}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.travelDateCard}>
          <Text style={styles.travelDateLabel}>
            TRAVEL DATE
          </Text>

          <Text style={styles.travelDateValue}>
            {formatDate(getTravelDate(item))}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <User
              size={15}
              color={MUTED}
              strokeWidth={1.8}
            />

            <Text style={styles.detailText}>
              {getGuestCount(item) || 1}{" "}
              {(getGuestCount(item) || 1) === 1
                ? "traveler"
                : "travelers"}
            </Text>
          </View>

          {item.departure_id ? (
            <View style={styles.detailItem}>
              <FileText
                size={15}
                color={MUTED}
                strokeWidth={1.8}
              />

              <Text style={styles.detailText}>
                Departure #{item.departure_id}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>
              Booking total
            </Text>

            <Text style={styles.totalValue}>
              {formatCurrency(getBookingTotal(item))}
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
                styles.paymentText,
                {
                  color: paymentTheme.textColor,
                },
              ]}
            >
              {paymentTheme.label}
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
          <ActivityIndicator
            size="large"
            color={THEME}
          />

          <Text style={styles.loadingText}>
            Loading trip reservations...
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
              pressed &&
                styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
              strokeWidth={2}
            />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Trip reservations
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage traveler bookings
            </Text>
          </View>

          <View style={styles.headerCount}>
            <Text style={styles.headerCountText}>
              {bookings.length}
            </Text>
          </View>
        </View>

        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredBookings.length === 0 &&
              styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshBookings}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.summaryGrid}>
                <SummaryCard
                  label="Total"
                  value={summary.total}
                  icon={
                    <FileText
                      size={19}
                      color={THEME}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Upcoming"
                  value={summary.upcoming}
                  icon={
                    <Building2
                      size={19}
                      color={SUCCESS}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Completed"
                  value={summary.completed}
                  icon={
                    <Building2
                      size={19}
                      color={THEME}
                      strokeWidth={1.9}
                    />
                  }
                />

                <SummaryCard
                  label="Revenue"
                  value={formatCurrency(
                    summary.revenue
                  )}
                  icon={
                    <Building2
                      size={19}
                      color={SUCCESS}
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
                  label="Upcoming"
                  active={filter === "upcoming"}
                  onPress={() =>
                    setFilter("upcoming")
                  }
                />

                <FilterButton
                  label="Completed"
                  active={filter === "completed"}
                  onPress={() =>
                    setFilter("completed")
                  }
                />

                <FilterButton
                  label="Cancelled"
                  active={filter === "cancelled"}
                  onPress={() =>
                    setFilter("cancelled")
                  }
                />
              </View>

              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      loadBookings(true)
                    }
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={styles.retryButtonText}
                    >
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {filteredBookings.length > 0 ? (
                <View style={styles.listHeadingRow}>
                  <Text style={styles.listHeading}>
                    {filter === "all"
                      ? "All trip reservations"
                      : `${filter
                          .charAt(0)
                          .toUpperCase()}${filter.slice(
                          1
                        )}`}
                  </Text>

                  <Text style={styles.listCount}>
                    {filteredBookings.length}
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
                  No trip reservations
                </Text>

                <Text style={styles.emptyText}>
                  {filter === "all"
                    ? "Bookings for your trip packages will appear here."
                    : `You do not have any ${filter} trip reservations.`}
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
      <View style={styles.summaryIcon}>
        {icon}
      </View>

      <Text
        style={styles.summaryValue}
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
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
        active &&
          styles.activeFilterButton,
        pressed &&
          styles.filterPressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.activeFilterText,
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
  headerCount: {
    minWidth: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerCountText: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
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
    paddingHorizontal: 6,
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
  bookingCard: {
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tripIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  tripContent: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 8,
  },
  tripTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 21,
  },
  bookingReference: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  statusBadge: {
    maxWidth: 90,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  guestAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f2f6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  guestContent: {
    flex: 1,
    marginLeft: 10,
  },
  guestName: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  guestDetail: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  messageButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonPressed: {
    backgroundColor: "#edf3ff",
  },
  travelDateCard: {
    alignItems: "center",
    backgroundColor: "#f8f9fb",
    borderRadius: 13,
    paddingVertical: 14,
    marginTop: 16,
  },
  travelDateLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
  },
  travelDateValue: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: 5,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 14,
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
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 15,
    paddingTop: 14,
  },
  totalLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  totalValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    marginTop: 3,
  },
  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
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
