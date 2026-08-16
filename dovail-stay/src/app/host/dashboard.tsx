import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Home,
  MessageCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View
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
const SUCCESS = "#188038";
const WARNING = "#a96300";
const DANGER = "#d93025";

const FALLBACK_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
  fullname?: string;
  name?: string;
  email?: string;
  role?: string;
};

type DashboardSummary = {
  today_earnings?: number | string;
  week_earnings?: number | string;
  month_earnings?: number | string;
  lifetime_earnings?: number | string;

  total_bookings?: number | string;
  upcoming_reservations?: number | string;
  active_listings?: number | string;
  pending_listings?: number | string;
  unread_messages?: number | string;
  average_rating?: number | string;
};

type StayListing = {
  id: number | string;
  title?: string;
  property_title?: string;
  status?: string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  location?: string;
  city?: string;
};

type TripListing = {
  id: number | string;
  title?: string;
  status?: string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  location?: string;
  city?: string;
};

type Reservation = {
  id: number | string;
  booking_id?: number | string;

  type?: "stay" | "trip";
  property_id?: number | string;
  experience_id?: number | string;

  title?: string;
  property_title?: string;
  experience_title?: string;
  trip_title?: string;

  guest_name?: string;
  user_name?: string;
  fullname?: string;
  guest_email?: string;

  checkin?: string;
  checkout?: string;
  booking_date?: string;
  departure_date?: string;
  travel_date?: string;
  created_at?: string;

  guests?: number | string;
  travelers?: number | string;

  total?: number | string;
  amount?: number | string;
  total_amount?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  property_image?: string;
};

type ReviewItem = {
  id: number | string;
  guest_name?: string;
  user_name?: string;
  rating?: number | string;
  review?: string;
  comment?: string;
  created_at?: string;
  property_title?: string;
  experience_title?: string;
};

type DashboardListItem =
  | {
      kind: "section-title";
      id: string;
      title: string;
      actionLabel?: string;
      onAction?: () => void;
    }
  | {
      kind: "reservation";
      id: string;
      reservation: Reservation;
    }
  | {
      kind: "review";
      id: string;
      review: ReviewItem;
    }
  | {
      kind: "empty";
      id: string;
      title: string;
      text: string;
    };

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value?: string) =>
  String(value || "").trim().toLowerCase();

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return value.startsWith("/")
    ? `https://stay.dovail.com${value}`
    : `https://stay.dovail.com/${value}`;
};

const getArrayFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of [
    ...keys,
    "data",
    "items",
    "results",
    "bookings",
    "reservations",
    "properties",
    "experiences",
    "reviews",
  ]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const getObjectFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of [...keys, "data", "summary", "dashboard"]) {
    const value = record[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value as T;
    }
  }

  return payload as T;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";

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

const isActiveStatus = (status?: string) =>
  ["published", "active", "approved"].includes(
    normalizeStatus(status)
  );

const isPendingStatus = (status?: string) =>
  ["pending", "draft", "under review", "review"].includes(
    normalizeStatus(status)
  );

const isCancelledStatus = (status?: string) =>
  ["cancelled", "canceled", "rejected", "refunded"].includes(
    normalizeStatus(status)
  );

const getReservationStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (
    ["confirmed", "active", "approved", "completed"].includes(
      normalized
    )
  ) {
    return {
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
      label: status || "Confirmed",
    };
  }

  if (isCancelledStatus(status)) {
    return {
      backgroundColor: "#fdecec",
      textColor: DANGER,
      label: status || "Cancelled",
    };
  }

  return {
    backgroundColor: "#fff4dc",
    textColor: WARNING,
    label: status || "Pending",
  };
};

const getReservationTitle = (item: Reservation) =>
  item.property_title ||
  item.experience_title ||
  item.trip_title ||
  item.title ||
  (item.type === "trip" ? "Trip package" : "Stay reservation");

const getReservationDate = (item: Reservation) =>
  item.checkin ||
  item.departure_date ||
  item.travel_date ||
  item.booking_date;

const getReservationTotal = (item: Reservation) =>
  toNumber(
    item.total ??
      item.total_amount ??
      item.amount
  );

const getReservationGuests = (item: Reservation) =>
  Math.max(
    1,
    toNumber(item.guests ?? item.travelers)
  );

