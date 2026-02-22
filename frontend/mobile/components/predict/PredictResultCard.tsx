import { useState, useEffect } from "react";
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
  KeyboardAvoidingView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Prediction, Factor, EvScenario, MarketData } from "../../lib/types";
import { updatePrediction } from "../../lib/api";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const BEGINNER_MODE_KEY = "beginner_mode";

// ── Beginner Tip ──

function BeginnerTip({ text, show }: { text: string; show: boolean }) {
  if (!show) return null;
  return (
    <View style={tipStyles.container}>
      <Text style={tipStyles.text}>{text}</Text>
    </View>
  );
}

const tipStyles = StyleSheet.create({
  container: {
    borderLeftWidth: 2,
    borderLeftColor: "#6366F1",
    backgroundColor: "rgba(99,102,241,0.06)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    borderRadius: 4,
  },
  text: {
    color: "#818CF8",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
});

// ── Toggle Section ──

function ToggleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  beginnerTip,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  badge?: { text: string; color: string };
  beginnerTip?: React.ReactNode;
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
      {open && (
        <View style={styles.toggleBody}>
          {beginnerTip}
          {children}
        </View>
      )}
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

// ── Live Market Data ──

function PriceCell({ label, value, color }: { label: string; value?: number | null; color?: string }) {
  return (
    <View style={liveStyles.priceCell}>
      <Text style={liveStyles.priceCellLabel}>{label}</Text>
      <Text style={[liveStyles.priceCellValue, color ? { color } : undefined]}>
        {value != null ? `${value}¢` : "—"}
      </Text>
    </View>
  );
}

function DepthBar({ yesDepth, noDepth }: { yesDepth: number; noDepth: number }) {
  const total = yesDepth + noDepth;
  if (total === 0) return null;
  const yesPct = (yesDepth / total) * 100;

  return (
    <View style={liveStyles.depthContainer}>
      <Text style={liveStyles.depthLabel}>Orderbook depth</Text>
      <View style={liveStyles.depthBarTrack}>
        <View style={[liveStyles.depthBarYes, { width: `${yesPct}%` }]} />
        <View style={[liveStyles.depthBarNo, { width: `${100 - yesPct}%` }]} />
      </View>
      <View style={liveStyles.depthLegend}>
        <Text style={liveStyles.depthLegendYes}>YES {yesDepth}</Text>
        <Text style={liveStyles.depthLegendNo}>NO {noDepth}</Text>
      </View>
    </View>
  );
}

function LiveMarketSection({ data, beginnerMode }: { data: MarketData; beginnerMode: boolean }) {
  if (data.status === "not_found") {
    return (
      <View style={liveStyles.warningRow}>
        <Ionicons name="warning-outline" size={16} color="#EAB308" />
        <Text style={liveStyles.warningText}>
          Ticker not found on Kalshi — prices may be outdated
        </Text>
      </View>
    );
  }

  if (data.status === "error") {
    return (
      <View style={liveStyles.warningRow}>
        <Ionicons name="cloud-offline-outline" size={16} color="#64748B" />
        <Text style={liveStyles.warningText}>
          Live data unavailable — Kalshi API unreachable
        </Text>
      </View>
    );
  }

  const isLive = data.market_status === "active" || data.market_status === "open";
  const delta = data.price_delta;

  return (
    <View>
      {/* Status badge + 24h delta */}
      <View style={liveStyles.statusRow}>
        <View style={[liveStyles.statusBadge, { backgroundColor: isLive ? "#22C55E20" : "#64748B20" }]}>
          <View style={[liveStyles.statusDot, { backgroundColor: isLive ? "#22C55E" : "#64748B" }]} />
          <Text style={[liveStyles.statusText, { color: isLive ? "#22C55E" : "#64748B" }]}>
            {isLive ? "LIVE" : (data.market_status ?? "CLOSED").toUpperCase()}
          </Text>
        </View>
        {delta != null && delta !== 0 && (
          <View style={[liveStyles.deltaPill, { backgroundColor: delta > 0 ? "#22C55E18" : "#EF444418" }]}>
            <Ionicons
              name={delta > 0 ? "arrow-up" : "arrow-down"}
              size={12}
              color={delta > 0 ? "#22C55E" : "#EF4444"}
            />
            <Text style={{ color: delta > 0 ? "#22C55E" : "#EF4444", fontSize: 12, fontWeight: "700" }}>
              {delta > 0 ? "+" : ""}{delta}¢ 24h
            </Text>
          </View>
        )}
      </View>

      {/* Price grid */}
      <View style={liveStyles.priceGrid}>
        <View style={liveStyles.priceRow}>
          <PriceCell label="YES BID" value={data.yes_bid} color="#22C55E" />
          <PriceCell label="YES ASK" value={data.yes_ask} color="#22C55E" />
          <PriceCell label="SPREAD" value={data.spread} />
        </View>
        <View style={liveStyles.priceRow}>
          <PriceCell label="NO BID" value={data.no_bid} color="#EF4444" />
          <PriceCell label="NO ASK" value={data.no_ask} color="#EF4444" />
          <PriceCell label="LAST" value={data.last_price} />
        </View>
      </View>
      <BeginnerTip
        show={beginnerMode}
        text="BID = highest someone will pay. ASK = lowest someone will sell for. SPREAD = gap between them — smaller is easier to trade."
      />

      {/* Volume row */}
      {(data.volume != null || data.open_interest != null) && (
        <View style={liveStyles.volumeRow}>
          {data.volume != null && (
            <View style={liveStyles.volumeItem}>
              <Text style={liveStyles.volumeLabel}>Volume</Text>
              <Text style={liveStyles.volumeValue}>{data.volume.toLocaleString()}</Text>
            </View>
          )}
          {data.volume_24h != null && (
            <View style={liveStyles.volumeItem}>
              <Text style={liveStyles.volumeLabel}>24h Vol</Text>
              <Text style={liveStyles.volumeValue}>{data.volume_24h.toLocaleString()}</Text>
            </View>
          )}
          {data.open_interest != null && (
            <View style={liveStyles.volumeItem}>
              <Text style={liveStyles.volumeLabel}>Open Interest</Text>
              <Text style={liveStyles.volumeValue}>{data.open_interest.toLocaleString()}</Text>
            </View>
          )}
        </View>
      )}
      <BeginnerTip
        show={beginnerMode && (data.volume != null || data.open_interest != null)}
        text="Volume = how many contracts traded. Open Interest = contracts still active (not settled yet)."
      />

      {/* Orderbook depth bar */}
      {data.yes_depth != null && data.no_depth != null && (
        <DepthBar yesDepth={data.yes_depth} noDepth={data.no_depth} />
      )}
      <BeginnerTip
        show={beginnerMode && data.yes_depth != null && data.no_depth != null}
        text="Orderbook depth = how much money is lined up on each side."
      />

      {/* Event context */}
      {data.event_title && (
        <View style={liveStyles.eventContext}>
          <Text style={liveStyles.eventLabel}>Event</Text>
          <Text style={liveStyles.eventTitle}>{data.event_title}</Text>
          {data.related_market_count != null && data.related_market_count > 1 && (
            <Text style={liveStyles.eventSub}>
              {data.related_market_count} related markets
              {data.mutually_exclusive ? " · mutually exclusive" : ""}
            </Text>
          )}
        </View>
      )}
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
  const [accepted, setAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(BEGINNER_MODE_KEY).then((v) => {
      if (v === "true") setBeginnerMode(true);
    });
  }, []);

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
          {prediction.error_message && (
            <Text style={styles.errorDetail}>{prediction.error_message}</Text>
          )}
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
  const positionPct = ((rec.recommended_position ?? 0) * 100).toFixed(0);

  const evScenarios = rec.ev_analysis ?? [];
  const factors = rec.factors ?? [];

  const bestEv =
    evScenarios.length > 0
      ? Math.max(...evScenarios.map((e) => e.ev_per_contract))
      : 0;
  const maxKelly =
    evScenarios.length > 0
      ? Math.max(...evScenarios.map((e) => e.kelly_fraction))
      : 0;

  // Count factor directions
  const yesFactors = factors.filter((f) => f.direction === "favors_yes").length;
  const noFactors = factors.filter((f) => f.direction === "favors_no").length;

  const toggleBeginner = () => {
    const next = !beginnerMode;
    setBeginnerMode(next);
    AsyncStorage.setItem(BEGINNER_MODE_KEY, next ? "true" : "false");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ═══ Beginner Toggle ═══ */}
      <Pressable style={styles.beginnerToggle} onPress={toggleBeginner}>
        <Ionicons
          name={beginnerMode ? "bulb" : "bulb-outline"}
          size={16}
          color={beginnerMode ? "#818CF8" : "#475569"}
        />
        <Text style={[styles.beginnerToggleText, beginnerMode && { color: "#818CF8" }]}>
          Explain
        </Text>
        <View style={[styles.beginnerDot, beginnerMode && styles.beginnerDotOn]} />
      </Pressable>

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
          <BeginnerTip
            show={beginnerMode}
            text="The model doesn't see a good bet here — the market price looks about right."
          />
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
          <BeginnerTip
            show={beginnerMode}
            text={`The model thinks you should bet ${rec.side.toUpperCase()} on this question. The EV pill shows expected profit per contract if the model is right.`}
          />

          {/* Ticker + title */}
          <Text style={styles.tradeTicker}>{rec.ticker}</Text>
          {rec.title && <Text style={styles.tradeTitle}>{rec.title}</Text>}
          <BeginnerTip
            show={beginnerMode}
            text="The ticker is this market's ID on Kalshi, like a stock ticker symbol."
          />

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
                {positionPct}% = {(((rec.recommended_position ?? 0) / (maxKelly || 1)) * 100).toFixed(0)}% Kelly
              </Text>
            </View>
          </View>
          <BeginnerTip
            show={beginnerMode}
            text={`Confidence = how sure the model is (${confidencePct}% means it thinks there's a ${confidencePct}-in-100 chance it's correct). Size = how much of your money to risk. Full Kelly = the mathematically optimal bet size — the recommended size is usually smaller to reduce risk.`}
          />
        </View>
      )}

      {/* ═══ Accept / Reject ═══ */}
      {!rec.no_bet && (
        <View style={styles.acceptRow}>
          {accepted ? (
            <View style={styles.acceptedBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.acceptedText}>Trade accepted &amp; logged</Text>
            </View>
          ) : (
            <>
              <Pressable
                style={styles.acceptButton}
                disabled={accepting}
                onPress={() => {
                  setAccepted(true);
                }}
              >
                {accepting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.acceptButtonText}>Accept Trade</Text>
                  </>
                )}
              </Pressable>
              <Pressable style={styles.rejectButton} onPress={onReset}>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Pass</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* ═══ WHY — The reasoning ═══ */}
      <ToggleSection
        title="Why this trade"
        icon="bulb-outline"
        defaultOpen
        beginnerTip={
          <BeginnerTip
            show={beginnerMode}
            text="The model's main argument for why this bet is worth taking."
          />
        }
      >
        <Text style={styles.bodyText}>{rec.reasoning}</Text>
      </ToggleSection>

      {/* ═══ EDGE — Factor breakdown ═══ */}
      {factors.length > 0 && (
        <ToggleSection
          title="Edge breakdown"
          icon="stats-chart-outline"
          defaultOpen
          badge={{
            text: `${yesFactors} YES / ${noFactors} NO`,
            color: yesFactors > noFactors ? "#22C55E" : "#EF4444",
          }}
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="Specific facts the model found. Green ↑ = supports the bet. Red ↓ = argues against. More dots = stronger signal."
            />
          }
        >
          {factors.map((f, i) => (
            <FactorRow key={i} factor={f} />
          ))}
        </ToggleSection>
      )}

      {/* ═══ SIZING — EV at different probs ═══ */}
      {evScenarios.length > 0 && (
        <ToggleSection
          title="Sizing scenarios"
          icon="resize-outline"
          badge={{
            text: `best +${bestEv.toFixed(2)}c`,
            color: "#22C55E",
          }}
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="What happens if the model's probability estimate is off. Green EV = still profitable. Kelly = suggested bet size at that probability."
            />
          }
        >
          <Text style={styles.evExplainer}>
            If your true probability estimate is wrong, here's how the trade looks at different levels.
            Positive EV = mispricing in your favor.
          </Text>
          <EvTable scenarios={evScenarios} side={rec.side} />
        </ToggleSection>
      )}

      {/* ═══ WHAT KILLS YOU — Bear case ═══ */}
      {rec.bear_case && (
        <ToggleSection
          title="What kills this trade"
          icon="skull-outline"
          beginnerTip={
            <BeginnerTip
              show={beginnerMode}
              text="The strongest argument AGAINST this bet. Read this before putting money down."
            />
          }
        >
          <View style={styles.bearCard}>
            <Text style={styles.bodyText}>{rec.bear_case}</Text>
          </View>
        </ToggleSection>
      )}

      {/* ═══ Live Market Data ═══ */}
      {prediction.market_data && (
        <ToggleSection
          title="Live market data"
          icon="pulse-outline"
          badge={
            prediction.market_data.status === "found"
              ? { text: "LIVE", color: "#22C55E" }
              : prediction.market_data.status === "not_found"
                ? { text: "NOT FOUND", color: "#EAB308" }
                : { text: "ERROR", color: "#64748B" }
          }
        >
          <LiveMarketSection data={prediction.market_data} beginnerMode={beginnerMode} />
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
        <KeyboardAvoidingView
          style={styles.editBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setEditVisible(false)}
          />
          <View style={styles.editSheet}>
            <View style={styles.editHandle} />
            <KeyboardAwareScrollView
              enableOnAndroid
              extraScrollHeight={20}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
            </KeyboardAwareScrollView>
          </View>
        </KeyboardAvoidingView>
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

  // ── Beginner Toggle ──
  beginnerToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  beginnerToggleText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  beginnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  beginnerDotOn: {
    backgroundColor: "#818CF8",
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

  // ── Accept / Reject ──
  acceptRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  acceptedBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(34,197,94,0.08)",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.2)",
  },
  acceptedText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.08)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  rejectButtonText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "600",
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
    marginBottom: 12,
  },
  errorDetail: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
});

// ── Live Market Data Styles ──

const liveStyles = StyleSheet.create({
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(234,179,8,0.06)",
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    color: "#EAB308",
    fontSize: 13,
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceGrid: {
    gap: 6,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    gap: 6,
  },
  priceCell: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  priceCellLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceCellValue: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "800",
  },
  volumeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  volumeItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    paddingVertical: 8,
  },
  volumeLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  volumeValue: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
  depthContainer: {
    marginBottom: 14,
  },
  depthLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  depthBarTrack: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  depthBarYes: {
    backgroundColor: "#22C55E",
  },
  depthBarNo: {
    backgroundColor: "#EF4444",
  },
  depthLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  depthLegendYes: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "700",
  },
  depthLegendNo: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "700",
  },
  eventContext: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 12,
  },
  eventLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  eventTitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  eventSub: {
    color: "#475569",
    fontSize: 11,
    marginTop: 4,
  },
});
