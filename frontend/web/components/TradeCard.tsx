import Link from "next/link";
import { TradeLog } from "@/lib/types";
import styles from "./TradeCard.module.css";

const statusColors: Record<string, string> = {
  filled: "var(--green)",
  pending: "var(--yellow)",
  canceled: "var(--red)",
};

export default function TradeCard({ trade }: { trade: TradeLog }) {
  const color = statusColors[trade.status as keyof typeof statusColors] ?? "var(--text-muted)";
  const date = new Date(trade.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/trades/${trade.trade_id}`} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.ticker}>{trade.ticker}</span>
        <span className={styles.badge} style={{ color, borderColor: color }}>
          {trade.status}
        </span>
      </div>
      <div className={styles.details}>
        <span className={styles.action}>
          {trade.action.toUpperCase()} {trade.quantity}x{" "}
          {trade.side.toUpperCase()} @ {trade.price}&cent;
        </span>
        <span className={styles.cost}>
          ${(trade.total_cost / 100).toFixed(2)}
        </span>
      </div>
      <div className={styles.date}>{date}</div>
    </Link>
  );
}
