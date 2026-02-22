import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getEndpoint,
  setEndpoint,
  EndpointKey,
  getIntegrations,
  disconnectPlatform,
  getDebugTables,
  getSystemPrompt,
  TablesResponse,
} from "../../lib/api";
import { Integration } from "../../lib/types";
import ConnectKalshiModal from "../../components/ConnectKalshiModal";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const USER_ID = "demo-user-1";

const ENDPOINT_OPTIONS: { key: EndpointKey; label: string; url: string }[] = [
  {
    key: "production",
    label: "Production",
    url: "cuxaxyzbcm.us-east-1.awsapprunner.com",
  },
  {
    key: "local",
    label: "Local",
    url: "192.168.7.179:8000",
  },
];

const ACCOUNT_TYPES = [
  { key: "personal" as const, label: "Kalshi (Personal)" },
  { key: "agent" as const, label: "Kalshi (AI Agent)" },
];

// ── Table Card ──

const TABLE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  predictions: { label: "Predictions", icon: "analytics-outline", color: "#6366F1" },
  trading_logs: { label: "Trading Logs", icon: "swap-horizontal-outline", color: "#22C55E" },
  market_snapshots: { label: "Market Snapshots", icon: "pulse-outline", color: "#3B82F6" },
};

function formatRecent(tableName: string, item: Record<string, any>): { primary: string; secondary: string; badge?: { text: string; color: string } } {
  if (tableName === "predictions") {
    const rec = item.recommendation;
    const ticker = rec?.ticker ?? item.ticker ?? "—";
    const side = rec?.side?.toUpperCase() ?? "?";
    const conf = rec?.confidence != null ? `${(rec.confidence * 100).toFixed(0)}%` : "—";
    const model = item.model ?? "?";
    const sideColor = side === "YES" ? "#22C55E" : side === "NO" ? "#EF4444" : "#64748B";
    const action = rec?.no_bet ? "PASS" : `BUY ${side}`;
    const actionColor = rec?.no_bet ? "#EAB308" : sideColor;
    return {
      primary: ticker,
      secondary: `${model} · ${conf} conf`,
      badge: { text: action, color: actionColor },
    };
  }
  if (tableName === "trading_logs") {
    const ticker = item.ticker ?? "—";
    const action = item.action?.toUpperCase() ?? "?";
    const side = item.side?.toUpperCase() ?? "?";
    const status = item.status ?? "?";
    const statusColor = status === "filled" ? "#22C55E" : status === "pending" ? "#EAB308" : "#64748B";
    return {
      primary: ticker,
      secondary: `${action} ${side} · qty ${item.quantity ?? "?"}`,
      badge: { text: status.toUpperCase(), color: statusColor },
    };
  }
  // market_snapshots
  const ticker = item.event_ticker ?? "—";
  const title = item.title ?? "—";
  return {
    primary: ticker,
    secondary: title,
    badge: item.status ? { text: item.status.toUpperCase(), color: item.status === "live" ? "#22C55E" : "#64748B" } : undefined,
  };
}

