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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRouter } from "expo-router";
import { submitKyc } from "@/lib/auth";

export default function KycScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!fullName || !dob || !ssnLast4 || !address) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    if (ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
      Alert.alert("Error", "Enter the last 4 digits of your SSN.");
      return;
    }

    setLoading(true);
    try {
      const success = await submitKyc({ fullName, dob, ssnLast4, address });
      if (success) {
        router.push("/(auth)/two-factor");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "KYC submission failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      enableOnAndroid
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Identity verification</Text>
      <Text style={styles.description}>
        As a CFTC-regulated exchange, Kalshi requires identity verification
        before you can trade event contracts.
      </Text>

      <Text style={styles.label}>Full legal name</Text>
      <TextInput
        style={styles.input}
        placeholder="John Doe"
        placeholderTextColor="#64748B"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Date of birth</Text>
      <TextInput
        style={styles.input}
        placeholder="MM/DD/YYYY"
        placeholderTextColor="#64748B"
        keyboardType="number-pad"
        value={dob}
        onChangeText={setDob}
      />

      <Text style={styles.label}>SSN (last 4 digits)</Text>
      <TextInput
        style={styles.input}
        placeholder="1234"
        placeholderTextColor="#64748B"
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
        value={ssnLast4}
        onChangeText={setSsnLast4}
      />

      <Text style={styles.label}>Residential address</Text>
      <TextInput
        style={[styles.input, styles.addressInput]}
        placeholder="123 Main St, City, State ZIP"
        placeholderTextColor="#64748B"
        multiline
        value={address}
        onChangeText={setAddress}
      />

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollView>
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
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
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
