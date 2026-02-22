import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPredictionLog,
  getModels,
  submitIdea,
} from "../../lib/api";
import { Prediction, ModelInfo, IdeaCreate } from "../../lib/types";

type Tab = "predictions" | "models";

function PredictionCard({ item, onPress }: { item: Prediction; onPress: () => void }) {
  const rec = item.recommendation;
  const sideColor = rec?.side === "yes" ? "#22C55E" : rec?.side === "no" ? "#EF4444" : "#64748B";
  const isManual = item.model === "manual";
  const date = new Date(item.completed_at ?? item.created_at);
  const timeStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {isManual ? (
        <View style={[styles.cardImage, styles.ideaIconBox]}>
          <Ionicons name="bulb-outline" size={24} color="#EAB308" />
        </View>
      ) : item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Ionicons name="image-outline" size={24} color="#475569" />
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTicker} numberOfLines={1}>
          {rec?.ticker ?? "Unknown"}
        </Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {rec?.title ?? "No recommendation"}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.cardSideBadge, { backgroundColor: sideColor + "20" }]}>
            <Text style={[styles.cardSideText, { color: sideColor }]}>
              {rec?.side?.toUpperCase() ?? "N/A"}
            </Text>
          </View>
          {rec?.confidence != null && (
            <Text style={styles.cardConfidence}>
              {(rec.confidence * 100).toFixed(0)}%
            </Text>
          )}
          <Text style={styles.cardModel}>{isManual ? "idea" : item.model}</Text>
        </View>
      </View>
      <Text style={styles.cardTime}>{timeStr}</Text>
    </Pressable>
  );
}

function ModelCard({ item }: { item: ModelInfo }) {
  return (
    <View style={styles.card}>
      <View style={styles.modelIcon}>
        <Ionicons name="cube-outline" size={24} color="#A78BFA" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTicker}>{item.display_name}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: item.status === "available" ? "#22C55E" : "#EF4444" },
        ]}
      />
    </View>
  );
}

// ── New Idea Form ──

