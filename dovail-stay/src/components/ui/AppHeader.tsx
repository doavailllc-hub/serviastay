import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { icon, palette, radius, sizes, spacing } from "../../constants/theme";
import { Typography } from "../../theme/typography";

type Props = { title: string; subtitle?: string; back?: boolean; onBack?: () => void; action?: ReactNode };

export function AppHeader({ title, subtitle, back = false, onBack, action }: Props) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={onBack ?? router.back} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <ChevronLeft size={icon.sizeLarge} strokeWidth={icon.strokeWidth} color={palette.ink} />
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {action ?? (back ? <View style={styles.iconButton} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, paddingHorizontal: sizes.screenPadding, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: palette.surface },
  iconButton: { width: sizes.touch, height: sizes.touch, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  copy: { flex: 1, minWidth: 0 }, title: { ...Typography.h3 }, subtitle: { ...Typography.caption, marginTop: 1 }, pressed: { opacity: 0.55 },
});
