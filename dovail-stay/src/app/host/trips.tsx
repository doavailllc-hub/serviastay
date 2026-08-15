import { useFocusEffect, useRouter } from "expo-router";
import {
  Building2,
  ChevronLeft,
  FileText,
  Plus,
  User,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
const DANGER = "#c63d3d";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type TripItem = {
  id: number | string;
  host_id?: number | string;
  user_id?: number | string;

  title?: string;
  name?: string;
  trip_name?: string;
  package_name?: string;

  description?: string;
  destination?: string;
  location?: string;
  city?: string;
  country?: string;

  price?: number | string;
  package_price?: number | string;
  adult_price?: number | string;

  package_days?: number | string;
  package_nights?: number | string;
  days?: number | string;
  nights?: number | string;

  max_guests?: number | string;
  travelers?: number | string;

  status?: string;

  cover_image?: string;
  coverImage?: string;
  image?: string;
  image_url?: string;
  images?: unknown;
};

type ResponseObject = Record<string, unknown>;

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as ResponseObject;

  const possibleKeys = [
    "data",
    "items",
    "results",
    "experiences",
    "trips",
    "packages",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(objectPayload[key])) {
      return objectPayload[key] as T[];
    }
  }

  return [];
};

const normalizeStatus = (status?: string) =>
  String(status || "Pending").trim().toLowerCase();

const getTripTitle = (trip: TripItem) =>
  trip.title ||
  trip.trip_name ||
  trip.package_name ||
  trip.name ||
  `Trip package #${trip.id}`;

const getTripDestination = (trip: TripItem) => {
  const parts = [trip.city, trip.country].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return trip.destination || trip.location || "Destination not added";
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTripPrice = (trip: TripItem) =>
  toNumber(trip.package_price ?? trip.adult_price ?? trip.price);

const getTripDays = (trip: TripItem) =>
  toNumber(trip.package_days ?? trip.days);

const getTripNights = (trip: TripItem) =>
  toNumber(trip.package_nights ?? trip.nights);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://stay.dovail.com${value}`;
  }

  return `https://stay.dovail.com/${value}`;
};

const getImageFromUnknownValue = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    try {
      return getImageFromUnknownValue(JSON.parse(value));
    } catch {
      return normalizeImageUrl(value);
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = getImageFromUnknownValue(item);

      if (result) {
        return result;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const imageObject = value as Record<string, unknown>;

    const fields = [
      "url",
      "image_url",
      "imageUrl",
      "image",
      "path",
      "file_url",
    ];

    for (const field of fields) {
      const imageValue = imageObject[field];

      if (typeof imageValue === "string" && imageValue.trim()) {
        return normalizeImageUrl(imageValue);
      }
    }
  }

  return "";
};

const getTripImage = (trip: TripItem) => {
  const directImage =
    trip.cover_image ||
    trip.coverImage ||
    trip.image ||
    trip.image_url;

  if (directImage) {
    return normalizeImageUrl(directImage);
  }

  return getImageFromUnknownValue(trip.images) || FALLBACK_IMAGE;
};

const getStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === "active" || normalized === "published") {
    return {
      label: "Active",
      backgroundColor: "#e8f6ee",
      textColor: "#177a45",
    };
  }

  if (normalized === "pending") {
    return {
      label: "Pending",
      backgroundColor: "#fff4dc",
      textColor: "#a96300",
    };
  }

  if (normalized === "rejected") {
    return {
      label: "Rejected",
      backgroundColor: "#fdecec",
      textColor: "#bd3434",
    };
  }

  if (normalized === "suspended") {
    return {
      label: "Suspended",
      backgroundColor: "#fceeee",
      textColor: "#a93737",
    };
  }

  if (normalized === "draft") {
    return {
      label: "Draft",
      backgroundColor: "#eef1f5",
      textColor: "#626d7d",
    };
  }

  return {
    label: status || "Pending",
    backgroundColor: "#eef1f5",
    textColor: MUTED,
  };
};

