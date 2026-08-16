import { SafeAreaView } from "react-native-safe-area-context";
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
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
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
  name?: string;
  full_name?: string;
  email?: string;
};

type StayItem = {
  id: number | string;
  status?: string;
};

type TripItem = {
  id: number | string;
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

type ReportData = {
  stays: StayItem[];
  trips: TripItem[];
  reservations: ReservationItem[];
};

type ReportSummary = {
  totalStays: number;
  activeStays: number;
  pendingStays: number;
  rejectedStays: number;

  totalTrips: number;
  activeTrips: number;
  pendingTrips: number;
  rejectedTrips: number;

  totalReservations: number;
  paidReservations: number;
  pendingReservations: number;
  cancelledReservations: number;

  grossRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  cancelledValue: number;

  averageBookingValue: number;
  bookedNights: number;
};

type ReportRowProps = {
  label: string;
  value: string | number;
  valueColor?: string;
  isLast?: boolean;
};

type NavigationCardProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
};

const EMPTY_DATA: ReportData = {
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

  const objectPayload = payload as Record<string, unknown>;

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
    const value = objectPayload[key];

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

const formatReportDate = () =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const getHostName = (user: StoredUser | null) => {
  if (!user) {
    return "Host";
  }

  return (
    user.name?.trim() ||
    user.full_name?.trim() ||
    user.email?.split("@")[0] ||
    "Host"
  );
};

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

const isCancelledReservation = (
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

const isPaidReservation = (
  reservation: ReservationItem
) => {
  const paymentStatus = normalizeStatus(
    reservation.payment_status
  );

  const bookingStatus = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    !isCancelledReservation(reservation) &&
    (paymentStatus === "paid" ||
      paymentStatus === "completed" ||
      bookingStatus === "completed")
  );
};

const isPendingReservation = (
  reservation: ReservationItem
) => {
  if (
    isCancelledReservation(reservation) ||
    isPaidReservation(reservation)
  ) {
    return false;
  }

  const paymentStatus = normalizeStatus(
    reservation.payment_status
  );

  return (
    !paymentStatus ||
    paymentStatus === "pending" ||
    paymentStatus === "processing" ||
    paymentStatus === "unpaid"
  );
};

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
      (checkoutTime - checkinTime) /
        millisecondsPerDay
    )
  );
};

