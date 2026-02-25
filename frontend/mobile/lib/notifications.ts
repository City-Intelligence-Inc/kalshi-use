import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Configure how notifications appear when the app is in the foreground.
 * Without this, notifications are silently swallowed when the app is open.
 */
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request notification permissions (for local notifications).
 * Returns true if granted, false otherwise.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: false,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission denied");
    return false;
  }

  // Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("trades", {
      name: "Trade Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#6366F1",
      sound: "default",
    });
  }

  return true;
}

/**
 * Fire a local notification immediately. Shows on lock screen,
 * notification center, and as a banner.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: data ?? {},
    },
    trigger: null, // null = fire immediately
  });
}

/**
 * Add notification listeners for foreground reception and tap handling.
 * Returns a cleanup function to remove the listeners.
 */
export function addNotificationListeners(
  onTap?: (data: Record<string, unknown>) => void
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification.request.content.title);
    }
  );

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
