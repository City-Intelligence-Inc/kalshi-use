"use client";

import { CheckCircle, Circle, Lock } from "lucide-react";
import { MilestoneStatus } from "@/lib/types";
import styles from "./MilestoneCard.module.css";

interface Props {
  milestone: MilestoneStatus;
  isNext: boolean;
}

export default function MilestoneCard({ milestone, isNext }: Props) {
  const progress = Math.min(1, milestone.current / milestone.target);
  const completed = milestone.completed;
  const locked = !completed && !isNext;

  const iconColor = completed ? "#22C55E" : isNext ? "#6366F1" : "#475569";
  const barColor = completed ? "#22C55E" : "#6366F1";

  const Icon = completed ? CheckCircle : isNext ? Circle : Lock;

  return (
    <div
      className={styles.card}
      style={{
        borderColor: isNext ? "#6366F130" : "#1E293B",
      }}
    >
      <div className={styles.row}>
        <Icon size={22} color={iconColor} className={styles.icon} />
        <div className={styles.textCol}>
          <span
            className={styles.name}
            style={{ color: locked ? "#64748B" : "#F1F5F9" }}
          >
            {milestone.name}
          </span>
          <span className={styles.description}>{milestone.description}</span>
        </div>
        <span className={styles.counter} style={{ color: iconColor }}>
          {milestone.current}/{milestone.target}
        </span>
      </div>
      <div className={styles.track}>
        <div
          className={styles.fill}
          style={{
            width: `${progress * 100}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}
