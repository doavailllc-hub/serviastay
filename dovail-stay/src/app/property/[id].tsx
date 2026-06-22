import { router } from "expo-router";
import { ArrowLeft, CalendarDays, Heart, Star, Users } from "lucide-react-native";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PropertyDetailsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1200",
            }}
            style={styles.hero}
          />

          <Pressable style={styles.back} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#111" />
          </Pressable>

          <Pressable style={styles.like}>
            <Heart size={22} color="#111" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Luxury stay in Riyadh</Text>

          <View style={styles.metaRow}>
            <Star size={16} color="#111" fill="#111" />
            <Text style={styles.meta}>4.93 · 128 reviews · Riyadh, Saudi Arabia</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.hostTitle}>Hosted by Dovail Stay</Text>
          <Text style={styles.hostText}>
            Professional Airbnb-style stay with clean rooms, modern design,
            smooth booking, and premium guest support.
          </Text>

          <View style={styles.divider} />

          <View style={styles.selector}>
            <View style={styles.selectorItem}>
              <CalendarDays size={21} color="#111" />
              <View>
                <Text style={styles.selectorLabel}>Dates</Text>
                <Text style={styles.selectorValue}>Today - Tomorrow</Text>
              </View>
            </View>

            <View style={styles.selectorLine} />

            <View style={styles.selectorItem}>
              <Users size={21} color="#111" />
              <View>
                <Text style={styles.selectorLabel}>Guests</Text>
                <Text style={styles.selectorValue}>1 guest</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About this place</Text>
          <Text style={styles.description}>
            Beautiful property designed for comfort and travel. This mobile UI
            is built in React Native and can connect to your existing Node API.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.reserveBar}>
        <View>
          <Text style={styles.reservePrice}>$62 night</Text>
          <Text style={styles.reserveDate}>Today available</Text>
        </View>

        <Pressable
          style={styles.reserveButton}
          onPress={() => router.push("/booking/checkout")}
        >
          <Text style={styles.reserveText}>Reserve</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  hero: { width: "100%", height: 330, backgroundColor: "#eee" },
  back: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  like: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 22, paddingBottom: 120 },
  title: { fontSize: 25, fontWeight: "900", color: "#111" },
  metaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 14, color: "#111", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 22 },
  hostTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  hostText: { marginTop: 7, fontSize: 14, lineHeight: 21, color: "#555" },
  selector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    overflow: "hidden",
  },
  selectorItem: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    padding: 16,
  },
  selectorLine: { height: 1, backgroundColor: "#eee" },
  selectorLabel: { fontSize: 12, color: "#555", fontWeight: "800" },
  selectorValue: { marginTop: 3, fontSize: 15, color: "#111", fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  description: { marginTop: 8, fontSize: 15, lineHeight: 23, color: "#555" },
  reserveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    paddingBottom: 22,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reservePrice: { fontSize: 17, fontWeight: "900", color: "#111" },
  reserveDate: { marginTop: 3, fontSize: 13, color: "#555", textDecorationLine: "underline" },
  reserveButton: {
    backgroundColor: "#FF385C",
    paddingHorizontal: 34,
    paddingVertical: 15,
    borderRadius: 14,
  },
  reserveText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});