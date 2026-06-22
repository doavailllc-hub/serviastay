import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function CheckoutScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Confirm and pay</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Your trip</Text>

        <View style={styles.box}>
          <Text style={styles.label}>Dates</Text>
          <Text style={styles.value}>Today - Tomorrow</Text>
        </View>

        <View style={styles.box}>
          <Text style={styles.label}>Guests</Text>
          <Text style={styles.value}>1 guest</Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Price details</Text>
          <View style={styles.row}>
            <Text style={styles.normal}>$62 x 1 night</Text>
            <Text style={styles.normal}>$62</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.normal}>Service fee</Text>
            <Text style={styles.normal}>$8</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>$70</Text>
          </View>
        </View>

        <Pressable style={styles.button} onPress={() => router.push("/trips")}>
          <Text style={styles.buttonText}>Confirm booking</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  content: { padding: 22 },
  title: { fontSize: 25, fontWeight: "900", color: "#111", marginBottom: 20 },
  box: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: "#555", fontWeight: "800" },
  value: { marginTop: 4, fontSize: 16, color: "#111", fontWeight: "700" },
  summary: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 18,
    padding: 18,
  },
  summaryTitle: { fontSize: 18, fontWeight: "900", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  normal: { fontSize: 15, color: "#333" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  total: { fontSize: 17, fontWeight: "900", color: "#111" },
  button: {
    marginTop: 24,
    backgroundColor: "#FF385C",
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
});