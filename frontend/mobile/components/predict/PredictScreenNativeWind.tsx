import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PredictResultCard from "./PredictResultCard";
import ModelPicker from "./ModelPicker";
import { submitPrediction, pollPrediction } from "../../lib/api";
import { Prediction } from "../../lib/types";

type ScreenState = "idle" | "preview" | "analyzing" | "result";

export default function PredictScreenNativeWind() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>("idle");
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setCapturedUri(result.assets[0].uri);
    setState("preview");
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setCapturedUri(result.assets[0].uri);
    setState("preview");
  }, []);

  const runPrediction = async () => {
    if (!capturedUri) return;
    setState("analyzing");
    try {
      const initial = await submitPrediction(capturedUri, "demo-user-1", undefined, selectedModel);
      const completed = await pollPrediction(initial.prediction_id);
      setPrediction(completed);
      setState("result");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Prediction failed");
      setState("preview");
    }
  };

  const handleReset = () => {
    setState("idle");
    setCapturedUri(null);
    setPrediction(null);
  };

  // ── Result screen ──
  if (state === "result" && prediction) {
    return (
      <PredictResultCard
        prediction={prediction}
        imageUri={capturedUri ?? undefined}
        onReset={handleReset}
        onPredictionUpdate={setPrediction}
      />
    );
  }

  // ── Analyzing screen ──
  if (state === "analyzing") {
    return (
      <View style={styles.container}>
        {capturedUri && (
          <Image source={{ uri: capturedUri }} style={styles.analyzingImage} resizeMode="cover" />
        )}
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.analyzingTitle}>Analyzing with {selectedModel}...</Text>
        <Text style={styles.analyzingSubtitle}>Matching to Kalshi markets</Text>
      </View>
    );
  }

  // ── Preview screen (image selected, ready to analyze) ──
  if (state === "preview" && capturedUri) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />

        <View style={styles.previewActions}>
          <ModelPicker selectedModel={selectedModel} onSelect={setSelectedModel} />
        </View>

        <View style={styles.previewButtons}>
          <Pressable style={styles.analyzeButton} onPress={runPrediction}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
            <Text style={styles.analyzeButtonText}>Analyze</Text>
          </Pressable>

          <Pressable style={styles.retakeButton} onPress={() => setState("idle")}>
            <Text style={styles.retakeText}>Pick different image</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Idle screen (no image yet) ──
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="scan-outline" size={48} color="#6366F1" />
        </View>
        <Text style={styles.heroTitle}>Scan a Market</Text>
        <Text style={styles.heroSubtitle}>
          Upload a Kalshi screenshot and Gemini will analyze it, match it to a real market, and tell you what to trade
        </Text>
      </View>

      <View style={styles.buttonGroup}>
        <Pressable style={styles.primaryButton} onPress={pickImage}>
          <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Choose from Gallery</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={22} color="#A78BFA" />
          <Text style={styles.secondaryButtonText}>Take Photo</Text>
        </Pressable>
      </View>

      <View style={styles.modelRow}>
        <Text style={styles.modelLabel}>Model:</Text>
        <ModelPicker selectedModel={selectedModel} onSelect={setSelectedModel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // ── Hero / Idle ──
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(99,102,241,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6366F1",
    paddingVertical: 18,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(167,139,250,0.1)",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
  },
  secondaryButtonText: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "600",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modelLabel: {
    color: "#475569",
    fontSize: 14,
  },

  // ── Preview ──
  previewImage: {
    flex: 1,
    width: "100%",
    borderRadius: 16,
    marginBottom: 20,
  },
  previewActions: {
    marginBottom: 16,
  },
  previewButtons: {
    width: "100%",
    gap: 10,
    paddingBottom: 30,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#6366F1",
    paddingVertical: 18,
    borderRadius: 14,
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  retakeButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  retakeText: {
    color: "#64748B",
    fontSize: 14,
  },

  // ── Analyzing ──
  analyzingImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginBottom: 24,
    opacity: 0.6,
  },
  analyzingTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  analyzingSubtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 6,
  },
});
