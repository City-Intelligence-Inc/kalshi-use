"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import PositionCard from "@/components/PositionCard";
import TrackedPositionCard from "@/components/TrackedPositionCard";
import { getPositions, getTrackedPositions } from "@/lib/api";
import { KalshiPosition, TrackedPosition } from "@/lib/types";
import styles from "./page.module.css";

const USER_ID = "demo-user-1";
const REFRESH_INTERVAL = 30_000;

export default function PositionsPage() {
  const [tracked, setTracked] = useState<TrackedPosition[]>([]);
  const [live, setLive] = useState<KalshiPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [trackedData, liveData] = await Promise.all([
        getTrackedPositions(USER_ID).catch(() => [] as TrackedPosition[]),
        getPositions(USER_ID).catch(() => [] as KalshiPosition[]),
      ]);
      setTracked(trackedData);
      setLive(liveData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const isEmpty = !loading && tracked.length === 0 && live.length === 0;

  return (
    <AppShell>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Positions</h1>
        <button className={styles.refreshBtn} onClick={loadData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading && <p className={styles.loadingText}>Loading positions...</p>}

      {isEmpty && (
        <div className={styles.emptyContainer}>
          <BarChart3 size={48} color="#475569" />
          <p className={styles.emptyTitle}>No positions yet</p>
          <p className={styles.emptySubtitle}>
            Accept a prediction to start tracking, or connect your Kalshi account
          </p>
        </div>
      )}

      {tracked.length > 0 && (
        <>
          <h2 className={styles.sectionHeader}>Tracked ({tracked.length})</h2>
          {tracked.map((pos) => (
            <TrackedPositionCard
              key={pos.position_id}
              position={pos}
              onClosed={loadData}
            />
          ))}
        </>
      )}

      {live.length > 0 && (
        <>
          <h2 className={styles.sectionHeader}>Live Positions ({live.length})</h2>
          {live.map((pos, i) => (
            <PositionCard key={pos.ticker + i} position={pos} />
          ))}
        </>
      )}
    </AppShell>
  );
}
