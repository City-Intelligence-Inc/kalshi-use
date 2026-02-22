import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KalshiMarket } from "@/lib/types";

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
    <Pressable
      style={styles.card}
      onPress={() => onPress?.(market)}
    >
      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {market.title}
      </Text>

      {/* Ticker + category */}
      <View style={styles.metaRow}>
        <Text style={styles.ticker}>{market.ticker}</Text>
        {market.category && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{market.category}</Text>
          </View>
        )}
      </View>

      {/* Price row */}
      <View style={styles.priceRow}>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>YES</Text>
          <Text style={[styles.priceValue, styles.yesColor]}>
            {yesPrice != null ? `${yesPrice}¢` : "—"}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>NO</Text>
          <Text style={[styles.priceValue, styles.noColor]}>
            {noPrice != null ? `${noPrice}¢` : "—"}
          </Text>
        </View>
        <View style={styles.priceBox}>
          <Text style={styles.priceLabel}>24H</Text>
          {delta != null && delta !== 0 ? (
            <View style={styles.deltaRow}>
              <Ionicons
                name={delta > 0 ? "arrow-up" : "arrow-down"}
                size={12}
                color={delta > 0 ? "#22C55E" : "#EF4444"}
              />
              <Text
                style={[
                  styles.priceValue,
                  { color: delta > 0 ? "#22C55E" : "#EF4444" },
                ]}
              >
                {Math.abs(delta)}¢
              </Text>
            </View>
          ) : (
            <Text style={[styles.priceValue, { color: "#475569" }]}>—</Text>
          )}
        </View>
      </View>

      {/* Volume */}
      {market.volume_24h != null && market.volume_24h > 0 && (
        <Text style={styles.volume}>
          {market.volume_24h.toLocaleString()} contracts today
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  title: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  ticker: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  categoryPill: {
    backgroundColor: "rgba(99,102,241,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    color: "#818CF8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    gap: 8,
  },
  priceBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  priceLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    color: "#CBD5E1",
    fontSize: 16,
    fontWeight: "800",
  },
  yesColor: {
    color: "#22C55E",
  },
  noColor: {
    color: "#EF4444",
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  volume: {
    color: "#475569",
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
});