function IdeaForm({
  visible,
  onClose,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [ticker, setTicker] = useState("");
  const [title, setTitle] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [confidence, setConfidence] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [bearCase, setBearCase] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Factor builder
  const [factors, setFactors] = useState<
    { stat: string; source: string; direction: "favors_yes" | "favors_no"; magnitude: "low" | "medium" | "high"; detail: string }[]
  >([]);
  const [showFactorForm, setShowFactorForm] = useState(false);
  const [fStat, setFStat] = useState("");
  const [fSource, setFSource] = useState("");
  const [fDir, setFDir] = useState<"favors_yes" | "favors_no">("favors_yes");
  const [fMag, setFMag] = useState<"low" | "medium" | "high">("medium");
  const [fDetail, setFDetail] = useState("");

  const resetForm = () => {
    setTicker("");
    setTitle("");
    setSide("yes");
    setConfidence("");
    setReasoning("");
    setBearCase("");
    setNotes("");
    setFactors([]);
    setShowFactorForm(false);
    resetFactorInputs();
  };

  const resetFactorInputs = () => {
    setFStat("");
    setFSource("");
    setFDir("favors_yes");
    setFMag("medium");
    setFDetail("");
  };

  const addFactor = () => {
    if (!fStat.trim()) return;
    setFactors((prev) => [
      ...prev,
      { stat: fStat.trim(), source: fSource.trim(), direction: fDir, magnitude: fMag, detail: fDetail.trim() },
    ]);
    resetFactorInputs();
    setShowFactorForm(false);
  };

  const removeFactor = (idx: number) => {
    setFactors((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!ticker.trim()) {
      Alert.alert("Missing field", "Ticker is required");
      return;
    }
    if (!reasoning.trim()) {
      Alert.alert("Missing field", "Reasoning / thesis is required");
      return;
    }

    const conf = parseFloat(confidence) / 100;
    if (isNaN(conf) || conf <= 0 || conf > 1) {
      Alert.alert("Invalid confidence", "Enter a percentage between 1 and 100");
      return;
    }

    setSubmitting(true);
    try {
      const idea: IdeaCreate = {
        user_id: "demo-user-1",
        ticker: ticker.trim().toUpperCase(),
        title: title.trim() || undefined,
        side,
        confidence: conf,
        reasoning: reasoning.trim(),
        factors: factors.length > 0 ? factors : undefined,
        bear_case: bearCase.trim() || undefined,
        user_notes: notes.trim() || undefined,
      };
      await submitIdea(idea);
      resetForm();
      onSubmitted();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to submit idea");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.formHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </Pressable>
          <Text style={styles.formHeaderTitle}>New Trade Idea</Text>
          <Pressable
            style={[styles.submitButton, submitting && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ticker */}
          <Text style={styles.formLabel}>TICKER *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. KXBTC-26FEB21-T100000"
            placeholderTextColor="#475569"
            value={ticker}
            onChangeText={setTicker}
            autoCapitalize="characters"
          />

          {/* Title */}
          <Text style={styles.formLabel}>MARKET QUESTION</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Will Bitcoin reach $100k by Feb 21?"
            placeholderTextColor="#475569"
            value={title}
            onChangeText={setTitle}
          />

          {/* Side */}
          <Text style={styles.formLabel}>SIDE *</Text>
          <View style={styles.sideToggle}>
            <Pressable
              style={[
                styles.sideOption,
                side === "yes" && styles.sideOptionYesActive,
              ]}
              onPress={() => setSide("yes")}
            >
              <Text
                style={[
                  styles.sideOptionText,
                  side === "yes" && styles.sideOptionTextActive,
                ]}
              >
                YES
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.sideOption,
                side === "no" && styles.sideOptionNoActive,
              ]}
              onPress={() => setSide("no")}
            >
              <Text
                style={[
                  styles.sideOptionText,
                  side === "no" && styles.sideOptionTextActive,
                ]}
              >
                NO
              </Text>
            </Pressable>
          </View>

          {/* Confidence */}
          <Text style={styles.formLabel}>CONFIDENCE (%) *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. 72"
            placeholderTextColor="#475569"
            value={confidence}
            onChangeText={setConfidence}
            keyboardType="numeric"
          />

          {/* Reasoning */}
          <Text style={styles.formLabel}>THESIS / REASONING *</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMulti]}
            placeholder="Explain your edge — why is the market mispricing this?"
            placeholderTextColor="#475569"
            value={reasoning}
            onChangeText={setReasoning}
            multiline
          />

          {/* Factors */}
          <View style={styles.factorHeader}>
            <Text style={styles.formLabel}>KEY FACTORS</Text>
            <Pressable
              style={styles.addFactorButton}
              onPress={() => setShowFactorForm(!showFactorForm)}
            >
              <Ionicons
                name={showFactorForm ? "chevron-up" : "add"}
                size={16}
                color="#6366F1"
              />
              <Text style={styles.addFactorText}>
                {showFactorForm ? "Cancel" : "Add Factor"}
              </Text>
            </Pressable>
          </View>

          {/* Existing factors */}
          {factors.map((f, idx) => (
            <View key={idx} style={styles.factorChip}>
              <View style={styles.factorChipLeft}>
                <Ionicons
                  name={f.direction === "favors_yes" ? "arrow-up" : "arrow-down"}
                  size={14}
                  color={f.direction === "favors_yes" ? "#22C55E" : "#EF4444"}
                />
                <Text style={styles.factorChipText} numberOfLines={1}>
                  {f.stat}
                </Text>
                <View
                  style={[
                    styles.factorMagBadge,
                    {
                      backgroundColor:
                        f.magnitude === "high"
                          ? "rgba(239,68,68,0.15)"
                          : f.magnitude === "medium"
                          ? "rgba(234,179,8,0.15)"
                          : "rgba(100,116,139,0.15)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.factorMagText,
                      {
                        color:
                          f.magnitude === "high"
                            ? "#EF4444"
                            : f.magnitude === "medium"
                            ? "#EAB308"
                            : "#64748B",
                      },
                    ]}
                  >
                    {f.magnitude}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => removeFactor(idx)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#475569" />
              </Pressable>
            </View>
          ))}

          {/* Factor form (inline) */}
          {showFactorForm && (
            <View style={styles.factorFormBox}>
              <TextInput
                style={styles.formInputSmall}
                placeholder="Stat (e.g. BTC hash rate trending up)"
                placeholderTextColor="#475569"
                value={fStat}
                onChangeText={setFStat}
              />
              <TextInput
                style={styles.formInputSmall}
                placeholder="Source (e.g. Glassnode)"
                placeholderTextColor="#475569"
                value={fSource}
                onChangeText={setFSource}
              />
              <TextInput
                style={styles.formInputSmall}
                placeholder="Detail (e.g. 30-day moving avg up 12%)"
                placeholderTextColor="#475569"
                value={fDetail}
                onChangeText={setFDetail}
              />
              <View style={styles.factorToggles}>
                <View style={styles.factorToggleGroup}>
                  <Text style={styles.factorToggleLabel}>Direction</Text>
                  <View style={styles.sideToggle}>
                    <Pressable
                      style={[
                        styles.miniOption,
                        fDir === "favors_yes" && { backgroundColor: "rgba(34,197,94,0.2)" },
                      ]}
                      onPress={() => setFDir("favors_yes")}
                    >
                      <Text
                        style={[
                          styles.miniOptionText,
                          fDir === "favors_yes" && { color: "#22C55E" },
                        ]}
                      >
                        YES
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.miniOption,
                        fDir === "favors_no" && { backgroundColor: "rgba(239,68,68,0.2)" },
                      ]}
                      onPress={() => setFDir("favors_no")}
                    >
                      <Text
                        style={[
                          styles.miniOptionText,
                          fDir === "favors_no" && { color: "#EF4444" },
                        ]}
                      >
                        NO
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.factorToggleGroup}>
                  <Text style={styles.factorToggleLabel}>Magnitude</Text>
                  <View style={styles.sideToggle}>
                    {(["low", "medium", "high"] as const).map((m) => (
                      <Pressable
                        key={m}
                        style={[
                          styles.miniOption,
                          fMag === m && {
                            backgroundColor:
                              m === "high"
                                ? "rgba(239,68,68,0.2)"
                                : m === "medium"
                                ? "rgba(234,179,8,0.2)"
                                : "rgba(100,116,139,0.2)",
                          },
                        ]}
                        onPress={() => setFMag(m)}
                      >
                        <Text
                          style={[
                            styles.miniOptionText,
                            fMag === m && {
                              color:
                                m === "high"
                                  ? "#EF4444"
                                  : m === "medium"
                                  ? "#EAB308"
                                  : "#94A3B8",
                            },
                          ]}
                        >
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <Pressable style={styles.factorSaveButton} onPress={addFactor}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.factorSaveText}>Add Factor</Text>
              </Pressable>
            </View>
          )}

          {/* Bear case */}
          <Text style={[styles.formLabel, { marginTop: 20 }]}>BEAR CASE</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMulti]}
            placeholder="What could go wrong? The argument against your thesis..."
            placeholderTextColor="#475569"
            value={bearCase}
            onChangeText={setBearCase}
            multiline
          />

          {/* Notes */}
          <Text style={styles.formLabel}>NOTES</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMulti]}
            placeholder="Additional context, sources, or reminders..."
            placeholderTextColor="#475569"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main ──

