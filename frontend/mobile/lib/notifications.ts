import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "expo_push_token";

/**
 * Configure how notifications appear when the app is in the foreground.
 */
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request permissions and get the Expo push token.
 * Returns the token string or null if permissions denied / not a device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permissions
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission denied");
    return null;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "445405bc-31fd-4157-b646-0171a9b57114",
  });
  const token = tokenData.data;

  // Cache locally
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  return token;
}

/**
 * Get the cached push token (if previously registered).
 */
export async function getCachedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/**
 * Add notification listeners for foreground reception and tap handling.
 * Returns a cleanup function to remove the listeners.
 */
export function addNotificationListeners(
  onTap?: (data: Record<string, unknown>) => void
): () => void {
  // Fired when a notification is received while app is foregrounded
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification.request.content.title);
    }
  );

  // Fired when user taps a notification
  const responseSub =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;
      onTap?.(data);
    });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
