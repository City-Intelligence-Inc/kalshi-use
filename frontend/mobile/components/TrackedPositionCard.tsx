import { View, Text, Pressable, StyleSheet, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrackedPosition } from "../lib/types";
import { closeTrackedPosition } from "../lib/api";

interface Props {
  position: TrackedPosition;
  onClosed?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TrackedPositionCard({ position, onClosed }: Props) {
  const isActive = position.status === "active";
  const isWin = position.status === "settled_win";
  const isLoss = position.status === "settled_loss";
  const isSettled = isWin || isLoss;

  const sideColor = position.side === "yes" ? "#22C55E" : "#EF4444";

  const pnl = isSettled ? position.realized_pnl : position.unrealized_pnl;
  const pnlColor =
    pnl == null ? "#64748B" : pnl >= 0 ? "#22C55E" : "#EF4444";
  const pnlSign = pnl != null && pnl >= 0 ? "+" : "";
  const pnlLabel = isSettled ? "Realized" : "Unrealized";

  const handleClose = () => {
    Alert.alert("Close Position", "Remove this tracked position?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Close",
        style: "destructive",
        onPress: async () => {
          try {
            await closeTrackedPosition(position.position_id);
            onClosed?.();
          } catch {
            Alert.alert("Error", "Failed to close position");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      {/* Header: ticker + side badge + status */}
      <View style={styles.header}>
        <Text style={styles.ticker} numberOfLines={1}>
          {position.ticker}
        </Text>
        <View style={[styles.sideBadge, { backgroundColor: sideColor + "20" }]}>
          <Text style={[styles.sideBadgeText, { color: sideColor }]}>
            {position.side.toUpperCase()}
          </Text>
        </View>
        {isSettled && (
          <View
            style={[
              styles.settleBadge,
              { backgroundColor: isWin ? "#22C55E20" : "#EF444420" },
            ]}
          >
            <Text
              style={[
                styles.settleBadgeText,
                { color: isWin ? "#22C55E" : "#EF4444" },
              ]}
            >
              {isWin ? "WIN" : "LOSS"}
            </Text>
          </View>
        )}
        {isActive && (
          <View style={styles.liveDot} />
        )}
      </View>

      {/* Title */}
      {position.title && (
        <Text style={styles.title} numberOfLines={2}>
          {position.title}
        </Text>
      )}

      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Entry</Text>
          <Text style={styles.priceValue}>{position.entry_price}c</Text>
        </View>
        {position.current_price != null && (
          <>
            <Ionicons name="arrow-forward" size={14} color="#475569" style={{ marginTop: 14 }} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>
                {isSettled ? "Settlement" : "Current"}
              </Text>
              <Text style={styles.priceValue}>{position.current_price}c</Text>
            </View>
          </>
        )}
        <View style={{ flex: 1 }} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{pnlLabel} P&L</Text>
          <Text style={[styles.pnlValue, { color: pnlColor }]}>
            {pnl != null ? `${pnlSign}${pnl.toFixed(1)}c` : "--"}
          </Text>
        </View>
      </View>

      {/* Meta row: model badge + confidence + time */}
      <View style={styles.metaRow}>
        {position.model && (
          <View style={styles.modelBadge}>
            <Text style={styles.modelText}>{position.model}</Text>
          </View>
        )}
        {position.confidence != null && (
          <Text style={styles.metaText}>
            {(position.confidence * 100).toFixed(0)}% conf
          </Text>
        )}
        <Text style={styles.metaText}>{timeAgo(position.created_at)}</Text>
        <View style={{ flex: 1 }} />
        {isActive && (
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={20} color="#475569" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ticker: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  settleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  settleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  title: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  priceItem: {
    alignItems: "center",
  },
  priceLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceValue: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "700",
  },
  pnlValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 10,
  },
  modelBadge: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modelText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  metaText: {
    color: "#475569",
    fontSize: 11,
  },
});
