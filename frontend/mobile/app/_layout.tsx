import { Stack, useRouter } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";
import "../global.css";

export default function RootLayout() {
  const router = useRouter();

  return (
    <ShareIntentProvider
      options={{
        debug: __DEV__,
        resetOnBackground: true,
        onResetShareIntent: () => router.replace("/"),
      }}
    >
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1120" },
          headerTintColor: "#FFFFFF",
          contentStyle: { backgroundColor: "#0B1120" },
        }}
      >
        <Stack.Screen name="index" redirect options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="shareintent"
          options={{ title: "Analyze Screenshot", presentation: "modal" }}
        />
      </Stack>
    </ShareIntentProvider>
  );
}
