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
    Pressable,
    RefreshControl,
    ScrollView,
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

type StayItem = {
  id: number | string;
  title?: string;
  property_name?: string;
  name?: string;
  status?: string;
};

type TripItem = {
  id: number | string;
  title?: string;
  trip_name?: string;
  package_name?: string;
  host_id?: number | string;
  user_id?: number | string;
  status?: string;
};

type ReservationItem = {
  id: number | string;
  booking_id?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;

  checkin?: string;
  checkout?: string;
  check_in?: string;
  check_out?: string;

  created_at?: string;
};

type InsightsData = {
  stays: StayItem[];
  trips: TripItem[];
  reservations: ReservationItem[];
};

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
};

type ProgressRowProps = {
  label: string;
  value: number;
  total: number;
  description: string;
};

type RevenueMonth = {
  key: string;
  label: string;
  amount: number;
  bookingCount: number;
};

const EMPTY_DATA: InsightsData = {
  stays: [],
  trips: [],
  reservations: [],
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatPercentage = (value: number) =>
  `${Math.max(0, Math.min(100, Math.round(value)))}%`;

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

const getCheckin = (reservation: ReservationItem) =>
  reservation.checkin || reservation.check_in;

const getCheckout = (reservation: ReservationItem) =>
  reservation.checkout || reservation.check_out;

const isCancelled = (reservation: ReservationItem) => {
  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected"
  );
};

const isPaid = (reservation: ReservationItem) => {
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

const isUpcoming = (reservation: ReservationItem) => {
  if (isCancelled(reservation)) {
    return false;
  }

  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  if (
    status === "confirmed" ||
    status === "pending" ||
    status === "upcoming"
  ) {
    return true;
  }

  const checkout = getCheckout(reservation);

  if (!checkout) {
    return false;
  }

  const checkoutTime = new Date(checkout).getTime();

  return (
    !Number.isNaN(checkoutTime) &&
    checkoutTime >= Date.now()
  );
};

const getStayStatusCount = (
  stays: StayItem[],
  statuses: string[]
) =>
  stays.filter((stay) =>
    statuses.includes(normalizeStatus(stay.status))
  ).length;

const getTripStatusCount = (
  trips: TripItem[],
  statuses: string[]
) =>
  trips.filter((trip) =>
    statuses.includes(normalizeStatus(trip.status))
  ).length;

const getBookingNights = (
  reservation: ReservationItem
) => {
  const checkin = getCheckin(reservation);
  const checkout = getCheckout(reservation);

  if (!checkin || !checkout) {
    return 0;
  }

  const checkinTime = new Date(checkin).getTime();
  const checkoutTime = new Date(checkout).getTime();

  if (
    Number.isNaN(checkinTime) ||
    Number.isNaN(checkoutTime) ||
    checkoutTime <= checkinTime
  ) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    1,
    Math.round(
      (checkoutTime - checkinTime) / millisecondsPerDay
    )
  );
};

