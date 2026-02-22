import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getTradesByUser } from "@/lib/api";
import { TradeLog } from "@/lib/types";
import TradeCard from "@/components/TradeCard";

export default function TradesScreen() {
  const router = useRouter();
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTrades = useCallback(async () => {
    try {
      const data = await getTradesByUser("demo-user-1");
      setTrades(data.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch {
      // will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadTrades();
    setRefreshing(false);
  }

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trades}
        keyExtractor={(item) => item.trade_id}
        renderItem={({ item }) => (
          <TradeCard
            trade={item}
            onPress={() =>
              router.push({
                pathname: "/trade/[id]",
                params: { id: item.trade_id },
              })
            }
          />
        )}
        contentContainerStyle={
          trades.length === 0 ? styles.center : styles.list
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>↕</Text>
            <Text style={styles.emptyTitle}>No trades yet</Text>
            <Text style={styles.emptyDesc}>
              Start your agent to begin trading
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  center: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    color: "#334155",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "#64748B",
    fontSize: 14,
  },
});
