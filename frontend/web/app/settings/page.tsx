"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, ArrowLeftRight, Activity, Code, ChevronUp, ChevronDown,
  PlusCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import ConnectKalshiModal from "@/components/ConnectKalshiModal";
import {
  getEndpoint, setEndpoint, EndpointKey,
  getIntegrations, disconnectPlatform,
  getDebugTables, getSystemPrompt, TablesResponse,
} from "@/lib/api";
import { Integration } from "@/lib/types";
import styles from "./page.module.css";

const USER_ID = "demo-user-1";

const ENDPOINT_OPTIONS: { key: EndpointKey; label: string; url: string }[] = [
  { key: "production", label: "Production", url: "cuxaxyzbcm.us-east-1.awsapprunner.com" },
  { key: "local", label: "Local", url: "192.168.7.179:8000" },
];

const ACCOUNT_TYPES = [
  { key: "personal" as const, label: "Kalshi (Personal)" },
  { key: "agent" as const, label: "Kalshi (AI Agent)" },
];

const TABLE_META: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  predictions: { label: "Predictions", icon: TrendingUp, color: "#6366F1" },
  trading_logs: { label: "Trading Logs", icon: ArrowLeftRight, color: "#22C55E" },
  market_snapshots: { label: "Market Snapshots", icon: Activity, color: "#3B82F6" },
};

// ── Format helpers ──

function formatRecent(
  tableName: string,
  item: Record<string, unknown>
): { primary: string; secondary: string; badge?: { text: string; color: string } } {
  if (tableName === "predictions") {
    const rec = item.recommendation as Record<string, unknown> | undefined;
    const ticker = (rec?.ticker as string) ?? (item.ticker as string) ?? "—";
    const side = ((rec?.side as string) ?? "?").toUpperCase();
    const conf = rec?.confidence != null ? `${((rec.confidence as number) * 100).toFixed(0)}%` : "—";
    const model = (item.model as string) ?? "?";
    const sideColor = side === "YES" ? "#22C55E" : side === "NO" ? "#EF4444" : "#64748B";
    const noBet = rec?.no_bet as boolean | undefined;
    const action = noBet ? "PASS" : `BUY ${side}`;
    const actionColor = noBet ? "#EAB308" : sideColor;
    return { primary: ticker, secondary: `${model} · ${conf} conf`, badge: { text: action, color: actionColor } };
  }
  if (tableName === "trading_logs") {
    const ticker = (item.ticker as string) ?? "—";
    const action = ((item.action as string) ?? "?").toUpperCase();
    const side = ((item.side as string) ?? "?").toUpperCase();
    const status = (item.status as string) ?? "?";
    const statusColor = status === "filled" ? "#22C55E" : status === "pending" ? "#EAB308" : "#64748B";
    return { primary: ticker, secondary: `${action} ${side} · qty ${(item.quantity as number) ?? "?"}`, badge: { text: status.toUpperCase(), color: statusColor } };
  }
  const ticker = (item.event_ticker as string) ?? "—";
  const title = (item.title as string) ?? "—";
  const status = item.status as string | undefined;
  return {
    primary: ticker,
    secondary: title,
    badge: status ? { text: status.toUpperCase(), color: status === "live" ? "#22C55E" : "#64748B" } : undefined,
  };
}

// ── Table Card ──

