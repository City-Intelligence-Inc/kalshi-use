import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BotSignal } from "@/lib/types";
import { acceptTrade } from "@/lib/api";

interface Props {
  signal: BotSignal;
}

export default function BotSignalCard({ signal }: Props) {
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState<string | null>(null);

  const sideColor = signal.side === "yes" ? "#22C55E" : "#EF4444";
  const matchPct = Math.round(signal.confidence * 100);
  const yesPrice = signal.current_price ?? 50;
  const noPrice = 100 - yesPrice;

  const handleTrack = async (side: "yes" | "no") => {
    setTracking(true);
    try {
      const price = side === "yes" ? yesPrice : noPrice;
      await acceptTrade({
        user_id: "demo-user-1",
        ticker: signal.ticker,
        side,
        entry_price: price,
        title: signal.title,
        model: "bot",
        confidence: signal.confidence,
      });
      setTracked(side);
      setTimeout(() => setTracked(null), 2000);
    } catch {
      // silent
    } finally {
      setTracking(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header: BOT PICK badge + match score */}
      <View style={styles.headerRow}>
        <View style={styles.botBadge}>
          <Ionicons name="hardware-chip" size={12} color="#6366F1" />
          <Text style={styles.botBadgeText}>BOT PICK</Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{matchPct}% match</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {signal.title}
      </Text>

      {/* Strategy line */}
      <View style={[styles.strategyBox, { borderLeftColor: sideColor }]}>
        <Text style={styles.strategyText}>
          BUY {signal.side.toUpperCase()} @ {signal.entry_price_suggestion}
          {"\u00A2"}
        </Text>
      </View>

      {/* Reasoning */}
      <Text style={styles.reasoning}>{signal.reasoning}</Text>

      {/* Category + ticker */}
      <View style={styles.metaRow}>
        {signal.category && (
          <View style={styles.catPill}>
            <Text style={styles.catText}>{signal.category}</Text>
          </View>
        )}
        <Text style={styles.ticker}>{signal.ticker}</Text>
      </View>

      {/* Track buttons */}
      {tracked ? (
        <View style={styles.trackedRow}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.trackedText}>Position tracked!</Text>
        </View>
      ) : (
        <View style={styles.trackRow}>
          <Pressable
            style={[styles.trackBtn, styles.trackYes]}
            onPress={() => handleTrack("yes")}
            disabled={tracking}
          >
            {tracking ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <Text style={styles.trackYesText}>
                Track YES @ {yesPrice}
                {"\u00A2"}
              </Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.trackBtn, styles.trackNo]}
            onPress={() => handleTrack("no")}
            disabled={tracking}
          >
            {tracking ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.trackNoText}>
                Track NO @ {noPrice}
                {"\u00A2"}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#6366F130",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  botBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6366F118",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  botBadgeText: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  matchBadge: {
    backgroundColor: "#22C55E15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  matchText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginBottom: 10,
  },
  strategyBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 6,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  strategyText: {
    color: "#F1F5F9",
    fontSize: 14,
    fontWeight: "800",
  },
  reasoning: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  catPill: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
  ticker: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  trackRow: {
    flexDirection: "row",
    gap: 8,
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  trackYes: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  trackNo: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  trackYesText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
  },
  trackNoText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  trackedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  trackedText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
  },
});
