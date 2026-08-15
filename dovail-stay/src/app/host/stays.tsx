import { useFocusEffect, useRouter } from "expo-router";
import {
  Building2,
  ChevronLeft,
  FileText,
  Home,
  Plus,
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
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type StayItem = {
  id: number | string;
  title?: string;
  property_name?: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  location?: string;
  status?: string;
  price?: number | string;
  weekday_price?: number | string;
  weekend_price?: number | string;
  cover_image?: string;
  coverImage?: string;
  image?: string;
  image_url?: string;
  images?: unknown;
  created_at?: string;
};

type ApiObject = Record<string, unknown>;

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as ApiObject;

  const possibleKeys = [
    "data",
    "items",
    "results",
    "properties",
    "stays",
    "listings",
  ];

  for (const key of possibleKeys) {
    const value = response[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const getStayTitle = (stay: StayItem) =>
  stay.title ||
  stay.property_name ||
  stay.name ||
  `Stay listing #${stay.id}`;

const getStayLocation = (stay: StayItem) => {
  const parts = [stay.city, stay.state, stay.country].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return stay.location || "Location not added";
};

const getStayPrice = (stay: StayItem) => {
  const value =
    stay.weekday_price ?? stay.price ?? stay.weekend_price ?? 0;

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return amount;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const normalizeImageUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://stay.dovail.com${value}`;
  }

  return `https://stay.dovail.com/${value}`;
};

const findImageFromUnknownValue = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return findImageFromUnknownValue(parsed);
    } catch {
      return normalizeImageUrl(value);
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "";
    }

    return findImageFromUnknownValue(value[0]);
  }

  if (typeof value === "object") {
    const imageObject = value as Record<string, unknown>;

    const possibleFields = [
      "url",
      "image_url",
      "imageUrl",
      "image",
      "path",
      "file_url",
    ];

    for (const field of possibleFields) {
      const imageValue = imageObject[field];

      if (typeof imageValue === "string" && imageValue.trim()) {
        return normalizeImageUrl(imageValue);
      }
    }
  }

  return "";
};

const getStayImage = (stay: StayItem) => {
  const directImage =
    stay.cover_image ||
    stay.coverImage ||
    stay.image ||
    stay.image_url;

  if (directImage) {
    return normalizeImageUrl(directImage);
  }

  const imageFromArray = findImageFromUnknownValue(stay.images);

  return imageFromArray || FALLBACK_IMAGE;
};

const normalizeStatus = (status?: string) =>
  String(status || "Pending").trim().toLowerCase();

const getStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (normalized === "published" || normalized === "active") {
    return {
      label: "Published",
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

export default function HostStaysScreen() {
  const router = useRouter();

  const [stays, setStays] = useState<StayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadStays = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError("");

      const storedUser = (await getStoredUser()) as StoredUser | null;
      const hostId = storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setStays([]);
        setError("Please sign in again to manage your stay listings.");
        return;
      }

      const response = await api.get(`/my-properties/${hostId}`);
      const hostStays = getArrayFromResponse<StayItem>(response.data);

      setStays(hostStays);
    } catch (requestError) {
      console.error("Load host stays error:", requestError);

      setStays([]);
      setError(
        "We could not load your stay listings. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStays(true);
    }, [loadStays])
  );

  const summary = useMemo(() => {
    return stays.reduce(
      (result, stay) => {
        const status = normalizeStatus(stay.status);

        result.total += 1;

        if (status === "published" || status === "active") {
          result.published += 1;
        } else if (status === "pending") {
          result.pending += 1;
        } else if (status === "rejected") {
          result.rejected += 1;
        }

        return result;
      },
      {
        total: 0,
        published: 0,
        pending: 0,
        rejected: 0,
      }
    );
  }, [stays]);

  const refreshStays = () => {
    setRefreshing(true);
    loadStays(false);
  };

  const openCreateStay = () => {
    router.push("/host/stay/create");
  };

  const openStayPreview = (stay: StayItem) => {
    const status = normalizeStatus(stay.status);

    if (status !== "published" && status !== "active") {
      Alert.alert(
        "Preview unavailable",
        "This stay will be publicly visible after it is approved and published."
      );
      return;
    }

    router.push({
      pathname: "/property/[id]",
      params: {
        id: String(stay.id),
      },
    });
  };

  const openEditStay = (stay: StayItem) => {
    router.push({
      pathname: "/host/stay/edit/[id]",
      params: {
        id: String(stay.id),
      },
    });
  };

  const deleteStay = async (stay: StayItem) => {
    const stayId = String(stay.id);

    try {
      setDeletingId(stayId);

      await api.delete(`/properties/${stay.id}`);

      setStays((currentStays) =>
        currentStays.filter((item) => String(item.id) !== stayId)
      );

      Alert.alert(
        "Listing deleted",
        "Your stay listing has been deleted successfully."
      );
    } catch (requestError: any) {
      console.error("Delete stay error:", requestError);

      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        "We could not delete this listing. Please try again.";

      Alert.alert("Unable to delete listing", message);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteStay = (stay: StayItem) => {
    Alert.alert(
      "Delete stay listing?",
      `Are you sure you want to delete “${getStayTitle(
        stay
      )}”? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteStay(stay),
        },
      ]
    );
  };

  const renderStay = ({ item }: { item: StayItem }) => {
    const statusTheme = getStatusTheme(item.status);
    const stayId = String(item.id);
    const deleting = deletingId === stayId;

    return (
      <View style={styles.stayCard}>
        <Image
          source={{ uri: getStayImage(item) }}
          style={styles.stayImage}
          resizeMode="cover"
        />

        <View style={styles.stayContent}>
          <View style={styles.stayHeaderRow}>
            <View style={styles.stayTitleContainer}>
              <Text style={styles.stayTitle} numberOfLines={2}>
                {getStayTitle(item)}
              </Text>

              <Text style={styles.stayLocation} numberOfLines={1}>
                {getStayLocation(item)}
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

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(getStayPrice(item))}
            </Text>
            <Text style={styles.priceSuffix}> / night</Text>
          </View>

          <View style={styles.cardActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preview ${getStayTitle(item)}`}
              onPress={() => openStayPreview(item)}
              style={({ pressed }) => [
                styles.outlineButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.outlineButtonText}>Preview</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${getStayTitle(item)}`}
              onPress={() => openEditStay(item)}
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${getStayTitle(item)}`}
              disabled={deleting}
              onPress={() => confirmDeleteStay(item)}
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
          <Text style={styles.loadingText}>Loading your stays...</Text>
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
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Your stays</Text>
            <Text style={styles.headerSubtitle}>
              Manage your stay listings
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new stay"
            onPress={openCreateStay}
            style={({ pressed }) => [
              styles.headerAddButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Plus size={21} color="#ffffff" strokeWidth={2.3} />
          </Pressable>
        </View>

        <FlatList
          data={stays}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStay}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            stays.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshStays}
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
                    <Home size={19} color={THEME} strokeWidth={1.9} />
                  }
                />

                <View style={styles.summaryDivider} />

                <SummaryItem
                  value={summary.published}
                  label="Published"
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
                    onPress={() => loadStays(true)}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </Pressable>
                </View>
              ) : null}

              {stays.length > 0 ? (
                <View style={styles.listHeadingRow}>
                  <Text style={styles.listHeading}>Listings</Text>
                  <Text style={styles.listCount}>
                    {stays.length} {stays.length === 1 ? "stay" : "stays"}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Home size={30} color={THEME} strokeWidth={1.8} />
                </View>

                <Text style={styles.emptyTitle}>Create your first stay</Text>

                <Text style={styles.emptyText}>
                  Add your property details, photos, pricing and amenities to
                  start receiving reservations.
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateStay}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Plus size={19} color="#ffffff" strokeWidth={2.2} />
                  <Text style={styles.createButtonText}>Create a stay</Text>
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
  stayCard: {
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  stayImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#e9ebee",
  },
  stayContent: {
    padding: 15,
  },
  stayHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stayTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  stayTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    lineHeight: 23,
  },
  stayLocation: {
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