import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1120" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: "#0B1120" },
      }}
    >
      <Stack.Screen name="login" options={{ title: "Log In" }} />
      <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
      <Stack.Screen
        name="verify-email"
        options={{ title: "Verify Email" }}
      />
      <Stack.Screen name="kyc" options={{ title: "Identity Verification" }} />
      <Stack.Screen
        name="two-factor"
        options={{ title: "Two-Factor Auth" }}
      />
    </Stack>
  );
}