export default function HostReportScreen() {
  const router = useRouter();

  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [data, setData] =
    useState<ReportData>(EMPTY_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(
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

        if (!storedUser || !hostId) {
          setUser(null);
          setData(EMPTY_DATA);

          setError(
            "Please sign in again to view your host report."
          );

          return;
        }

        setUser(storedUser);

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
            "We could not load your host report."
          );
        } else if (failedCount > 0) {
          setError(
            "Some report information could not be loaded."
          );
        }
      } catch (requestError) {
        console.error(
          "Load host report error:",
          requestError
        );

        setData(EMPTY_DATA);

        setError(
          "We could not load your report. Check your connection and try again."
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
      loadReport(true);
    }, [loadReport])
  );

  const summary = useMemo<ReportSummary>(() => {
    const activeStays = data.stays.filter((stay) => {
      const status = normalizeStatus(stay.status);

      return (
        status === "published" ||
        status === "active"
      );
    }).length;

    const pendingStays = data.stays.filter(
      (stay) =>
        normalizeStatus(stay.status) === "pending"
    ).length;

    const rejectedStays = data.stays.filter((stay) => {
      const status = normalizeStatus(stay.status);

      return (
        status === "rejected" ||
        status === "suspended"
      );
    }).length;

    const activeTrips = data.trips.filter((trip) => {
      const status = normalizeStatus(trip.status);

      return (
        status === "published" ||
        status === "active"
      );
    }).length;

    const pendingTrips = data.trips.filter(
      (trip) =>
        normalizeStatus(trip.status) === "pending"
    ).length;

    const rejectedTrips = data.trips.filter((trip) => {
      const status = normalizeStatus(trip.status);

      return (
        status === "rejected" ||
        status === "suspended"
      );
    }).length;

    const paidReservations =
      data.reservations.filter(
        isPaidReservation
      );

    const pendingReservations =
      data.reservations.filter(
        isPendingReservation
      );

    const cancelledReservations =
      data.reservations.filter(
        isCancelledReservation
      );

    const validReservations =
      data.reservations.filter(
        (reservation) =>
          !isCancelledReservation(reservation)
      );

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

    const pendingRevenue =
      pendingReservations.reduce(
        (total, reservation) =>
          total +
          getReservationTotal(reservation),
        0
      );

    const cancelledValue =
      cancelledReservations.reduce(
        (total, reservation) =>
          total +
          getReservationTotal(reservation),
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

    return {
      totalStays: data.stays.length,
      activeStays,
      pendingStays,
      rejectedStays,

      totalTrips: data.trips.length,
      activeTrips,
      pendingTrips,
      rejectedTrips,

      totalReservations: data.reservations.length,
      paidReservations: paidReservations.length,
      pendingReservations:
        pendingReservations.length,
      cancelledReservations:
        cancelledReservations.length,

      grossRevenue,
      paidRevenue,
      pendingRevenue,
      cancelledValue,

      averageBookingValue,
      bookedNights,
    };
  }, [data]);

  const completionRate = useMemo(() => {
    const completedChecks = [
      summary.totalStays > 0,
      summary.activeStays > 0,
      summary.totalTrips > 0,
      summary.activeTrips > 0,
      summary.totalReservations > 0,
      summary.paidReservations > 0,
    ].filter(Boolean).length;

    return Math.round(
      (completedChecks / 6) * 100
    );
  }, [summary]);

  const createShareMessage = () => {
    const hostName = getHostName(user);
    const reportDate = formatReportDate();

    return [
      "Dovail Stay — Host Performance Report",
      "",
      `Host: ${hostName}`,
      `Report date: ${reportDate}`,
      "",
      "LISTINGS",
      `Total stays: ${summary.totalStays}`,
      `Active stays: ${summary.activeStays}`,
      `Pending stays: ${summary.pendingStays}`,
      `Rejected or suspended stays: ${summary.rejectedStays}`,
      "",
      `Total trip packages: ${summary.totalTrips}`,
      `Active trips: ${summary.activeTrips}`,
      `Pending trips: ${summary.pendingTrips}`,
      `Rejected or suspended trips: ${summary.rejectedTrips}`,
      "",
      "RESERVATIONS",
      `Total reservations: ${summary.totalReservations}`,
      `Paid reservations: ${summary.paidReservations}`,
      `Pending reservations: ${summary.pendingReservations}`,
      `Cancelled reservations: ${summary.cancelledReservations}`,
      `Booked nights: ${summary.bookedNights}`,
      "",
      "REVENUE",
      `Gross revenue: ${formatCurrency(
        summary.grossRevenue
      )}`,
      `Paid revenue: ${formatCurrency(
        summary.paidRevenue
      )}`,
      `Pending revenue: ${formatCurrency(
        summary.pendingRevenue
      )}`,
      `Average booking value: ${formatCurrency(
        summary.averageBookingValue
      )}`,
      "",
      `Host readiness: ${completionRate}%`,
      "",
      "Generated from the Dovail Stay mobile app.",
    ].join("\n");
  };

  const shareReport = async () => {
    try {
      setSharing(true);

      await Share.share({
        title: "Dovail Stay Host Report",
        message: createShareMessage(),
      });
    } catch (shareError) {
      console.error(
        "Share host report error:",
        shareError
      );

      Alert.alert(
        "Unable to share",
        "The host report could not be shared. Please try again."
      );
    } finally {
      setSharing(false);
    }
  };

  const refreshReport = () => {
    setRefreshing(true);
    loadReport(false);
  };

  const openRoute = (route: string) => {
    router.push(route as never);
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
            Preparing host report...
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
            Host report
          </Text>

          <Text style={styles.headerSubtitle}>
            Updated {formatReportDate()}
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <FileText
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
            onRefresh={refreshReport}
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
              onPress={() => loadReport(true)}
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

        <View style={styles.reportHero}>
          <Text style={styles.heroEyebrow}>
            HOST PERFORMANCE
          </Text>

          <Text style={styles.heroTitle}>
            {getHostName(user)}
          </Text>

          <Text style={styles.heroRevenue}>
            {formatCurrency(
              summary.paidRevenue
            )}
          </Text>

          <Text style={styles.heroRevenueLabel}>
            Paid revenue from{" "}
            {summary.paidReservations}{" "}
            {summary.paidReservations === 1
              ? "reservation"
              : "reservations"}
          </Text>

          <View style={styles.readinessArea}>
            <View style={styles.readinessHeader}>
              <Text style={styles.readinessLabel}>
                Host readiness
              </Text>

              <Text style={styles.readinessValue}>
                {completionRate}%
              </Text>
            </View>

            <View style={styles.readinessTrack}>
              <View
                style={[
                  styles.readinessFill,
                  {
                    width: `${completionRate}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={sharing}
          onPress={shareReport}
          style={({ pressed }) => [
            styles.shareButton,
            pressed &&
              styles.buttonPressed,
            sharing &&
              styles.disabledButton,
          ]}
        >
          {sharing ? (
            <ActivityIndicator
              size="small"
              color="#ffffff"
            />
          ) : (
            <FileText
              size={19}
              color="#ffffff"
              strokeWidth={2}
            />
          )}

          <Text style={styles.shareButtonText}>
            {sharing
              ? "Preparing report..."
              : "Share host report"}
          </Text>
        </Pressable>

        <View style={styles.metricGrid}>
          <MetricCard
            value={summary.totalStays}
            title="Stay listings"
            subtitle={`${summary.activeStays} active`}
            icon={
              <Home
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            value={summary.totalTrips}
            title="Trip packages"
            subtitle={`${summary.activeTrips} active`}
            icon={
              <Building2
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            value={summary.totalReservations}
            title="Reservations"
            subtitle={`${summary.paidReservations} paid`}
            icon={
              <FileText
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <MetricCard
            value={summary.bookedNights}
            title="Booked nights"
            subtitle="Valid reservations"
            icon={
              <User
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />
        </View>

        <ReportSection
          title="Stay listings"
          subtitle="Approval and publication status"
          icon={
            <Home
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
        >
          <ReportRow
            label="Total stays"
            value={summary.totalStays}
          />

          <ReportRow
            label="Published or active"
            value={summary.activeStays}
            valueColor={SUCCESS}
          />

          <ReportRow
            label="Pending approval"
            value={summary.pendingStays}
            valueColor={WARNING}
          />

          <ReportRow
            label="Rejected or suspended"
            value={summary.rejectedStays}
            valueColor={DANGER}
            isLast
          />
        </ReportSection>

        <ReportSection
          title="Trip packages"
          subtitle="Trip package approval status"
          icon={
            <Building2
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
        >
          <ReportRow
            label="Total trip packages"
            value={summary.totalTrips}
          />

          <ReportRow
            label="Active packages"
            value={summary.activeTrips}
            valueColor={SUCCESS}
          />

          <ReportRow
            label="Pending approval"
            value={summary.pendingTrips}
            valueColor={WARNING}
          />

          <ReportRow
            label="Rejected or suspended"
            value={summary.rejectedTrips}
            valueColor={DANGER}
            isLast
          />
        </ReportSection>

        <ReportSection
          title="Reservations"
          subtitle="Stay booking performance"
          icon={
            <FileText
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
        >
          <ReportRow
            label="Total reservations"
            value={summary.totalReservations}
          />

          <ReportRow
            label="Paid reservations"
            value={summary.paidReservations}
            valueColor={SUCCESS}
          />

          <ReportRow
            label="Pending payment"
            value={summary.pendingReservations}
            valueColor={WARNING}
          />

          <ReportRow
            label="Cancelled reservations"
            value={summary.cancelledReservations}
            valueColor={DANGER}
          />

          <ReportRow
            label="Booked nights"
            value={summary.bookedNights}
            isLast
          />
        </ReportSection>

        <ReportSection
          title="Revenue"
          subtitle="Financial summary from reservations"
          icon={
            <Building2
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
        >
          <ReportRow
            label="Gross reservation value"
            value={formatCurrency(
              summary.grossRevenue
            )}
          />

          <ReportRow
            label="Paid revenue"
            value={formatCurrency(
              summary.paidRevenue
            )}
            valueColor={SUCCESS}
          />

          <ReportRow
            label="Pending revenue"
            value={formatCurrency(
              summary.pendingRevenue
            )}
            valueColor={WARNING}
          />

          <ReportRow
            label="Cancelled booking value"
            value={formatCurrency(
              summary.cancelledValue
            )}
            valueColor={DANGER}
          />

          <ReportRow
            label="Average booking value"
            value={formatCurrency(
              summary.averageBookingValue
            )}
            isLast
          />
        </ReportSection>

        <Text style={styles.navigationHeading}>
          Open management
        </Text>

        <NavigationCard
          title="Manage stays"
          subtitle="Review, edit and create stay listings"
          icon={
            <Home
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
          onPress={() =>
            openRoute("/host/stays")
          }
        />

        <NavigationCard
          title="Manage trips"
          subtitle="Review and edit your trip packages"
          icon={
            <Building2
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
          onPress={() =>
            openRoute("/host/trips")
          }
        />

        <NavigationCard
          title="View reservations"
          subtitle="Open guest booking information"
          icon={
            <FileText
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
          onPress={() =>
            openRoute("/host/reservations")
          }
        />

        <NavigationCard
          title="View earnings"
          subtitle="Review paid and pending revenue"
          icon={
            <Building2
              size={21}
              color={THEME}
              strokeWidth={1.9}
            />
          }
          onPress={() =>
            openRoute("/host/earnings")
          }
        />

        <Text style={styles.footerText}>
          This report is calculated from the
          reservation, listing and trip data returned
          by the current Dovail Stay backend.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

type MetricCardProps = {
  value: string | number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

function MetricCard({
  value,
  title,
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

      <Text style={styles.metricSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

type ReportSectionProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function ReportSection({
  title,
  subtitle,
  icon,
  children,
}: ReportSectionProps) {
  return (
    <View style={styles.reportSection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          {icon}
        </View>

        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitle}>
            {title}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.sectionRows}>
        {children}
      </View>
    </View>
  );
}

function ReportRow({
  label,
  value,
  valueColor = TEXT,
  isLast = false,
}: ReportRowProps) {
  return (
    <View
      style={[
        styles.reportRow,
        isLast && styles.lastReportRow,
      ]}
    >
      <Text style={styles.reportLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.reportValue,
          {
            color: valueColor,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function NavigationCard({
  title,
  subtitle,
  icon,
  onPress,
}: NavigationCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.navigationCard,
        pressed &&
          styles.navigationCardPressed,
      ]}
    >
      <View style={styles.navigationIcon}>
        {icon}
      </View>

      <View style={styles.navigationContent}>
        <Text style={styles.navigationTitle}>
          {title}
        </Text>

        <Text style={styles.navigationSubtitle}>
          {subtitle}
        </Text>
      </View>

      <ChevronRight
        size={19}
        color={MUTED}
        strokeWidth={1.9}
      />
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
  disabledButton: {
    opacity: 0.65,
  },
  reportHero: {
    backgroundColor: THEME,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  heroEyebrow: {
    color: "#dbe6ff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    marginTop: 7,
  },
  heroRevenue: {
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    marginTop: 15,
  },
  heroRevenueLabel: {
    color: "#e8efff",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 5,
  },
  readinessArea: {
    marginTop: 18,
  },
  readinessHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readinessLabel: {
    color: "#e8efff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  readinessValue: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  readinessTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#7e9fe7",
    overflow: "hidden",
    marginTop: 9,
  },
  readinessFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  shareButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  shareButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricCard: {
    width: "48.5%",
    minHeight: 143,
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
    marginTop: 4,
  },
  reportSection: {
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
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderContent: {
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
  sectionRows: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  reportRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  lastReportRow: {
    borderBottomWidth: 0,
  },
  reportLabel: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  reportValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textAlign: "right",
  },
  navigationHeading: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    marginBottom: 11,
  },
  navigationCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 11,
  },
  navigationCardPressed: {
    backgroundColor: "#f7f9fc",
  },
  navigationIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  navigationContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  navigationTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  navigationSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 4,
  },
  footerText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 6,
  },
});