import { useState } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = "Password",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        secureTextEntry={!visible}
        autoCapitalize="none"
        value={value}
        onChangeText={onChangeText}
      />
      <Pressable style={styles.toggle} onPress={() => setVisible(!visible)}>
        <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    padding: 16,
    fontSize: 16,
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  toggleText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
  },
});
