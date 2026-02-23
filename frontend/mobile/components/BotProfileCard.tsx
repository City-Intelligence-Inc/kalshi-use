import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BotStrategy } from "@/lib/types";

interface Props {
  strategy: BotStrategy;
  paperBalance: number; // cents
}

export default function BotProfileCard({ strategy, paperBalance }: Props) {
  const winPct = Math.round(strategy.win_rate * 100);
  const balanceDollars = (paperBalance / 100).toFixed(2);
  const bandLabel =
    strategy.preferred_entry_band === "low"
      ? "Low (<30\u00A2)"
      : strategy.preferred_entry_band === "high"
        ? "High (>70\u00A2)"
        : "Mid (30-70\u00A2)";
  const sideLabel =
    strategy.preferred_side === "yes"
      ? "Bullish (YES)"
      : strategy.preferred_side === "no"
        ? "Bearish (NO)"
        : "Balanced";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="hardware-chip" size={20} color="#6366F1" />
        <Text style={styles.headerText}>Your Trading Bot</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{winPct}%</Text>
          <Text style={styles.statLabel}>Win Rate</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{strategy.total_trades}</Text>
          <Text style={styles.statLabel}>Trades</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: "#22C55E" }]}>
            ${balanceDollars}
          </Text>
          <Text style={styles.statLabel}>Paper $</Text>
        </View>
      </View>

      {/* Strategy details */}
      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Style</Text>
          <Text style={styles.detailValue}>{sideLabel}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Best Band</Text>
          <Text style={styles.detailValue}>{bandLabel}</Text>
        </View>
      </View>

      {/* Top categories */}
      {strategy.preferred_categories.length > 0 && (
        <View style={styles.catRow}>
          {strategy.preferred_categories.slice(0, 3).map((cat) => (
            <View key={cat.category} style={styles.catPill}>
              <Text style={styles.catText}>
                {cat.category} {Math.round(cat.win_rate * 100)}%
              </Text>
            </View>
          ))}
        </View>
      )}
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
    borderColor: "#6366F130",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  headerText: {
    color: "#F1F5F9",
    fontSize: 17,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: "#1E293B",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  detail: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  detailValue: {
    color: "#F1F5F9",
    fontSize: 13,
    fontWeight: "700",
  },
  catRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catPill: {
    backgroundColor: "#6366F115",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catText: {
    color: "#818CF8",
    fontSize: 11,
    fontWeight: "700",
  },
});
