import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { verifyEmail } from "@/lib/auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (code.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const success = await verifyEmail(code);
      if (success) {
        router.push("/(auth)/kyc");
      } else {
        Alert.alert("Error", "Invalid verification code.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Verify your email</Text>
      <Text style={styles.description}>
        We sent a 6-digit code to your email. Enter it below to continue.
      </Text>

      <TextInput
        style={styles.codeInput}
        placeholder="000000"
        placeholderTextColor="#64748B"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        textAlign="center"
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </Pressable>

      <Pressable onPress={() => Alert.alert("TODO", "Resend code")}>
        <Text style={styles.resendText}>Resend code</Text>
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
  codeInput: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    fontSize: 28,
    letterSpacing: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#334155",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
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
  resendText: {
    color: "#6366F1",
    fontSize: 14,
    textAlign: "center",
  },
});
