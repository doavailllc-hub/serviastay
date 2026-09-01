import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../api/api";
import { formatCurrency } from "../utils/currency";
import { getStoredUser } from "../services/authService";

const THEME = "#2DB281";
const THEME_LIGHT = "#E8F7F1";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const SURFACE = "#f8fafc";
const WHITE = "#ffffff";
const SUCCESS = "#16803d";
const DANGER = "#c62828";

const FALLBACK_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type ProductTab = "Stays" | "Trip packages";
type TripFilter = "Upcoming" | "Completed" | "Cancelled";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type StayBooking = {
  id: number | string;
  title?: string;
  property_title?: string;
  location?: string;
  city?: string;
  image?: string;
  image_url?: string;
  property_image?: string;
  cover_image?: string;
  checkin?: string;
  checkout?: string;
  guests?: number | string;
  total?: number | string;
  status?: string;
  payment_status?: string;
};

type ExperienceImage = {
  image_url?: string;
  imageUrl?: string;
  url?: string;
};

type PackageBooking = {
  id: number | string;
  booking_id?: number | string;
  experience_title?: string;
  trip_title?: string;
  package_name?: string;
  title?: string;
  location?: string;
  city?: string;
  destination?: string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  images?: ExperienceImage[] | string | null;
  departure_date?: string;
  travel_date?: string;
  booking_date?: string;
  guests?: number | string;
  travelers?: number | string;
  guest_count?: number | string;
  package_days?: number | string;
  package_nights?: number | string;
  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;
  status?: string;
  booking_status?: string;
  payment_status?: string;
};

const filters: TripFilter[] = ["Upcoming", "Completed", "Cancelled"];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value?: string) =>
  String(value || "Pending").trim().toLowerCase();

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string) => {
  const date = parseDate(value);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateRange = (checkin?: string, checkout?: string) => {
  const start = parseDate(checkin);
  const end = parseDate(checkout);
  if (!start || !end) return "Dates unavailable";

  const startText = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(start);
  const endText = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);

  return `${startText} – ${endText}`;
};

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/")
    ? `https://stay.dovail.com${value}`
    : `https://stay.dovail.com/${value}`;
};

const parseImages = (images: PackageBooking["images"]): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) {
    return images
      .map((item) => item.image_url || item.imageUrl || item.url || "")
      .filter(Boolean)
      .map(normalizeImageUrl);
  }
  if (typeof images === "string") {
    try {
      return parseImages(JSON.parse(images));
    } catch {
      return images.split(",").map((item) => item.trim()).filter(Boolean).map(normalizeImageUrl);
    }
  }
  return [];
};

