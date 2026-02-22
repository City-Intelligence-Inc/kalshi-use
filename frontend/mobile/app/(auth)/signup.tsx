import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { signup, validatePassword, validateEmail } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordErrors = validatePassword(password);

  async function handleSignup() {
    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    if (passwordErrors.length > 0) {
      Alert.alert("Weak Password", `Missing:\n${passwordErrors.join("\n")}`);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Error", "You must accept the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      router.push("/(auth)/verify-email");
    } catch (e: any) {
      Alert.alert("Sign Up Failed", e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748B"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <PasswordInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
      />
      {password.length > 0 && passwordErrors.length > 0 && (
        <View style={styles.errors}>
          {passwordErrors.map((err) => (
            <Text key={err} style={styles.errorText}>
              - {err}
            </Text>
          ))}
        </View>
      )}

      <PasswordInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Confirm password"
      />

      <Pressable
        style={styles.checkbox}
        onPress={() => setTermsAccepted(!termsAccepted)}
      >
        <View
          style={[styles.checkboxBox, termsAccepted && styles.checkboxChecked]}
        >
          {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>
          I agree to the Terms of Service and Privacy Policy
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  errors: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    color: "#94A3B8",
    fontSize: 14,
    flex: 1,
  },
  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
});
