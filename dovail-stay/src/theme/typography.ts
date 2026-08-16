import { fontFamily, fontSize, lineHeight, palette } from "../constants/theme";

export const Typography = {
  display: { fontFamily: fontFamily.displayExtraBold, fontSize: fontSize.display, lineHeight: lineHeight.display, letterSpacing: -1.1, color: palette.ink },
  h1: { fontFamily: fontFamily.displayExtraBold, fontSize: fontSize.heading, lineHeight: lineHeight.heading, letterSpacing: -0.7, color: palette.ink },
  h2: { fontFamily: fontFamily.displayBold, fontSize: fontSize.title, lineHeight: lineHeight.title, letterSpacing: -0.3, color: palette.ink },
  h3: { fontFamily: fontFamily.displaySemibold, fontSize: fontSize.bodyLarge, lineHeight: lineHeight.bodyLarge, color: palette.ink },
  body: { fontFamily: fontFamily.body, fontSize: fontSize.body, lineHeight: lineHeight.body, color: palette.charcoal },
  bodyLarge: { fontFamily: fontFamily.body, fontSize: fontSize.bodyLarge, lineHeight: lineHeight.bodyLarge, color: palette.charcoal },
  bodyMedium: { fontFamily: fontFamily.bodyMedium, fontSize: fontSize.body, lineHeight: lineHeight.body, color: palette.charcoal },
  label: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.body, lineHeight: lineHeight.body, color: palette.ink },
  caption: { fontFamily: fontFamily.body, fontSize: fontSize.caption, lineHeight: lineHeight.caption, color: palette.muted },
  button: { fontFamily: fontFamily.bodySemibold, fontSize: fontSize.body, lineHeight: lineHeight.body },
} as const;
