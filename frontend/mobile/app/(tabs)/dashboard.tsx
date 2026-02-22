import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { getTradesByUser } from "@/lib/api";
import { TradeLog } from "@/lib/types";

export default function DashboardScreen() {
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const data = await getTradesByUser("demo-user-1");
      setTrades(data);
    } catch {
      // silently fail on dashboard load
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalCost = trades.reduce((sum, t) => sum + t.total_cost, 0);
  const filledTrades = trades.filter((t) => t.status === "filled");
  const pendingTrades = trades.filter((t) => t.status === "pending");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
      }
    >
      <Text style={styles.greeting}>Portfolio</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Deployed</Text>
        <Text style={styles.cardValue}>
          ${(totalCost / 100).toFixed(2)}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardLabel}>Filled</Text>
          <Text style={[styles.cardValue, styles.greenText]}>
            {filledTrades.length}
          </Text>
        </View>
        <View style={[styles.card, styles.halfCard]}>
          <Text style={styles.cardLabel}>Pending</Text>
          <Text style={[styles.cardValue, styles.yellowText]}>
            {pendingTrades.length}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Agent Status</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Idle</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Total Trades</Text>
        <Text style={styles.cardValue}>{trades.length}</Text>
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
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 8,
  },
  cardValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  greenText: {
    color: "#4ADE80",
  },
  yellowText: {
    color: "#FACC15",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#64748B",
  },
  statusText: {
    color: "#94A3B8",
    fontSize: 18,
    fontWeight: "600",
  },
});
