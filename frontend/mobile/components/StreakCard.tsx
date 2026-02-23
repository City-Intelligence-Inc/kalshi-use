import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  currentStreak: number;
  longestStreak: number;
  lastCheckIn?: string;
  checkInDates?: string[];
}

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  lastCheckIn,
  checkInDates = [],
}: Props) {
  const last7 = getLastNDays(7);
  const checkInSet = new Set(checkInDates);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.streakLeft}>
          <Text style={styles.flameIcon}>
            {currentStreak > 0 ? "\uD83D\uDD25" : "\u2744\uFE0F"}
          </Text>
          <View>
            <Text style={styles.streakCount}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
        <View style={styles.streakRight}>
          <Text style={styles.bestLabel}>Best: {longestStreak}d</Text>
          {lastCheckIn && (
            <Text style={styles.lastCheckIn}>
              Last: {timeAgo(lastCheckIn)}
            </Text>
          )}
        </View>
      </View>

      {/* 7-day dots */}
      <View style={styles.dotsRow}>
        {last7.map((day) => {
          const isToday = day === last7[last7.length - 1];
          const checked = checkInSet.has(day);
          const label = ["S", "M", "T", "W", "T", "F", "S"][
            new Date(day + "T00:00:00").getDay()
          ];
          return (
            <View key={day} style={styles.dotCol}>
              <View
                style={[
                  styles.dot,
                  checked && styles.dotFilled,
                  isToday && !checked && styles.dotToday,
                ]}
              >
                {checked && (
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                )}
              </View>
              <Text
                style={[styles.dotLabel, isToday && styles.dotLabelToday]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flameIcon: {
    fontSize: 32,
  },
  streakCount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  streakLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  streakRight: {
    alignItems: "flex-end",
  },
  bestLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  lastCheckIn: {
    color: "#475569",
    fontSize: 11,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dotCol: {
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  dotFilled: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  dotToday: {
    borderColor: "#6366F1",
    borderStyle: "dashed",
  },
  dotLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
  },
  dotLabelToday: {
    color: "#94A3B8",
  },
});
