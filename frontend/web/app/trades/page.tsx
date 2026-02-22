"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import TradeCard from "@/components/TradeCard";
import { getTradesByUser } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { TradeLog } from "@/lib/types";
import styles from "./page.module.css";

export default function TradesPage() {
  const [trades, setTrades] = useState<TradeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      getTradesByUser(user.id)
        .then((data) =>
          setTrades(data.sort((a, b) => b.created_at.localeCompare(a.created_at)))
        )
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AppShell>
      <h1 className={styles.title}>Trade Feed</h1>

      {loading && <p className={styles.loadingText}>Loading trades...</p>}

      {!loading && trades.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>&#8597;</div>
          <div className={styles.emptyTitle}>No trades yet</div>
          <div className={styles.emptyDesc}>
            Start your agent to begin trading
          </div>
        </div>
      )}

      <div className={styles.list}>
        {trades.map((trade) => (
          <TradeCard key={trade.trade_id} trade={trade} />
        ))}
      </div>
    </AppShell>
  );
}