export default function HostTripsScreen() {
  const router = useRouter();

  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadTrips = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const storedUser = (await getStoredUser()) as StoredUser | null;
      const hostId = storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setTrips([]);
        setError("Please sign in again to manage your trip packages.");
        return;
      }

      const response = await api.get("/experiences");
      const allTrips = getArrayFromResponse<TripItem>(response.data);

      const ownTrips = allTrips.filter((trip) => {
        const tripHostId = trip.host_id ?? trip.user_id;
        return String(tripHostId) === String(hostId);
      });

      setTrips(ownTrips);
    } catch (requestError) {
      console.error("Load host trips error:", requestError);

      setTrips([]);
      setError(
        "We could not load your trip packages. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips(true);
    }, [loadTrips])
  );

  const summary = useMemo(() => {
    return trips.reduce(
      (result, trip) => {
        const status = normalizeStatus(trip.status);

        result.total += 1;

        if (status === "active" || status === "published") {
          result.active += 1;
        } else if (status === "pending") {
          result.pending += 1;
        } else if (status === "rejected") {
          result.rejected += 1;
        } else if (status === "suspended") {
          result.suspended += 1;
        }

        return result;
      },
      {
        total: 0,
        active: 0,
        pending: 0,
        rejected: 0,
        suspended: 0,
      }
    );
  }, [trips]);

  const refreshTrips = () => {
    setRefreshing(true);
    loadTrips(false);
  };

  const openCreateTrip = () => {
    router.push("/host/trip/create");
  };

  const openTripPreview = (trip: TripItem) => {
    const status = normalizeStatus(trip.status);

    if (status !== "active" && status !== "published") {
      Alert.alert(
        "Preview unavailable",
        "This trip will be publicly visible after it is approved and activated."
      );
      return;
    }

    router.push({
      pathname: "/trip/[id]",
      params: {
        id: String(trip.id),
      },
    });
  };

  const openEditTrip = (trip: TripItem) => {
    router.push({
      pathname: "/host/trip/edit/[id]",
      params: {
        id: String(trip.id),
      },
    });
  };

  const deleteTrip = async (trip: TripItem) => {
    const tripId = String(trip.id);

    try {
      setDeletingId(tripId);

      await api.delete(`/experiences/${trip.id}`);

      setTrips((currentTrips) =>
        currentTrips.filter((item) => String(item.id) !== tripId)
      );

      Alert.alert(
        "Trip deleted",
        "Your trip package has been deleted successfully."
      );
    } catch (requestError: any) {
      console.error("Delete trip error:", requestError);

      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        "We could not delete this trip package. Please try again.";

      Alert.alert("Unable to delete trip", message);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteTrip = (trip: TripItem) => {
    Alert.alert(
      "Delete trip package?",
      `Are you sure you want to delete “${getTripTitle(
        trip
      )}”? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTrip(trip),
        },
      ]
    );
  };

  const renderTrip = ({ item }: { item: TripItem }) => {
    const statusTheme = getStatusTheme(item.status);
    const deleting = deletingId === String(item.id);

    const days = getTripDays(item);
    const nights = getTripNights(item);

    return (
      <View style={styles.tripCard}>
        <Image
          source={{ uri: getTripImage(item) }}
          style={styles.tripImage}
          resizeMode="cover"
        />

        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <View style={styles.tripTitleArea}>
              <Text style={styles.tripTitle} numberOfLines={2}>
                {getTripTitle(item)}
              </Text>

              <Text style={styles.tripDestination} numberOfLines={1}>
                {getTripDestination(item)}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusTheme.backgroundColor,
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

          <View style={styles.tripMetaRow}>
            <View style={styles.metaItem}>
              <FileText size={15} color={MUTED} strokeWidth={1.8} />
              <Text style={styles.metaText}>
                {days || 1} {days === 1 ? "day" : "days"}
                {nights > 0
                  ? ` · ${nights} ${nights === 1 ? "night" : "nights"}`
                  : ""}
              </Text>
            </View>

            {toNumber(item.max_guests ?? item.travelers) > 0 ? (
              <View style={styles.metaItem}>
                <User size={15} color={MUTED} strokeWidth={1.8} />
                <Text style={styles.metaText}>
                  Up to {toNumber(item.max_guests ?? item.travelers)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(getTripPrice(item))}
            </Text>
            <Text style={styles.priceSuffix}> / person</Text>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openTripPreview(item)}
              style={({ pressed }) => [
                styles.outlineButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.outlineButtonText}>Preview</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => openEditTrip(item)}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={deleting}
              onPress={() => confirmDeleteTrip(item)}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.buttonPressed,
                deleting && styles.disabledButton,
              ]}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={DANGER} />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
            <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Your trips</Text>
            <Text style={styles.headerSubtitle}>
              Manage your trip packages
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a new trip"
            onPress={openCreateTrip}
            style={({ pressed }) => [
              styles.headerAddButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Plus size={21} color="#ffffff" strokeWidth={2.3} />
          </Pressable>
        </View>

        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrip}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            trips.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshTrips}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.summaryCard}>
                <SummaryItem
                  value={summary.total}
                  label="Total"
                  icon={
                    <Building2 size={19} color={THEME} strokeWidth={1.9} />
                  }
                />

                <View style={styles.summaryDivider} />

                <SummaryItem
                  value={summary.active}
                  label="Active"
                  icon={
                    <Building2
                      size={19}
                      color="#177a45"
                      strokeWidth={1.9}
                    />
                  }
                />

                <View style={styles.summaryDivider} />

                <SummaryItem
                  value={summary.pending}
                  label="Pending"
                  icon={
                    <FileText
                      size={19}
                      color="#a96300"
                      strokeWidth={1.9}
                    />
                  }
                />
              </View>

              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => loadTrips(true)}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </Pressable>
                </View>
              ) : null}

              {trips.length > 0 ? (
                <View style={styles.listHeadingRow}>
                  <Text style={styles.listHeading}>Trip packages</Text>
                  <Text style={styles.listCount}>
                    {trips.length} {trips.length === 1 ? "trip" : "trips"}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Building2 size={30} color={THEME} strokeWidth={1.8} />
                </View>

                <Text style={styles.emptyTitle}>Create your first trip</Text>

                <Text style={styles.emptyText}>
                  Add your destination, itinerary, pricing, departures and
                  package details to start receiving trip reservations.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateTrip}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Plus size={19} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.createButtonText}>Create a trip</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

type SummaryItemProps = {
  value: number;
  label: string;
  icon: React.ReactNode;
};

function SummaryItem({ value, label, icon }: SummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryIcon}>{icon}</View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
  headerAddButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: THEME,
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 17,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#f2f6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 3,
  },
  summaryDivider: {
    width: 1,
    height: 55,
    backgroundColor: BORDER,
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
  tripCard: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  tripImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#e9ebee",
  },
  tripContent: {
    padding: 15,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tripTitleArea: {
    flex: 1,
    paddingRight: 10,
  },
  tripTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    lineHeight: 23,
  },
  tripDestination: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 5,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  tripMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
    marginTop: 13,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 13,
  },
  price: {
    color: TEXT,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  priceSuffix: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  outlineButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  deleteButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#ebcaca",
    backgroundColor: "#fffafa",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: DANGER,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  emptyState: {
    flex: 1,
    minHeight: 420,
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
    fontSize: 21,
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
  createButton: {
    minHeight: 50,
    borderRadius: 13,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
    marginTop: 22,
  },
  createButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
