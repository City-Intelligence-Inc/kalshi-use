import { View, Text, StyleSheet } from "react-native";

interface Props {
  showHint?: boolean;
}

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

export default function GuideFrame({ showHint = true }: Props) {
  return (
    <View style={styles.container}>
      <Corner style={styles.topLeft} />
      <Corner style={styles.topRight} />
      <Corner style={styles.bottomLeft} />
      <Corner style={styles.bottomRight} />
      {showHint && (
        <Text style={styles.hint}>Position your Kalshi screen here</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "85%",
    aspectRatio: 0.7,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: "rgba(255,255,255,0.6)",
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: "rgba(255,255,255,0.6)",
    borderBottomRightRadius: 12,
  },
  hint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
});
