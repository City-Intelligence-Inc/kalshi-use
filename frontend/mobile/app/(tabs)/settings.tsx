import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getEndpoint, setEndpoint, EndpointKey, getIntegrations, disconnectPlatform } from "../../lib/api";
import { Integration } from "../../lib/types";
import ConnectKalshiModal from "../../components/ConnectKalshiModal";

const USER_ID = "demo-user-1";

const ENDPOINT_OPTIONS: { key: EndpointKey; label: string; url: string }[] = [
  {
    key: "production",
    label: "Production",
    url: "cuxaxyzbcm.us-east-1.awsapprunner.com",
  },
  {
    key: "local",
    label: "Local",
    url: "192.168.7.179:8000",
  },
];

const ACCOUNT_TYPES = [
  { key: "personal" as const, label: "Kalshi (Personal)" },
  { key: "agent" as const, label: "Kalshi (AI Agent)" },
];

export default function SettingsScreen() {
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointKey>("production");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAccountType, setModalAccountType] = useState<"personal" | "agent">("personal");

  const loadIntegrations = useCallback(async () => {
    try {
      const data = await getIntegrations(USER_ID);
      setIntegrations(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    getEndpoint().then(setActiveEndpoint);
    loadIntegrations();
  }, [loadIntegrations]);

  const handleEndpointChange = async (key: EndpointKey) => {
    await setEndpoint(key);
    setActiveEndpoint(key);
    Alert.alert("Endpoint changed", `Now using ${key} backend.`);
  };

  const isConnected = (accountType: string) =>
    integrations.some(
      (i) => i.platform === "kalshi" && i.account_type === accountType
    );

  const handleDisconnect = (accountType: string) => {
    Alert.alert(
      "Disconnect",
      `Are you sure you want to disconnect Kalshi (${accountType})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectPlatform(USER_ID, "kalshi", accountType);
              await loadIntegrations();
            } catch {
              Alert.alert("Error", "Failed to disconnect.");
            }
          },
        },
      ]
    );
  };

  const openConnectModal = (accountType: "personal" | "agent") => {
    setModalAccountType(accountType);
    setModalVisible(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      {/* Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>
        {ACCOUNT_TYPES.map((acct) => {
          const connected = isConnected(acct.key);
          return (
            <View key={acct.key} style={styles.integrationRow}>
              <View style={styles.integrationLeft}>
                <View
                  style={[
                    styles.statusDot,
                    connected ? styles.dotActive : styles.dotInactive,
                  ]}
                />
                <Text style={styles.integrationLabel}>{acct.label}</Text>
              </View>
              {connected ? (
                <Pressable
                  style={styles.disconnectButton}
                  onPress={() => handleDisconnect(acct.key)}
                >
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={styles.connectBtn}
                  onPress={() => openConnectModal(acct.key)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#6366F1" />
                  <Text style={styles.connectBtnText}>Connect</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={styles.integrationHint}>
          Generate your API key at kalshi.com/account/profile
        </Text>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>{USER_ID}</Text>
        </View>
      </View>

      {/* API Endpoint */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Endpoint</Text>
        {ENDPOINT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[
              styles.endpointRow,
              activeEndpoint === opt.key && styles.endpointRowActive,
            ]}
            onPress={() => handleEndpointChange(opt.key)}
          >
            <View style={styles.endpointLeft}>
              <View
                style={[
                  styles.radio,
                  activeEndpoint === opt.key && styles.radioActive,
                ]}
              >
                {activeEndpoint === opt.key && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <View>
                <Text style={styles.endpointLabel}>{opt.label}</Text>
                <Text style={styles.endpointUrl}>{opt.url}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>2.0.0</Text>
        </View>
      </View>

      <ConnectKalshiModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        userId={USER_ID}
        accountType={modalAccountType}
        onConnected={loadIntegrations}
      />
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Integrations
  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
  },
  integrationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: "#22C55E",
  },
  dotInactive: {
    backgroundColor: "#475569",
  },
  integrationLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectBtnText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
  },
  disconnectButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  disconnectText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
  integrationHint: {
    color: "#6366F1",
    fontSize: 12,
    marginTop: 8,
  },
  // Account / general rows
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 2,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 15,
  },
  value: {
    color: "#94A3B8",
    fontSize: 15,
  },
  // Endpoint radio rows
  endpointRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  endpointRowActive: {
    borderColor: "#3B82F6",
  },
  endpointLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#475569",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: "#3B82F6",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3B82F6",
  },
  endpointLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  endpointUrl: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
});
