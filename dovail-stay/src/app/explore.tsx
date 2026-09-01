import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Heart, MapPin, Search, Star } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../api/api";
import { formatCurrency } from "../utils/currency";
import { getStoredUser } from "../services/authService";

const THEME = "#2DB281";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

type PropertyItem = {
  id: number | string;
  title?: string;
  name?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  thumbnail?: string;
  images?: unknown;
  price?: number | string;
  weekday_price?: number | string;
  weekend_price?: number | string;
  rating?: number | string;
  average_rating?: number | string;
  guests?: number | string;
  max_guests?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  category?: string;
  property_type?: string;
};

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

const firstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/")
    ? `https://stay.dovail.com${value}`
    : `https://stay.dovail.com/${value}`;
};

const imageFromUnknown = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") {
    try {
      return imageFromUnknown(JSON.parse(value));
    } catch {
      return normalizeImageUrl(value);
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = imageFromUnknown(entry);
      if (image) return image;
    }
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of ["url", "image_url", "imageUrl", "image", "path"]) {
      const image = record[key];

      if (typeof image === "string" && image.trim()) {
        return normalizeImageUrl(image);
      }
    }
  }

  return "";
};

const getImage = (item: PropertyItem) =>
  normalizeImageUrl(
    item.cover_image || item.image || item.image_url || item.thumbnail
  ) ||
  imageFromUnknown(item.images) ||
  FALLBACK_IMAGE;

const getTitle = (item: PropertyItem) =>
  item.title || item.name || "Beautiful stay";

const getLocation = (item: PropertyItem) => {
  const parts = [item.city, item.state, item.country].filter(Boolean);

  return parts.length ? parts.join(", ") : item.location || "Location not specified";
};

const getPrice = (item: PropertyItem) =>
  toNumber(item.weekday_price ?? item.price ?? item.weekend_price);

const getRating = (item: PropertyItem) =>
  toNumber(item.average_rating ?? item.rating);

const getGuestCapacity = (item: PropertyItem) =>
  toNumber(item.max_guests ?? item.guests ?? 1);

const getItems = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;

  for (const key of ["data", "items", "results", "properties", "stays"]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  return [];
};

