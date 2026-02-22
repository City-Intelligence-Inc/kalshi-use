"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getTrade } from "@/lib/api";
import { TradeLog } from "@/lib/types";
import styles from "./page.module.css";

const statusColors: Record<string, string> = {
  filled: "var(--green)",
  pending: "var(--yellow)",
  canceled: "var(--red)",
};

export default function TradeDetailPage() {
  const params = useParams();
  const tradeId = typeof params.id === "string" ? params.id : "";
  const [trade, setTrade] = useState<TradeLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tradeId) return;
    getTrade(tradeId)
      .then(setTrade)
      .catch((e) => setError(e.message ?? "Failed to load trade"))
      .finally(() => setLoading(false));
  }, [tradeId]);

  if (loading) {
    return (
      <AppShell>
        <p style={{ color: "var(--text-secondary)", textAlign: "center", paddingTop: 80 }}>
          Loading...
        </p>
      </AppShell>
    );
  }

  if (error || !trade) {
    return (
      <AppShell>
        <p style={{ color: "var(--red)", textAlign: "center", paddingTop: 80 }}>
          {error ?? "Trade not found"}
        </p>
      </AppShell>
    );
  }

  const color = statusColors[trade.status as keyof typeof statusColors] ?? "var(--text-muted)";

  const rows: { label: string; value: string }[] = [
    { label: "Trade ID", value: trade.trade_id },
    { label: "Ticker", value: trade.ticker },
    { label: "Side", value: trade.side.toUpperCase() },
    { label: "Action", value: trade.action.toUpperCase() },
    { label: "Quantity", value: String(trade.quantity) },
    { label: "Price", value: `${trade.price}\u00A2 per contract` },
    { label: "Total Cost", value: `$${(trade.total_cost / 100).toFixed(2)}` },
    { label: "Status", value: trade.status },
    { label: "Created", value: new Date(trade.created_at).toLocaleString() },
    ...(trade.filled_at
      ? [{ label: "Filled", value: new Date(trade.filled_at).toLocaleString() }]
      : []),
    ...(trade.agent_id ? [{ label: "Agent ID", value: trade.agent_id }] : []),
    { label: "User ID", value: trade.user_id },
  ];

  return (
    <AppShell>
      <div className={styles.header}>
        <h1 className={styles.ticker}>{trade.ticker}</h1>
        <span className={styles.badge} style={{ color, borderColor: color }}>
          {trade.status}
        </span>
      </div>

      <p className={styles.summary}>
        {trade.action.toUpperCase()} {trade.quantity}x {trade.side.toUpperCase()}{" "}
        @ {trade.price}&cent;
      </p>

      <div className={styles.table}>
        {rows.map(({ label, value }) => (
          <div key={label} className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{value}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
