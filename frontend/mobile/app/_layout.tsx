import { Redirect, Stack } from "expo-router";

export default function RootLayout() {
  return (
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
    </Stack>
  );
}
