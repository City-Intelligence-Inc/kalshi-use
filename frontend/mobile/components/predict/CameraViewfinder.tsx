import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

export interface CameraRef {
  takePicture: () => Promise<string | null>;
}

interface Props {
  isActive: boolean;
}

const CameraViewfinder = forwardRef<CameraRef, Props>(({ isActive }, ref) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useImperativeHandle(ref, () => ({
    takePicture: async () => {
      if (!cameraRef.current) return null;
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      return photo?.uri ?? null;
    },
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#64748B" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan your Kalshi market screens
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash ? "on" : "off"}
        active={isActive}
      />
    </View>
  );
});

CameraViewfinder.displayName = "CameraViewfinder";

export default CameraViewfinder;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0B1120",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 20,
    textAlign: "center",
  },
  permissionText: {
    color: "#94A3B8",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: "#6366F1",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
