import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useShareIntentContext } from "expo-share-intent";
import { submitPrediction, pollPrediction } from "../lib/api";
import { Prediction } from "../lib/types";
import PredictResultCard from "../components/predict/PredictResultCard";

const USER_ID = "demo-user-1";

export default function ShareIntentScreen() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent, error } =
    useShareIntentContext();
  const [status, setStatus] = useState<"loading" | "analyzing" | "done" | "error">("loading");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent?.files?.length) return;

    const file = shareIntent.files[0];
    setImageUri(file.path);
    setStatus("analyzing");

    (async () => {
      try {
        // Submit the shared image for analysis
        const result = await submitPrediction(file.path, USER_ID);
        // Poll until complete
        const completed = await pollPrediction(result.prediction_id);
        setPrediction(completed);
        setStatus("done");
      } catch (err: any) {
        setErrorMsg(err.message || "Analysis failed");
        setStatus("error");
      }
    })();
  }, [hasShareIntent, shareIntent]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error receiving image: {error}</Text>
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.text}>Receiving image...</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (status === "analyzing") {
    return (
      <View style={styles.container}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 20 }} />
        <Text style={styles.text}>Analyzing Kalshi screenshot...</Text>
        <Text style={styles.subtext}>This takes 10-20 seconds</Text>
      </View>
    );
  }

  // status === "done"
  if (prediction) {
    return (
      <PredictResultCard
        prediction={prediction}
        onReset={() => {
          resetShareIntent();
          router.replace("/");
        }}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  image: {
    width: 240,
    height: 240,
    resizeMode: "contain",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  text: {
    color: "#E2E8F0",
    fontSize: 17,
    fontWeight: "600",
    marginTop: 16,
  },
  subtext: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});
