import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getTrade } from "@/lib/api";
import { TradeLog } from "@/lib/types";

const statusColors: Record<string, string> = {
  filled: "#4ADE80",
  pending: "#FACC15",
  canceled: "#F87171",
};

export default function TradeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tradeId = typeof id === "string" ? id : "";
  const [trade, setTrade] = useState<TradeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tradeId) return;
    getTrade(tradeId)
      .then(setTrade)
      .catch((e) => setError(e.message ?? "Failed to load trade"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error || !trade) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Trade not found"}</Text>
      </View>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: "Trade ID", value: trade.trade_id },
    { label: "Ticker", value: trade.ticker },
    { label: "Side", value: trade.side.toUpperCase() },
    { label: "Action", value: trade.action.toUpperCase() },
    { label: "Quantity", value: String(trade.quantity) },
    { label: "Price", value: `${trade.price}¢ per contract` },
    { label: "Total Cost", value: `$${(trade.total_cost / 100).toFixed(2)}` },
    { label: "Status", value: trade.status },
    {
      label: "Created",
      value: new Date(trade.created_at).toLocaleString(),
    },
    ...(trade.filled_at
      ? [{ label: "Filled", value: new Date(trade.filled_at).toLocaleString() }]
      : []),
    ...(trade.agent_id ? [{ label: "Agent ID", value: trade.agent_id }] : []),
    { label: "User ID", value: trade.user_id },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.ticker}>{trade.ticker}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                (statusColors[trade.status as keyof typeof statusColors] ?? "#64748B") + "22",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColors[trade.status as keyof typeof statusColors] ?? "#64748B" },
            ]}
          >
            {trade.status}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>
        {trade.action.toUpperCase()} {trade.quantity}x {trade.side.toUpperCase()}{" "}
        @ {trade.price}¢
      </Text>

      <View style={styles.table}>
        {rows.map(({ label, value }) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          </View>
        ))}
      </View>
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
  },
  center: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#F87171",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticker: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  summary: {
    color: "#94A3B8",
    fontSize: 16,
    marginBottom: 24,
  },
  table: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0B1120",
  },
  label: {
    color: "#94A3B8",
    fontSize: 14,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
});
