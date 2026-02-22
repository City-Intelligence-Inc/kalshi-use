import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { submitPrediction } from "../../lib/api";
import { Prediction } from "../../lib/types";

type ScreenState = "idle" | "submitting" | "result";

export default function PredictScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [state, setState] = useState<ScreenState>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  async function pickImage(source: "camera" | "library") {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Photo library access is required.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function showPickerOptions() {
    if (Platform.OS === "web") {
      pickImage("library");
      return;
    }
    Alert.alert("Add Screenshot", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Photo Library", onPress: () => pickImage("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSubmit() {
    if (!imageUri) return;
    setState("submitting");
    try {
      const result = await submitPrediction(
        imageUri,
        "demo-user",
        context || undefined
      );
      setPrediction(result);
      setState("result");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong");
      setState("idle");
    }
  }

  function handleReset() {
    setImageUri(null);
    setContext("");
    setPrediction(null);
    setState("idle");
  }

  if (state === "result" && prediction) {
    const rec = prediction.recommendation;
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Uploaded image */}
        <Image
          source={{ uri: prediction.image_url }}
          style={styles.resultImage}
        />

        {/* Model badge */}
        <View style={styles.modelBadge}>
          <Text style={styles.modelLabel}>
            {prediction.model === "taruns_model"
              ? "Tarun's Model"
              : prediction.model}
          </Text>
        </View>

        {/* Recommendation card */}
        {rec && (
          <View style={styles.recCard}>
            <Text style={styles.recTicker}>{rec.ticker}</Text>

            <View style={styles.recRow}>
              <View
                style={[
                  styles.sideBadge,
                  rec.side === "yes" ? styles.sideYes : styles.sideNo,
                ]}
              >
                <Text style={styles.sideText}>
                  {rec.side.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.confidence}>
                {Math.round(rec.confidence * 100)}% confidence
              </Text>
            </View>

            <Text style={styles.reasoning}>{rec.reasoning}</Text>
          </View>
        )}

        {/* Actions */}
        <Pressable style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Analyze Another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Upload area */}
      {imageUri ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Pressable style={styles.changeBtn} onPress={showPickerOptions}>
            <Text style={styles.changeBtnText}>Change</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.uploadArea} onPress={showPickerOptions}>
          <Text style={styles.uploadIcon}>📷</Text>
          <Text style={styles.uploadText}>
            Tap to take a photo or upload a screenshot
          </Text>
          <Text style={styles.uploadHint}>
            Market, chart, or news article
          </Text>
        </Pressable>
      )}

      {/* Context input */}
      <TextInput
        style={styles.input}
        placeholder="What should I look for? (optional)"
        placeholderTextColor="#64748B"
        value={context}
        onChangeText={setContext}
        multiline
      />

      {/* Submit button */}
      <Pressable
        style={[styles.button, !imageUri && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!imageUri || state === "submitting"}
      >
        {state === "submitting" ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Analyze</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: "#334155",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  uploadText: {
    color: "#CBD5E1",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 4,
  },
  uploadHint: {
    color: "#64748B",
    fontSize: 13,
  },
  previewWrapper: {
    position: "relative",
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 240,
    borderRadius: 16,
  },
  changeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
    minHeight: 60,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  // Result screen styles
  resultImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  modelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  modelLabel: {
    color: "#A78BFA",
    fontSize: 13,
    fontWeight: "600",
  },
  recCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  recTicker: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  recRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  sideBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sideYes: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  sideNo: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  sideText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#FFFFFF",
  },
  confidence: {
    color: "#94A3B8",
    fontSize: 14,
  },
  reasoning: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
  },
});