const getArrayFromResponse = <T,>(payload: unknown, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  for (const key of [...keys, "data", "items", "results", "bookings"]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
};

const stayCategory = (booking: StayBooking): TripFilter => {
  const status = normalizeStatus(booking.status);
  if (["cancelled", "canceled", "declined", "rejected"].includes(status)) return "Cancelled";
  if (["completed", "checked-out", "checked out"].includes(status)) return "Completed";

  const checkout = parseDate(booking.checkout);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return checkout && checkout < today ? "Completed" : "Upcoming";
};

const packageCategory = (booking: PackageBooking): TripFilter => {
  const status = normalizeStatus(booking.status || booking.booking_status);
  if (["cancelled", "canceled", "rejected", "refunded"].includes(status)) return "Cancelled";
  if (status === "completed") return "Completed";

  const travelDate = parseDate(
    booking.departure_date || booking.travel_date || booking.booking_date
  );
  return travelDate && travelDate.getTime() < Date.now() ? "Completed" : "Upcoming";
};

export default function TripsScreen() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [productTab, setProductTab] = useState<ProductTab>("Stays");
  const [activeFilter, setActiveFilter] = useState<TripFilter>("Upcoming");
  const [stayBookings, setStayBookings] = useState<StayBooking[]>([]);
  const [packageBookings, setPackageBookings] = useState<PackageBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadTrips = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setLoadFailed(false);

      const storedUser = (await getStoredUser()) as StoredUser | null;
      const userId = storedUser?.id ?? storedUser?.user_id;

      if (!userId) {
        setUser(null);
        setStayBookings([]);
        setPackageBookings([]);
        return;
      }

      setUser(storedUser);

      const [stayResult, packageResult] = await Promise.allSettled([
        api.get(`/bookings/${userId}`),
        api.get("/my-experience-bookings").catch(async (error: any) => {
          if (error?.response?.status !== 404) throw error;
          return api.get(`/experience-bookings/${userId}`);
        }),
      ]);

      setStayBookings(
        stayResult.status === "fulfilled"
          ? getArrayFromResponse<StayBooking>(stayResult.value.data, ["stayBookings"])
          : []
      );

      setPackageBookings(
        packageResult.status === "fulfilled"
          ? getArrayFromResponse<PackageBooking>(packageResult.value.data, [
              "experienceBookings",
              "tripBookings",
            ])
          : []
      );

      if (stayResult.status === "rejected" && packageResult.status === "rejected") {
        setLoadFailed(true);
      }
    } catch (error: any) {
      console.log("Trips load error:", error?.response?.data || error?.message || error);
      setStayBookings([]);
      setPackageBookings([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const stayCounts = useMemo(
    () => ({
      Upcoming: stayBookings.filter((item) => stayCategory(item) === "Upcoming").length,
      Completed: stayBookings.filter((item) => stayCategory(item) === "Completed").length,
      Cancelled: stayBookings.filter((item) => stayCategory(item) === "Cancelled").length,
    }),
    [stayBookings]
  );

  const packageCounts = useMemo(
    () => ({
      Upcoming: packageBookings.filter((item) => packageCategory(item) === "Upcoming").length,
      Completed: packageBookings.filter((item) => packageCategory(item) === "Completed").length,
      Cancelled: packageBookings.filter((item) => packageCategory(item) === "Cancelled").length,
    }),
    [packageBookings]
  );

  const currentCounts = productTab === "Stays" ? stayCounts : packageCounts;

  const data = useMemo(() => {
    return productTab === "Stays"
      ? stayBookings.filter((item) => stayCategory(item) === activeFilter)
      : packageBookings.filter((item) => packageCategory(item) === activeFilter);
  }, [activeFilter, packageBookings, productTab, stayBookings]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TripsSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredPage}>
          <View style={styles.emptyIcon}>
            <CalendarDays size={29} color={THEME} />
          </View>
          <Text style={styles.emptyTitle}>View and manage your trips</Text>
          <Text style={styles.emptyText}>
            Log in to see stay reservations and trip package bookings.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push("/login")}>
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={data}
        key={`${productTab}-${activeFilter}`}
        keyExtractor={(item) =>
          String("booking_id" in item ? item.booking_id || item.id : item.id)
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, data.length === 0 && styles.emptyList]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTrips(true)}
            tintColor={THEME}
            colors={[THEME]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Trips</Text>
              <Text style={styles.subtitle}>
                Manage stays and trip package reservations in one place.
              </Text>
            </View>

            <View style={styles.productTabs}>
              {(["Stays", "Trip packages"] as ProductTab[]).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => {
                    setProductTab(tab);
                    setActiveFilter("Upcoming");
                  }}
                  style={[
                    styles.productTabButton,
                    productTab === tab && styles.productTabButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.productTabText,
                      productTab === tab && styles.productTabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterContainer}>
              {filters.map((filter) => {
                const active = activeFilter === filter;

                return (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterButton,
                      active && styles.filterButtonActive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                    <View
                      style={[
                        styles.countBadge,
                        active && styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          active && styles.countTextActive,
                        ]}
                      >
                        {currentCounts[filter]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            productTab={productTab}
            filter={activeFilter}
            loadFailed={loadFailed}
            onRetry={() => loadTrips()}
          />
        }
        renderItem={({ item }) =>
          productTab === "Stays" ? (
            <StayCard
              booking={item as StayBooking}
              onPress={() => router.push(`/trip/${(item as StayBooking).id}`)}
            />
          ) : (
            <PackageCard
              booking={item as PackageBooking}
              onPress={() =>
                router.push({
                  pathname: "/experience/bookings/[id]",
                  params: {
                    id: String(
                      (item as PackageBooking).booking_id ||
                        (item as PackageBooking).id
                    ),
                  },
                })
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

function StayCard({ booking, onPress }: { booking: StayBooking; onPress: () => void }) {
  const category = stayCategory(booking);
  const guests = Math.max(1, toNumber(booking.guests));

  return (
    <BookingCard
      image={
        normalizeImageUrl(
          booking.cover_image || booking.image || booking.image_url || booking.property_image
        ) || FALLBACK_STAY_IMAGE
      }
      title={booking.title || booking.property_title || "Dovail Stay"}
      location={booking.location || booking.city || "Location unavailable"}
      status={booking.status || category}
      category={category}
      firstLabel="Dates"
      firstValue={formatDateRange(booking.checkin, booking.checkout)}
      secondLabel="Guests"
      secondValue={String(guests)}
      payment={booking.payment_status || "Pending"}
      reference={`Booking #${booking.id}`}
      total={toNumber(booking.total)}
      onPress={onPress}
    />
  );
}

function PackageCard({
  booking,
  onPress,
}: {
  booking: PackageBooking;
  onPress: () => void;
}) {
  const category = packageCategory(booking);
  const images = parseImages(booking.images);
  const guests = Math.max(
    1,
    toNumber(booking.guests ?? booking.travelers ?? booking.guest_count)
  );
  const days = Math.max(1, toNumber(booking.package_days) || 1);
  const nights = Math.max(0, toNumber(booking.package_nights) || days - 1);

  return (
    <BookingCard
      image={
        images[0] ||
        normalizeImageUrl(booking.cover_image || booking.image || booking.image_url) ||
        FALLBACK_TRIP_IMAGE
      }
      title={
        booking.experience_title ||
        booking.trip_title ||
        booking.package_name ||
        booking.title ||
        "Trip package"
      }
      location={
        booking.location || booking.city || booking.destination || "Destination unavailable"
      }
      status={booking.status || booking.booking_status || category}
      category={category}
      firstLabel="Departure"
      firstValue={formatDate(
        booking.departure_date || booking.travel_date || booking.booking_date
      )}
      secondLabel="Package"
      secondValue={`${days}D / ${nights}N · ${guests}`}
      payment={booking.payment_status || "Pending"}
      reference={`Booking #${booking.booking_id || booking.id}`}
      total={toNumber(booking.total ?? booking.total_amount ?? booking.amount)}
      onPress={onPress}
    />
  );
}

function BookingCard({
  image,
  title,
  location,
  status,
  category,
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  payment,
  reference,
  total,
  onPress,
}: {
  image: string;
  title: string;
  location: string;
  status: string;
  category: TripFilter;
  firstLabel: string;
  firstValue: string;
  secondLabel: string;
  secondValue: string;
  payment: string;
  reference: string;
  total: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripCard,
        pressed && styles.tripCardPressed,
      ]}
    >
      <Image source={{ uri: image }} style={styles.tripImage} />

      <View style={styles.tripContent}>
        <StatusBadge category={category} label={status} />

        <View style={styles.tripTitleRow}>
          <Text numberOfLines={1} style={styles.tripTitle}>
            {title}
          </Text>
          <ChevronRight size={19} color="#9aa0a6" />
        </View>

        <View style={styles.locationRow}>
          <MapPin size={14} color={MUTED} />
          <Text numberOfLines={1} style={styles.location}>
            {location}
          </Text>
        </View>

        <View style={styles.infoGrid}>
          <InfoBox
            icon={<CalendarDays size={16} color={THEME} />}
            label={firstLabel}
            value={firstValue}
          />
          <InfoBox
            icon={<Users size={16} color={THEME} />}
            label={secondLabel}
            value={secondValue}
          />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.paymentLabel}>{payment}</Text>
            <Text style={styles.bookingReference}>{reference}</Text>
          </View>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function InfoBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoItem}>
      {icon}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusBadge({ category, label }: { category: TripFilter; label: string }) {
  const Icon =
    category === "Upcoming"
      ? Clock3
      : category === "Completed"
      ? CheckCircle2
      : XCircle;

  const color =
    category === "Upcoming"
      ? THEME
      : category === "Completed"
      ? SUCCESS
      : DANGER;

  return (
    <View
      style={[
        styles.statusBadge,
        category === "Upcoming" && styles.statusUpcoming,
        category === "Completed" && styles.statusCompleted,
        category === "Cancelled" && styles.statusCancelled,
      ]}
    >
      <Icon size={14} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function EmptyState({
  productTab,
  filter,
  loadFailed,
  onRetry,
}: {
  productTab: ProductTab;
  filter: TripFilter;
  loadFailed: boolean;
  onRetry: () => void;
}) {
  const itemName = productTab === "Stays" ? "stays" : "trip packages";

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {loadFailed ? (
          <RefreshCw size={28} color={THEME} />
        ) : productTab === "Stays" ? (
          <CalendarDays size={28} color={THEME} />
        ) : (
          <Building2 size={28} color={THEME} />
        )}
      </View>

      <Text style={styles.emptyTitle}>
        {loadFailed
          ? "Could not load trips"
          : `No ${filter.toLowerCase()} ${itemName}`}
      </Text>

      <Text style={styles.emptyText}>
        {loadFailed
          ? "Check your connection and try again."
          : `Your ${filter.toLowerCase()} ${itemName} will appear here.`}
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={loadFailed ? onRetry : () => router.push("/")}
      >
        <Text style={styles.primaryButtonText}>
          {loadFailed ? "Try again" : "Explore"}
        </Text>
      </Pressable>
    </View>
  );
}

function TripsSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonHeaderTitle} />
        <View style={styles.skeletonHeaderSubtitle} />
      </View>

      <View style={styles.skeletonProductTabs} />
      <View style={styles.skeletonFilters} />

      {[1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonCardBody}>
            <View style={styles.skeletonBadge} />
            <View style={styles.skeletonCardTitle} />
            <View style={styles.skeletonLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  list: { paddingHorizontal: 18, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  header: { paddingTop: 14, paddingBottom: 18 },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: TEXT,
  },
  subtitle: {
    marginTop: 4,
    maxWidth: 330,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  productTabs: {
    minHeight: 48,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
  },
  productTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  productTabButtonActive: { borderBottomColor: THEME },
  productTabText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: MUTED },
  productTabTextActive: { color: THEME },
  filterContainer: {
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  filterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  filterButtonActive: { backgroundColor: WHITE, elevation: 1 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 11, color: MUTED },
  filterTextActive: { fontFamily: "Inter_600SemiBold", color: THEME },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e4e7eb",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeActive: { backgroundColor: THEME_LIGHT },
  countText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: MUTED },
  countTextActive: { color: THEME },
  tripCard: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  tripCardPressed: { opacity: 0.94 },
  tripImage: { width: "100%", height: 195, backgroundColor: "#f1f3f4" },
  tripContent: { padding: 16 },
  statusBadge: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusUpcoming: { backgroundColor: THEME_LIGHT },
  statusCompleted: { backgroundColor: "#ebf8ef" },
  statusCancelled: { backgroundColor: "#ffeeee" },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10, textTransform: "capitalize" },
  tripTitleRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  tripTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    lineHeight: 23,
    color: TEXT,
  },
  locationRow: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  location: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: MUTED },
  infoGrid: { marginTop: 16, flexDirection: "row", gap: 10 },
  infoItem: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: SURFACE,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: MUTED,
    textTransform: "uppercase",
  },
  infoValue: { marginTop: 4, fontFamily: "Inter_500Medium", fontSize: 10, color: TEXT },
  cardDivider: { height: 1, marginVertical: 15, backgroundColor: BORDER },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  paymentLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: THEME },
  bookingReference: { marginTop: 4, fontFamily: "Inter_400Regular", fontSize: 10, color: MUTED },
  total: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: TEXT },
  skeletonPage: { flex: 1, paddingHorizontal: 18 },
  skeletonHeader: { height: 88, paddingTop: 14 },
  skeletonHeaderTitle: {
    width: 76,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },
  skeletonHeaderSubtitle: {
    width: 260,
    height: 13,
    marginTop: 8,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },
  skeletonProductTabs: {
    height: 48,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#eceff1",
  },
  skeletonFilters: {
    height: 54,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
  },
  skeletonCard: {
    marginBottom: 20,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: WHITE,
  },
  skeletonImage: { width: "100%", height: 195, backgroundColor: "#eceff1" },
  skeletonCardBody: { padding: 16 },
  skeletonBadge: { width: 72, height: 24, borderRadius: 12, backgroundColor: "#eceff1" },
  skeletonCardTitle: { width: "66%", height: 17, marginTop: 12, borderRadius: 8, backgroundColor: "#eceff1" },
  skeletonLine: { width: "48%", height: 12, marginTop: 9, borderRadius: 6, backgroundColor: "#f1f3f4" },
  centeredPage: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    minHeight: 380,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    color: TEXT,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 9,
    maxWidth: 310,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 24,
    minWidth: 148,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: WHITE },
});
