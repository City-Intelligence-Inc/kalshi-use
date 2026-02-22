import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getPositions, getTrackedPositions } from "@/lib/api";
import { KalshiPosition, TrackedPosition } from "@/lib/types";
import PositionCard from "@/components/PositionCard";
import TrackedPositionCard from "@/components/TrackedPositionCard";

const USER_ID = "demo-user-1";
const REFRESH_INTERVAL = 30_000;

type Section =
  | { title: string; type: "tracked"; data: TrackedPosition[] }
  | { title: string; type: "live"; data: KalshiPosition[] };

export default function PositionsScreen() {
  const [tracked, setTracked] = useState<TrackedPosition[]>([]);
  const [live, setLive] = useState<KalshiPosition[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [trackedData, liveData] = await Promise.all([
        getTrackedPositions(USER_ID).catch(() => [] as TrackedPosition[]),
        getPositions(USER_ID).catch(() => [] as KalshiPosition[]),
      ]);
      setTracked(trackedData);
      setLive(liveData);
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

  // Load on focus + auto-refresh every 30s while focused
  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }, [loadData])
  );

  const isEmpty = !loading && tracked.length === 0 && live.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={48} color="#475569" />
        <Text style={styles.emptyTitle}>No positions yet</Text>
        <Text style={styles.emptySubtitle}>
          Accept a prediction to start tracking, or connect your Kalshi account
        </Text>
      </View>
    );
  }

  const sections: Section[] = [];
  if (tracked.length > 0) {
    sections.push({ title: "Tracked", type: "tracked", data: tracked });
  }
  if (live.length > 0) {
    sections.push({ title: "Live Positions", type: "live", data: live });
  }

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item, index) => {
        if ("position_id" in item) return item.position_id;
        return (item as KalshiPosition).ticker + index;
      }}
      renderItem={({ item, section }) => {
        if ((section as Section).type === "tracked") {
          return (
            <TrackedPositionCard
              position={item as TrackedPosition}
              onClosed={loadData}
            />
          );
        }
        return <PositionCard position={item as KalshiPosition} />;
      }}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>
          {section.title} ({section.data.length})
        </Text>
      )}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
      }
      ListHeaderComponent={
        <Text style={styles.heading}>Positions</Text>
      }
      stickySectionHeadersEnabled={false}
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
  sectionHeader: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
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
