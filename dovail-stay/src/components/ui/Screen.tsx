import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../../constants/theme";

type Props = ComponentProps<typeof SafeAreaView>;

export function Screen({ edges = ["top", "left", "right"], style, ...props }: Props) {
  return <SafeAreaView edges={edges} style={[styles.screen, style]} {...props} />;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: palette.canvas } });
