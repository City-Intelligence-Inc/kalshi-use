import { View, Text, StyleSheet } from "react-native";
import { KalshiFill } from "../lib/types";

interface Props {
  fill: KalshiFill;
}

export default function FillCard({ fill }: Props) {
  const isBuy = fill.action.toLowerCase() === "buy";
  const actionColor = isBuy ? "#22C55E" : "#EF4444";
  const sideUpper = fill.side.toUpperCase();

  // Format timestamp
  const date = fill.created_time
    ? new Date(fill.created_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.ticker} numberOfLines={1}>
          {fill.ticker}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: actionColor + "20" }]}>
          <Text style={[styles.badgeText, { color: actionColor }]}>
            {fill.action.toUpperCase()}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sideUpper}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Contracts</Text>
          <Text style={styles.statValue}>{fill.count}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>YES Price</Text>
          <Text style={styles.statValue}>{fill.yes_price}¢</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>NO Price</Text>
          <Text style={styles.statValue}>{fill.no_price}¢</Text>
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticker: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  date: {
    color: "#64748B",
    fontSize: 12,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#334155",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: {
    color: "#CBD5E1",
    fontSize: 15,
    fontWeight: "600",
  },
});
