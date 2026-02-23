"use client";

import { Cpu } from "lucide-react";
import { BotStrategy } from "@/lib/types";
import styles from "./BotProfileCard.module.css";

interface Props {
  strategy: BotStrategy;
  paperBalance: number; // cents
}

export default function BotProfileCard({ strategy, paperBalance }: Props) {
  const winPct = Math.round(strategy.win_rate * 100);
  const balanceDollars = (paperBalance / 100).toFixed(2);
  const bandLabel =
    strategy.preferred_entry_band === "low"
      ? "Low (<30\u00A2)"
      : strategy.preferred_entry_band === "high"
        ? "High (>70\u00A2)"
        : "Mid (30-70\u00A2)";
  const sideLabel =
    strategy.preferred_side === "yes"
      ? "Bullish (YES)"
      : strategy.preferred_side === "no"
        ? "Bearish (NO)"
        : "Balanced";

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.header}>
        <Cpu size={20} color="#6366F1" />
        <span className={styles.headerText}>Your Trading Bot</span>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{winPct}%</span>
          <span className={styles.statLabel}>Win Rate</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statValue}>{strategy.total_trades}</span>
          <span className={styles.statLabel}>Trades</span>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: "#22C55E" }}>
            ${balanceDollars}
          </span>
          <span className={styles.statLabel}>Paper $</span>
        </div>
      </div>

      {/* Strategy details */}
      <div className={styles.detailsRow}>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Style</span>
          <span className={styles.detailValue}>{sideLabel}</span>
        </div>
        <div className={styles.detail}>
          <span className={styles.detailLabel}>Best Band</span>
          <span className={styles.detailValue}>{bandLabel}</span>
        </div>
      </div>

      {/* Top categories */}
      {strategy.preferred_categories.length > 0 && (
        <div className={styles.catRow}>
          {strategy.preferred_categories.slice(0, 3).map((cat) => (
            <span key={cat.category} className={styles.catPill}>
              <span className={styles.catText}>
                {cat.category} {Math.round(cat.win_rate * 100)}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
