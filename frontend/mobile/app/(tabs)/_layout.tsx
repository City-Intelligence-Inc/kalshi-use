import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import CenterTabButton from "../../components/CenterTabButton";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1120" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: "#0B1120",
          borderTopColor: "#1E293B",
          height: 85,
          paddingBottom: 28,
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#64748B",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trades"
        options={{
          title: "Trades",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-vertical-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="predict"
        options={{
          title: "",
          headerShown: false,
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: "Data",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="server-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hide the old agent tab from navigation */}
      <Tabs.Screen
        name="agent"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
