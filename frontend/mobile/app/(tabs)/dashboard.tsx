import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMarkets } from "@/lib/api";
import { KalshiMarket } from "@/lib/types";
import MarketCard, { CATEGORY_COLORS } from "@/components/MarketCard";

export default function DashboardScreen() {
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const mkts = await getMarkets(100);
      setMarkets(mkts);
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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    markets.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [markets]);

  const filtered = useMemo(
    () =>
      selectedCategory
        ? markets.filter((m) => m.category === selectedCategory)
        : markets,
    [markets, selectedCategory]
  );

  const header = (
    <View>
      <Text style={styles.heading}>Markets</Text>
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            style={[
              styles.filterChip,
              !selectedCategory && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons
              name="filter"
              size={13}
              color={!selectedCategory ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.filterChipText,
                !selectedCategory && styles.filterChipTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            const accent = CATEGORY_COLORS[cat] ?? "#6366F1";
            return (
              <Pressable
                key={cat}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: accent + "30", borderColor: accent + "60" },
                ]}
                onPress={() =>
                  setSelectedCategory(active ? null : cat)
                }
              >
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: accent },
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    active && { color: accent },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filtered}
      keyExtractor={(item) => item.ticker}
      renderItem={({ item }) => <MarketCard market={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6366F1" />
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {selectedCategory
                ? `No ${selectedCategory} markets`
                : "No markets available"}
            </Text>
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
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
    padding: 16,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  filterChipActive: {
    backgroundColor: "#6366F130",
    borderColor: "#6366F160",
  },
  filterChipText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  center: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
  },
});