const formatDateRange = (checkin: string, checkout: string) => {
  if (!checkin || !checkout) return "Any week";

  const start = new Date(checkin);
  const end = new Date(checkout);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Any week";
  }

  const formatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
};

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    destination?: string | string[];
    checkin?: string | string[];
    checkout?: string | string[];
    guests?: string | string[];
    minimumPrice?: string | string[];
    maximumPrice?: string | string[];
  }>();

  const destination = firstParam(params.destination).trim();
  const checkin = firstParam(params.checkin);
  const checkout = firstParam(params.checkout);
  const guests = Math.max(1, toNumber(firstParam(params.guests) || 1));
  const minimumPrice = toNumber(firstParam(params.minimumPrice));
  const maximumPrice = toNumber(firstParam(params.maximumPrice));

  const [items, setItems] = useState<PropertyItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadResults = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");

      const response = await api.get("/properties");
      setItems(getItems<PropertyItem>(response.data));
    } catch (requestError: any) {
      console.log("Explore load error:", requestError?.message || requestError);
      setItems([]);
      setError("We could not load stays. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const filteredItems = useMemo(() => {
    const destinationQuery = destination.toLowerCase();

    return items.filter((item) => {
      if (destinationQuery) {
        const searchableText = [
          item.title,
          item.name,
          item.location,
          item.city,
          item.state,
          item.country,
          item.category,
          item.property_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(destinationQuery)) return false;
      }

      const price = getPrice(item);

      if (minimumPrice > 0 && price < minimumPrice) return false;
      if (maximumPrice > 0 && price > maximumPrice) return false;
      if (guests > 1 && getGuestCapacity(item) < guests) return false;

      return true;
    });
  }, [destination, guests, items, maximumPrice, minimumPrice]);

  const toggleWishlist = async (item: PropertyItem) => {
    const itemId = String(item.id);

    if (savedIds.has(itemId)) {
      Alert.alert("Already saved", "This stay is already in your wishlist.");
      return;
    }

    try {
      const user = (await getStoredUser()) as StoredUser | null;
      const userId = user?.id ?? user?.user_id;

      if (!userId) {
        router.push("/login");
        return;
      }

      setSavingId(itemId);

      await api.post("/wishlist", {
        user_id: userId,
        property_id: item.id,
      });

      setSavedIds((current) => new Set(current).add(itemId));
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.message || "Could not save this stay.";

      if (String(message).toLowerCase().includes("already")) {
        setSavedIds((current) => new Set(current).add(itemId));
        return;
      }

      Alert.alert("Wishlist", message);
    } finally {
      setSavingId(null);
    }
  };

  const openMap = () => {
    router.push({
      pathname: "/map",
      params: {
        destination,
        checkin,
        checkout,
        guests: String(guests),
        minimumPrice: minimumPrice ? String(minimumPrice) : "",
        maximumPrice: maximumPrice ? String(maximumPrice) : "",
      },
    });
  };

  const renderItem = ({ item }: { item: PropertyItem }) => {
    const itemId = String(item.id);
    const saved = savedIds.has(itemId);
    const rating = getRating(item);

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/property/[id]",
            params: { id: itemId },
          })
        }
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri: getImage(item) }} style={styles.image} />

          <Pressable
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              toggleWishlist(item);
            }}
            style={({ pressed }) => [
              styles.heartButton,
              pressed && styles.heartButtonPressed,
            ]}
          >
            {savingId === itemId ? (
              <ActivityIndicator size="small" color={THEME} />
            ) : (
              <Heart
                size={20}
                color={saved ? THEME : TEXT}
                fill={saved ? THEME : "transparent"}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {getTitle(item)}
            </Text>

            <View style={styles.ratingRow}>
              <Star
                size={13}
                color="#717171"
                fill={rating > 0 ? "#717171" : "transparent"}
              />
              <Text style={styles.ratingText}>
                {rating > 0 ? rating.toFixed(1) : "New"}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#717171" />
            <Text numberOfLines={1} style={styles.locationText}>
              {getLocation(item)}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.detailsText}>
            {getGuestCapacity(item)} guests · {toNumber(item.bedrooms || 1)} bedroom
            {toNumber(item.bedrooms || 1) === 1 ? "" : "s"} ·{" "}
            {toNumber(item.bathrooms || 1)} bath
            {toNumber(item.bathrooms || 1) === 1 ? "" : "s"}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(getPrice(item))}</Text>
            <Text style={styles.priceSuffix}> / night</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const searchSubtitle = `${formatDateRange(checkin, checkout)} · ${
    guests > 1 ? `${guests} guests` : "Add guests"
  }`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.searchPill,
            pressed && styles.searchPillPressed,
          ]}
        >
          <Search size={20} color={TEXT} />

          <View style={styles.searchTextArea}>
            <Text numberOfLines={1} style={styles.searchTitle}>
              {destination || "Search and go"}
            </Text>

            <Text numberOfLines={1} style={styles.searchSubtitle}>
              {searchSubtitle}
            </Text>
          </View>
        </Pressable>
      </View>

      <FlatList
        data={loading ? [] : filteredItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadResults(true)}
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          !loading && filteredItems.length === 0 && styles.emptyList,
        ]}
        ListHeaderComponent={
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {filteredItems.length} {filteredItems.length === 1 ? "stay" : "stays"}
            </Text>
            <Text style={styles.resultsSubtitle}>
              Explore available stays matching your search.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" color={THEME} />
              <Text style={styles.stateText}>Finding stays...</Text>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.emptyTitle}>
                {error ? "Could not load stays" : "No matching stays"}
              </Text>

              <Text style={styles.emptyText}>
                {error ||
                  "Try another destination or adjust your guests and price range."}
              </Text>

              <Pressable
                style={styles.primaryButton}
                onPress={() => (error ? loadResults() : router.back())}
              >
                <Text style={styles.primaryButtonText}>
                  {error ? "Try again" : "Change search"}
                </Text>
              </Pressable>
            </View>
          )
        }
      />

      {!loading && !error && filteredItems.length > 0 ? (
        <Pressable
          onPress={openMap}
          style={({ pressed }) => [
            styles.mapButton,
            pressed && styles.mapButtonPressed,
          ]}
        >
          <MapPin size={18} color={WHITE} />
          <Text style={styles.mapButtonText}>Map</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },

  header: {
    minHeight: 76,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPressed: { backgroundColor: SURFACE },

  searchPill: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 28,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  searchPillPressed: { opacity: 0.84 },

  searchTextArea: { flex: 1, marginLeft: 12 },

  searchTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  searchSubtitle: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 118,
  },

  emptyList: { flexGrow: 1 },

  resultsHeader: { marginBottom: 16 },

  resultsTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  resultsSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  card: { marginBottom: 24, backgroundColor: WHITE },

  cardPressed: { opacity: 0.92 },

  imageWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },

  image: {
    width: "100%",
    height: 235,
    backgroundColor: "#f1f3f4",
  },

  heartButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  heartButtonPressed: { transform: [{ scale: 0.92 }] },

  cardBody: { paddingTop: 12, paddingHorizontal: 2 },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  cardTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#717171",
  },

  locationRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  locationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  detailsText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#80868b",
  },

  priceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },

  price: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  priceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  mapButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: 92,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: TEXT,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    elevation: 5,
  },

  mapButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.97 }],
  },

  mapButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  stateBox: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  stateText: {
    marginTop: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  emptyTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 20,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },
});
