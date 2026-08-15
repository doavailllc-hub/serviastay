import { useFocusEffect, useRouter } from "expo-router";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
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
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#3b71e6";
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

type StayItem = {
  id: number | string;
  title?: string;
  property_name?: string;
  name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type TripItem = {
  id: number | string;
  host_id?: number | string;
  user_id?: number | string;
  title?: string;
  trip_name?: string;
  package_name?: string;
  name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type ReservationItem = {
  id: number | string;
  booking_id?: number | string;

  property_title?: string;
  property_name?: string;
  title?: string;

  guest_name?: string;
  user_name?: string;
  customer_name?: string;

  status?: string;
  booking_status?: string;
  payment_status?: string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;

  checkin?: string;
  check_in?: string;
  checkout?: string;
  check_out?: string;

  created_at?: string;
  updated_at?: string;
};

type ActivityFilter =
  | "all"
  | "listings"
  | "bookings"
  | "payments";

type ActivityType =
  | "stay"
  | "trip"
  | "booking"
  | "payment";

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  route: string;
  routeId?: string;
  amount?: number;
};

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;

  const keys = [
    "data",
    "items",
    "results",
    "properties",
    "stays",
    "experiences",
    "trips",
    "bookings",
    "reservations",
  ];

  for (const key of keys) {
    const value = response[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const normalizeStatus = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeDateValue = (value?: string) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatActivityDate = (value?: string) => {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const difference = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference >= 0 && difference < minute) {
    return "Just now";
  }

  if (difference >= minute && difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (difference >= hour && difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (difference >= day && difference < 7 * day) {
    const days = Math.floor(difference / day);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getStayTitle = (stay: StayItem) =>
  stay.title ||
  stay.property_name ||
  stay.name ||
  `Stay #${stay.id}`;

const getTripTitle = (trip: TripItem) =>
  trip.title ||
  trip.trip_name ||
  trip.package_name ||
  trip.name ||
  `Trip #${trip.id}`;

const getReservationTitle = (
  reservation: ReservationItem
) =>
  reservation.property_title ||
  reservation.property_name ||
  reservation.title ||
  `Reservation #${
    reservation.booking_id || reservation.id
  }`;

const getGuestName = (
  reservation: ReservationItem
) =>
  reservation.guest_name ||
  reservation.user_name ||
  reservation.customer_name ||
  "Guest";

const getReservationStatus = (
  reservation: ReservationItem
) =>
  reservation.status ||
  reservation.booking_status ||
  "Pending";

const getReservationTotal = (
  reservation: ReservationItem
) =>
  toNumber(
    reservation.total ??
      reservation.total_amount ??
      reservation.amount
  );

const isCancelled = (
  reservation: ReservationItem
) => {
  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected"
  );
};

const isPaid = (
  reservation: ReservationItem
) => {
  const paymentStatus = normalizeStatus(
    reservation.payment_status
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

const getStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (
    normalized === "published" ||
    normalized === "active" ||
    normalized === "confirmed" ||
    normalized === "completed" ||
    normalized === "paid"
  ) {
    return {
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "upcoming"
  ) {
    return {
      backgroundColor: "#fff4dc",
      textColor: WARNING,
    };
  }

  if (
    normalized === "rejected" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "suspended" ||
    normalized === "refunded"
  ) {
    return {
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    backgroundColor: "#eef1f5",
    textColor: MUTED,
  };
};

const getActivityIcon = (
  type: ActivityType
) => {
  if (type === "stay") {
    return (
      <Home
        size={20}
        color={THEME}
        strokeWidth={1.9}
      />
    );
  }

  if (type === "trip") {
    return (
      <Building2
        size={20}
        color={THEME}
        strokeWidth={1.9}
      />
    );
  }

  if (type === "payment") {
    return (
      <FileText
        size={20}
        color={SUCCESS}
        strokeWidth={1.9}
      />
    );
  }

  return (
    <User
      size={20}
      color={THEME}
      strokeWidth={1.9}
    />
  );
};

export default function HostActivityScreen() {
  const router = useRouter();

  const [stays, setStays] = useState<StayItem[]>(
    []
  );

  const [trips, setTrips] = useState<TripItem[]>(
    []
  );

  const [reservations, setReservations] =
    useState<ReservationItem[]>([]);

  const [filter, setFilter] =
    useState<ActivityFilter>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadActivity = useCallback(
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
          setStays([]);
          setTrips([]);
          setReservations([]);

          setError(
            "Please sign in again to view host activity."
          );

          return;
        }

        const results = await Promise.allSettled([
          api.get(`/my-properties/${hostId}`),
          api.get("/experiences"),
          api.get(`/host/reservations/${hostId}`),
        ]);

        const loadedStays =
          results[0].status === "fulfilled"
            ? getArrayFromResponse<StayItem>(
                results[0].value.data
              )
            : [];

        const allTrips =
          results[1].status === "fulfilled"
            ? getArrayFromResponse<TripItem>(
                results[1].value.data
              )
            : [];

        const loadedReservations =
          results[2].status === "fulfilled"
            ? getArrayFromResponse<ReservationItem>(
                results[2].value.data
              )
            : [];

        const ownTrips = allTrips.filter((trip) => {
          const tripHostId =
            trip.host_id ?? trip.user_id;

          return String(tripHostId) === String(hostId);
        });

        setStays(loadedStays);
        setTrips(ownTrips);
        setReservations(loadedReservations);

        const failedCount = results.filter(
          (result) =>
            result.status === "rejected"
        ).length;

        if (
          failedCount === results.length
        ) {
          setError(
            "We could not load host activity."
          );
        } else if (failedCount > 0) {
          setError(
            "Some activity information could not be loaded."
          );
        }
      } catch (requestError) {
        console.error(
          "Load host activity error:",
          requestError
        );

        setStays([]);
        setTrips([]);
        setReservations([]);

        setError(
          "We could not load your activity. Check your connection and try again."
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
      loadActivity(true);
    }, [loadActivity])
  );

  const activities = useMemo<
    ActivityItem[]
  >(() => {
    const stayActivities: ActivityItem[] =
      stays.map((stay) => ({
        id: `stay-${stay.id}`,
        type: "stay",
        title: getStayTitle(stay),
        subtitle:
          normalizeStatus(stay.status) ===
          "published"
            ? "Stay listing was approved"
            : normalizeStatus(stay.status) ===
                "rejected"
              ? "Stay listing requires attention"
              : "Stay listing was created",
        status: stay.status || "Pending",
        timestamp:
          stay.updated_at ||
          stay.created_at ||
          "",
        route: "/host/stay/edit/[id]",
        routeId: String(stay.id),
      }));

    const tripActivities: ActivityItem[] =
      trips.map((trip) => ({
        id: `trip-${trip.id}`,
        type: "trip",
        title: getTripTitle(trip),
        subtitle:
          normalizeStatus(trip.status) ===
          "active"
            ? "Trip package was activated"
            : normalizeStatus(
                  trip.status
                ) === "rejected"
              ? "Trip package requires attention"
              : "Trip package was created",
        status: trip.status || "Pending",
        timestamp:
          trip.updated_at ||
          trip.created_at ||
          "",
        route: "/host/trip/edit/[id]",
        routeId: String(trip.id),
      }));

    const bookingActivities: ActivityItem[] =
      reservations.map(
        (reservation) => ({
          id: `booking-${reservation.id}`,
          type: "booking",
          title: getReservationTitle(
            reservation
          ),
          subtitle: `${getGuestName(
            reservation
          )} · Reservation received`,
          status: getReservationStatus(
            reservation
          ),
          timestamp:
            reservation.updated_at ||
            reservation.created_at ||
            reservation.checkin ||
            reservation.check_in ||
            "",
          route:
            "/host/reservation/[id]",
          routeId: String(
            reservation.id
          ),
          amount:
            getReservationTotal(
              reservation
            ),
        })
      );

    const paymentActivities: ActivityItem[] =
      reservations
        .filter(
          (reservation) =>
            isPaid(reservation) ||
            isCancelled(reservation) ||
            normalizeStatus(
              reservation.payment_status
            ) === "refunded"
        )
        .map((reservation) => {
          const refunded =
            normalizeStatus(
              reservation.payment_status
            ) === "refunded";

          const cancelled =
            isCancelled(reservation);

          return {
            id: `payment-${reservation.id}`,
            type: "payment",
            title: getReservationTitle(
              reservation
            ),
            subtitle: refunded
              ? "Payment was refunded"
              : cancelled
                ? "Booking was cancelled"
                : "Payment was received",
            status: refunded
              ? "Refunded"
              : cancelled
                ? "Cancelled"
                : "Paid",
            timestamp:
              reservation.updated_at ||
              reservation.created_at ||
              "",
            route:
              "/host/reservation/[id]",
            routeId: String(
              reservation.id
            ),
            amount:
              getReservationTotal(
                reservation
              ),
          };
        });

    return [
      ...stayActivities,
      ...tripActivities,
      ...bookingActivities,
      ...paymentActivities,
    ].sort(
      (first, second) =>
        safeDateValue(second.timestamp) -
        safeDateValue(first.timestamp)
    );
  }, [reservations, stays, trips]);

  const filteredActivities = useMemo(() => {
    if (filter === "listings") {
      return activities.filter(
        (item) =>
          item.type === "stay" ||
          item.type === "trip"
      );
    }

    if (filter === "bookings") {
      return activities.filter(
        (item) => item.type === "booking"
      );
    }

    if (filter === "payments") {
      return activities.filter(
        (item) => item.type === "payment"
      );
    }

    return activities;
  }, [activities, filter]);

  const summary = useMemo(() => {
    return {
      total: activities.length,

      listings: activities.filter(
        (item) =>
          item.type === "stay" ||
          item.type === "trip"
      ).length,

      bookings: activities.filter(
        (item) =>
          item.type === "booking"
      ).length,

      payments: activities.filter(
        (item) =>
          item.type === "payment"
      ).length,
    };
  }, [activities]);

  const refreshActivity = () => {
    setRefreshing(true);
    loadActivity(false);
  };

  const openActivity = (
    activity: ActivityItem
  ) => {
    if (!activity.routeId) {
      router.push(
        activity.route as never
      );
      return;
    }

    router.push({
      pathname: activity.route as never,
      params: {
        id: activity.routeId,
      },
    });
  };

  const renderActivity = ({
    item,
    index,
  }: {
    item: ActivityItem;
    index: number;
  }) => {
    const statusTheme =
      getStatusTheme(item.status);

    const showTimeline =
      index <
      filteredActivities.length - 1;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openActivity(item)}
        style={({ pressed }) => [
          styles.activityRow,
          pressed &&
            styles.activityRowPressed,
        ]}
      >
        <View style={styles.timelineArea}>
          <View style={styles.activityIcon}>
            {getActivityIcon(item.type)}
          </View>

          {showTimeline ? (
            <View style={styles.timelineLine} />
          ) : null}
        </View>

        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleArea}>
              <Text
                style={styles.activityTitle}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              <Text
                style={styles.activitySubtitle}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
            </View>

            <ChevronRight
              size={18}
              color={MUTED}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.activityFooter}>
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
                    color:
                      statusTheme.textColor,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>

            {typeof item.amount === "number" &&
            item.amount > 0 ? (
              <Text style={styles.activityAmount}>
                {formatCurrency(item.amount)}
              </Text>
            ) : null}

            <Text style={styles.activityDate}>
              {formatActivityDate(
                item.timestamp
              )}
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
            Loading host activity...
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
            Host activity
          </Text>

          <Text style={styles.headerSubtitle}>
            Listings, bookings and payments
          </Text>
        </View>

        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>
            {summary.total}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredActivities}
        keyExtractor={(item) => item.id}
        renderItem={renderActivity}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredActivities.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshActivity}
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        ListHeaderComponent={
          <>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    loadActivity(true)
                  }
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.summaryCard}>
              <SummaryItem
                label="All"
                value={summary.total}
                icon={
                  <FileText
                    size={18}
                    color={THEME}
                    strokeWidth={1.9}
                  />
                }
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                label="Listings"
                value={summary.listings}
                icon={
                  <Home
                    size={18}
                    color={THEME}
                    strokeWidth={1.9}
                  />
                }
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                label="Bookings"
                value={summary.bookings}
                icon={
                  <User
                    size={18}
                    color={THEME}
                    strokeWidth={1.9}
                  />
                }
              />

              <View style={styles.summaryDivider} />

              <SummaryItem
                label="Payments"
                value={summary.payments}
                icon={
                  <Building2
                    size={18}
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
                onPress={() =>
                  setFilter("all")
                }
              />

              <FilterButton
                label="Listings"
                active={
                  filter === "listings"
                }
                onPress={() =>
                  setFilter("listings")
                }
              />

              <FilterButton
                label="Bookings"
                active={
                  filter === "bookings"
                }
                onPress={() =>
                  setFilter("bookings")
                }
              />

              <FilterButton
                label="Payments"
                active={
                  filter === "payments"
                }
                onPress={() =>
                  setFilter("payments")
                }
              />
            </View>

            {filteredActivities.length > 0 ? (
              <View style={styles.listHeadingRow}>
                <Text style={styles.listHeading}>
                  {filter === "all"
                    ? "Recent activity"
                    : `${filter
                        .charAt(0)
                        .toUpperCase()}${filter.slice(
                        1
                      )}`}
                </Text>

                <Text style={styles.listCount}>
                  {filteredActivities.length}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <FileText
                  size={30}
                  color={THEME}
                  strokeWidth={1.8}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No activity found
              </Text>

              <Text style={styles.emptyText}>
                {filter === "all"
                  ? "Listing, booking and payment activity will appear here."
                  : `There is no ${filter} activity yet.`}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

type SummaryItemProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

function SummaryItem({
  label,
  value,
  icon,
}: SummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryIcon}>
        {icon}
      </View>

      <Text style={styles.summaryValue}>
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
          styles.filterButtonPressed,
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
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#f1cccc",
    backgroundColor: "#fff7f7",
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
  },
  errorText: {
    color: "#a93737",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 11,
    backgroundColor: THEME,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingVertical: 15,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  summaryValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: BORDER,
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
    paddingHorizontal: 5,
  },
  activeFilterButton: {
    borderColor: THEME,
    backgroundColor: "#edf3ff",
  },
  filterButtonPressed: {
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
  activityRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  activityRowPressed: {
    opacity: 0.75,
  },
  timelineArea: {
    width: 50,
    alignItems: "center",
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 45,
    backgroundColor: "#dfe5ed",
    marginTop: 5,
  },
  activityContent: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    marginLeft: 8,
    marginBottom: 13,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  activityTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  activitySubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  activityFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 11,
    marginTop: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "capitalize",
  },
  activityAmount: {
    color: TEXT,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  activityDate: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    marginLeft: "auto",
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