import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getModels } from "../../lib/api";
import { ModelInfo } from "../../lib/types";

interface Props {
  selectedModel: string;
  onSelect: (modelName: string) => void;
}

export default function ModelPicker({ selectedModel, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = models.find((m) => m.name === selectedModel);

  const loadModels = async () => {
    setLoading(true);
    try {
      const data = await getModels();
      setModels(data);
    } catch {
      // silently fail, keep current selection
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  return (
    <>
      <Pressable style={styles.badge} onPress={() => setVisible(true)}>
        <Ionicons name="cube-outline" size={14} color="#A78BFA" />
        <Text style={styles.badgeText} numberOfLines={1}>
          {selected?.display_name ?? selectedModel}
        </Text>
        <Ionicons name="chevron-up" size={12} color="#94A3B8" />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Select Model</Text>

            {loading ? (
              <ActivityIndicator color="#6366F1" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={models}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.modelRow,
                      item.name === selectedModel && styles.modelRowActive,
                    ]}
                    onPress={() => {
                      onSelect(item.name);
                      setVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modelName}>{item.display_name}</Text>
                      <Text style={styles.modelDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            item.status === "available" ? "#22C55E" : "#EF4444",
                        },
                      ]}
                    />
                  </Pressable>
                )}
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(167,139,250,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "50%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#475569",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1120",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  modelRowActive: {
    borderColor: "#6366F1",
  },
  modelName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modelDesc: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 12,
  },
});
