import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Compass } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Compass size={30} color="#2DB281" />
        </View>
        <Text style={styles.title}>This journey ends here</Text>
        <Text style={styles.message}>
          The page may have moved or the link is no longer available.
        </Text>
        <Pressable onPress={() => router.replace("/")} style={styles.button}>
          <ChevronLeft size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Back to explore</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7F1",
  },
  title: {
    marginTop: 22,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 23,
    color: "#202124",
  },
  message: {
    marginTop: 9,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "#5f6368",
  },
  button: {
    height: 52,
    marginTop: 26,
    paddingHorizontal: 22,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2DB281",
  },
  buttonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
});
