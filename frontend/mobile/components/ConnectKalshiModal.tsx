import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { connectPlatform } from "../lib/api";

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  accountType: "personal" | "agent";
  onConnected: () => void;
}

export default function ConnectKalshiModal({
  visible,
  onClose,
  userId,
  accountType,
  onConnected,
}: Props) {
  const [apiKeyId, setApiKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!apiKeyId.trim() || !privateKey.trim()) {
      Alert.alert("Missing fields", "Please enter both API Key ID and Private Key.");
      return;
    }

    setLoading(true);
    try {
      await connectPlatform(userId, apiKeyId.trim(), privateKey.trim(), "kalshi", accountType);
      setApiKeyId("");
      setPrivateKey("");
      onConnected();
      onClose();
    } catch (err: any) {
      Alert.alert("Connection failed", err.message || "Could not validate credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>
              Connect Kalshi ({accountType === "agent" ? "AI Agent" : "Personal"})
            </Text>

            <Text style={styles.label}>API Key ID</Text>
            <TextInput
              style={styles.input}
              value={apiKeyId}
              onChangeText={setApiKeyId}
              placeholder="e.g. abc123-def456"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>RSA Private Key (PEM)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={privateKey}
              onChangeText={setPrivateKey}
              placeholder="-----BEGIN RSA PRIVATE KEY-----"
              placeholderTextColor="#475569"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.hint}>
              Generate your API key at kalshi.com/account/profile
            </Text>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Connect</Text>
              )}
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  hint: {
    color: "#6366F1",
    fontSize: 13,
    marginTop: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#6366F1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    color: "#64748B",
    fontSize: 15,
  },
});
