"use client";

import { useState } from "react";
import { Cpu, CheckCircle } from "lucide-react";
import { BotSignal } from "@/lib/types";
import { acceptTrade } from "@/lib/api";
import styles from "./BotSignalCard.module.css";

interface Props {
  signal: BotSignal;
}

export default function BotSignalCard({ signal }: Props) {
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState<string | null>(null);

  const sideColor = signal.side === "yes" ? "#22C55E" : "#EF4444";
  const matchPct = Math.round(signal.confidence * 100);
  const yesPrice = signal.current_price ?? 50;
  const noPrice = 100 - yesPrice;

  const handleTrack = async (side: "yes" | "no") => {
    setTracking(true);
    try {
      const price = side === "yes" ? yesPrice : noPrice;
      await acceptTrade({
        user_id: "demo-user-1",
        ticker: signal.ticker,
        side,
        entry_price: price,
        title: signal.title,
        model: "bot",
        confidence: signal.confidence,
      });
      setTracked(side);
      setTimeout(() => setTracked(null), 2000);
    } catch {
      // silent
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className={styles.card}>
      {/* Header: BOT PICK badge + match score */}
      <div className={styles.headerRow}>
        <div className={styles.botBadge}>
          <Cpu size={12} color="#818CF8" />
          <span className={styles.botBadgeText}>BOT PICK</span>
        </div>
        <div className={styles.matchBadge}>
          <span className={styles.matchText}>{matchPct}% match</span>
        </div>
      </div>

      {/* Title */}
      <p className={styles.title}>{signal.title}</p>

      {/* Strategy line */}
      <div
        className={styles.strategyBox}
        style={{ borderLeftColor: sideColor }}
      >
        <span className={styles.strategyText}>
          BUY {signal.side.toUpperCase()} @ {signal.entry_price_suggestion}
          {"\u00A2"}
        </span>
      </div>

      {/* Reasoning */}
      <p className={styles.reasoning}>{signal.reasoning}</p>

      {/* Category + ticker */}
      <div className={styles.metaRow}>
        {signal.category && (
          <span className={styles.catPill}>{signal.category}</span>
        )}
        <span className={styles.ticker}>{signal.ticker}</span>
      </div>

      {/* Track buttons */}
      {tracked ? (
        <div className={styles.trackedRow}>
          <CheckCircle size={16} color="#22C55E" />
          <span className={styles.trackedText}>Position tracked!</span>
        </div>
      ) : (
        <div className={styles.trackRow}>
          <button
            className={`${styles.trackBtn} ${styles.trackYes}`}
            onClick={() => handleTrack("yes")}
            disabled={tracking}
          >
            {tracking ? (
              <span className={styles.trackYesText}>...</span>
            ) : (
              <span className={styles.trackYesText}>
                Track YES @ {yesPrice}{"\u00A2"}
              </span>
            )}
          </button>
          <button
            className={`${styles.trackBtn} ${styles.trackNo}`}
            onClick={() => handleTrack("no")}
            disabled={tracking}
          >
            {tracking ? (
              <span className={styles.trackNoText}>...</span>
            ) : (
              <span className={styles.trackNoText}>
                Track NO @ {noPrice}{"\u00A2"}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
