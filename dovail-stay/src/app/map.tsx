import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Crosshair, List, MapPin, Star } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

import api from "../api/api";

const THEME = "#3b71e6";
const TEXT = "#172033";
const MUTED = "#687386";
const BORDER = "#e5e7eb";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

const DEFAULT_REGION: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 16,
  longitudeDelta: 16,
};

type PropertyItem = {
  id: number | string;
  title?: string;
  name?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number | string;
  longitude?: number | string;
  price?: number | string;
  weekday_price?: number | string;
  rating?: number | string;
  average_rating?: number | string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  thumbnail?: string;
};

const toNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getItems = (payload: unknown): PropertyItem[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["data", "items", "results", "properties", "stays"]) {
    if (Array.isArray(record[key])) return record[key] as PropertyItem[];
  }
  return [];
};

const coordinatesFor = (item: PropertyItem) => {
  const latitude = toNumber(item.latitude);
  const longitude = toNumber(item.longitude);
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
};

const normalizeImage = (value?: string) => {
  if (!value) return FALLBACK_IMAGE;
  if (/^https?:\/\//.test(value)) return value;
  return `https://stay.dovail.com${value.startsWith("/") ? "" : "/"}${value}`;
};

const propertyImage = (item: PropertyItem) =>
  normalizeImage(item.cover_image || item.image || item.image_url || item.thumbnail);

const propertyLocation = (item: PropertyItem) =>
  [item.city, item.state, item.country].filter(Boolean).join(", ") ||
  item.location ||
  "Location unavailable";

export default function PropertyMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string }>();
  const mapRef = useRef<MapView>(null);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/properties");
      setProperties(getItems(response.data));
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ||
          "We could not load stays on the map."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  const mappedProperties = useMemo(
    () => properties.filter((item) => coordinatesFor(item)),
    [properties]
  );

  const selected = properties.find((item) => String(item.id) === selectedId);

  const initialRegion = useMemo<Region>(() => {
    const first = mappedProperties[0] && coordinatesFor(mappedProperties[0]);
    return first
      ? { ...first, latitudeDelta: 0.3, longitudeDelta: 0.3 }
      : DEFAULT_REGION;
  }, [mappedProperties]);

  const centerOnUser = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Location permission", "Allow location access to center the map on your position.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        450
      );
    } catch {
      Alert.alert("Location unavailable", "We could not determine your current location.");
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} accessibilityLabel="Go back" onPress={() => router.back()}>
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Map</Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {params.destination || `${mappedProperties.length} mapped stays`}
          </Text>
        </View>
        <Pressable style={styles.iconButton} accessibilityLabel="Show property list" onPress={() => router.back()}>
          <List size={22} color={TEXT} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={THEME} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadProperties}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>
      ) : Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.webList}>
          <Text style={styles.webNotice}>Interactive maps are available in the Android and iOS app.</Text>
          {properties.map((item) => (
            <PropertyCard key={String(item.id)} item={item} onPress={() => router.push({ pathname: "/property/[id]", params: { id: String(item.id) } })} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {mappedProperties.map((item) => {
              const coordinates = coordinatesFor(item)!;
              const selectedMarker = selectedId === String(item.id);
              return (
                <Marker key={String(item.id)} coordinate={coordinates} onPress={() => setSelectedId(String(item.id))}>
                  <View style={[styles.marker, selectedMarker && styles.selectedMarker]}>
                    <Text style={[styles.markerText, selectedMarker && styles.selectedMarkerText]}>
                      ₹{Math.round(toNumber(item.weekday_price ?? item.price) / 100) / 10}k
                    </Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          <Pressable style={styles.locationButton} onPress={centerOnUser} disabled={locating}>
            {locating ? <ActivityIndicator color={THEME} /> : <Crosshair size={22} color={THEME} />}
          </Pressable>

          {mappedProperties.length === 0 ? (
            <View style={styles.noCoordinates}>
              <MapPin size={22} color={THEME} />
              <Text style={styles.noCoordinatesText}>These listings do not have valid coordinates yet.</Text>
            </View>
          ) : null}

          {selected ? (
            <View style={styles.selectedCard}>
              <PropertyCard item={selected} onPress={() => router.push({ pathname: "/property/[id]", params: { id: String(selected.id) } })} />
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

function PropertyCard({ item, onPress }: { item: PropertyItem; onPress: () => void }) {
  const rating = toNumber(item.average_rating ?? item.rating);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: propertyImage(item) }} style={styles.image} />
      <View style={styles.cardContent}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title || item.name || "Dovail Stay"}</Text>
        <Text numberOfLines={1} style={styles.cardLocation}>{propertyLocation(item)}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>₹{toNumber(item.weekday_price ?? item.price).toLocaleString("en-IN")} <Text style={styles.perNight}>/ night</Text></Text>
          {rating > 0 ? <View style={styles.rating}><Star size={13} color="#f59e0b" fill="#f59e0b" /><Text style={styles.ratingText}>{rating.toFixed(1)}</Text></View> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: { minHeight: 72, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: "#fff", zIndex: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: TEXT },
  subtitle: { maxWidth: 220, marginTop: 2, fontSize: 12, color: MUTED },
  center: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontSize: 20, fontWeight: "700", color: TEXT },
  errorText: { marginTop: 8, textAlign: "center", lineHeight: 21, color: MUTED },
  retryButton: { marginTop: 20, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, backgroundColor: THEME },
  retryText: { fontWeight: "700", color: "#fff" },
  mapWrap: { flex: 1 },
  marker: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: "#fff" },
  selectedMarker: { borderColor: THEME, backgroundColor: THEME },
  markerText: { fontSize: 12, fontWeight: "700", color: TEXT },
  selectedMarkerText: { color: "#fff" },
  locationButton: { position: "absolute", top: 18, right: 16, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 8, elevation: 4 },
  noCoordinates: { position: "absolute", top: 20, left: 16, right: 76, padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff" },
  noCoordinatesText: { flex: 1, fontSize: 13, lineHeight: 18, color: MUTED },
  selectedCard: { position: "absolute", left: 14, right: 14, bottom: 18 },
  card: { padding: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 20, backgroundColor: "#fff", flexDirection: "row", gap: 12, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  image: { width: 94, height: 94, borderRadius: 15, backgroundColor: "#eef0f3" },
  cardContent: { flex: 1, justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  cardLocation: { marginTop: 5, fontSize: 12, color: MUTED },
  cardFooter: { marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  price: { fontSize: 14, fontWeight: "700", color: TEXT },
  perNight: { fontSize: 11, fontWeight: "400", color: MUTED },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontWeight: "600", color: TEXT },
  webList: { padding: 18, gap: 13 },
  webNotice: { padding: 14, borderRadius: 14, textAlign: "center", color: MUTED, backgroundColor: "#edf3ff" },
});
