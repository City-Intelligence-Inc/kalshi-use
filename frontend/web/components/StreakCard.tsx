"use client";

import { Check } from "lucide-react";
import styles from "./StreakCard.module.css";

interface Props {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn?: string;
  checkInDates?: string[];
}

/** Return an array of YYYY-MM-DD strings for the last `n` days (inclusive of today). */
function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Return a human-readable relative time string like "5m ago", "2h ago", "3d ago". */
function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function StreakCard({
  currentStreak,
  longestStreak,
  lastCheckIn,
  checkInDates = [],
}: Props) {
  const last7 = getLastNDays(7);
  const today = new Date().toISOString().slice(0, 10);
  const checkInSet = new Set(checkInDates);

  return (
    <div className={styles.card}>
      {/* ---- Header row ---- */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.flame}>
            {currentStreak > 0 ? "\uD83D\uDD25" : "\u2744\uFE0F"}
          </span>
          <span className={styles.streakCount}>{currentStreak}</span>
          <span className={styles.streakLabel}>day streak</span>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.best}>Best: {longestStreak}d</span>
          {lastCheckIn && (
            <span className={styles.lastCheckIn}>{timeAgo(lastCheckIn)}</span>
          )}
        </div>
      </div>

      {/* ---- 7-day dots row ---- */}
      <div className={styles.dotsRow}>
        {last7.map((date) => {
          const isChecked = checkInSet.has(date);
          const isToday = date === today;
          const dayIndex = new Date(date).getDay();

          let dotClass = styles.dot;
          if (isChecked) {
            dotClass = `${styles.dot} ${styles.dotFilled}`;
          } else if (isToday) {
            dotClass = `${styles.dot} ${styles.dotToday}`;
          }

          return (
            <div key={date} className={styles.dayCol}>
              <div className={dotClass}>
                {isChecked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
              </div>
              <span className={styles.dayLabel}>{DAY_LABELS[dayIndex]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
