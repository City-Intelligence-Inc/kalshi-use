import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { getPortfolioBalance, getIntegrations } from "@/lib/api";
import { AggregatedPortfolio, Integration } from "@/lib/types";
import { useRouter } from "expo-router";

const USER_ID = "demo-user-1";

export default function DashboardScreen() {
  const [portfolio, setPortfolio] = useState<AggregatedPortfolio | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [bal, intgs] = await Promise.all([
        getPortfolioBalance(USER_ID),
        getIntegrations(USER_ID),
      ]);
      setPortfolio(bal);
      setIntegrations(intgs);
    } catch {
      // silent on dashboard load
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
      <Text style={styles.heading}>Portfolio</Text>

      {/* Total value card */}
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
                Kalshi ({intg.account_type === "agent" ? "AI Agent" : "Personal"})
              </Text>
            </View>
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        </View>
      ))}

      {/* Deposit button */}
      {hasIntegrations && (
        <Pressable
          style={styles.depositButton}
          onPress={() =>
            WebBrowser.openBrowserAsync("https://kalshi.com/account/wallet")
          }
        >
          <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
          <Text style={styles.depositText}>Deposit on Kalshi</Text>
        </Pressable>
      )}

      {/* Empty state */}
      {!hasIntegrations && (
        <View style={styles.emptyCard}>
          <Ionicons name="link-outline" size={40} color="#475569" />
          <Text style={styles.emptyTitle}>No platforms connected</Text>
          <Text style={styles.emptySubtitle}>
            Go to Settings to connect your Kalshi account
          </Text>
          <Pressable
            style={styles.connectButton}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Text style={styles.connectButtonText}>Connect a Platform</Text>
          </Pressable>
        </View>
      )}
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
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
  },
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
  emptyCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 12,
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
});