function TableCard({
  tableName,
  data,
}: {
  tableName: string;
  data: { count: number; recent: Record<string, unknown>[] };
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TABLE_META[tableName] ?? { label: tableName, icon: Activity, color: "#94A3B8" };
  const Icon = meta.icon;

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableCardHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.tableIconBox} style={{ backgroundColor: meta.color + "18" }}>
          <Icon size={20} color={meta.color} />
        </div>
        <div className={styles.tableCardInfo}>
          <p className={styles.tableCardLabel}>{meta.label}</p>
          <p className={styles.tableCardCount}>{data.count} items</p>
        </div>
        {expanded ? (
          <ChevronUp size={16} color="#475569" />
        ) : (
          <ChevronDown size={16} color="#475569" />
        )}
      </div>

      {expanded && (
        <div className={styles.tableCardBody}>
          {data.recent.length === 0 ? (
            <p className={styles.tableEmpty}>No items</p>
          ) : (
            data.recent.map((item, i) => {
              const fmt = formatRecent(tableName, item);
              return (
                <div key={i} className={styles.tableItem}>
                  <div className={styles.tableItemInfo}>
                    <p className={styles.tableItemPrimary}>{fmt.primary}</p>
                    <p className={styles.tableItemSecondary}>{fmt.secondary}</p>
                  </div>
                  {fmt.badge && (
                    <span
                      className={styles.tableItemBadge}
                      style={{ backgroundColor: fmt.badge.color + "18" }}
                    >
                      <span className={styles.tableItemBadgeText} style={{ color: fmt.badge.color }}>
                        {fmt.badge.text}
                      </span>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── System Prompt Card ──

function SystemPromptCard({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  const sections = prompt.split("\n\n").filter((s) => s.trim());

  return (
    <div className={styles.promptCard}>
      <div className={styles.promptHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.tableIconBox} style={{ backgroundColor: "#A78BFA18" }}>
          <Code size={20} color="#A78BFA" />
        </div>
        <div className={styles.tableCardInfo}>
          <p className={styles.tableCardLabel}>Analysis System Prompt</p>
          <p className={styles.tableCardCount}>Used by Gemini &amp; OpenRouter models</p>
        </div>
        {expanded ? (
          <ChevronUp size={16} color="#475569" />
        ) : (
          <ChevronDown size={16} color="#475569" />
        )}
      </div>

      {expanded && (
        <div className={styles.promptBody}>
          {sections.map((section, i) => {
            const isJson = section.trim().startsWith("{");
            const isHeading = section.startsWith("IMPORTANT") || section.startsWith("Key ");
            return (
              <div
                key={i}
                className={`${styles.promptSection} ${isHeading ? styles.promptSectionHighlight : ""}`}
              >
                <p className={`${styles.promptText} ${isJson ? styles.promptCode : ""}`}>
                  {section.trim()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──

export default function SettingsPage() {
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
    setActiveEndpoint(getEndpoint());
    loadIntegrations();
    loadTables();
  }, [loadIntegrations, loadTables]);

  const handleEndpointChange = (key: EndpointKey) => {
    setEndpoint(key);
    setActiveEndpoint(key);
    alert(`Now using ${key} backend.`);
  };

  const isConnected = (accountType: string) =>
    integrations.some(
      (i) => i.platform === "kalshi" && i.account_type === accountType
    );

  const handleDisconnect = (accountType: string) => {
    if (!window.confirm(`Disconnect Kalshi (${accountType})?`)) return;
    disconnectPlatform(USER_ID, "kalshi", accountType)
      .then(() => loadIntegrations())
      .catch(() => alert("Failed to disconnect."));
  };

  const openConnectModal = (accountType: "personal" | "agent") => {
    setModalAccountType(accountType);
    setModalVisible(true);
  };

  const totalItems = tables
    ? tables.predictions.count + tables.trading_logs.count + tables.market_snapshots.count
    : 0;

  return (
    <AppShell>
      <h1 className={styles.title}>Settings</h1>

      {/* Data Explorer */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Data Explorer</span>
          {tables && <span className={styles.sectionBadge}>{totalItems} total</span>}
        </div>
        {tablesLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <div className="spinner" />
          </div>
        ) : tables ? (
          <>
            <TableCard tableName="predictions" data={tables.predictions} />
            <TableCard tableName="trading_logs" data={tables.trading_logs} />
            <TableCard tableName="market_snapshots" data={tables.market_snapshots} />
          </>
        ) : (
          <p className={styles.tableEmpty}>Failed to load table data</p>
        )}
      </div>

      {/* System Prompt */}
      {systemPrompt && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>AI Configuration</span>
          <SystemPromptCard prompt={systemPrompt} />
        </div>
      )}

      {/* Integrations */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Integrations</span>
        {ACCOUNT_TYPES.map((acct) => {
          const connected = isConnected(acct.key);
          return (
            <div key={acct.key} className={styles.integrationRow}>
              <div className={styles.integrationLeft}>
                <span
                  className={styles.statusDot}
                  style={{
                    backgroundColor: connected ? "#22C55E" : "#475569",
                  }}
                />
                <span className={styles.integrationLabel}>{acct.label}</span>
              </div>
              {connected ? (
                <button
                  className={styles.disconnectButton}
                  onClick={() => handleDisconnect(acct.key)}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className={styles.connectBtn}
                  onClick={() => openConnectModal(acct.key)}
                >
                  <PlusCircle size={16} />
                  <span>Connect</span>
                </button>
              )}
            </div>
          );
        })}
        <p className={styles.integrationHint}>
          Generate your API key at kalshi.com/account/profile
        </p>
      </div>

      {/* Account */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Account</span>
        <div className={styles.row}>
          <span className={styles.label}>User ID</span>
          <span className={styles.value}>{USER_ID}</span>
        </div>
      </div>

      {/* API Endpoint */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>API Endpoint</span>
        {ENDPOINT_OPTIONS.map((opt) => (
          <div
            key={opt.key}
            className={`${styles.endpointRow} ${activeEndpoint === opt.key ? styles.endpointRowActive : ""}`}
            onClick={() => handleEndpointChange(opt.key)}
          >
            <div className={styles.endpointLeft}>
              <div className={`${styles.radio} ${activeEndpoint === opt.key ? styles.radioActive : ""}`}>
                {activeEndpoint === opt.key && <div className={styles.radioDot} />}
              </div>
              <div>
                <p className={styles.endpointLabel}>{opt.label}</p>
                <p className={styles.endpointUrl}>{opt.url}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* About */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>About</span>
        <div className={styles.row}>
          <span className={styles.label}>Version</span>
          <span className={styles.value}>2.0.0</span>
        </div>
      </div>

      <ConnectKalshiModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={USER_ID}
        accountType={modalAccountType}
        onConnected={loadIntegrations}
      />
    </AppShell>
  );
}
