"use client";

import { useState, useCallback, useEffect } from "react";
import { Activity as ActivityIcon, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import FillCard from "@/components/FillCard";
import { getFills } from "@/lib/api";
import { KalshiFill } from "@/lib/types";
import styles from "./page.module.css";

const USER_ID = "demo-user-1";

export default function ActivityPage() {
  const [fills, setFills] = useState<KalshiFill[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getFills(USER_ID);
      setFills(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AppShell>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Activity</h1>
        <button className={styles.refreshBtn} onClick={loadData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading && <p className={styles.loadingText}>Loading activity...</p>}

      {!loading && fills.length === 0 && (
        <div className={styles.emptyContainer}>
          <ActivityIcon size={48} color="#475569" />
          <p className={styles.emptyTitle}>No recent activity</p>
          <p className={styles.emptySubtitle}>
            Your Kalshi trades will appear here
          </p>
        </div>
      )}

      {fills.map((fill) => (
        <FillCard key={fill.trade_id} fill={fill} />
      ))}
    </AppShell>
  );
}
