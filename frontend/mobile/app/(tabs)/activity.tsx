import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFills } from "@/lib/api";
import { KalshiFill } from "@/lib/types";
import FillCard from "@/components/FillCard";

const USER_ID = "demo-user-1";

export default function ActivityScreen() {
  const [fills, setFills] = useState<KalshiFill[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getFills(USER_ID);
      setFills(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!loading && fills.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={48} color="#475569" />
        <Text style={styles.emptyTitle}>No recent activity</Text>
        <Text style={styles.emptySubtitle}>
          Your Kalshi trades will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={fills}
      keyExtractor={(item) => item.trade_id}
      renderItem={({ item }) => <FillCard fill={item} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
      }
      ListHeaderComponent={
        <Text style={styles.heading}>Activity</Text>
      }
    />
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    color: "#CBD5E1",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
});
