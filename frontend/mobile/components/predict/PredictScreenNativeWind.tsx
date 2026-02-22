import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useIsFocused } from "@react-navigation/native";
import CameraViewfinder, { CameraRef } from "./CameraViewfinder";
import CameraOverlay from "./CameraOverlay";
import PredictResultCard from "./PredictResultCard";
import { submitPrediction, pollPrediction } from "../../lib/api";
import { Prediction } from "../../lib/types";

type ScreenState = "camera" | "analyzing" | "result";

export default function PredictScreenNativeWind() {
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

    // Flash animation
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
    <View className="flex-1 bg-black">
      {/* Camera */}
      <CameraViewfinder ref={cameraRef} isActive={isFocused && state === "camera"} />

      {/* Capture flash effect */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#FFFFFF",
          opacity: flashAnim,
        }}
      />

      {/* Analyzing overlay */}
      {state === "analyzing" && (
        <View className="absolute inset-0 bg-black/70 justify-center items-center">
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              className="w-48 h-48 rounded-2xl mb-6 opacity-60"
              resizeMode="cover"
            />
          )}
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-white text-base font-semibold mt-4">
            Analyzing with {selectedModel}...
          </Text>
          <Text className="text-slate-400 text-sm mt-1">This may take a moment</Text>
        </View>
      )}

      {/* Camera overlay controls */}
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
