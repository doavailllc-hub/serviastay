import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  Heart,
  MapPin,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../api/api";
import { getStoredUser } from "../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const SURFACE = "#f8fafc";
const WHITE = "#ffffff";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

type WishlistItem = {
  id: number | string;
  wishlist_id?: number | string;
  property_id?: number | string;
  title?: string;
  location?: string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  thumbnail?: string;
  price?: number | string;
  rating?: number | string;
  guests?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  item_type?: "stay" | "trip";
  package_days?: number | string;
};

function getPropertyId(item: WishlistItem) {
  return String(item.property_id || item.id);
}

function getImage(item: WishlistItem) {
  return (
    item.image ||
    item.cover_image ||
    item.image_url ||
    item.thumbnail ||
    FALLBACK_IMAGE
  );
}

export default function WishlistScreen() {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadWishlist = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadFailed(false);

      const stored = await getStoredUser();

      if (!stored) {
        setUser(null);
        setItems([]);
        return;
      }

      setUser(stored);

      const [staysResponse, tripsResponse] = await Promise.all([
        api.get(`/wishlist/${stored.id}`),
        api.get("/trip-wishlist"),
      ]);
      const stays = Array.isArray(staysResponse.data) ? staysResponse.data : [];
      const trips = Array.isArray(tripsResponse.data) ? tripsResponse.data : [];
      setItems([
        ...stays.map((item) => ({ ...item, item_type: "stay" as const })),
        ...trips.map((item) => ({ ...item, item_type: "trip" as const })),
      ]);
    } catch (error: any) {
      console.log("Wishlist load error:", error?.message || error);

      setItems([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [loadWishlist])
  );

  const removeWishlistItem = async (item: WishlistItem) => {
    const wishlistId = item.wishlist_id;
    const propertyId = getPropertyId(item);

    Alert.alert(
      `Remove saved ${item.item_type === "trip" ? "trip" : "stay"}?`,
      "This item will be removed from your wishlist.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingId(propertyId);

              if (!wishlistId) {
                throw new Error("Wishlist details are missing.");
              }
              await api.delete(item.item_type === "trip" ? `/trip-wishlist/${wishlistId}` : `/wishlist/${wishlistId}`);

              setItems((current) =>
                current.filter(
                  (entry) => getPropertyId(entry) !== propertyId
                )
              );
            } catch (error: any) {
              console.log("Remove wishlist error:", error);

              Alert.alert(
                "Could not remove",
                error?.response?.data?.message ||
                  "Please try again."
              );
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const propertyId = getPropertyId(item);
    const removing = removingId === propertyId;

    const rating =
      Number(item.rating || 0) > 0
        ? Number(item.rating).toFixed(1)
        : "New";

    const price = Number(item.price || 0);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(item.item_type === "trip" ? `/experience/${propertyId}` : `/property/${propertyId}`)}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: getImage(item) }}
            style={styles.image}
            resizeMode="cover"
          />

          <Pressable
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.removeButtonPressed,
            ]}
            onPress={(event) => {
              event.stopPropagation();
              removeWishlistItem(item);
            }}
            disabled={removing}
          >
            {removing ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Trash2
                size={18}
                color="#dc2626"
                strokeWidth={2}
              />
            )}
          </Pressable>

          <View style={styles.savedBadge}>
            <Heart
              size={14}
              color={THEME}
              fill={THEME}
              strokeWidth={2}
            />

            <Text style={styles.savedBadgeText}>Saved</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {item.title || "Dovail Stay"}
            </Text>

            <View style={styles.rating}>
              <Star
                size={13}
                color="#717171"
                fill={rating === "New" ? "transparent" : "#717171"}
              />

              <Text style={styles.ratingText}>{rating}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color="#717171" />

            <Text numberOfLines={1} style={styles.location}>
              {item.location || "Location not specified"}
            </Text>
          </View>

          {item.item_type === "trip" && item.package_days ? (
            <Text numberOfLines={1} style={styles.details}>{Number(item.package_days)} day trip package</Text>
          ) : (item.guests || item.bedrooms || item.bathrooms) && (
            <Text numberOfLines={1} style={styles.details}>
              {Number(item.guests || 1)} guests ·{" "}
              {Number(item.bedrooms || 1)} bedroom
              {Number(item.bedrooms || 1) === 1 ? "" : "s"} ·{" "}
              {Number(item.bathrooms || 1)} bath
              {Number(item.bathrooms || 1) === 1 ? "" : "s"}
            </Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{price.toLocaleString("en-IN")}
            </Text>

            <Text style={styles.priceSuffix}>{item.item_type === "trip" ? " / person" : " / night"}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <WishlistSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredPage}>
          <View style={styles.emptyIcon}>
            <Heart size={29} color={THEME} strokeWidth={2} />
          </View>

          <Text style={styles.emptyTitle}>
            Save your favourite stays
          </Text>

          <Text style={styles.emptyText}>
            Log in to save properties, compare places and find
            them again later.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/")}
          >
            <Text style={styles.secondaryButtonText}>
              Continue exploring
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={(item) =>
          `${item.item_type || "stay"}-${item.wishlist_id || getPropertyId(item)}`
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          items.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWishlist(true)}
            tintColor={THEME}
            colors={[THEME]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Wishlist</Text>

            <Text style={styles.subtitle}>
              {items.length === 0
                ? "Saved stays and trips will appear here."
                : `${items.length} saved ${items.length === 1 ? "item" : "items"}`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {loadFailed ? (
                <RefreshCw size={28} color={THEME} />
              ) : (
                <Heart size={28} color={THEME} />
              )}
            </View>

            <Text style={styles.emptyTitle}>
              {loadFailed
                ? "Could not load wishlist"
                : "No saved stays or trips yet"}
            </Text>

            <Text style={styles.emptyText}>
              {loadFailed
                ? "Check your connection and try loading again."
                : "Tap the heart on a stay or trip to save it here."}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={
                loadFailed
                  ? () => loadWishlist()
                  : () => router.push("/")
              }
            >
              <Text style={styles.primaryButtonText}>
                {loadFailed ? "Try again" : "Explore stays"}
              </Text>
            </Pressable>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function WishlistSkeleton() {
  return (
    <View style={styles.skeletonList}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonHeaderTitle} />
        <View style={styles.skeletonHeaderSubtitle} />
      </View>

      {[1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonPrice} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },

  emptyList: {
    flexGrow: 1,
  },

  header: {
    paddingTop: 14,
    paddingBottom: 18,
  },

  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: TEXT,
  },

  subtitle: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  card: {
    marginBottom: 24,
    backgroundColor: WHITE,
  },

  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },

  imageWrap: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#f1f3f4",
  },

  image: {
    width: "100%",
    height: 235,
    backgroundColor: "#f1f3f4",
  },

  removeButton: {
    position: "absolute",
    top: 13,
    right: 13,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  removeButtonPressed: {
    transform: [{ scale: 0.92 }],
  },

  savedBadge: {
    position: "absolute",
    left: 13,
    top: 13,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  savedBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: THEME,
  },

  cardBody: {
    paddingTop: 13,
    paddingHorizontal: 2,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  cardTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: TEXT,
  },

  rating: {
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#717171",
  },

  locationRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  details: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#80868b",
  },

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
  },

  price: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  priceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  centeredPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 60,
  },

  emptyState: {
    flex: 1,
    minHeight: 380,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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

  primaryButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  secondaryButton: {
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
  },

  skeletonList: {
    flex: 1,
    paddingHorizontal: 18,
  },

  skeletonHeader: {
    height: 88,
    paddingTop: 14,
  },

  skeletonHeaderTitle: {
    width: 112,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonHeaderSubtitle: {
    width: 190,
    height: 13,
    marginTop: 8,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonCard: {
    marginBottom: 24,
  },

  skeletonImage: {
    width: "100%",
    height: 235,
    borderRadius: 24,
    backgroundColor: "#eceff1",
  },

  skeletonTitle: {
    marginTop: 14,
    width: "68%",
    height: 17,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonLine: {
    marginTop: 9,
    width: "48%",
    height: 13,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonPrice: {
    marginTop: 10,
    width: "34%",
    height: 15,
    borderRadius: 7,
    backgroundColor: "#eceff1",
  },
});
