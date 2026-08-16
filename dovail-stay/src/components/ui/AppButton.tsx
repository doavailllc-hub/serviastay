import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { icon, palette, radius, sizes, spacing } from "../../constants/theme";
import { Typography } from "../../theme/typography";

type Props = Omit<ComponentProps<typeof Pressable>, "children" | "style"> & {
  label: string; icon?: LucideIcon; loading?: boolean; variant?: "primary" | "secondary" | "ghost"; fullWidth?: boolean; trailing?: ReactNode;
};

export function AppButton({ label, icon: Icon, loading, disabled, variant = "primary", fullWidth = true, trailing, ...props }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? label} accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} {...props}
      style={({ pressed }) => [styles.base, fullWidth && styles.fullWidth, styles[variant], inactive && styles.disabled, pressed && styles.pressed]}>
      {loading ? <ActivityIndicator color={variant === "primary" ? palette.inverse : palette.ink} /> : (
        <View style={styles.content}>
          {Icon ? <Icon size={icon.size} strokeWidth={icon.strokeWidth} color={variant === "primary" ? palette.inverse : palette.ink} /> : null}
          <Text style={[styles.label, variant === "primary" && styles.primaryLabel]} numberOfLines={1}>{label}</Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: sizes.touch, minHeight: sizes.button, paddingHorizontal: spacing.lg, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  fullWidth: { alignSelf: "stretch" }, primary: { backgroundColor: palette.ink },
  secondary: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong }, ghost: { backgroundColor: palette.transparent },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  label: { ...Typography.button, color: palette.ink }, primaryLabel: { color: palette.inverse }, disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
