import { View, Text, StyleSheet } from "react-native";
import { KalshiPosition } from "../lib/types";

interface Props {
  position: KalshiPosition;
}

export default function PositionCard({ position }: Props) {
  const pnlColor = position.realized_pnl >= 0 ? "#22C55E" : "#EF4444";
  const pnlSign = position.realized_pnl >= 0 ? "+" : "";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.ticker} numberOfLines={1}>
          {position.ticker}
        </Text>
        {position.resting_orders_count > 0 && (
          <View style={styles.ordersBadge}>
            <Text style={styles.ordersText}>
              {position.resting_orders_count} open
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {position.market_title}
      </Text>

      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>YES</Text>
          <Text style={styles.statValue}>{position.yes_count}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>NO</Text>
          <Text style={styles.statValue}>{position.no_count}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Exposure</Text>
          <Text style={styles.statValue}>
            ${position.market_exposure.toFixed(2)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>P&L</Text>
          <Text style={[styles.statValue, { color: pnlColor }]}>
            {pnlSign}${Math.abs(position.realized_pnl).toFixed(2)}
          </Text>
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
    marginBottom: 4,
  },
  ticker: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  ordersBadge: {
    backgroundColor: "#334155",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ordersText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  title: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 12,
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
