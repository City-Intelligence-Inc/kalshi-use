import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { AgentConfig } from "@/lib/types";

export default function AgentScreen() {
  const [config, setConfig] = useState<AgentConfig>({
    market: "kalshi",
    strategy: "",
    active: false,
  });

  function toggleMarket() {
    setConfig((prev) => ({
      ...prev,
      market: prev.market === "kalshi" ? "polymarket" : "kalshi",
    }));
  }

  function toggleAgent() {
    if (!config.strategy.trim() && !config.active) {
      Alert.alert("Error", "Enter a trading strategy before starting.");
      return;
    }
    setConfig((prev) => ({ ...prev, active: !prev.active }));
    Alert.alert(
      config.active ? "Agent Stopped" : "Agent Started",
      config.active
        ? "Your trading agent has been paused."
        : "Your agent is now trading based on your strategy."
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Agent Configuration</Text>

      <Text style={styles.label}>Market</Text>
      <Pressable style={styles.toggle} onPress={toggleMarket}>
        <View
          style={[
            styles.toggleOption,
            config.market === "kalshi" && styles.toggleActive,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              config.market === "kalshi" && styles.toggleTextActive,
            ]}
          >
            Kalshi
          </Text>
        </View>
        <View
          style={[
            styles.toggleOption,
            config.market === "polymarket" && styles.toggleActive,
          ]}
        >
          <Text
            style={[
              styles.toggleText,
              config.market === "polymarket" && styles.toggleTextActive,
            ]}
          >
            Polymarket
          </Text>
        </View>
      </Pressable>

      <Text style={styles.label}>Strategy</Text>
      <TextInput
        style={styles.strategyInput}
        placeholder="Describe your trading strategy..."
        placeholderTextColor="#64748B"
        multiline
        numberOfLines={6}
        value={config.strategy}
        onChangeText={(text) => setConfig((prev) => ({ ...prev, strategy: text }))}
        textAlignVertical="top"
      />
      <Text style={styles.hint}>
        Example: "Buy YES on weather markets when confidence &gt; 80% and price
        &lt; 60 cents"
      </Text>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>Agent Status</Text>
          <View
            style={[
              styles.statusBadge,
              config.active ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text style={styles.badgeText}>
              {config.active ? "Running" : "Stopped"}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[
          styles.button,
          config.active ? styles.stopButton : styles.startButton,
        ]}
        onPress={toggleAgent}
      >
        <Text style={styles.buttonText}>
          {config.active ? "Stop Agent" : "Start Agent"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
  },
  content: {
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 24,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    marginBottom: 24,
    overflow: "hidden",
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: "#6366F1",
  },
  toggleText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  strategyInput: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 140,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    lineHeight: 22,
  },
  hint: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: "#94A3B8",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: "#065F46",
  },
  badgeInactive: {
    backgroundColor: "#7F1D1D",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#6366F1",
  },
  stopButton: {
    backgroundColor: "#DC2626",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
