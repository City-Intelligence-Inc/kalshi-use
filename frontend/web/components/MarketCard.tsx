"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { KalshiMarket } from "@/lib/types";
import styles from "./MarketCard.module.css";

interface Props {
  market: KalshiMarket;
  onPress?: (market: KalshiMarket) => void;
}

export default function MarketCard({ market, onPress }: Props) {
  const yesPrice = market.yes_bid ?? market.last_price;
  const noPrice = market.no_bid ?? (yesPrice != null ? 100 - yesPrice : null);
  const delta =
    market.last_price != null && market.previous_price != null
      ? market.last_price - market.previous_price
      : null;

  return (
    <button className={styles.card} onClick={() => onPress?.(market)}>
      {/* Title */}
      <p className={styles.title}>{market.title}</p>

      {/* Ticker + category */}
      <div className={styles.metaRow}>
        <span className={styles.ticker}>{market.ticker}</span>
        {market.category && (
          <span className={styles.categoryPill}>{market.category}</span>
        )}
      </div>

      {/* Price row */}
      <div className={styles.priceRow}>
        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>YES</span>
          <span className={`${styles.priceValue} ${styles.yesColor}`}>
            {yesPrice != null ? `${yesPrice}\u00A2` : "\u2014"}
          </span>
        </div>
        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>NO</span>
          <span className={`${styles.priceValue} ${styles.noColor}`}>
            {noPrice != null ? `${noPrice}\u00A2` : "\u2014"}
          </span>
        </div>
        <div className={styles.priceBox}>
          <span className={styles.priceLabel}>24H</span>
          {delta != null && delta !== 0 ? (
            <span className={styles.deltaRow}>
              {delta > 0 ? (
                <ArrowUp size={12} color="#22C55E" />
              ) : (
                <ArrowDown size={12} color="#EF4444" />
              )}
              <span
                className={styles.priceValue}
                style={{ color: delta > 0 ? "#22C55E" : "#EF4444" }}
              >
                {Math.abs(delta)}&cent;
              </span>
            </span>
          ) : (
            <span className={styles.priceValue} style={{ color: "#475569" }}>
              &mdash;
            </span>
          )}
        </div>
      </div>

      {/* Volume */}
      {market.volume_24h != null && market.volume_24h > 0 && (
        <p className={styles.volume}>
          {market.volume_24h.toLocaleString()} contracts today
        </p>
      )}
    </button>
  );
}
