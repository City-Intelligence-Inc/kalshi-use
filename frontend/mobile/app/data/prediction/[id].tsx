import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getPrediction } from "../../../lib/api";
import { Prediction } from "../../../lib/types";
import PredictResultCard from "../../../components/predict/PredictResultCard";
import { useRouter } from "expo-router";

export default function PredictionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    getPrediction(id)
      .then(setPrediction)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!prediction) {
    return null;
  }

  return (
    <PredictResultCard
      prediction={prediction}
      imageUri={prediction.image_url}
      onReset={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
  },
});
