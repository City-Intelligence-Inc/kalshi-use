import { useRef, useState } from "react";
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
import { submitPrediction, pollPrediction } from "../../lib/api";
import { Prediction, Factor, EvScenario } from "../../lib/types";

type ScreenState = "idle" | "submitting" | "result";

export default function PredictScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [state, setState] = useState<ScreenState>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const pollAbort = useRef(false);

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
    pollAbort.current = false;
    try {
      // Submit — returns immediately with status: "processing"
      const initial = await submitPrediction(
        imageUri,
        "demo-user",
        context || undefined,
        "taruns_model"
      );
      setPrediction(initial);

      // Poll until completed
      if (initial.status !== "completed" && initial.status !== "failed") {
        const completed = await pollPrediction(initial.prediction_id);
        if (pollAbort.current) return;
        setPrediction(completed);
      }

      setState("result");
    } catch (e: any) {
      if (!pollAbort.current) {
        Alert.alert("Error", e.message ?? "Something went wrong");
        setState("idle");
      }
    }
  }

  function handleReset() {
    pollAbort.current = true;
    setImageUri(null);
    setContext("");
    setPrediction(null);
    setState("idle");
  }

  // ── Result screen ──
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
          <>
            {/* No-bet warning */}
            {rec.no_bet && (
              <View style={styles.noBetCard}>
                <Text style={styles.noBetTitle}>No Bet Recommended</Text>
                {rec.no_bet_reason && (
                  <Text style={styles.noBetReason}>{rec.no_bet_reason}</Text>
                )}
              </View>
            )}

            <View style={styles.recCard}>
              <Text style={styles.recTicker}>{rec.ticker}</Text>
              {rec.title ? (
                <Text style={styles.recTitle}>{rec.title}</Text>
              ) : null}

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

              {/* Kelly sizing */}
              {rec.recommended_position > 0 && !rec.no_bet && (
                <View style={styles.kellyBadge}>
                  <Text style={styles.kellyText}>
                    Kelly: {(rec.recommended_position * 100).toFixed(1)}% of
                    bankroll
                  </Text>
                </View>
              )}
            </View>

            {/* Factors */}
            {rec.factors && rec.factors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Factors</Text>
                {rec.factors.map((f: Factor, i: number) => (
                  <View key={i} style={styles.factorCard}>
                    <View style={styles.factorHeader}>
                      <Text style={styles.factorStat}>{f.stat}</Text>
                      <View
                        style={[
                          styles.magnitudeBadge,
                          f.magnitude === "high"
                            ? styles.magnitudeHigh
                            : f.magnitude === "medium"
                            ? styles.magnitudeMedium
                            : styles.magnitudeLow,
                        ]}
                      >
                        <Text style={styles.magnitudeText}>
                          {f.magnitude.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.factorDetail}>{f.detail}</Text>
                    <View style={styles.factorMeta}>
                      <Text style={styles.factorSource}>{f.source}</Text>
                      <Text
                        style={[
                          styles.factorDirection,
                          f.direction === "favors_yes"
                            ? styles.dirYes
                            : styles.dirNo,
                        ]}
                      >
                        {f.direction === "favors_yes"
                          ? "Favors YES"
                          : "Favors NO"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* EV Analysis */}
            {rec.ev_analysis && rec.ev_analysis.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EV Analysis</Text>
                <View style={styles.evTable}>
                  <View style={styles.evHeaderRow}>
                    <Text style={styles.evHeaderCell}>Prob</Text>
                    <Text style={styles.evHeaderCell}>EV/Contract</Text>
                    <Text style={styles.evHeaderCell}>Kelly</Text>
                  </View>
                  {rec.ev_analysis.map((ev: EvScenario, i: number) => (
                    <View key={i} style={styles.evRow}>
                      <Text style={styles.evCell}>
                        {Math.round(ev.probability * 100)}%
                      </Text>
                      <Text
                        style={[
                          styles.evCell,
                          ev.ev_per_contract >= 0
                            ? styles.evPositive
                            : styles.evNegative,
                        ]}
                      >
                        {ev.ev_per_contract >= 0 ? "+" : ""}
                        {ev.ev_per_contract.toFixed(4)}
                      </Text>
                      <Text style={styles.evCell}>
                        {(ev.kelly_fraction * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Bear case */}
            {rec.bear_case && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bear Case</Text>
                <View style={styles.bearCard}>
                  <Text style={styles.bearText}>{rec.bear_case}</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Actions */}
        <Pressable style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Analyze Another</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Idle / submitting screen ──
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
          <View style={styles.submittingRow}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.submittingText}>Analyzing...</Text>
          </View>
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
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submittingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    marginBottom: 4,
  },
  recTitle: {
    color: "#94A3B8",
    fontSize: 14,
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
  kellyBadge: {
    marginTop: 12,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  kellyText: {
    color: "#818CF8",
    fontSize: 13,
    fontWeight: "600",
  },
  // No-bet card
  noBetCard: {
    backgroundColor: "rgba(234, 179, 8, 0.12)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(234, 179, 8, 0.3)",
  },
  noBetTitle: {
    color: "#EAB308",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  noBetReason: {
    color: "#FDE68A",
    fontSize: 14,
    lineHeight: 20,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  // Factor cards
  factorCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  factorStat: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  magnitudeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  magnitudeHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  magnitudeMedium: {
    backgroundColor: "rgba(234, 179, 8, 0.2)",
  },
  magnitudeLow: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  magnitudeText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "700",
  },
  factorDetail: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  factorMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factorSource: {
    color: "#64748B",
    fontSize: 12,
  },
  factorDirection: {
    fontSize: 12,
    fontWeight: "600",
  },
  dirYes: {
    color: "#22C55E",
  },
  dirNo: {
    color: "#EF4444",
  },
  // EV table
  evTable: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    overflow: "hidden",
  },
  evHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#162033",
  },
  evHeaderCell: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  evRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  evCell: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
  },
  evPositive: {
    color: "#22C55E",
  },
  evNegative: {
    color: "#EF4444",
  },
  // Bear case
  bearCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  bearText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
  },
});
