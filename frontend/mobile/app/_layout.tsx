import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { ShareIntentProvider } from "expo-share-intent";
import {
  setNotificationHandler,
  registerForPushNotifications,
  addNotificationListeners,
} from "@/lib/notifications";
import { registerPushToken, recordCheckIn } from "@/lib/api";
import "../global.css";

// Configure foreground notification display
setNotificationHandler();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        registerPushToken("demo-user-1", token).catch((err) =>
          console.warn("Failed to register push token:", err)
        );
      }
    });

    // Notification tap handler — record check-in and navigate
    const cleanup = addNotificationListeners(async (data) => {
      // Record daily check-in for streak tracking
      try {
        await recordCheckIn("demo-user-1");
      } catch {
        // silent
      }
      // Navigate to Bot tab for position updates, positions tab otherwise
      if (data?.type === "position_update") {
        router.push("/(tabs)/activity");
      } else {
        router.push("/(tabs)/positions");
      }
    });

    return cleanup;
  }, []);

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
