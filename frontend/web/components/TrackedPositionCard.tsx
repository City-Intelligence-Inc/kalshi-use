"use client";

import { ArrowRight, XCircle } from "lucide-react";
import { TrackedPosition } from "@/lib/types";
import { closeTrackedPosition } from "@/lib/api";
import styles from "./TrackedPositionCard.module.css";

interface Props {
  position: TrackedPosition;
  onClosed?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TrackedPositionCard({ position, onClosed }: Props) {
  const isActive = position.status === "active";
  const isWin = position.status === "settled_win";
  const isLoss = position.status === "settled_loss";
  const isSettled = isWin || isLoss;

  const sideColor = position.side === "yes" ? "#22C55E" : "#EF4444";

  const pnl = isSettled ? position.realized_pnl : position.unrealized_pnl;
  const pnlColor =
    pnl == null ? "#64748B" : pnl >= 0 ? "#22C55E" : "#EF4444";
  const pnlSign = pnl != null && pnl >= 0 ? "+" : "";
  const pnlLabel = isSettled ? "Realized" : "Unrealized";

  const handleClose = () => {
    if (!window.confirm("Remove this tracked position?")) return;
    closeTrackedPosition(position.position_id)
      .then(() => onClosed?.())
      .catch(() => alert("Failed to close position"));
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.ticker}>{position.ticker}</span>
        <span
          className={styles.sideBadge}
          style={{ backgroundColor: sideColor + "20", color: sideColor }}
        >
          {position.side.toUpperCase()}
        </span>
        {isSettled && (
          <span
            className={styles.settleBadge}
            style={{
              backgroundColor: isWin ? "#22C55E20" : "#EF444420",
              color: isWin ? "#22C55E" : "#EF4444",
            }}
          >
            {isWin ? "WIN" : "LOSS"}
          </span>
        )}
        {isActive && <span className={styles.liveDot} />}
      </div>

      {position.title && (
        <p className={styles.title}>{position.title}</p>
      )}

      <div className={styles.priceRow}>
        <div className={styles.priceItem}>
          <span className={styles.priceLabel}>Entry</span>
          <span className={styles.priceValue}>{position.entry_price}c</span>
        </div>
        {position.current_price != null && (
          <>
            <ArrowRight size={14} color="#475569" style={{ marginTop: 14 }} />
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>
                {isSettled ? "Settlement" : "Current"}
              </span>
              <span className={styles.priceValue}>{position.current_price}c</span>
            </div>
          </>
        )}
        <div style={{ flex: 1 }} />
        <div className={styles.priceItem}>
          <span className={styles.priceLabel}>{pnlLabel} P&L</span>
          <span className={styles.pnlValue} style={{ color: pnlColor }}>
            {pnl != null ? `${pnlSign}${pnl.toFixed(1)}c` : "--"}
          </span>
        </div>
      </div>

      <div className={styles.metaRow}>
        {position.model && (
          <span className={styles.modelBadge}>{position.model}</span>
        )}
        {position.confidence != null && (
          <span className={styles.metaText}>
            {(position.confidence * 100).toFixed(0)}% conf
          </span>
        )}
        <span className={styles.metaText}>{timeAgo(position.created_at)}</span>
        <div style={{ flex: 1 }} />
        {isActive && (
          <button onClick={handleClose} className={styles.closeBtn}>
            <XCircle size={20} color="#475569" />
          </button>
        )}
      </div>
    </div>
  );
}
