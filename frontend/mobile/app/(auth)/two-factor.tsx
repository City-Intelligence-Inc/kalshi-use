import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { setup2FA } from "@/lib/auth";

export default function TwoFactorScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"totp" | "sms" | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    if (!method) {
      Alert.alert("Error", "Please select a 2FA method.");
      return;
    }
    setLoading(true);
    try {
      await setup2FA(method);
      Alert.alert("Success", "Two-factor authentication enabled.", [
        { text: "Continue", onPress: () => router.replace("/(tabs)/dashboard") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "2FA setup failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Secure your account</Text>
      <Text style={styles.description}>
        Add an extra layer of security with two-factor authentication.
        You can always set this up later in Settings.
      </Text>

      <Pressable
        style={[styles.option, method === "totp" && styles.optionSelected]}
        onPress={() => setMethod("totp")}
      >
        <Text style={styles.optionTitle}>Authenticator App</Text>
        <Text style={styles.optionDesc}>
          Use Google Authenticator, Authy, or similar
        </Text>
      </Pressable>

      <Pressable
        style={[styles.option, method === "sms" && styles.optionSelected]}
        onPress={() => setMethod("sms")}
      >
        <Text style={styles.optionTitle}>SMS</Text>
        <Text style={styles.optionDesc}>
          Receive codes via text message
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSetup}
        disabled={loading || !method}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Enable 2FA</Text>
        )}
      </Pressable>

      <Pressable onPress={handleSkip}>
        <Text style={styles.skipText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 32,
    lineHeight: 22,
  },
  option: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#334155",
  },
  optionSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#1E1B4B",
  },
  optionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDesc: {
    color: "#94A3B8",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  skipText: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
});
