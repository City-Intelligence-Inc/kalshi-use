import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import GuideFrame from "./GuideFrame";
import ShutterButton from "./ShutterButton";
import ModelPicker from "./ModelPicker";

interface Props {
  onCapture: () => void;
  onGallery: () => void;
  onFlipCamera: () => void;
  onToggleFlash: () => void;
  flashOn: boolean;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  capturing: boolean;
}

export default function CameraOverlay({
  onCapture,
  onGallery,
  onFlipCamera,
  onToggleFlash,
  flashOn,
  selectedModel,
  onSelectModel,
  capturing,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onToggleFlash} style={styles.iconButton}>
          <Ionicons
            name={flashOn ? "flash" : "flash-off"}
            size={22}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.topTitle}>Scan Market</Text>
        <Pressable onPress={onFlipCamera} style={styles.iconButton}>
          <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Guide frame */}
      <View style={styles.frameContainer}>
        <GuideFrame showHint={!capturing} />
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: 90 + insets.bottom }]}>
        <Pressable onPress={onGallery} style={styles.galleryButton}>
          <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          <Text style={styles.galleryText}>Gallery</Text>
        </Pressable>

        <ShutterButton onPress={onCapture} disabled={capturing} />

        <ModelPicker selectedModel={selectedModel} onSelect={onSelectModel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "600",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  frameContainer: {
    flex: 1,
    justifyContent: "center",
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 16,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
