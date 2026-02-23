import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getBotProgress } from "@/lib/api";
import { UserProgress } from "@/lib/types";

const USER_ID = "demo-user-1";

export default function BotScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const prog = await getBotProgress(USER_ID);
      setProgress(prog);
    } catch {
      // silent
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const balance = progress
    ? (progress.paper_balance / 100).toFixed(2)
    : "100.00";

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
      <Text style={styles.heading}>Your Bot</Text>

      {/* Balance + Streak row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Paper Balance</Text>
          <Text style={styles.statValue}>${balance}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Streak</Text>
          <Text style={styles.statValue}>
            {progress?.current_streak ?? 0}d
          </Text>
        </View>
      </View>

      {/* Milestones */}
      <Text style={styles.sectionTitle}>Milestones</Text>
      {progress?.milestones.map((m) => {
        const done = m.completed;
        const pct = m.target > 0 ? Math.min(1, m.current / m.target) : 0;
        return (
          <View key={m.id} style={styles.milestone}>
            <Ionicons
              name={done ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={done ? "#22C55E" : "#334155"}
            />
            <View style={styles.milestoneText}>
              <Text style={[styles.milestoneName, done && styles.done]}>
                {m.name}
              </Text>
              <View style={styles.bar}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct * 100}%`,
                      backgroundColor: done ? "#22C55E" : "#6366F1",
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.counter, done && { color: "#22C55E" }]}>
              {m.current}/{m.target}
            </Text>
          </View>
        );
      })}

      {!progress && (
        <View style={styles.loading}>
          <Ionicons name="hardware-chip-outline" size={32} color="#334155" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  milestoneText: {
    flex: 1,
  },
  milestoneName: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  done: {
    color: "#22C55E",
  },
  bar: {
    height: 4,
    backgroundColor: "#1E293B",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  counter: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  loading: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  loadingText: {
    color: "#475569",
    fontSize: 14,
  },
});
