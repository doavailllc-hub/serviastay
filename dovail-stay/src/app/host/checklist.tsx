import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    FileText,
    Home,
    MessageCircle,
    ShieldCheck,
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

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
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
  status?: string;
  booking_status?: string;
  payment_status?: string;
  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;
};

type ChecklistData = {
  stays: StayItem[];
  trips: TripItem[];
  reservations: ReservationItem[];
};

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  actionRoute: string;
  icon: React.ReactNode;
};

const EMPTY_DATA: ChecklistData = {
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

const getReservationStatus = (
  reservation: ReservationItem
) =>
  reservation.status ||
  reservation.booking_status ||
  "Pending";

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

const getReservationTotal = (
  reservation: ReservationItem
) =>
  toNumber(
    reservation.total ??
      reservation.total_amount ??
      reservation.amount
  );

export default function HostChecklistScreen() {
  const router = useRouter();

  const [data, setData] =
    useState<ChecklistData>(EMPTY_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadChecklist = useCallback(
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
            "Please sign in again to view your host checklist."
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
            "We could not load your host checklist."
          );
        } else if (failedCount > 0) {
          setError(
            "Some checklist information could not be loaded."
          );
        }
      } catch (requestError) {
        console.error(
          "Load host checklist error:",
          requestError
        );

        setData(EMPTY_DATA);

        setError(
          "We could not load your checklist. Check your connection and try again."
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
      loadChecklist(true);
    }, [loadChecklist])
  );

  const checklist = useMemo<ChecklistItem[]>(() => {
    const hasStay = data.stays.length > 0;

    const hasPublishedStay = data.stays.some((stay) => {
      const status = normalizeStatus(stay.status);

      return (
        status === "published" ||
        status === "active"
      );
    });

    const hasTrip = data.trips.length > 0;

    const hasActiveTrip = data.trips.some((trip) => {
      const status = normalizeStatus(trip.status);

      return (
        status === "active" ||
        status === "published"
      );
    });

    const hasReservation =
      data.reservations.length > 0;

    const hasPaidReservation =
      data.reservations.some(isPaidReservation);

    return [
      {
        id: "create-stay",
        title: "Create your first stay",
        description:
          "Add property details, pricing, amenities and photos.",
        completed: hasStay,
        actionLabel: hasStay
          ? "Manage stays"
          : "Create stay",
        actionRoute: hasStay
          ? "/host/stays"
          : "/host/stay/create",
        icon: (
          <Home
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "publish-stay",
        title: "Get a stay approved",
        description:
          "A stay must be approved and published before guests can book it.",
        completed: hasPublishedStay,
        actionLabel: hasPublishedStay
          ? "View active stays"
          : "Check status",
        actionRoute: "/host/stays",
        icon: (
          <ShieldCheck
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "create-trip",
        title: "Create a trip package",
        description:
          "Add a destination, duration, itinerary and pricing.",
        completed: hasTrip,
        actionLabel: hasTrip
          ? "Manage trips"
          : "Create trip",
        actionRoute: hasTrip
          ? "/host/trips"
          : "/trip/create",
        icon: (
          <Building2
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "activate-trip",
        title: "Get a trip activated",
        description:
          "Trip packages become visible after admin approval.",
        completed: hasActiveTrip,
        actionLabel: hasActiveTrip
          ? "View active trips"
          : "Check status",
        actionRoute: "/host/trips",
        icon: (
          <FileText
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "first-reservation",
        title: "Receive your first reservation",
        description:
          "Guest reservations will appear after a published stay is booked.",
        completed: hasReservation,
        actionLabel: "View reservations",
        actionRoute: "/host/reservations",
        icon: (
          <User
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
      {
        id: "first-payment",
        title: "Receive your first paid booking",
        description:
          "Paid reservation revenue appears in your earnings screen.",
        completed: hasPaidReservation,
        actionLabel: "View earnings",
        actionRoute: "/host/earnings",
        icon: (
          <Building2
            size={21}
            color={THEME}
            strokeWidth={1.9}
          />
        ),
      },
    ];
  }, [data]);

  const progress = useMemo(() => {
    const completedCount = checklist.filter(
      (item) => item.completed
    ).length;

    const totalCount = checklist.length;

    const percentage =
      totalCount > 0
        ? Math.round(
            (completedCount / totalCount) * 100
          )
        : 0;

    return {
      completedCount,
      totalCount,
      percentage,
    };
  }, [checklist]);

  const paidRevenue = useMemo(
    () =>
      data.reservations
        .filter(isPaidReservation)
        .reduce(
          (total, reservation) =>
            total +
            getReservationTotal(reservation),
          0
        ),
    [data.reservations]
  );

  const refreshChecklist = () => {
    setRefreshing(true);
    loadChecklist(false);
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
            Loading host checklist...
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
            Host checklist
          </Text>

          <Text style={styles.headerSubtitle}>
            Complete your host setup
          </Text>
        </View>

        <View style={styles.headerProgress}>
          <Text style={styles.headerProgressText}>
            {progress.percentage}%
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshChecklist}
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
              onPress={() =>
                loadChecklist(true)
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

        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <View>
              <Text style={styles.progressEyebrow}>
                HOST SETUP
              </Text>

              <Text style={styles.progressTitle}>
                {progress.percentage === 100
                  ? "Your host account is ready"
                  : "Finish setting up your host account"}
              </Text>
            </View>

            <View style={styles.progressCircle}>
              <Text style={styles.progressCircleValue}>
                {progress.percentage}%
              </Text>
            </View>
          </View>

          <Text style={styles.progressDescription}>
            {progress.completedCount} of{" "}
            {progress.totalCount} setup steps
            completed.
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress.percentage}%`,
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Stays"
            value={data.stays.length}
            subtitle="Created listings"
            icon={
              <Home
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <SummaryCard
            title="Trips"
            value={data.trips.length}
            subtitle="Created packages"
            icon={
              <Building2
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <SummaryCard
            title="Bookings"
            value={data.reservations.length}
            subtitle="Stay reservations"
            icon={
              <FileText
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />

          <SummaryCard
            title="Paid revenue"
            value={formatCurrency(paidRevenue)}
            subtitle="Confirmed earnings"
            icon={
              <Building2
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Setup steps
          </Text>

          <Text style={styles.sectionCount}>
            {progress.completedCount}/
            {progress.totalCount}
          </Text>
        </View>

        <View style={styles.checklistCard}>
          {checklist.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() =>
                openRoute(item.actionRoute)
              }
              style={({ pressed }) => [
                styles.checklistItem,
                index === checklist.length - 1 &&
                  styles.lastChecklistItem,
                pressed &&
                  styles.checklistItemPressed,
              ]}
            >
              <View
                style={[
                  styles.checkIcon,
                  item.completed &&
                    styles.completedCheckIcon,
                ]}
              >
                {item.completed ? (
                  <ShieldCheck
                    size={21}
                    color="#ffffff"
                    strokeWidth={2}
                  />
                ) : (
                  item.icon
                )}
              </View>

              <View style={styles.checkContent}>
                <View style={styles.checkTitleRow}>
                  <Text
                    style={[
                      styles.checkTitle,
                      item.completed &&
                        styles.completedCheckTitle,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <View
                    style={[
                      styles.statusPill,
                      item.completed
                        ? styles.completedStatusPill
                        : styles.pendingStatusPill,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.completed
                          ? styles.completedStatusText
                          : styles.pendingStatusText,
                      ]}
                    >
                      {item.completed
                        ? "Complete"
                        : "Pending"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.checkDescription}>
                  {item.description}
                </Text>

                <Text style={styles.checkAction}>
                  {item.actionLabel}
                </Text>
              </View>

              <ChevronRight
                size={19}
                color={MUTED}
                strokeWidth={1.9}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <MessageCircle
              size={22}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>
              Need help completing a step?
            </Text>

            <Text style={styles.helpText}>
              Open Support for help with listings,
              approval, reservations and payments.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              openRoute("/support")
            }
            style={({ pressed }) => [
              styles.helpButton,
              pressed &&
                styles.buttonPressed,
            ]}
          >
            <Text style={styles.helpButtonText}>
              Open
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SummaryCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
};

function SummaryCard({
  title,
  value,
  subtitle,
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

      <Text style={styles.summaryTitle}>
        {title}
      </Text>

      <Text
        style={styles.summarySubtitle}
        numberOfLines={1}
      >
        {subtitle}
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
  headerProgress: {
    minWidth: 46,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headerProgressText: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
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
    opacity: 0.78,
  },
  progressCard: {
    backgroundColor: THEME,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  progressEyebrow: {
    color: "#dbe6ff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.9,
  },
  progressTitle: {
    maxWidth: 240,
    color: "#ffffff",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    marginTop: 7,
  },
  progressCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderColor: "#8eaff4",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleValue: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  progressDescription: {
    color: "#e8efff",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 14,
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#7e9fe7",
    overflow: "hidden",
    marginTop: 14,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryCard: {
    width: "48.5%",
    minHeight: 143,
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
    marginBottom: 12,
  },
  summaryValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  summaryTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
  summarySubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  sectionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  sectionCount: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  checklistCard: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    marginBottom: 17,
  },
  checklistItem: {
    minHeight: 116,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  lastChecklistItem: {
    borderBottomWidth: 0,
  },
  checklistItemPressed: {
    backgroundColor: "#f7f9fc",
  },
  checkIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  completedCheckIcon: {
    backgroundColor: SUCCESS,
  },
  checkContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  checkTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  checkTitle: {
    flex: 1,
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  completedCheckTitle: {
    color: SUCCESS,
  },
  checkDescription: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  checkAction: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    marginTop: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedStatusPill: {
    backgroundColor: "#e9f7ef",
  },
  pendingStatusPill: {
    backgroundColor: "#fff4dc",
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
  },
  completedStatusText: {
    color: SUCCESS,
  },
  pendingStatusText: {
    color: WARNING,
  },
  helpCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 15,
  },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  helpContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  helpTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  helpText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  helpButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  helpButtonText: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
});