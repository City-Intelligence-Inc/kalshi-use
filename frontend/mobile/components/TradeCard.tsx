import { View, Text, Pressable, StyleSheet } from "react-native";
import { TradeLog } from "@/lib/types";

interface TradeCardProps {
  trade: TradeLog;
  onPress?: () => void;
}

const statusColors: Record<string, string> = {
  filled: "#4ADE80",
  pending: "#FACC15",
  canceled: "#F87171",
};

export default function TradeCard({ trade, onPress }: TradeCardProps) {
  const date = new Date(trade.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.ticker}>{trade.ticker}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: (statusColors[trade.status as keyof typeof statusColors] ?? "#64748B") + "22" },
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

      <View style={styles.details}>
        <Text style={styles.actionText}>
          {trade.action.toUpperCase()} {trade.quantity}x {trade.side.toUpperCase()}{" "}
          @ {trade.price}¢
        </Text>
        <Text style={styles.costText}>
          ${(trade.total_cost / 100).toFixed(2)}
        </Text>
      </View>

      <Text style={styles.date}>{date}</Text>
    </Pressable>
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  actionText: {
    color: "#CBD5E1",
    fontSize: 14,
  },
  costText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  date: {
    color: "#64748B",
    fontSize: 12,
  },
});
