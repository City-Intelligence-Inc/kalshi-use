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
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getEndpoint,
  setEndpoint,
  EndpointKey,
  getIntegrations,
  disconnectPlatform,
  updateNotificationEmail,
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

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Prediction Card ──

function PredictionCard({ item }: { item: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);
  const rec = item.recommendation;
  const status = item.status ?? "unknown";
  const model = item.model ?? "?";
  const title = rec?.title ?? rec?.ticker ?? "Unknown Market";
  const ticker = rec?.ticker ?? "—";
  const side = rec?.side?.toUpperCase() ?? "?";
  const conf = rec?.confidence != null ? Math.round(rec.confidence * 100) : null;
  const noBet = rec?.no_bet === true;
  const reasoning = rec?.reasoning;
  const factors = rec?.factors as { stat: string; direction: string; magnitude: string; detail: string }[] | null;
  const evAnalysis = rec?.ev_analysis as { probability: number; ev_per_contract: number; kelly_fraction: number }[] | null;
  const bearCase = rec?.bear_case;
  const visiblePrices = rec?.visible_prices;
  const recPosition = rec?.recommended_position;
  const createdAt = item.created_at;

  const sideColor = side === "YES" ? "#22C55E" : side === "NO" ? "#EF4444" : "#64748B";
  const actionText = noBet ? "PASS" : `BUY ${side}`;
  const actionColor = noBet ? "#EAB308" : sideColor;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={d.card}>
      <Pressable style={d.cardHeader} onPress={toggle}>
        <View style={{ flex: 1 }}>
          <Text style={d.cardTitle} numberOfLines={2}>{title}</Text>
          <View style={d.cardMeta}>
            <Text style={d.cardTicker}>{ticker}</Text>
            <Text style={d.cardDot}> · </Text>
            <Text style={d.cardModel}>{model}</Text>
            {createdAt && (
              <>
                <Text style={d.cardDot}> · </Text>
                <Text style={d.cardTime}>{timeAgo(createdAt)}</Text>
              </>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[d.actionBadge, { backgroundColor: actionColor + "20" }]}>
            <Text style={[d.actionBadgeText, { color: actionColor }]}>{actionText}</Text>
          </View>
          {conf != null && (
            <Text style={[d.confText, { color: conf >= 70 ? "#22C55E" : conf >= 40 ? "#EAB308" : "#EF4444" }]}>
              {conf}%
            </Text>
          )}
        </View>
      </Pressable>

      {expanded && status === "completed" && rec && (
        <View style={d.cardBody}>
          {visiblePrices && (visiblePrices.yes_price != null || visiblePrices.no_price != null) && (
            <View style={d.pricesRow}>
              {visiblePrices.yes_price != null && (
                <View style={d.priceBox}>
                  <Text style={d.priceLabel}>YES</Text>
                  <Text style={[d.priceValue, { color: "#22C55E" }]}>{visiblePrices.yes_price}¢</Text>
                </View>
              )}
              {visiblePrices.no_price != null && (
                <View style={d.priceBox}>
                  <Text style={d.priceLabel}>NO</Text>
                  <Text style={[d.priceValue, { color: "#EF4444" }]}>{visiblePrices.no_price}¢</Text>
                </View>
              )}
              {recPosition != null && (
                <View style={d.priceBox}>
                  <Text style={d.priceLabel}>KELLY</Text>
                  <Text style={[d.priceValue, { color: "#6366F1" }]}>{Math.round(recPosition * 100)}%</Text>
                </View>
              )}
            </View>
          )}

          {reasoning && reasoning !== "No reasoning provided" && (
            <View style={d.section}>
              <Text style={d.sectionLabel}>REASONING</Text>
              <Text style={d.sectionText}>{reasoning}</Text>
            </View>
          )}

          {factors && factors.length > 0 && (
            <View style={d.section}>
              <Text style={d.sectionLabel}>FACTORS</Text>
              {factors.map((f, i) => {
                const dirColor = f.direction === "favors_yes" ? "#22C55E" : f.direction === "favors_no" ? "#EF4444" : "#64748B";
                const magDots = f.magnitude === "high" ? "●●●" : f.magnitude === "medium" ? "●●○" : "●○○";
                return (
                  <View key={i} style={d.factorRow}>
                    <View style={d.factorHeader}>
                      <Text style={[d.factorDir, { color: dirColor }]}>
                        {f.direction === "favors_yes" ? "▲" : "▼"} {magDots}
                      </Text>
                      <Text style={d.factorStat} numberOfLines={1}>{f.stat}</Text>
                    </View>
                    <Text style={d.factorDetail}>{f.detail}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {evAnalysis && evAnalysis.length > 0 && (
            <View style={d.section}>
              <Text style={d.sectionLabel}>EV ANALYSIS</Text>
              <View style={d.evTable}>
                <View style={d.evHeaderRow}>
                  <Text style={[d.evCell, d.evHeaderCell, { flex: 1 }]}>Prob</Text>
                  <Text style={[d.evCell, d.evHeaderCell, { flex: 1 }]}>EV/Contract</Text>
                  <Text style={[d.evCell, d.evHeaderCell, { flex: 1 }]}>Kelly</Text>
                </View>
                {evAnalysis.map((ev, i) => (
                  <View key={i} style={d.evRow}>
                    <Text style={[d.evCell, { flex: 1 }]}>{Math.round(ev.probability * 100)}%</Text>
                    <Text style={[d.evCell, { flex: 1, color: ev.ev_per_contract >= 0 ? "#22C55E" : "#EF4444" }]}>
                      {ev.ev_per_contract >= 0 ? "+" : ""}{ev.ev_per_contract.toFixed(2)}
                    </Text>
                    <Text style={[d.evCell, { flex: 1 }]}>{Math.round(ev.kelly_fraction * 100)}%</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {bearCase && (
            <View style={d.section}>
              <Text style={d.sectionLabel}>BEAR CASE</Text>
              <View style={d.bearBox}>
                <Text style={d.bearText}>{bearCase}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {expanded && status === "failed" && (
        <View style={d.cardBody}>
          <Text style={d.failedText}>{item.error_message ?? "Prediction failed"}</Text>
        </View>
      )}

      {expanded && status === "pending" && (
        <View style={d.cardBody}>
          <ActivityIndicator color="#6366F1" size="small" />
          <Text style={d.pendingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

// ── Trade Card ──

function TradeCard({ item }: { item: Record<string, any> }) {
  const ticker = item.ticker ?? "—";
  const action = item.action?.toUpperCase() ?? "?";
  const side = item.side?.toUpperCase() ?? "?";
  const status = item.status ?? "?";
  const qty = item.quantity ?? "?";
  const price = item.price ?? "?";
  const totalCost = item.total_cost;
  const createdAt = item.created_at;

  const sideColor = side === "YES" ? "#22C55E" : side === "NO" ? "#EF4444" : "#64748B";
  const statusColor = status === "filled" ? "#22C55E" : status === "pending" ? "#EAB308" : "#64748B";

  return (
    <View style={d.card}>
      <View style={d.tradeRow}>
        <View style={{ flex: 1 }}>
          <Text style={d.cardTitle} numberOfLines={1}>{ticker}</Text>
          <View style={d.cardMeta}>
            <Text style={[d.tradeAction, { color: sideColor }]}>{action} {side}</Text>
            <Text style={d.cardDot}> · </Text>
            <Text style={d.cardModel}>qty {qty} @ {price}¢</Text>
            {totalCost != null && (
              <>
                <Text style={d.cardDot}> · </Text>
                <Text style={d.cardModel}>${(totalCost / 100).toFixed(2)}</Text>
              </>
            )}
          </View>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[d.actionBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[d.actionBadgeText, { color: statusColor }]}>{status.toUpperCase()}</Text>
          </View>
          {createdAt && <Text style={d.cardTime}>{timeAgo(createdAt)}</Text>}
        </View>
      </View>
    </View>
  );
}

// ── Snapshot Card ──

function SnapshotCard({ item }: { item: Record<string, any> }) {
  const title = item.title ?? "—";
  const eventTicker = item.event_ticker ?? "—";
  const markets = item.markets as { name: string; yes_price: number; no_price: number }[] | null;
  const volume = item.volume;
  const status = item.status ?? "?";
  const scrapedAt = item.scraped_at;

  return (
    <View style={d.card}>
      <View style={{ padding: 14 }}>
        <View style={d.snapHeader}>
          <View style={{ flex: 1 }}>
            <Text style={d.cardTitle} numberOfLines={1}>{title}</Text>
            <View style={d.cardMeta}>
              <Text style={d.cardTicker}>{eventTicker}</Text>
              {volume != null && (
                <>
                  <Text style={d.cardDot}> · </Text>
                  <Text style={d.cardModel}>${volume.toLocaleString()} vol</Text>
                </>
              )}
              {scrapedAt && (
                <>
                  <Text style={d.cardDot}> · </Text>
                  <Text style={d.cardTime}>{timeAgo(scrapedAt)}</Text>
                </>
              )}
            </View>
          </View>
          <View style={[d.actionBadge, { backgroundColor: status === "live" ? "#22C55E20" : "#64748B20" }]}>
            <Text style={[d.actionBadgeText, { color: status === "live" ? "#22C55E" : "#64748B" }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        {markets && markets.length > 0 && (
          <View style={d.marketsGrid}>
            {markets.map((m, i) => (
              <View key={i} style={d.marketRow}>
                <Text style={d.marketName} numberOfLines={1}>{m.name}</Text>
                <View style={d.marketPrices}>
                  <Text style={[d.marketPrice, { color: "#22C55E" }]}>{m.yes_price}¢</Text>
                  <Text style={d.marketSlash}>/</Text>
                  <Text style={[d.marketPrice, { color: "#EF4444" }]}>{m.no_price}¢</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Table Section ──

const TABLE_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  predictions: { label: "Predictions", icon: "analytics-outline", color: "#6366F1" },
  trading_logs: { label: "Trades", icon: "swap-horizontal-outline", color: "#22C55E" },
  market_snapshots: { label: "Snapshots", icon: "pulse-outline", color: "#3B82F6" },
};

function TableSection({
  tableName,
  data,
}: {
  tableName: string;
  data: { count: number; recent: Record<string, any>[] };
}) {
  const [expanded, setExpanded] = useState(tableName === "predictions");
  const meta = TABLE_META[tableName] ?? { label: tableName, icon: "server-outline" as const, color: "#94A3B8" };

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable style={d.tableSectionHeader} onPress={toggle}>
        <Ionicons name={meta.icon} size={18} color={meta.color} />
        <Text style={d.tableSectionLabel}>{meta.label}</Text>
        <View style={[d.tableSectionCount, { backgroundColor: meta.color + "20" }]}>
          <Text style={[d.tableSectionCountText, { color: meta.color }]}>{data.count}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
      </Pressable>

      {expanded && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {data.recent.length === 0 ? (
            <Text style={d.emptyText}>No items yet</Text>
          ) : (
            data.recent.map((item, i) => {
              if (tableName === "predictions") return <PredictionCard key={i} item={item} />;
              if (tableName === "trading_logs") return <TradeCard key={i} item={item} />;
              return <SnapshotCard key={i} item={item} />;
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

  const sections = prompt.split("\n\n").filter((sec) => sec.trim());

  return (
    <View style={d.promptCard}>
      <Pressable style={d.promptHeader} onPress={toggle}>
        <View style={[d.promptIconBox, { backgroundColor: "#A78BFA18" }]}>
          <Ionicons name="code-slash-outline" size={20} color="#A78BFA" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={d.promptLabel}>Analysis System Prompt</Text>
          <Text style={d.promptSublabel}>Used by Gemini & OpenRouter models</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#475569" />
      </Pressable>

      {expanded && (
        <View style={d.promptBody}>
          {sections.map((sec, i) => {
            const isJson = sec.trim().startsWith("{");
            const isHeading = sec.startsWith("IMPORTANT") || sec.startsWith("Key ");
            return (
              <View key={i} style={[d.promptSection, isHeading && d.promptSectionHighlight]}>
                <Text style={[d.promptText, isJson && d.promptCode]}>
                  {sec.trim()}
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
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

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

  const currentEmail = integrations.find((i) => i.email)?.email ?? null;

  const handleSaveEmail = async () => {
    const trimmed = emailDraft.trim();
    if (!trimmed || !trimmed.includes("@")) return;
    setEmailSaving(true);
    try {
      await updateNotificationEmail(USER_ID, trimmed);
      await loadIntegrations();
      setEditingEmail(false);
    } catch {
      Alert.alert("Error", "Failed to update email.");
    } finally {
      setEmailSaving(false);
    }
  };

  const totalItems = tables
    ? tables.predictions.count + tables.trading_logs.count + tables.market_snapshots.count
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      {/* Data Explorer */}
      <View style={styles.section}>
        <View style={d.explorerHeader}>
          <Text style={styles.sectionTitle}>Data Explorer</Text>
          {tables && (
            <Pressable onPress={loadTables}>
              <Ionicons name="refresh-outline" size={16} color="#64748B" />
            </Pressable>
          )}
        </View>
        {tablesLoading ? (
          <ActivityIndicator color="#6366F1" style={{ marginVertical: 20 }} />
        ) : tables ? (
          <>
            <TableSection tableName="predictions" data={tables.predictions} />
            <TableSection tableName="trading_logs" data={tables.trading_logs} />
            <TableSection tableName="market_snapshots" data={tables.market_snapshots} />
          </>
        ) : (
          <Text style={d.emptyText}>Failed to load table data</Text>
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

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={ns.notifCard}>
          <View style={ns.notifIconBox}>
            <Ionicons name="mail-outline" size={20} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ns.notifLabel}>Email Notifications</Text>
            <Text style={ns.notifHint}>
              Receive alerts when predictions complete and trades are accepted
            </Text>
          </View>
        </View>
        <View style={ns.notifEmailRow}>
          {editingEmail ? (
            <>
              <TextInput
                style={ns.notifInput}
                value={emailDraft}
                onChangeText={setEmailDraft}
                placeholder="you@email.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                onSubmitEditing={handleSaveEmail}
              />
              <Pressable
                style={ns.notifSaveBtn}
                onPress={handleSaveEmail}
                disabled={emailSaving}
              >
                {emailSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </Pressable>
              <Pressable
                style={ns.notifCancelBtn}
                onPress={() => setEditingEmail(false)}
              >
                <Ionicons name="close" size={16} color="#94A3B8" />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={ns.notifEmail} numberOfLines={1}>
                {currentEmail ?? "Not configured"}
              </Text>
              {integrations.length > 0 && (
                <Pressable
                  style={ns.notifEditBtn}
                  onPress={() => {
                    setEmailDraft(currentEmail ?? "");
                    setEditingEmail(true);
                  }}
                >
                  <Ionicons name="pencil-outline" size={14} color="#6366F1" />
                  <Text style={ns.notifEditText}>
                    {currentEmail ? "Edit" : "Add"}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
        {!integrations.length && (
          <Text style={ns.notifDisabled}>
            Connect a Kalshi account first to enable notifications
          </Text>
        )}
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

// ── Data Explorer Styles ──

const d = StyleSheet.create({
  explorerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tableSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  tableSectionLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  tableSectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tableSectionCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  // Cards (shared)
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
  },
  cardTicker: {
    color: "#6366F1",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  cardDot: {
    color: "#334155",
    fontSize: 11,
  },
  cardModel: {
    color: "#64748B",
    fontSize: 11,
  },
  cardTime: {
    color: "#475569",
    fontSize: 11,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  confText: {
    fontSize: 13,
    fontWeight: "700",
  },
  // Prediction detail
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
    padding: 14,
  },
  pricesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  priceBox: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  priceLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
  },
  // Factors
  factorRow: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  factorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  factorDir: {
    fontSize: 11,
    fontWeight: "700",
  },
  factorStat: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  factorDetail: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
  },
  // EV table
  evTable: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    overflow: "hidden",
  },
  evHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  evRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.03)",
  },
  evCell: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  evHeaderCell: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
    fontFamily: undefined,
  },
  // Bear case
  bearBox: {
    backgroundColor: "#1C1017",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  bearText: {
    color: "#FCA5A5",
    fontSize: 12,
    lineHeight: 18,
  },
  // Status states
  failedText: {
    color: "#EF4444",
    fontSize: 13,
  },
  pendingText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  // Trade card
  tradeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  tradeAction: {
    fontSize: 11,
    fontWeight: "700",
  },
  // Snapshot card
  snapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marketsGrid: {
    marginTop: 10,
    gap: 4,
  },
  marketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  marketName: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  marketPrices: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  marketPrice: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  marketSlash: {
    color: "#334155",
    fontSize: 11,
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
  promptIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  promptLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  promptSublabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 1,
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

// ── Notification Styles ──

const ns = StyleSheet.create({
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  notifIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.1)",
  },
  notifLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  notifHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  notifEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  notifEmail: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 14,
  },
  notifEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notifEditText: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "600",
  },
  notifInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#E2E8F0",
    fontSize: 14,
  },
  notifSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  notifCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  notifDisabled: {
    color: "#475569",
    fontSize: 12,
    marginTop: 8,
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
