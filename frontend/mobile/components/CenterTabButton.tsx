import { Pressable, View, StyleSheet } from "react-native";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

export default function CenterTabButton(props: BottomTabBarButtonProps) {
  const { onPress, accessibilityState } = props;
  const focused = accessibilityState?.selected ?? false;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.outer, focused && styles.outerFocused]}>
        <View style={[styles.inner, focused && styles.innerFocused]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    top: -12,
  },
  outer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E293B",
    borderWidth: 3,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  outerFocused: {
    borderColor: "#6366F1",
    backgroundColor: "#1E1B4B",
  },
  inner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#64748B",
  },
  innerFocused: {
    backgroundColor: "#6366F1",
  },
});