const getMonthKey = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const getMonthLabel = (key: string) => {
  const [yearText, monthText] = key.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month)
  ) {
    return key;
  }

  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function HostInsightsScreen() {
  const router = useRouter();

  const [data, setData] =
    useState<InsightsData>(EMPTY_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadInsights = useCallback(
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
          setData(EMPTY_DATA);
          setError(
            "Please sign in again to view host insights."
          );
          return;
        }

        const results = await Promise.allSettled([
          api.get(`/my-properties/${hostId}`),
          api.get("/experiences"),
          api.get(`/host/reservations/${hostId}`),
        ]);

        const stays =
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

        const reservations =
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

        setData({
          stays,
          trips: ownTrips,
          reservations,
        });

        const failedCount = results.filter(
          (result) => result.status === "rejected"
        ).length;

        if (failedCount === results.length) {
          setError(
            "We could not load your host performance data."
          );
        } else if (failedCount > 0) {
          setError(
            "Some insights could not be loaded."
          );
        }
      } catch (requestError) {
        console.error(
          "Load host insights error:",
          requestError
        );

        setData(EMPTY_DATA);

        setError(
          "We could not load your insights. Check your connection and try again."
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
      loadInsights(true);
    }, [loadInsights])
  );

  const insights = useMemo(() => {
    const activeStays = getStayStatusCount(
      data.stays,
      ["published", "active"]
    );

    const pendingStays = getStayStatusCount(
      data.stays,
      ["pending"]
    );

    const rejectedStays = getStayStatusCount(
      data.stays,
      ["rejected", "suspended"]
    );

    const activeTrips = getTripStatusCount(
      data.trips,
      ["active", "published"]
    );

    const pendingTrips = getTripStatusCount(
      data.trips,
      ["pending"]
    );

    const rejectedTrips = getTripStatusCount(
      data.trips,
      ["rejected", "suspended"]
    );

    const validReservations = data.reservations.filter(
      (reservation) => !isCancelled(reservation)
    );

    const paidReservations =
      data.reservations.filter(isPaid);

    const upcomingReservations =
      data.reservations.filter(isUpcoming);

    const grossRevenue = validReservations.reduce(
      (total, reservation) =>
        total + getReservationTotal(reservation),
      0
    );

    const paidRevenue = paidReservations.reduce(
      (total, reservation) =>
        total + getReservationTotal(reservation),
      0
    );

    const pendingRevenue = validReservations
      .filter((reservation) => !isPaid(reservation))
      .reduce(
        (total, reservation) =>
          total + getReservationTotal(reservation),
        0
      );

    const averageBookingValue =
      validReservations.length > 0
        ? grossRevenue / validReservations.length
        : 0;

    const bookedNights = validReservations.reduce(
      (total, reservation) =>
        total + getBookingNights(reservation),
      0
    );

    /*
     * Estimated occupancy uses a rolling 30-day
     * capacity for each active stay.
     */
    const availableNights = activeStays * 30;

    const occupancyRate =
      availableNights > 0
        ? (bookedNights / availableNights) * 100
        : 0;

    const stayApprovalRate =
      data.stays.length > 0
        ? (activeStays / data.stays.length) * 100
        : 0;

    const tripApprovalRate =
      data.trips.length > 0
        ? (activeTrips / data.trips.length) * 100
        : 0;

    return {
      activeStays,
      pendingStays,
      rejectedStays,

      activeTrips,
      pendingTrips,
      rejectedTrips,

      totalReservations: data.reservations.length,
      paidReservations: paidReservations.length,
      upcomingReservations:
        upcomingReservations.length,

      grossRevenue,
      paidRevenue,
      pendingRevenue,
      averageBookingValue,

      bookedNights,
      occupancyRate,
      stayApprovalRate,
      tripApprovalRate,
    };
  }, [data]);

  const monthlyRevenue = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        amount: number;
        bookingCount: number;
      }
    >();

    data.reservations
      .filter(isPaid)
      .forEach((reservation) => {
        const key = getMonthKey(
          reservation.created_at ||
            getCheckin(reservation)
        );

        if (!key) {
          return;
        }

        const current = monthMap.get(key) || {
          amount: 0,
          bookingCount: 0,
        };

        current.amount +=
          getReservationTotal(reservation);

        current.bookingCount += 1;

        monthMap.set(key, current);
      });

    return Array.from(monthMap.entries())
      .map<RevenueMonth>(([key, value]) => ({
        key,
        label: getMonthLabel(key),
        amount: value.amount,
        bookingCount: value.bookingCount,
      }))
      .sort((first, second) =>
        second.key.localeCompare(first.key)
      )
      .slice(0, 6);
  }, [data.reservations]);

  const maximumMonthlyRevenue = useMemo(
    () =>
      Math.max(
        ...monthlyRevenue.map((item) => item.amount),
        1
      ),
    [monthlyRevenue]
  );

  const refreshInsights = () => {
    setRefreshing(true);
    loadInsights(false);
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
            Loading host insights...
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
          <Text style={styles.headerTitle}>
            Host insights
          </Text>

          <Text style={styles.headerSubtitle}>
            Performance and revenue overview
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

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInsights}
            colors={[THEME]}
            tintColor={THEME}
          />
        }
      >
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => loadInsights(true)}
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

        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>
            Paid revenue
          </Text>

          <Text style={styles.revenueValue}>
            {formatCurrency(insights.paidRevenue)}
          </Text>

          <View style={styles.revenueFooter}>
            <Text style={styles.revenueFooterText}>
              {insights.paidReservations} paid{" "}
              {insights.paidReservations === 1
                ? "booking"
                : "bookings"}
            </Text>

            <Text style={styles.revenueFooterText}>
              Avg.{" "}
              {formatCurrency(
                insights.averageBookingValue
              )}
            </Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Gross revenue"
            value={formatCurrency(
              insights.grossRevenue
            )}
            subtitle="All valid reservations"
            icon={
              <Building2
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            title="Pending revenue"
            value={formatCurrency(
              insights.pendingRevenue
            )}
            subtitle="Awaiting payment"
            icon={
              <FileText
                size={20}
                color={WARNING}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            title="Upcoming"
            value={insights.upcomingReservations}
            subtitle="Future reservations"
            icon={
              <Home
                size={20}
                color={SUCCESS}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            title="Booked nights"
            value={insights.bookedNights}
            subtitle="Across all stays"
            icon={
              <User
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Home
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Stay performance
              </Text>

              <Text style={styles.sectionSubtitle}>
                Listing approval and occupancy
              </Text>
            </View>
          </View>

          <ProgressRow
            label="Active stays"
            value={insights.activeStays}
            total={data.stays.length}
            description={`${insights.pendingStays} pending · ${insights.rejectedStays} rejected or suspended`}
          />

          <ProgressRow
            label="Approval rate"
            value={Math.round(
              insights.stayApprovalRate
            )}
            total={100}
            description={`${formatPercentage(
              insights.stayApprovalRate
            )} of stay listings are active`}
          />

          <ProgressRow
            label="Estimated occupancy"
            value={Math.round(
              insights.occupancyRate
            )}
            total={100}
            description="Estimated from booked nights over a rolling 30-day capacity"
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Building2
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Trip performance
              </Text>

              <Text style={styles.sectionSubtitle}>
                Package approval progress
              </Text>
            </View>
          </View>

          <ProgressRow
            label="Active trips"
            value={insights.activeTrips}
            total={data.trips.length}
            description={`${insights.pendingTrips} pending · ${insights.rejectedTrips} rejected or suspended`}
          />

          <ProgressRow
            label="Approval rate"
            value={Math.round(
              insights.tripApprovalRate
            )}
            total={100}
            description={`${formatPercentage(
              insights.tripApprovalRate
            )} of trip packages are active`}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <FileText
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Monthly paid revenue
              </Text>

              <Text style={styles.sectionSubtitle}>
                Latest six months with paid bookings
              </Text>
            </View>
          </View>

          {monthlyRevenue.length > 0 ? (
            monthlyRevenue.map((month) => {
              const percentage =
                (month.amount /
                  maximumMonthlyRevenue) *
                100;

              return (
                <View
                  key={month.key}
                  style={styles.monthRow}
                >
                  <View style={styles.monthHeader}>
                    <View>
                      <Text style={styles.monthLabel}>
                        {month.label}
                      </Text>

                      <Text
                        style={styles.monthBookings}
                      >
                        {month.bookingCount}{" "}
                        {month.bookingCount === 1
                          ? "booking"
                          : "bookings"}
                      </Text>
                    </View>

                    <Text style={styles.monthAmount}>
                      {formatCurrency(month.amount)}
                    </Text>
                  </View>

                  <View style={styles.monthTrack}>
                    <View
                      style={[
                        styles.monthProgress,
                        {
                          width: `${Math.max(
                            4,
                            percentage
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyRevenue}>
              <FileText
                size={26}
                color="#9aa3b1"
                strokeWidth={1.8}
              />

              <Text style={styles.emptyRevenueTitle}>
                No paid revenue yet
              </Text>

              <Text style={styles.emptyRevenueText}>
                Monthly revenue will appear after
                guests complete paid reservations.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total stay listings
            </Text>

            <Text style={styles.summaryValue}>
              {data.stays.length}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total trip packages
            </Text>

            <Text style={styles.summaryValue}>
              {data.trips.length}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Total reservations
            </Text>

            <Text style={styles.summaryValue}>
              {insights.totalReservations}
            </Text>
          </View>

          <View
            style={[
              styles.summaryRow,
              styles.lastSummaryRow,
            ]}
          >
            <Text style={styles.summaryLabel}>
              Paid reservations
            </Text>

            <Text style={styles.summaryValue}>
              {insights.paidReservations}
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          Occupancy is an estimate based on the
          reservation dates returned by the current
          backend.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        {icon}
      </View>

      <Text
        style={styles.metricValue}
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text style={styles.metricTitle}>
        {title}
      </Text>

      <Text
        style={styles.metricSubtitle}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function ProgressRow({
  label,
  value,
  total,
  description,
}: ProgressRowProps) {
  const percentage =
    total > 0
      ? Math.min(100, Math.max(0, (value / total) * 100))
      : 0;

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {label}
        </Text>

        <Text style={styles.progressValue}>
          {total === 100
            ? formatPercentage(value)
            : `${value}/${total}`}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.progressDescription}>
        {description}
      </Text>
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
  revenueCard: {
    backgroundColor: THEME,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  revenueLabel: {
    color: "#dbe6ff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  revenueValue: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    marginTop: 8,
  },
  revenueFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  revenueFooterText: {
    color: "#e8efff",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricCard: {
    width: "48.5%",
    minHeight: 145,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  metricTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
  metricSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
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
    marginBottom: 18,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderText: {
    flex: 1,
    marginLeft: 11,
  },
  sectionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
  },
  sectionSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  progressRow: {
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  progressValue: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#edf0f4",
    overflow: "hidden",
    marginTop: 9,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME,
  },
  progressDescription: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  monthRow: {
    marginBottom: 17,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  monthLabel: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  monthBookings: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
  monthAmount: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
  },
  monthTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#edf0f4",
    overflow: "hidden",
    marginTop: 9,
  },
  monthProgress: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: THEME,
  },
  emptyRevenue: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyRevenueTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginTop: 10,
  },
  emptyRevenueText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  summaryRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  lastSummaryRow: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  summaryValue: {
    color: TEXT,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  footerText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});