const getReservationGuest = (item: Reservation) =>
  item.guest_name ||
  item.user_name ||
  item.fullname ||
  item.guest_email ||
  "Guest";

const getReservationImage = (item: Reservation) =>
  normalizeImageUrl(
    item.cover_image ||
      item.property_image ||
      item.image ||
      item.image_url
  ) ||
  (item.type === "trip"
    ? FALLBACK_TRIP_IMAGE
    : FALLBACK_STAY_IMAGE);

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function HostDashboardScreen() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({});

  const [stayListings, setStayListings] = useState<StayListing[]>([]);
  const [tripListings, setTripListings] = useState<TripListing[]>([]);
  const [stayReservations, setStayReservations] = useState<Reservation[]>([]);
  const [tripReservations, setTripReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadDashboard = useCallback(
    async (refresh = false) => {
      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setLoadFailed(false);

        const storedUser =
          (await getStoredUser()) as StoredUser | null;

        const hostId =
          storedUser?.id ?? storedUser?.user_id;

        if (!storedUser || !hostId) {
          setUser(null);
          router.replace("/login");
          return;
        }

        setUser(storedUser);

        const [
          dashboardResult,
          stayListingsResult,
          tripListingsResult,
          stayReservationsResult,
          tripReservationsResult,
          reviewsResult,
        ] = await Promise.allSettled([
          api.get(`/host/dashboard/${hostId}`),

          api.get(`/my-properties/${hostId}`),

          api
            .get(`/my-experiences/${hostId}`)
            .catch(async (error: any) => {
              if (error?.response?.status !== 404) {
                throw error;
              }

              return api.get(`/trip-packages/host/${hostId}`);
            }),

          api.get(`/host/reservations/${hostId}`),

          api
            .get("/host/package-bookings")
            .catch(async (error: any) => {
              if (error?.response?.status !== 404) {
                throw error;
              }

              return {
                data: [],
              };
            }),

          api
            .get(`/host/reviews/${hostId}`)
            .catch(async (error: any) => {
              if (error?.response?.status !== 404) {
                throw error;
              }

              return {
                data: [],
              };
            }),
        ]);

        if (dashboardResult.status === "fulfilled") {
          setSummary(
            getObjectFromResponse<DashboardSummary>(
              dashboardResult.value.data,
              ["metrics", "stats"]
            ) || {}
          );
        } else {
          setSummary({});
        }

        if (stayListingsResult.status === "fulfilled") {
          setStayListings(
            getArrayFromResponse<StayListing>(
              stayListingsResult.value.data,
              ["listings", "stays"]
            )
          );
        } else {
          setStayListings([]);
        }

        if (tripListingsResult.status === "fulfilled") {
          setTripListings(
            getArrayFromResponse<TripListing>(
              tripListingsResult.value.data,
              ["trips", "packages"]
            )
          );
        } else {
          setTripListings([]);
        }

        if (stayReservationsResult.status === "fulfilled") {
          setStayReservations(
            getArrayFromResponse<Reservation>(
              stayReservationsResult.value.data,
              ["stayReservations"]
            ).map((item) => ({
              ...item,
              type: "stay",
            }))
          );
        } else {
          setStayReservations([]);
        }

        if (tripReservationsResult.status === "fulfilled") {
          setTripReservations(
            getArrayFromResponse<Reservation>(
              tripReservationsResult.value.data,
              ["tripReservations", "experienceBookings"]
            ).map((item) => ({
              ...item,
              type: "trip",
            }))
          );
        } else {
          setTripReservations([]);
        }

        if (reviewsResult.status === "fulfilled") {
          setReviews(
            getArrayFromResponse<ReviewItem>(
              reviewsResult.value.data
            )
          );
        } else {
          setReviews([]);
        }

        const failedCount = [
          dashboardResult,
          stayListingsResult,
          tripListingsResult,
          stayReservationsResult,
        ].filter(
          (result) => result.status === "rejected"
        ).length;

        if (failedCount >= 3) {
          setLoadFailed(true);
        }
      } catch (error: any) {
        console.log(
          "Host dashboard load error:",
          error?.response?.data ||
            error?.message ||
            error
        );

        setLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const allReservations = useMemo(() => {
    return [...stayReservations, ...tripReservations].sort(
      (first, second) => {
        const firstDate = new Date(
          getReservationDate(first) || first.created_at || 0
        ).getTime();

        const secondDate = new Date(
          getReservationDate(second) || second.created_at || 0
        ).getTime();

        return secondDate - firstDate;
      }
    );
  }, [stayReservations, tripReservations]);

  const computedMetrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const monthStart = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      1
    );

    const paidReservations = allReservations.filter((item) => {
      const paymentStatus = normalizeStatus(item.payment_status);

      return (
        paymentStatus === "paid" ||
        paymentStatus === "completed"
      );
    });

    const todayEarnings = paidReservations.reduce((total, item) => {
      const created = new Date(item.created_at || 0);

      if (
        !Number.isNaN(created.getTime()) &&
        created >= todayStart &&
        created < tomorrowStart
      ) {
        return total + getReservationTotal(item);
      }

      return total;
    }, 0);

    const monthEarnings = paidReservations.reduce((total, item) => {
      const created = new Date(item.created_at || 0);

      if (
        !Number.isNaN(created.getTime()) &&
        created >= monthStart
      ) {
        return total + getReservationTotal(item);
      }

      return total;
    }, 0);

    const lifetimeEarnings = paidReservations.reduce(
      (total, item) => total + getReservationTotal(item),
      0
    );

    const upcomingReservations = allReservations.filter((item) => {
      if (isCancelledStatus(item.status || item.booking_status)) {
        return false;
      }

      const date = new Date(getReservationDate(item) || "");

      return (
        Number.isNaN(date.getTime()) ||
        date.getTime() >= todayStart.getTime()
      );
    }).length;

    const activeListings =
      stayListings.filter((item) => isActiveStatus(item.status)).length +
      tripListings.filter((item) => isActiveStatus(item.status)).length;

    const pendingListings =
      stayListings.filter((item) => isPendingStatus(item.status)).length +
      tripListings.filter((item) => isPendingStatus(item.status)).length;

    const averageRating =
      reviews.length > 0
        ? reviews.reduce(
            (total, item) => total + toNumber(item.rating),
            0
          ) / reviews.length
        : 0;

    return {
      todayEarnings,
      monthEarnings,
      lifetimeEarnings,
      upcomingReservations,
      activeListings,
      pendingListings,
      averageRating,
    };
  }, [
    allReservations,
    reviews,
    stayListings,
    tripListings,
  ]);

  const metrics = {
    todayEarnings:
      toNumber(summary.today_earnings) ||
      computedMetrics.todayEarnings,

    monthEarnings:
      toNumber(summary.month_earnings) ||
      computedMetrics.monthEarnings,

    lifetimeEarnings:
      toNumber(summary.lifetime_earnings) ||
      computedMetrics.lifetimeEarnings,

    totalBookings:
      toNumber(summary.total_bookings) ||
      allReservations.length,

    upcomingReservations:
      toNumber(summary.upcoming_reservations) ||
      computedMetrics.upcomingReservations,

    activeListings:
      toNumber(summary.active_listings) ||
      computedMetrics.activeListings,

    pendingListings:
      toNumber(summary.pending_listings) ||
      computedMetrics.pendingListings,

    unreadMessages:
      toNumber(summary.unread_messages),

    averageRating:
      toNumber(summary.average_rating) ||
      computedMetrics.averageRating,
  };

  const recentReservations = allReservations.slice(0, 5);
  const recentReviews = reviews.slice(0, 3);

  const listData = useMemo<DashboardListItem[]>(() => {
    const items: DashboardListItem[] = [
      {
        kind: "section-title",
        id: "recent-reservations-title",
        title: "Recent reservations",
        actionLabel: "View all",
        onAction: () => router.push("/host/reservations"),
      },
    ];

    if (recentReservations.length > 0) {
      recentReservations.forEach((reservation) => {
        items.push({
          kind: "reservation",
          id: `reservation-${reservation.booking_id || reservation.id}`,
          reservation,
        });
      });
    } else {
      items.push({
        kind: "empty",
        id: "reservation-empty",
        title: "No reservations yet",
        text: "New stay and trip reservations will appear here.",
      });
    }

    items.push({
      kind: "section-title",
      id: "reviews-title",
      title: "Latest reviews",
      actionLabel: "View all",
      onAction: () => router.push("/host/reviews"),
    });

    if (recentReviews.length > 0) {
      recentReviews.forEach((review) => {
        items.push({
          kind: "review",
          id: `review-${review.id}`,
          review,
        });
      });
    } else {
      items.push({
        kind: "empty",
        id: "reviews-empty",
        title: "No reviews yet",
        text: "Guest feedback will appear here after completed bookings.",
      });
    }

    return items;
  }, [recentReservations, recentReviews]);

  const openReservation = (reservation: Reservation) => {
    if (reservation.type === "trip") {
      router.push({
        pathname: "/host/trip-reservation/[id]",
        params: {
          id: String(
            reservation.booking_id || reservation.id
          ),
        },
      });

      return;
    }

    router.push({
      pathname: "/host/reservation/[id]",
      params: {
        id: String(
          reservation.booking_id || reservation.id
        ),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={WHITE}
        />

        <View style={styles.loadingPage}>
          <ActivityIndicator
            size="large"
            color={THEME}
          />

          <Text style={styles.loadingText}>
            Loading host dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboard(true)}
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>
                  {getGreeting()}
                </Text>

                <Text style={styles.hostName}>
                  {user.fullname ||
                    user.name ||
                    "Host"}
                </Text>

                <Text style={styles.subtitle}>
                  Manage stays, trip packages,
                  reservations and earnings.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push("/notifications")
                }
                style={({ pressed }) => [
                  styles.notificationButton,
                  pressed &&
                    styles.notificationButtonPressed,
                ]}
              >
                <Bell
                  size={21}
                  color={TEXT}
                />

                {metrics.unreadMessages > 0 ? (
                  <View style={styles.notificationDot} />
                ) : null}
              </Pressable>
            </View>

            {loadFailed ? (
              <View style={styles.errorCard}>
                <RefreshCw
                  size={19}
                  color={DANGER}
                />

                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>
                    Some dashboard data could not load
                  </Text>

                  <Text style={styles.errorText}>
                    Pull down to refresh or try again.
                  </Text>
                </View>

                <Pressable
                  onPress={() => loadDashboard()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.earningsCard}>
              <Text style={styles.earningsEyebrow}>
                TODAY’S EARNINGS
              </Text>

              <Text style={styles.earningsValue}>
                {formatCurrency(metrics.todayEarnings)}
              </Text>

              <View style={styles.earningsFooter}>
                <View>
                  <Text style={styles.earningsSmallLabel}>
                    This month
                  </Text>

                  <Text style={styles.earningsSmallValue}>
                    {formatCurrency(metrics.monthEarnings)}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    router.push("/host/earnings")
                  }
                  style={styles.earningsButton}
                >
                  <Text style={styles.earningsButtonText}>
                    View earnings
                  </Text>

                  <ChevronRight
                    size={16}
                    color={WHITE}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <MetricCard
                icon={
                  <CheckCircle2
                    size={20}
                    color={THEME}
                  />
                }
                label="Active listings"
                value={String(metrics.activeListings)}
              />

              <MetricCard
                icon={
                  <CalendarDays
                    size={20}
                    color={THEME}
                  />
                }
                label="Upcoming"
                value={String(metrics.upcomingReservations)}
              />

              <MetricCard
                icon={
                  <FileText
                    size={20}
                    color={THEME}
                  />
                }
                label="Pending"
                value={String(metrics.pendingListings)}
              />

              <MetricCard
                icon={
                  <Users
                    size={20}
                    color={THEME}
                  />
                }
                label="Bookings"
                value={String(metrics.totalBookings)}
              />
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Lifetime earnings
                </Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(metrics.lifetimeEarnings)}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Average rating
                </Text>

                <Text style={styles.summaryValue}>
                  {metrics.averageRating > 0
                    ? metrics.averageRating.toFixed(1)
                    : "New"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Quick actions
            </Text>

            <View style={styles.quickGrid}>
              <QuickAction
                icon={
                  <Plus
                    size={21}
                    color={THEME}
                  />
                }
                title="Add stay"
                onPress={() =>
                  router.push("/host/stay/create")
                }
              />

              <QuickAction
                icon={
                  <Plus
                    size={21}
                    color={THEME}
                  />
                }
                title="Add trip"
                onPress={() =>
                  router.push("/host/trip/create")
                }
              />

              <QuickAction
                icon={
                  <Home
                    size={21}
                    color={THEME}
                  />
                }
                title="Listings"
                onPress={() =>
                  router.push("/host/listings")
                }
              />

              <QuickAction
                icon={
                  <CalendarDays
                    size={21}
                    color={THEME}
                  />
                }
                title="Reservations"
                onPress={() =>
                  router.push("/host/reservations")
                }
              />

              <QuickAction
                icon={
                  <CalendarDays
                    size={21}
                    color={THEME}
                  />
                }
                title="Calendar"
                onPress={() =>
                  router.push("/host/calendar")
                }
              />

              <QuickAction
                icon={
                  <MessageCircle
                    size={21}
                    color={THEME}
                  />
                }
                title="Messages"
                onPress={() =>
                  router.push("/messages")
                }
              />

              <QuickAction
                icon={
                  <ShieldCheck
                    size={21}
                    color={THEME}
                  />
                }
                title="Earnings"
                onPress={() =>
                  router.push("/host/earnings")
                }
              />

              <QuickAction
                icon={
                  <Building2
                    size={21}
                    color={THEME}
                  />
                }
                title="Payouts"
                onPress={() =>
                  router.push("/host/payouts")
                }
              />
            </View>
          </>
        }
        renderItem={({ item }) => {
          if (item.kind === "section-title") {
            return (
              <View style={styles.listSectionHeader}>
                <Text style={styles.sectionTitle}>
                  {item.title}
                </Text>

                {item.actionLabel && item.onAction ? (
                  <Pressable
                    onPress={item.onAction}
                    style={styles.sectionAction}
                  >
                    <Text style={styles.sectionActionText}>
                      {item.actionLabel}
                    </Text>

                    <ChevronRight
                      size={16}
                      color={THEME}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          }

          if (item.kind === "reservation") {
            return (
              <ReservationCard
                reservation={item.reservation}
                onPress={() =>
                  openReservation(item.reservation)
                }
              />
            );
          }

          if (item.kind === "review") {
            return (
              <ReviewCard
                review={item.review}
              />
            );
          }

          return (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {item.title}
              </Text>

              <Text style={styles.emptyText}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        {icon}
      </View>

      <Text style={styles.metricValue}>
        {value}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && styles.quickActionPressed,
      ]}
    >
      <View style={styles.quickActionIcon}>
        {icon}
      </View>

      <Text style={styles.quickActionText}>
        {title}
      </Text>
    </Pressable>
  );
}

function ReservationCard({
  reservation,
  onPress,
}: {
  reservation: Reservation;
  onPress: () => void;
}) {
  const status = getReservationStatusTheme(
    reservation.status ||
      reservation.booking_status
  );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.reservationCard,
        pressed && styles.reservationCardPressed,
      ]}
    >
      <Image
        source={{
          uri: getReservationImage(reservation),
        }}
        style={styles.reservationImage}
      />

      <View style={styles.reservationContent}>
        <View style={styles.reservationTopRow}>
          <View
            style={[
              styles.reservationType,
              {
                backgroundColor:
                  reservation.type === "trip"
                    ? "#fff4dc"
                    : THEME_LIGHT,
              },
            ]}
          >
            <Text
              style={[
                styles.reservationTypeText,
                {
                  color:
                    reservation.type === "trip"
                      ? WARNING
                      : THEME,
                },
              ]}
            >
              {reservation.type === "trip"
                ? "Trip"
                : "Stay"}
            </Text>
          </View>

          <View
            style={[
              styles.reservationStatus,
              {
                backgroundColor:
                  status.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.reservationStatusText,
                {
                  color: status.textColor,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={1}
          style={styles.reservationTitle}
        >
          {getReservationTitle(reservation)}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.guestName}
        >
          {getReservationGuest(reservation)}
        </Text>

        <Text style={styles.reservationMeta}>
          {formatDate(
            getReservationDate(reservation)
          )}{" "}
          · {getReservationGuests(reservation)}{" "}
          {getReservationGuests(reservation) === 1
            ? "guest"
            : "guests"}
        </Text>

        <Text style={styles.reservationTotal}>
          {formatCurrency(
            getReservationTotal(reservation)
          )}
        </Text>
      </View>

      <ChevronRight
        size={18}
        color="#9aa0a6"
      />
    </Pressable>
  );
}

function ReviewCard({
  review,
}: {
  review: ReviewItem;
}) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>
          {String(
            review.guest_name ||
              review.user_name ||
              "G"
          )
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>

      <View style={styles.reviewContent}>
        <View style={styles.reviewTopRow}>
          <Text style={styles.reviewName}>
            {review.guest_name ||
              review.user_name ||
              "Guest"}
          </Text>

          <Text style={styles.reviewRating}>
            {toNumber(review.rating).toFixed(1)}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={styles.reviewText}
        >
          {review.review ||
            review.comment ||
            "Guest review"}
        </Text>

        <Text style={styles.reviewDate}>
          {formatDate(review.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  header: {
    paddingTop: 18,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  hostName: {
    marginTop: 4,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: TEXT,
  },

  subtitle: {
    marginTop: 7,
    maxWidth: 320,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  notificationButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationButtonPressed: {
    backgroundColor: SURFACE,
  },

  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DANGER,
    borderWidth: 2,
    borderColor: WHITE,
  },

  errorCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f2c7c4",
    borderRadius: 16,
    backgroundColor: "#fff7f7",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: DANGER,
  },

  errorText: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  retryButton: {
    borderRadius: 10,
    backgroundColor: THEME,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  retryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: WHITE,
  },

  earningsCard: {
    borderRadius: 24,
    backgroundColor: THEME,
    padding: 20,
  },

  earningsEyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.78)",
  },

  earningsValue: {
    marginTop: 9,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    color: WHITE,
  },

  earningsFooter: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  earningsSmallLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },

  earningsSmallValue: {
    marginTop: 4,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: WHITE,
  },

  earningsButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  earningsButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: WHITE,
  },

  metricGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  metricCard: {
    width: "48.5%",
    minHeight: 128,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    padding: 15,
  },

  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  metricValue: {
    marginTop: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: TEXT,
  },

  metricLabel: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  summaryRow: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryItem: {
    flex: 1,
  },

  summaryDivider: {
    width: 1,
    height: 42,
    marginHorizontal: 14,
    backgroundColor: BORDER,
  },

  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  summaryValue: {
    marginTop: 5,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: TEXT,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  quickAction: {
    width: "23.5%",
    minHeight: 88,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  quickActionPressed: {
    backgroundColor: THEME_LIGHT,
  },

  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  quickActionText: {
    marginTop: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: TEXT,
    textAlign: "center",
  },

  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionAction: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  sectionActionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: THEME,
  },

  reservationCard: {
    minHeight: 112,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    backgroundColor: WHITE,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  reservationCardPressed: {
    backgroundColor: SURFACE,
  },

  reservationImage: {
    width: 88,
    height: 90,
    borderRadius: 13,
    backgroundColor: "#f1f3f4",
  },

  reservationContent: {
    flex: 1,
    marginLeft: 11,
  },

  reservationTopRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  reservationType: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  reservationTypeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
  },

  reservationStatus: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  reservationStatusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    textTransform: "capitalize",
  },

  reservationTitle: {
    marginTop: 7,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  guestName: {
    marginTop: 4,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: TEXT,
  },

  reservationMeta: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: MUTED,
  },

  reservationTotal: {
    marginTop: 5,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: TEXT,
  },

  reviewCard: {
    minHeight: 96,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    backgroundColor: WHITE,
    padding: 13,
    flexDirection: "row",
  },

  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewAvatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: THEME,
  },

  reviewContent: {
    flex: 1,
    marginLeft: 11,
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reviewName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: TEXT,
  },

  reviewRating: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#717171",
  },

  reviewText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
    color: MUTED,
  },

  reviewDate: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: "#9aa0a6",
  },

  emptyCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    backgroundColor: SURFACE,
    padding: 18,
  },

  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  emptyText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: MUTED,
  },
});
