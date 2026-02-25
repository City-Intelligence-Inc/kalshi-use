import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KalshiMarket } from "@/lib/types";
import { acceptTrade } from "@/lib/api";
import { sendLocalNotification } from "@/lib/notifications";

const CATEGORY_COLORS: Record<string, string> = {
  Politics: "#818CF8",
  Elections: "#F472B6",
  Economics: "#34D399",
  Financials: "#FBBF24",
  "Science and Technology": "#60A5FA",
  "Climate and Weather": "#2DD4BF",
  Entertainment: "#FB923C",
  Sports: "#A78BFA",
  Companies: "#F87171",
  Health: "#4ADE80",
  World: "#38BDF8",
  Social: "#E879F9",
};

interface Props {
  market: KalshiMarket;
}

export default function MarketCard({ market }: Props) {
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState<string | null>(null);

  const yesPrice = market.yes_bid ?? market.last_price ?? 0;
  const noPrice = 100 - yesPrice;

  const handleTrack = async (side: "yes" | "no") => {
    setTracking(true);
    try {
      const price = side === "yes" ? yesPrice : noPrice;
      await acceptTrade({
        user_id: "demo-user-1",
        ticker: market.ticker,
        side,
        entry_price: price,
        title: market.title,
      });
      setTracked(side);
      sendLocalNotification(
        `${side.toUpperCase()} @ ${price}¢ Tracked`,
        market.title,
        { type: "trade_tracked", ticker: market.ticker, side },
      );
      setTimeout(() => setTracked(null), 2000);
    } catch {
      // silent
    } finally {
      setTracking(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>
        {market.title}
      </Text>

      {/* YES / NO prices */}
      <View style={styles.priceRow}>
        <Text style={styles.yesPrice}>YES {yesPrice}¢</Text>
        <Text style={styles.noPrice}>NO {noPrice}¢</Text>
      </View>

      {/* Track buttons */}
      {tracked ? (
        <View style={styles.trackedRow}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.trackedText}>Tracked!</Text>
        </View>
      ) : (
        <View style={styles.trackRow}>
          <Pressable
            style={[styles.trackBtn, styles.trackYes]}
            onPress={() => handleTrack("yes")}
            disabled={tracking}
          >
            {tracking ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <Text style={styles.trackYesText}>Track YES</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.trackBtn, styles.trackNo]}
            onPress={() => handleTrack("no")}
            disabled={tracking}
          >
            {tracking ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text style={styles.trackNoText}>Track NO</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

export { CATEGORY_COLORS };

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  title: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  yesPrice: {
    color: "#22C55E",
    fontSize: 15,
    fontWeight: "800",
  },
  noPrice: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "800",
  },
  trackRow: {
    flexDirection: "row",
    gap: 8,
  },
  trackBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  trackYes: {
    borderColor: "#22C55E40",
    backgroundColor: "rgba(34,197,94,0.06)",
  },
  trackNo: {
    borderColor: "#EF444440",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  trackYesText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
  },
  trackNoText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  trackedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  trackedText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
  },
});
