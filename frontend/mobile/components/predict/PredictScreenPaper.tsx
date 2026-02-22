import { useState, useRef, useCallback } from "react";
import {
  View,
  Animated,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused } from "@react-navigation/native";
import CameraViewfinder, { CameraRef } from "./CameraViewfinder";
import CameraOverlay from "./CameraOverlay";
import PredictResultCard from "./PredictResultCard";
import { submitPrediction, pollPrediction } from "../../lib/api";
import { Prediction } from "../../lib/types";

type ScreenState = "camera" | "analyzing" | "result";

export default function PredictScreenPaper() {
  const [state, setState] = useState<ScreenState>("camera");
  const [selectedModel, setSelectedModel] = useState("taruns_model");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [flash, setFlash] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    const uri = await cameraRef.current.takePicture();
    if (!uri) return;

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setCapturedUri(uri);
    runPrediction(uri);
  }, [selectedModel]);

  const handleGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setCapturedUri(uri);
    runPrediction(uri);
  }, [selectedModel]);

  const runPrediction = async (uri: string) => {
    setState("analyzing");
    try {
      const initial = await submitPrediction(uri, "demo-user-1", undefined, selectedModel);
      const final = await pollPrediction(initial.prediction_id);
      setPrediction(final);
      setState("result");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Prediction failed");
      setState("camera");
    }
  };

  const handleReset = () => {
    setState("camera");
    setCapturedUri(null);
    setPrediction(null);
  };

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

  return (
    <View style={styles.container}>
      <CameraViewfinder ref={cameraRef} isActive={isFocused && state === "camera"} />

      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flashAnim }]}
      />

      {state === "analyzing" && (
        <View style={styles.analyzingOverlay}>
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              style={styles.analyzingImage}
              resizeMode="cover"
            />
          )}
          <ActivityIndicator animating size="large" color="#6366F1" />
          <Text variant="titleMedium" style={styles.analyzingTitle}>
            Analyzing with {selectedModel}...
          </Text>
          <Text variant="bodySmall" style={styles.analyzingSub}>
            This may take a moment
          </Text>
        </View>
      )}

      {state === "camera" && (
        <CameraOverlay
          onCapture={handleCapture}
          onGallery={handleGallery}
          onFlipCamera={() => {}}
          onToggleFlash={() => setFlash(!flash)}
          flashOn={flash}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          capturing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingImage: {
    width: 192,
    height: 192,
    borderRadius: 16,
    marginBottom: 24,
    opacity: 0.6,
  },
  analyzingTitle: {
    color: "#FFFFFF",
    marginTop: 16,
  },
  analyzingSub: {
    color: "#94A3B8",
    marginTop: 4,
  },
});