function TableCard({
  tableName,
  data,
}: {
  tableName: string;
  data: { count: number; recent: Record<string, any>[] };
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TABLE_META[tableName] ?? { label: tableName, icon: "server-outline" as const, color: "#94A3B8" };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={s.tableCard}>
      <Pressable style={s.tableCardHeader} onPress={toggle}>
        <View style={[s.tableIconBox, { backgroundColor: meta.color + "18" }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tableCardLabel}>{meta.label}</Text>
          <Text style={s.tableCardCount}>{data.count} items</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
      </Pressable>

      {expanded && (
        <View style={s.tableCardBody}>
          {data.recent.length === 0 ? (
            <Text style={s.tableEmpty}>No items</Text>
          ) : (
            data.recent.map((item, i) => {
              const fmt = formatRecent(tableName, item);
              return (
                <View key={i} style={s.tableItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tableItemPrimary} numberOfLines={1}>{fmt.primary}</Text>
                    <Text style={s.tableItemSecondary} numberOfLines={1}>{fmt.secondary}</Text>
                  </View>
                  {fmt.badge && (
                    <View style={[s.tableItemBadge, { backgroundColor: fmt.badge.color + "18" }]}>
                      <Text style={[s.tableItemBadgeText, { color: fmt.badge.color }]}>
                        {fmt.badge.text}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

// ── System Prompt Card ──

function SystemPromptCard({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Split prompt into sections for readable display
  const sections = prompt.split("\n\n").filter((s) => s.trim());

  return (
    <View style={s.promptCard}>
      <Pressable style={s.promptHeader} onPress={toggle}>
        <View style={[s.tableIconBox, { backgroundColor: "#A78BFA18" }]}>
          <Ionicons name="code-slash-outline" size={20} color="#A78BFA" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tableCardLabel}>Analysis System Prompt</Text>
          <Text style={s.tableCardCount}>Used by Gemini & OpenRouter models</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
      </Pressable>

      {expanded && (
        <View style={s.promptBody}>
          {sections.map((section, i) => {
            const isJson = section.trim().startsWith("{");
            const isHeading = section.startsWith("IMPORTANT") || section.startsWith("Key ");
            return (
              <View key={i} style={[s.promptSection, isHeading && s.promptSectionHighlight]}>
                <Text style={[s.promptText, isJson && s.promptCode]}>
                  {section.trim()}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Main ──

export default function SettingsScreen() {
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointKey>("production");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAccountType, setModalAccountType] = useState<"personal" | "agent">("personal");
  const [tables, setTables] = useState<TablesResponse | null>(null);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    try {
      const data = await getIntegrations(USER_ID);
      setIntegrations(data);
    } catch {
      // silent
    }
  }, []);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const [tablesData, promptData] = await Promise.all([
        getDebugTables(),
        getSystemPrompt(),
      ]);
      setTables(tablesData);
      setSystemPrompt(promptData.prompt);
    } catch {
      // silent
    } finally {
      setTablesLoading(false);
    }
  }, []);

  useEffect(() => {
    getEndpoint().then(setActiveEndpoint);
    loadIntegrations();
    loadTables();
  }, [loadIntegrations, loadTables]);

  const handleEndpointChange = async (key: EndpointKey) => {
    await setEndpoint(key);
    setActiveEndpoint(key);
    Alert.alert("Endpoint changed", `Now using ${key} backend.`);
  };

  const isConnected = (accountType: string) =>
    integrations.some(
      (i) => i.platform === "kalshi" && i.account_type === accountType
    );

  const handleDisconnect = (accountType: string) => {
    Alert.alert(
      "Disconnect",
      `Are you sure you want to disconnect Kalshi (${accountType})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectPlatform(USER_ID, "kalshi", accountType);
              await loadIntegrations();
            } catch {
              Alert.alert("Error", "Failed to disconnect.");
            }
          },
        },
      ]
    );
  };

  const openConnectModal = (accountType: "personal" | "agent") => {
    setModalAccountType(accountType);
    setModalVisible(true);
  };

  const totalItems = tables
    ? tables.predictions.count + tables.trading_logs.count + tables.market_snapshots.count
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      {/* Data Explorer */}
      <View style={styles.section}>
        <View style={s.sectionHeader}>
          <Text style={styles.sectionTitle}>Data Explorer</Text>
          {tables && (
            <Text style={s.sectionBadge}>{totalItems} total</Text>
          )}
        </View>
        {tablesLoading ? (
          <ActivityIndicator color="#6366F1" style={{ marginVertical: 20 }} />
        ) : tables ? (
          <>
            <TableCard tableName="predictions" data={tables.predictions} />
            <TableCard tableName="trading_logs" data={tables.trading_logs} />
            <TableCard tableName="market_snapshots" data={tables.market_snapshots} />
          </>
        ) : (
          <Text style={s.tableEmpty}>Failed to load table data</Text>
        )}
      </View>

      {/* System Prompt */}
      {systemPrompt && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Configuration</Text>
          <SystemPromptCard prompt={systemPrompt} />
        </View>
      )}

      {/* Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        {ACCOUNT_TYPES.map((acct) => {
          const connected = isConnected(acct.key);
          return (
            <View key={acct.key} style={styles.integrationRow}>
              <View style={styles.integrationLeft}>
                <View
                  style={[
                    styles.statusDot,
                    connected ? styles.dotActive : styles.dotInactive,
                  ]}
                />
                <Text style={styles.integrationLabel}>{acct.label}</Text>
              </View>
              {connected ? (
                <Pressable
                  style={styles.disconnectButton}
                  onPress={() => handleDisconnect(acct.key)}
                >
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.connectBtn}
                  onPress={() => openConnectModal(acct.key)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
                  <Text style={styles.connectBtnText}>Connect</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={styles.integrationHint}>
          Generate your API key at kalshi.com/account/profile
        </Text>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>{USER_ID}</Text>
        </View>
      </View>

      {/* API Endpoint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Endpoint</Text>
        {ENDPOINT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[
              styles.endpointRow,
              activeEndpoint === opt.key && styles.endpointRowActive,
            ]}
            onPress={() => handleEndpointChange(opt.key)}
          >
            <View style={styles.endpointLeft}>
              <View
                style={[
                  styles.radio,
                  activeEndpoint === opt.key && styles.radioActive,
                ]}
              >
                {activeEndpoint === opt.key && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <View>
                <Text style={styles.endpointLabel}>{opt.label}</Text>
                <Text style={styles.endpointUrl}>{opt.url}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>2.0.0</Text>
        </View>
      </View>

      <ConnectKalshiModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={USER_ID}
        accountType={modalAccountType}
        onConnected={loadIntegrations}
      />
    </ScrollView>
  );
}

// ── Data Explorer & Prompt Styles ──

const s = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionBadge: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  // Table Cards
  tableCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
  },
  tableCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  tableIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  tableCardLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  tableCardCount: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 1,
  },
  tableCardBody: {
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  tableEmpty: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  tableItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  tableItemPrimary: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  tableItemSecondary: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  tableItemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  tableItemBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  // System Prompt
  promptCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  promptBody: {
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    padding: 14,
  },
  promptSection: {
    marginBottom: 12,
  },
  promptSectionHighlight: {
    backgroundColor: "rgba(99,102,241,0.06)",
    borderLeftWidth: 2,
    borderLeftColor: "#6366F1",
    paddingLeft: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  promptText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  promptCode: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: "#A78BFA",
    backgroundColor: "rgba(167,139,250,0.06)",
    padding: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
});

// ── Original Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Integrations
  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  integrationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: "#22C55E",
  },
  dotInactive: {
    backgroundColor: "#475569",
  },
  integrationLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectBtnText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
  },
  disconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  disconnectText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  integrationHint: {
    color: "#6366F1",
    fontSize: 12,
    marginTop: 8,
  },
  // Account / general rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 2,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 15,
  },
  value: {
    color: "#94A3B8",
    fontSize: 15,
  },
  // Endpoint radio rows
  endpointRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  endpointRowActive: {
    borderColor: "#3B82F6",
  },
  endpointLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: "#3B82F6",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },
  endpointLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  endpointUrl: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
});
