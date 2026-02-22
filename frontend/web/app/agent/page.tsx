"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { AgentConfig } from "@/lib/types";
import styles from "./page.module.css";

export default function AgentPage() {
  const [config, setConfig] = useState<AgentConfig>({
    market: "kalshi",
    strategy: "",
    active: false,
  });

  function toggleAgent() {
    if (!config.strategy.trim() && !config.active) {
      alert("Enter a trading strategy before starting.");
      return;
    }
    setConfig((prev) => ({ ...prev, active: !prev.active }));
  }

  return (
    <AppShell>
      <h1 className={styles.title}>Agent Configuration</h1>

      <label className="label">Market</label>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleOption} ${config.market === "kalshi" ? styles.toggleActive : ""}`}
          onClick={() => setConfig((p) => ({ ...p, market: "kalshi" }))}
        >
          Kalshi
        </button>
        <button
          type="button"
          className={`${styles.toggleOption} ${config.market === "polymarket" ? styles.toggleActive : ""}`}
          onClick={() => setConfig((p) => ({ ...p, market: "polymarket" }))}
        >
          Polymarket
        </button>
      </div>

      <label className="label">Strategy</label>
      <textarea
        className={`input ${styles.strategyInput}`}
        placeholder="Describe your trading strategy..."
        rows={6}
        value={config.strategy}
        onChange={(e) =>
          setConfig((p) => ({ ...p, strategy: e.target.value }))
        }
      />
      <p className={styles.hint}>
        Example: &quot;Buy YES on weather markets when confidence &gt; 80% and
        price &lt; 60 cents&quot;
      </p>

      <div className={styles.statusCard}>
        <span className={styles.statusLabel}>Agent Status</span>
        <span
          className={`${styles.badge} ${config.active ? styles.badgeActive : styles.badgeInactive}`}
        >
          {config.active ? "Running" : "Stopped"}
        </span>
      </div>

      <button
        className={`btn ${config.active ? "btn-danger" : "btn-primary"}`}
        onClick={toggleAgent}
      >
        {config.active ? "Stop Agent" : "Start Agent"}
      </button>
    </AppShell>
  );
}
