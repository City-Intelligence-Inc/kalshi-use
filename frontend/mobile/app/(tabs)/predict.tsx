import { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { getUiStyle, UiStyle } from "../../lib/preferences";
import PredictScreenNativeWind from "../../components/predict/PredictScreenNativeWind";
import PredictScreenPaper from "../../components/predict/PredictScreenPaper";

export default function PredictTab() {
  const [uiStyle, setUiStyle] = useState<UiStyle | null>(null);

  useEffect(() => {
    getUiStyle().then(setUiStyle);
  }, []);

  if (!uiStyle) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (uiStyle === "paper") {
    return <PredictScreenPaper />;
  }

  return <PredictScreenNativeWind />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
});
