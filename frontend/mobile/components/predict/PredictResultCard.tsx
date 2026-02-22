import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Prediction, Factor, EvScenario } from "../../lib/types";
import { updatePrediction } from "../../lib/api";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ── Toggle Section ──

function ToggleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  badge?: { text: string; color: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  return (
    <View style={styles.toggleSection}>
      <Pressable style={styles.toggleHeader} onPress={toggle}>
        <View style={styles.toggleLeft}>
          <Ionicons name={icon} size={16} color="#64748B" />
          <Text style={styles.toggleTitle}>{title}</Text>
          {badge && (
            <View style={[styles.toggleBadge, { backgroundColor: badge.color + "20" }]}>
              <Text style={[styles.toggleBadgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          )}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#475569"
        />
      </Pressable>
      {open && <View style={styles.toggleBody}>{children}</View>}
    </View>
  );
}

// ── Factor Row ──

function FactorRow({ factor }: { factor: Factor }) {
  const isYes = factor.direction === "favors_yes";
  const dirColor = isYes ? "#22C55E" : "#EF4444";
  const magDots =
    factor.magnitude === "high" ? 3 : factor.magnitude === "medium" ? 2 : 1;

  return (
    <View style={styles.factorRow}>
      <View style={styles.factorIconCol}>
        <Ionicons
          name={isYes ? "arrow-up" : "arrow-down"}
          size={14}
          color={dirColor}
        />
      </View>
      <View style={styles.factorContent}>
        <Text style={styles.factorStat}>{factor.stat}</Text>
        <Text style={styles.factorDetail}>{factor.detail}</Text>
        <View style={styles.factorMeta}>
          <Text style={styles.factorSource}>{factor.source}</Text>
          <View style={styles.magDots}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[
                  styles.magDot,
                  { backgroundColor: n <= magDots ? dirColor : "#334155" },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── EV Table ──

function EvTable({ scenarios, side }: { scenarios: EvScenario[]; side: string }) {
  return (
    <View style={styles.evTable}>
      <View style={styles.evHeaderRow}>
        <Text style={[styles.evHeaderCell, { flex: 1 }]}>True Prob</Text>
        <Text style={[styles.evHeaderCell, { flex: 1.2 }]}>EV / Contract</Text>
        <Text style={[styles.evHeaderCell, { flex: 1 }]}>Kelly Size</Text>
      </View>
      {scenarios.map((s, i) => {
        const evColor = s.ev_per_contract >= 0 ? "#22C55E" : "#EF4444";
        const isBest =
          s.ev_per_contract ===
          Math.max(...scenarios.map((x) => x.ev_per_contract));
        return (
          <View
            key={i}
            style={[
              styles.evDataRow,
              i % 2 === 0 && styles.evDataRowAlt,
              isBest && styles.evBestRow,
            ]}
          >
            <Text style={[styles.evCell, { flex: 1 }]}>
              {(s.probability * 100).toFixed(0)}%
            </Text>
            <Text
              style={[styles.evCell, { flex: 1.2, color: evColor, fontWeight: "700" }]}
            >
              {s.ev_per_contract >= 0 ? "+" : ""}
              {s.ev_per_contract.toFixed(2)}c
            </Text>
            <Text style={[styles.evCell, { flex: 1 }]}>
              {(s.kelly_fraction * 100).toFixed(1)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main ──

interface Props {
  prediction: Prediction;
  imageUri?: string;
  onReset: () => void;
  onPredictionUpdate?: (updated: Prediction) => void;
}

export default function PredictResultCard({
  prediction,
  imageUri,
  onReset,
  onPredictionUpdate,
}: Props) {
  const rec = prediction.recommendation;
  const [editVisible, setEditVisible] = useState(false);
  const [editNotes, setEditNotes] = useState(prediction.user_notes ?? "");
  const [editIdea, setEditIdea] = useState(prediction.model_idea ?? "");
  const [editContext, setEditContext] = useState(prediction.context ?? "");
  const [saving, setSaving] = useState(false);

  if (!rec) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#475569" />
          <Text style={styles.errorText}>
            {prediction.status === "failed"
              ? "Analysis failed. Try again."
              : "No recommendation available."}
          </Text>
          <Pressable style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const sideColor = rec.side === "yes" ? "#22C55E" : "#EF4444";
  const oppColor = rec.side === "yes" ? "#EF4444" : "#22C55E";
  const confidencePct = (rec.confidence * 100).toFixed(0);
  const positionPct = (rec.recommended_position * 100).toFixed(0);

  // Derive break-even from mid EV scenario
  const midScenario = rec.ev_analysis[Math.floor(rec.ev_analysis.length / 2)];
  const bestEv =
    rec.ev_analysis.length > 0
      ? Math.max(...rec.ev_analysis.map((e) => e.ev_per_contract))
      : 0;
  const maxKelly =
    rec.ev_analysis.length > 0
      ? Math.max(...rec.ev_analysis.map((e) => e.kelly_fraction))
      : 0;

  // Count factor directions
  const yesFactors = rec.factors.filter((f) => f.direction === "favors_yes").length;
  const noFactors = rec.factors.filter((f) => f.direction === "favors_no").length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ═══ THE TRADE ═══ */}
      {rec.no_bet ? (
        <View style={styles.passCard}>
          <View style={styles.passIconRow}>
            <View style={styles.passIconCircle}>
              <Ionicons name="close" size={28} color="#EAB308" />
            </View>
          </View>
          <Text style={styles.passTitle}>PASS</Text>
          <Text style={styles.passSubtitle}>No edge — don't trade this</Text>
          <View style={styles.passDivider} />
          <Text style={styles.passReason}>
            {rec.no_bet_reason || "Market is efficiently priced. No mispricing detected."}
          </Text>
          <Text style={styles.passTicker}>{rec.ticker}</Text>
        </View>
      ) : (
        <View style={styles.tradeCard}>
          {/* Action line */}
          <Text style={styles.tradeLabel}>TRADE</Text>
          <View style={styles.tradeActionRow}>
            <Text style={[styles.tradeAction, { color: sideColor }]}>
              BUY {rec.side.toUpperCase()}
            </Text>
            <View style={[styles.edgePill, { backgroundColor: sideColor + "18" }]}>
              <Text style={[styles.edgePillText, { color: sideColor }]}>
                +{bestEv.toFixed(2)}c EV
              </Text>
            </View>
          </View>

          {/* Ticker + title */}
          <Text style={styles.tradeTicker}>{rec.ticker}</Text>
          {rec.title && <Text style={styles.tradeTitle}>{rec.title}</Text>}

          {/* Key numbers strip */}
          <View style={styles.numbersStrip}>
            <View style={styles.numberBox}>
              <Text style={styles.numberLabel}>Confidence</Text>
              <Text style={[styles.numberValue, { color: sideColor }]}>
                {confidencePct}%
              </Text>
            </View>
            <View style={styles.numberDivider} />
            <View style={styles.numberBox}>
              <Text style={styles.numberLabel}>Size</Text>
              <Text style={styles.numberValue}>{positionPct}%</Text>
              <Text style={styles.numberSub}>of bankroll</Text>
            </View>
            <View style={styles.numberDivider} />
            <View style={styles.numberBox}>
              <Text style={styles.numberLabel}>Full Kelly</Text>
              <Text style={styles.numberValue}>
                {(maxKelly * 100).toFixed(0)}%
              </Text>
              <Text style={styles.numberSub}>
                {positionPct}% = {((rec.recommended_position / (maxKelly || 1)) * 100).toFixed(0)}% Kelly
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ═══ WHY — The reasoning ═══ */}
      <ToggleSection title="Why this trade" icon="bulb-outline" defaultOpen>
        <Text style={styles.bodyText}>{rec.reasoning}</Text>
      </ToggleSection>

      {/* ═══ EDGE — Factor breakdown ═══ */}
      {rec.factors.length > 0 && (
        <ToggleSection
          title="Edge breakdown"
          icon="stats-chart-outline"
          defaultOpen
          badge={{
            text: `${yesFactors} YES / ${noFactors} NO`,
            color: yesFactors > noFactors ? "#22C55E" : "#EF4444",
          }}
        >
          {rec.factors.map((f, i) => (
            <FactorRow key={i} factor={f} />
          ))}
        </ToggleSection>
      )}

      {/* ═══ SIZING — EV at different probs ═══ */}
      {rec.ev_analysis.length > 0 && (
        <ToggleSection
          title="Sizing scenarios"
          icon="resize-outline"
          badge={{
            text: `best +${bestEv.toFixed(2)}c`,
            color: "#22C55E",
          }}
        >
          <Text style={styles.evExplainer}>
            If your true probability estimate is wrong, here's how the trade looks at different levels.
            Positive EV = mispricing in your favor.
          </Text>
          <EvTable scenarios={rec.ev_analysis} side={rec.side} />
        </ToggleSection>
      )}

      {/* ═══ WHAT KILLS YOU — Bear case ═══ */}
      {rec.bear_case && (
        <ToggleSection title="What kills this trade" icon="skull-outline">
          <View style={styles.bearCard}>
            <Text style={styles.bodyText}>{rec.bear_case}</Text>
          </View>
        </ToggleSection>
      )}

      {/* ═══ Screenshot ═══ */}
      {imageUri && (
        <ToggleSection title="Screenshot" icon="image-outline">
          <Image
            source={{ uri: imageUri }}
            style={styles.screenshotImage}
            resizeMode="cover"
          />
        </ToggleSection>
      )}

      {/* ═══ User Notes & Model Idea ═══ */}
      {(prediction.user_notes || prediction.model_idea) && (
        <ToggleSection title="Your notes" icon="pencil-outline" defaultOpen>
          {prediction.user_notes ? (
            <Text style={styles.bodyText}>{prediction.user_notes}</Text>
          ) : null}
          {prediction.model_idea ? (
            <View style={{ marginTop: prediction.user_notes ? 12 : 0 }}>
              <Text style={styles.ideaLabel}>Model idea</Text>
              <Text style={styles.bodyText}>{prediction.model_idea}</Text>
            </View>
          ) : null}
        </ToggleSection>
      )}

      {/* ═══ Meta ═══ */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {prediction.model} &middot;{" "}
          {new Date(prediction.completed_at ?? prediction.created_at).toLocaleString()}
          {prediction.updated_at && " (edited)"}
        </Text>
      </View>

      {/* ═══ Actions ═══ */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.resetButton, { flex: 1 }]}
          onPress={onReset}
        >
          <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Scan Another</Text>
        </Pressable>
        <Pressable
          style={styles.editButton}
          onPress={() => {
            setEditNotes(prediction.user_notes ?? "");
            setEditIdea(prediction.model_idea ?? "");
            setEditContext(prediction.context ?? "");
            setEditVisible(true);
          }}
        >
          <Ionicons name="create-outline" size={18} color="#A78BFA" />
        </Pressable>
      </View>

      {/* ═══ Edit Modal ═══ */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable
          style={styles.editBackdrop}
          onPress={() => setEditVisible(false)}
        >
          <Pressable
            style={styles.editSheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editHandle} />
            <Text style={styles.editTitle}>Edit Prediction</Text>

            <Text style={styles.editLabel}>Your Notes</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Add your thoughts on this prediction..."
              placeholderTextColor="#475569"
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
            />

            <Text style={styles.editLabel}>Model Idea</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Suggest an analysis approach or model idea..."
              placeholderTextColor="#475569"
              value={editIdea}
              onChangeText={setEditIdea}
              multiline
            />

            <Text style={styles.editLabel}>Context</Text>
            <TextInput
              style={styles.editInput}
              placeholder="What should the model look for?"
              placeholderTextColor="#475569"
              value={editContext}
              onChangeText={setEditContext}
              multiline
            />

            <Pressable
              style={styles.saveButton}
              disabled={saving}
              onPress={async () => {
                setSaving(true);
                try {
                  const updates: Record<string, string> = {};
                  if (editNotes !== (prediction.user_notes ?? ""))
                    updates.user_notes = editNotes;
                  if (editIdea !== (prediction.model_idea ?? ""))
                    updates.model_idea = editIdea;
                  if (editContext !== (prediction.context ?? ""))
                    updates.context = editContext;

                  if (Object.keys(updates).length === 0) {
                    setEditVisible(false);
                    setSaving(false);
                    return;
                  }

                  const updated = await updatePrediction(
                    prediction.prediction_id,
                    updates
                  );
                  onPredictionUpdate?.(updated);
                  setEditVisible(false);
                } catch (e: any) {
                  Alert.alert("Error", e.message ?? "Failed to save");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // ── Trade Card (the decision) ──
  tradeCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  tradeLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
  },
  tradeActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  tradeAction: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  edgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  edgePillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  tradeTicker: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 2,
  },
  tradeTitle: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  numbersStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    paddingVertical: 16,
  },
  numberBox: {
    flex: 1,
    alignItems: "center",
  },
  numberLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  numberValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  numberSub: {
    color: "#475569",
    fontSize: 9,
    marginTop: 2,
  },
  numberDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // ── Pass Card ──
  passCard: {
    backgroundColor: "rgba(234,179,8,0.06)",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.15)",
  },
  passIconRow: {
    marginBottom: 12,
  },
  passIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(234,179,8,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  passTitle: {
    color: "#EAB308",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  passSubtitle: {
    color: "#CA8A04",
    fontSize: 14,
    marginTop: 4,
  },
  passDivider: {
    height: 1,
    backgroundColor: "rgba(234,179,8,0.12)",
    width: "100%",
    marginVertical: 16,
  },
  passReason: {
    color: "#FDE68A",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  passTicker: {
    color: "#92400E",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 12,
  },

  // ── Toggle Sections ──
  toggleSection: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "#111827",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  toggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleTitle: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  toggleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  toggleBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // ── Body Text ──
  bodyText: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 22,
  },

  // ── Factors ──
  factorRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  factorIconCol: {
    width: 28,
    alignItems: "center",
    paddingTop: 2,
  },
  factorContent: {
    flex: 1,
  },
  factorStat: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  factorDetail: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  factorMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factorSource: {
    color: "#475569",
    fontSize: 11,
  },
  magDots: {
    flexDirection: "row",
    gap: 3,
  },
  magDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── EV Table ──
  evExplainer: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  evTable: {
    borderRadius: 8,
    overflow: "hidden",
  },
  evHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  evHeaderCell: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  evDataRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  evDataRowAlt: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  evBestRow: {
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  evCell: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Bear Case ──
  bearCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#DC2626",
    paddingLeft: 12,
  },

  // ── Screenshot ──
  screenshotImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },

  // ── Meta ──
  metaRow: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  metaText: {
    color: "#334155",
    fontSize: 11,
  },

  // ── Idea label ──
  ideaLabel: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // ── Actions ──
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  resetButton: {
    flexDirection: "row",
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  editButton: {
    backgroundColor: "rgba(167,139,250,0.12)",
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Edit Modal ──
  editBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  editSheet: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  editHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  editTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  editLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  editInput: {
    backgroundColor: "#0B1120",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#334155",
  },
  saveButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorText: {
    color: "#94A3B8",
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
});
