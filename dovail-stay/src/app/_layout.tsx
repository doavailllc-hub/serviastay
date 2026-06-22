import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Heart, Home, MessageCircle, Search, User } from "lucide-react-native";

const THEME = "#7e4ff5";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: THEME,
          tabBarInactiveTintColor: "#777",
          tabBarStyle: {
            height: 72,
            paddingTop: 8,
            paddingBottom: 10,
            borderTopColor: "#eee",
            backgroundColor: "#fff",
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlists",
            tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="trips"
          options={{
            title: "Trips",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size }) => (
              <MessageCircle size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="property/[id]"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="booking/checkout"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}