export default function DataScreen() {
  const [tab, setTab] = useState<Tab>("predictions");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ideaFormVisible, setIdeaFormVisible] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      if (tab === "predictions") {
        const data = await getPredictionLog();
        setPredictions(data);
      } else {
        const data = await getModels();
        setModels(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [tab]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <View style={styles.container}>
      {/* Segment control */}
      <View style={styles.segmentBar}>
        {(["predictions", "models"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.segment, tab === t && styles.segmentActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>
              {t === "predictions" ? "Predictions" : "Models"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
      ) : tab === "predictions" ? (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.prediction_id}
          renderItem={({ item }) => (
            <PredictionCard
              item={item}
              onPress={() => router.push(`/data/prediction/${item.prediction_id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="analytics-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No predictions yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={models}
          keyExtractor={(item) => item.name}
          renderItem={({ item }) => <ModelCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366F1"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No models found</Text>
            </View>
          }
        />
      )}

      {/* FAB — New Idea */}
      <Pressable
        style={styles.fab}
        onPress={() => setIdeaFormVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Idea Form Modal */}
      <IdeaForm
        visible={ideaFormVisible}
        onClose={() => setIdeaFormVisible(false)}
        onSubmitted={() => {
          setTab("predictions");
          handleRefresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  segmentBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: "#334155",
  },
  segmentText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  cardImagePlaceholder: {
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  ideaIconBox: {
    backgroundColor: "rgba(234,179,8,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  modelIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "rgba(167,139,250,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTicker: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cardTitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  cardSideBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardSideText: {
    fontSize: 10,
    fontWeight: "800",
  },
  cardConfidence: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  cardModel: {
    color: "#64748B",
    fontSize: 10,
  },
  cardTime: {
    color: "#475569",
    fontSize: 10,
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
  empty: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#475569",
    fontSize: 16,
    marginTop: 12,
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Form ──
  formContainer: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  formHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  formLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  formInputMulti: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  formInputSmall: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 8,
  },

  // ── Side toggle ──
  sideToggle: {
    flexDirection: "row",
    gap: 8,
  },
  sideOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  sideOptionYesActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "#22C55E",
  },
  sideOptionNoActive: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "#EF4444",
  },
  sideOptionText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sideOptionTextActive: {
    color: "#FFFFFF",
  },

  // ── Factor builder ──
  factorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  addFactorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  addFactorText: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "600",
  },
  factorChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  factorChipLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  factorChipText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  factorMagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  factorMagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  factorFormBox: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  factorToggles: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  factorToggleGroup: {
    flex: 1,
  },
  factorToggleLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  miniOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#1E293B",
  },
  miniOptionText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  factorSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    borderRadius: 8,
  },
  factorSaveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
