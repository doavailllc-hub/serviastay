import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import api from "../api/api";
import {
  Heart,
  Search,
  SlidersHorizontal,
  Star,
  Home,
  Building2,
  Waves,
  Tent,
  Mountain,
} from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";

const THEME = "#3b71e6";

const categories = [
  { name: "Homes", icon: Home },
  { name: "Apartments", icon: Building2 },
  { name: "Beach", icon: Waves },
  { name: "Camping", icon: Tent },
  { name: "Views", icon: Mountain },
];

export default function HomeScreen() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Homes");

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const res = await api.get("/api/properties");
      setProperties(res.data || []);
    } catch (err) {
      console.log("Property load error", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={THEME} />
        <Text style={styles.loadingText}>Loading Dovail Stay...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.logo}>Dovail Stay</Text>
          <Text style={styles.logoSub}>Find your perfect stay</Text>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Search size={22} color="#111" />
          <View style={styles.searchTextBox}>
            <Text style={styles.searchTitle}>Where to?</Text>
            <TextInput
              placeholder="Anywhere • Any week • Add guests"
              placeholderTextColor="#777"
              style={styles.searchInput}
            />
          </View>
        </View>

        <Pressable style={styles.filterButton}>
          <SlidersHorizontal size={20} color="#111" />
        </Pressable>
      </View>

      <View style={styles.categoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.name;

            return (
              <Pressable
                key={cat.name}
                onPress={() => setActiveCategory(cat.name)}
                style={styles.categoryItem}
              >
                <Icon size={22} color={active ? THEME : "#777"} />
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
                {active && <View style={styles.activeLine} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No stays found</Text>
            <Text style={styles.emptyText}>Add properties from your web admin.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/property/${item.id}`)}
          >
            <View>
              <Image
                source={{
                  uri:
                    item.image ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200",
                }}
                style={styles.image}
              />

              <Pressable style={styles.heart}>
                <Heart size={24} color="#fff" fill="rgba(0,0,0,0.35)" />
              </Pressable>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.category || "Guest favorite"}
                </Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <Text numberOfLines={1} style={styles.title}>
                  {item.title || "Beautiful stay"}
                </Text>

                <View style={styles.rating}>
                  <Star size={14} color="#111" fill="#111" />
                  <Text style={styles.ratingText}>{item.rating || "4.8"}</Text>
                </View>
              </View>

              <Text numberOfLines={1} style={styles.location}>
                {item.location || "Location not added"}
              </Text>

              <Text style={styles.date}>
                {item.guests || 1} guests · {item.bedrooms || 1} bedrooms ·{" "}
                {item.bathrooms || 1} baths
              </Text>

              <Text style={styles.price}>
                <Text style={styles.priceBold}>₹{item.price || 0}</Text> night
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },

  logo: {
    fontSize: 27,
    fontWeight: "900",
    color: THEME,
    letterSpacing: -0.6,
  },

  logoSub: {
    marginTop: 2,
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },

  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  searchBox: {
    flex: 1,
    minHeight: 58,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 5,
  },

  searchTextBox: {
    flex: 1,
  },

  searchTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
  },

  searchInput: {
    fontSize: 12,
    color: "#555",
    padding: 0,
    marginTop: 1,
  },

  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  categoryWrap: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },

  categoryItem: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },

  categoryText: {
    marginTop: 5,
    fontSize: 12,
    color: "#777",
    fontWeight: "700",
  },

  categoryTextActive: {
    color: THEME,
    fontWeight: "900",
  },

  activeLine: {
    marginTop: 7,
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: THEME,
  },

  list: { padding: 20, paddingBottom: 110 },
  card: { marginBottom: 30 },

  image: {
    width: "100%",
    height: 285,
    borderRadius: 24,
    backgroundColor: "#eee",
  },

  heart: {
    position: "absolute",
    right: 16,
    top: 16,
  },

  badge: {
    position: "absolute",
    left: 14,
    top: 14,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
  },

  cardBody: { paddingTop: 12 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },

  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    color: "#111",
    fontWeight: "700",
  },

  location: {
    marginTop: 4,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  date: {
    marginTop: 3,
    fontSize: 14,
    color: "#666",
  },

  price: {
    marginTop: 7,
    fontSize: 15,
    color: "#111",
  },

  priceBold: {
    fontWeight: "900",
  },

  emptyBox: {
    paddingVertical: 80,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
});