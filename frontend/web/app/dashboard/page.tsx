"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { getTradesByUser } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { TradeLog } from "@/lib/types";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [trades, setTrades] = useState<TradeLog[]>([]);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      getTradesByUser(user.id).then(setTrades).catch(() => {});
    }
  }, []);

  const totalCost = trades.reduce((sum, t) => sum + t.total_cost, 0);
  const filled = trades.filter((t) => t.status === "filled").length;
  const pending = trades.filter((t) => t.status === "pending").length;

  return (
    <AppShell>
      <h1 className={styles.title}>Portfolio</h1>

      <div className={styles.grid}>
        <div className="card">
          <div className={styles.cardLabel}>Total Deployed</div>
          <div className={styles.cardValue}>
            ${(totalCost / 100).toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div className={styles.cardLabel}>Filled Trades</div>
          <div className={`${styles.cardValue} ${styles.green}`}>{filled}</div>
        </div>

        <div className="card">
          <div className={styles.cardLabel}>Pending Trades</div>
          <div className={`${styles.cardValue} ${styles.yellow}`}>
            {pending}
          </div>
        </div>

        <div className="card">
          <div className={styles.cardLabel}>Agent Status</div>
          <div className={styles.statusRow}>
            <span className={styles.dot} />
            <span className={styles.statusText}>Idle</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className={styles.cardLabel}>Total Trades</div>
        <div className={styles.cardValue}>{trades.length}</div>
      </div>
    </AppShell>
  );
}
