"use client";

import { useState, useCallback, useEffect } from "react";
import { Cpu, RefreshCw, CheckCircle, Circle, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import { getBotProgress } from "@/lib/api";
import { UserProgress } from "@/lib/types";
import styles from "./page.module.css";

const USER_ID = "demo-user-1";

export default function ActivityPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const prog = await getBotProgress(USER_ID);
      setProgress(prog);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const balance = progress
    ? (progress.paper_balance / 100).toFixed(2)
    : "100.00";

  return (
    <AppShell>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Your Bot</h1>
        <button className={styles.refreshBtn} onClick={loadData}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Paper Balance</p>
          <p className={styles.statValue}>${balance}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Streak</p>
          <p className={styles.statValue}>
            {progress?.current_streak ?? 0}d
          </p>
        </div>
      </div>

      {/* Milestones */}
      <p className={styles.sectionTitle}>Milestones</p>
      {progress?.milestones.map((m) => {
        const done = m.completed;
        const isNext = !done && progress.milestones.findIndex((ms) => !ms.completed) === progress.milestones.indexOf(m);
        const pct = m.target > 0 ? Math.min(1, m.current / m.target) : 0;
        const IconComp = done ? CheckCircle : isNext ? Circle : Lock;
        const iconColor = done ? "#22C55E" : isNext ? "#6366F1" : "#334155";

        return (
          <div
            key={m.id}
            className={`${styles.milestone} ${isNext ? styles.milestoneActive : ""}`}
          >
            <IconComp size={20} color={iconColor} />
            <div className={styles.milestoneText}>
              <p className={`${styles.milestoneName} ${done ? styles.done : ""}`}>
                {m.name}
              </p>
              <div className={styles.bar}>
                <div
                  className={styles.barFill}
                  style={{
                    width: `${pct * 100}%`,
                    backgroundColor: done ? "#22C55E" : "#6366F1",
                  }}
                />
              </div>
            </div>
            <span
              className={styles.counter}
              style={{ color: iconColor }}
            >
              {m.current}/{m.target}
            </span>
          </div>
        );
      })}

      {loading && (
        <div className={styles.loadingContainer}>
          <Cpu size={32} color="#334155" />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      )}

      {!loading && !progress && (
        <div className={styles.loadingContainer}>
          <Cpu size={32} color="#334155" />
          <p className={styles.loadingText}>Could not load bot data</p>
        </div>
      )}
    </AppShell>
  );
}
