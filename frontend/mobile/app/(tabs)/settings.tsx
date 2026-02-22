import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { getEndpoint, setEndpoint, EndpointKey } from "../../lib/api";
import {
  getUiStyle,
  setUiStyle as saveUiStyle,
  UiStyle,
} from "../../lib/preferences";

const UI_STYLE_OPTIONS: { key: UiStyle; label: string; desc: string }[] = [
  { key: "nativewind", label: "NativeWind", desc: "Tailwind CSS styling" },
  { key: "paper", label: "Paper", desc: "Material Design components" },
];

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

export default function SettingsScreen() {
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointKey>("production");
  const [activeUiStyle, setActiveUiStyle] = useState<UiStyle>("nativewind");

  useEffect(() => {
    getEndpoint().then(setActiveEndpoint);
    getUiStyle().then(setActiveUiStyle);
  }, []);

  const handleEndpointChange = async (key: EndpointKey) => {
    await setEndpoint(key);
    setActiveEndpoint(key);
    Alert.alert("Endpoint changed", `Now using ${key} backend.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>demo-user-1</Text>
        </View>
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UI Style</Text>
        {UI_STYLE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[
              styles.endpointRow,
              activeUiStyle === opt.key && styles.endpointRowActive,
            ]}
            onPress={async () => {
              await saveUiStyle(opt.key);
              setActiveUiStyle(opt.key);
              Alert.alert("UI Style changed", `Using ${opt.label}. Re-open Predict tab to see changes.`);
            }}
          >
            <View style={styles.endpointLeft}>
              <View
                style={[
                  styles.radio,
                  activeUiStyle === opt.key && styles.radioActive,
                ]}
              >
                {activeUiStyle === opt.key && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <View>
                <Text style={styles.endpointLabel}>{opt.label}</Text>
                <Text style={styles.endpointUrl}>{opt.desc}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
      </View>
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
    backgroundColor: "#1E293B",
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
