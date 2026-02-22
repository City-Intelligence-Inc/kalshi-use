import { KalshiFill } from "@/lib/types";
import styles from "./FillCard.module.css";

interface Props {
  fill: KalshiFill;
}

export default function FillCard({ fill }: Props) {
  const isBuy = fill.action.toLowerCase() === "buy";
  const actionColor = isBuy ? "#22C55E" : "#EF4444";
  const sideUpper = fill.side.toUpperCase();

  const date = fill.created_time
    ? new Date(fill.created_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.ticker}>{fill.ticker}</span>
        <span className={styles.date}>{date}</span>
      </div>
      <div className={styles.badges}>
        <span
          className={styles.badge}
          style={{ backgroundColor: actionColor + "20", color: actionColor }}
        >
          {fill.action.toUpperCase()}
        </span>
        <span className={styles.badge}>{sideUpper}</span>
      </div>
      <div className={styles.row}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Contracts</span>
          <span className={styles.statValue}>{fill.count}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>YES Price</span>
          <span className={styles.statValue}>{fill.yes_price}&cent;</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>NO Price</span>
          <span className={styles.statValue}>{fill.no_price}&cent;</span>
        </div>
      </div>
    </div>
  );
}
