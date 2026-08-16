import { Building2, Plane } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

const THEME = "#2DB281";

export default function CategoryBar({
  selected,
  onChange,
}: {
  selected: "stay" | "trip";
  onChange: (v: "stay" | "trip") => void;
}) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.item,
          selected === "stay" && styles.active,
        ]}
        onPress={() => onChange("stay")}
      >
        <Building2
          size={22}
          color={selected === "stay" ? THEME : "#666"}
        />

        <Text
          style={[
            styles.text,
            selected === "stay" && styles.activeText,
          ]}
        >
          Stay
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.item,
          selected === "trip" && styles.active,
        ]}
        onPress={() => onChange("trip")}
      >
        <Plane
          size={22}
          color={selected === "trip" ? THEME : "#666"}
        />

        <Text
          style={[
            styles.text,
            selected === "trip" && styles.activeText,
          ]}
        >
          Trip
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },

  item: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  active: {
    borderBottomColor: THEME,
  },

  text: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
  },

  activeText: {
    color: THEME,
    fontWeight: "900",
  },
});