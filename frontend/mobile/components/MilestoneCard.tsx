import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MilestoneStatus } from "@/lib/types";

interface Props {
  milestone: MilestoneStatus;
  isNext: boolean; // is this the next milestone to complete?
}

export default function MilestoneCard({ milestone, isNext }: Props) {
  const progress = milestone.target > 0
    ? Math.min(1, milestone.current / milestone.target)
    : 0;

  const iconName = milestone.completed
    ? "checkmark-circle"
    : isNext
      ? "radio-button-on"
      : "lock-closed";
  const iconColor = milestone.completed
    ? "#22C55E"
    : isNext
      ? "#6366F1"
      : "#475569";
  const barColor = milestone.completed ? "#22C55E" : "#6366F1";

  return (
    <View style={[styles.card, isNext && styles.cardActive]}>
      <View style={styles.row}>
        <Ionicons name={iconName} size={22} color={iconColor} />
        <View style={styles.textCol}>
          <Text
            style={[
              styles.name,
              !milestone.completed && !isNext && styles.textMuted,
            ]}
          >
            {milestone.name}
          </Text>
          <Text style={styles.description}>{milestone.description}</Text>
        </View>
        <Text
          style={[styles.counter, { color: iconColor }]}
        >
          {milestone.current}/{milestone.target}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardActive: {
    borderColor: "#6366F130",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  textCol: {
    flex: 1,
  },
  name: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
  },
  textMuted: {
    color: "#64748B",
  },
  description: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 1,
  },
  counter: {
    fontSize: 13,
    fontWeight: "800",
  },
  barTrack: {
    height: 5,
    backgroundColor: "#1E293B",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
});
