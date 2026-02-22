import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { darkTheme } from "../lib/paperTheme";
import "../global.css";

export default function RootLayout() {
  return (
    <PaperProvider theme={darkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1120" },
          headerTintColor: "#FFFFFF",
          contentStyle: { backgroundColor: "#0B1120" },
        }}
      >
        <Stack.Screen name="index" redirect options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="trade/[id]" options={{ title: "Trade Details" }} />
        <Stack.Screen
          name="data/prediction/[id]"
          options={{ title: "Prediction Details" }}
        />
        <Stack.Screen
          name="data/snapshot/[ticker]"
          options={{ title: "Snapshot Details" }}
        />
      </Stack>
    </PaperProvider>
  );
}
