import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import {
  getPortfolioBalance,
  getIntegrations,
  getMarkets,
} from "@/lib/api";
import { AggregatedPortfolio, Integration, KalshiMarket } from "@/lib/types";
import MarketCard from "@/components/MarketCard";
import { useRouter } from "expo-router";

const USER_ID = "demo-user-1";

type SortOption = "volume" | "price_high" | "price_low" | "change";

export default function DashboardScreen() {
  const [portfolio, setPortfolio] = useState<AggregatedPortfolio | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortOption>("volume");
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [bal, intgs, mkts] = await Promise.all([
        getPortfolioBalance(USER_ID).catch(() => null),
        getIntegrations(USER_ID).catch(() => [] as Integration[]),
        getMarkets(200).catch(() => [] as KalshiMarket[]),
      ]);
      if (bal) setPortfolio(bal);
      setIntegrations(intgs);
      setMarkets(mkts);
    } catch {
      // silent
    } finally {
      setLoadingMarkets(false);
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

  const hasIntegrations = integrations.length > 0;

  // Sort markets
  const sortedMarkets = [...markets].sort((a, b) => {
    switch (sort) {
      case "volume":
        return (b.volume_24h ?? 0) - (a.volume_24h ?? 0);
      case "price_high":
        return (b.last_price ?? 0) - (a.last_price ?? 0);
      case "price_low":
        return (a.last_price ?? 0) - (b.last_price ?? 0);
      case "change": {
        const deltaA =
          a.last_price != null && a.previous_price != null
            ? Math.abs(a.last_price - a.previous_price)
            : 0;
        const deltaB =
          b.last_price != null && b.previous_price != null
            ? Math.abs(b.last_price - b.previous_price)
            : 0;
        return deltaB - deltaA;
      }
      default:
        return 0;
    }
  });

  const handleMarketPress = (market: KalshiMarket) => {
    WebBrowser.openBrowserAsync(`https://kalshi.com/markets/${market.ticker}`);
  };

  type Section =
    | { title: string; type: "portfolio"; data: [null] }
    | { title: string; type: "markets"; data: KalshiMarket[] };

  const sections: Section[] = [];
  sections.push({ title: "Portfolio", type: "portfolio", data: [null] });
  if (sortedMarkets.length > 0) {
    sections.push({
      title: "Live Markets",
      type: "markets",
      data: sortedMarkets,
    });
  }

  return (
    <SectionList
      style={styles.container}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item, index) => {
        if (item === null) return "portfolio";
        return (item as KalshiMarket).ticker + index;
      }}
      renderItem={({ item, section }) => {
        if ((section as Section).type === "portfolio") {
          return (
            <View>
              {/* Total value */}
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Total Value</Text>
                <Text style={styles.cardValueLarge}>
                  ${portfolio ? portfolio.total_value.toFixed(2) : "0.00"}
                </Text>
              </View>

              {/* Balance breakdown */}
              <View style={styles.row}>
                <View style={[styles.card, styles.halfCard]}>
                  <Text style={styles.cardLabel}>Available</Text>
                  <Text style={[styles.cardValue, styles.greenText]}>
                    ${portfolio ? portfolio.available_balance.toFixed(2) : "0.00"}
                  </Text>
                </View>
                <View style={[styles.card, styles.halfCard]}>
                  <Text style={styles.cardLabel}>In Positions</Text>
                  <Text style={[styles.cardValue, styles.blueText]}>
                    ${portfolio ? portfolio.total_payout.toFixed(2) : "0.00"}
                  </Text>
                </View>
              </View>

              {/* Platform cards */}
              {integrations.map((intg) => (
                <View key={intg.platform_account} style={styles.card}>
                  <View style={styles.platformHeader}>
                    <View style={styles.platformLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          intg.status === "active"
                            ? styles.statusActive
                            : styles.statusError,
                        ]}
                      />
                      <Text style={styles.platformName}>
                        Kalshi (
                        {intg.account_type === "agent"
                          ? "AI Agent"
                          : "Personal"}
                        )
                      </Text>
                    </View>
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                </View>
              ))}

              {hasIntegrations && (
                <Pressable
                  style={styles.depositButton}
                  onPress={() =>
                    WebBrowser.openBrowserAsync(
                      "https://kalshi.com/account/wallet"
                    )
                  }
                >
                  <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.depositText}>Deposit on Kalshi</Text>
                </Pressable>
              )}

              {!hasIntegrations && (
                <View style={styles.emptyCard}>
                  <Ionicons name="link-outline" size={40} color="#475569" />
                  <Text style={styles.emptyTitle}>
                    No platforms connected
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    Go to Settings to connect your Kalshi account
                  </Text>
                  <Pressable
                    style={styles.connectButton}
                    onPress={() => router.push("/(tabs)/settings")}
                  >
                    <Text style={styles.connectButtonText}>
                      Connect a Platform
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }

        return (
          <MarketCard
            market={item as KalshiMarket}
            onPress={handleMarketPress}
          />
        );
      }}
      renderSectionHeader={({ section }) => {
        if ((section as Section).type === "portfolio") {
          return <Text style={styles.heading}>Portfolio</Text>;
        }
        return (
          <View style={styles.marketHeader}>
            <Text style={styles.sectionTitle}>
              Live Markets ({markets.length})
            </Text>
            {/* Sort pills */}
            <View style={styles.sortRow}>
              {(
                [
                  { key: "volume", label: "Hot" },
                  { key: "change", label: "Movers" },
                  { key: "price_high", label: "High" },
                  { key: "price_low", label: "Low" },
                ] as { key: SortOption; label: string }[]
              ).map((s) => (
                <Pressable
                  key={s.key}
                  style={[
                    styles.sortPill,
                    sort === s.key && styles.sortPillActive,
                  ]}
                  onPress={() => setSort(s.key)}
                >
                  <Text
                    style={[
                      styles.sortPillText,
                      sort === s.key && styles.sortPillTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        loadingMarkets ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#6366F1" />
            <Text style={styles.loadingText}>Loading markets...</Text>
          </View>
        ) : markets.length === 0 ? (
          <View style={styles.emptyMarkets}>
            <Ionicons name="bar-chart-outline" size={32} color="#475569" />
            <Text style={styles.emptyMarketsText}>
              No open markets available
            </Text>
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#6366F1"
        />
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
    paddingBottom: 100,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
  },

  // ── Cards ──
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
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
  cardValueLarge: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "700",
  },
  cardValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
  },
  greenText: {
    color: "#4ADE80",
  },
  blueText: {
    color: "#60A5FA",
  },

  // ── Platform ──
  platformHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  platformLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusActive: {
    backgroundColor: "#22C55E",
  },
  statusError: {
    backgroundColor: "#EF4444",
  },
  platformName: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "600",
  },
  connectedText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "600",
  },
  depositButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  depositText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Empty ──
  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
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
    marginBottom: 20,
  },
  connectButton: {
    backgroundColor: "#6366F1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Markets Section ──
  marketHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  sortPillActive: {
    backgroundColor: "rgba(99,102,241,0.15)",
    borderColor: "#6366F1",
  },
  sortPillText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  sortPillTextActive: {
    color: "#818CF8",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 14,
  },
  emptyMarkets: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyMarketsText: {
    color: "#64748B",
    fontSize: 14,
  },
});
