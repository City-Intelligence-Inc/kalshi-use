import { Pressable, View, StyleSheet, Animated } from "react-native";
import { useRef } from "react";
import * as Haptics from "expo-haptics";

interface Props {
  onPress: () => void;
  disabled?: boolean;
}

export default function ShutterButton({ onPress, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
        <View style={styles.inner} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  inner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
});
