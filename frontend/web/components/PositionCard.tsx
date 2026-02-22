import { KalshiPosition } from "@/lib/types";
import styles from "./PositionCard.module.css";

interface Props {
  position: KalshiPosition;
}

export default function PositionCard({ position }: Props) {
  const pnlColor = position.realized_pnl >= 0 ? "#22C55E" : "#EF4444";
  const pnlSign = position.realized_pnl >= 0 ? "+" : "";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.ticker}>{position.ticker}</span>
        {position.resting_orders_count > 0 && (
          <span className={styles.ordersBadge}>
            {position.resting_orders_count} open
          </span>
        )}
      </div>
      <p className={styles.title}>{position.market_title}</p>
      <div className={styles.row}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>YES</span>
          <span className={styles.statValue}>{position.yes_count}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>NO</span>
          <span className={styles.statValue}>{position.no_count}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Exposure</span>
          <span className={styles.statValue}>
            ${position.market_exposure.toFixed(2)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>P&L</span>
          <span className={styles.statValue} style={{ color: pnlColor }}>
            {pnlSign}${Math.abs(position.realized_pnl).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
