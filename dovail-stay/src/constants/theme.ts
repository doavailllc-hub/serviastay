import "@/global.css";
import { Platform } from "react-native";

export const palette = {
  primary: "#2DB281",
  primarySoft: "#E8F7F1",
  ink: "#171716", charcoal: "#292927", muted: "#6F706C", subtle: "#949590",
  canvas: "#FFFFFF", surface: "#FFFFFF", surfaceMuted: "#F0F0EC",
  border: "#E5E5DF", borderStrong: "#D6D6CF", inverse: "#FFFFFF",
  success: "#287A52", warning: "#A56816", danger: "#B33A32",
  overlay: "rgba(23, 23, 22, 0.46)", transparent: "transparent",
} as const;

export const Colors = {
  light: { text: palette.ink, background: palette.canvas, backgroundElement: palette.surfaceMuted, backgroundSelected: palette.ink, textSecondary: palette.muted },
  dark: { text: palette.inverse, background: "#111110", backgroundElement: "#242422", backgroundSelected: palette.inverse, textSecondary: "#B8B8B2" },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: { sans: "var(--font-display)", serif: "var(--font-serif)", rounded: "var(--font-rounded)", mono: "var(--font-mono)" },
});

export const fontFamily = {
  body: "Inter_400Regular", bodyMedium: "Inter_500Medium", bodySemibold: "Inter_600SemiBold", bodyBold: "Inter_700Bold",
  displaySemibold: "PlusJakartaSans_600SemiBold", displayBold: "PlusJakartaSans_700Bold", displayExtraBold: "PlusJakartaSans_800ExtraBold",
} as const;
export const fontSize = { caption: 12, body: 14, bodyLarge: 16, title: 20, heading: 28, display: 36 } as const;
export const lineHeight = { caption: 16, body: 20, bodyLarge: 24, title: 26, heading: 34, display: 43 } as const;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 } as const;
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const sizes = { touch: 44, icon: 20, iconLarge: 24, button: 52, input: 54, screenPadding: 18, tabBar: 68 } as const;
export const icon = { strokeWidth: 1.5, strokeWidthActive: 2, size: 20, sizeSmall: 18, sizeLarge: 24 } as const;
export const motion = { fast: 120, standard: 200, slow: 320 } as const;
export const shadows = {
  subtle: { shadowColor: "#171716", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  floating: { shadowColor: "#171716", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
