import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getSnapshotsByTicker } from "../../../lib/api";
import { Snapshot } from "../../../lib/types";

export default function SnapshotDetail() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    getSnapshotsByTicker(ticker)
      .then(setSnapshots)
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{ticker}</Text>
      {snapshots.length === 0 ? (
        <Text style={styles.emptyText}>No snapshots for this ticker</Text>
      ) : (
        snapshots.map((snap, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardDate}>
              {new Date(snap.created_at).toLocaleString()}
            </Text>
            <Text style={styles.cardData}>
              {JSON.stringify(snap.snapshot_data, null, 2)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  emptyText: {
    color: "#475569",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardDate: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 8,
  },
  cardData: {
    color: "#CBD5E1",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
