import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import {
  Building2,
  Heart,
  MessageCircle,
  Search,
  User,
} from "lucide-react-native";

import {
  addNotificationListeners,
  handleInitialNotification,
  registerForPushNotifications,
} from "../services/notificationService";

const THEME = "#3b71e6";
const TEXT_MUTED = "#717171";
const BORDER = "#e5e7eb";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be controlled during Fast Refresh.
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootNavigation />
    </SafeAreaProvider>
  );
}

function RootNavigation() {
  const insets = useSafeAreaInsets();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,

    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    const initializeNotifications = async () => {
      try {
        await registerForPushNotifications();

        if (!mounted) {
          return;
        }

        cleanup = addNotificationListeners();

        await handleInitialNotification();
      } catch (error) {
        console.log(
          "Notification initialization error:",
          error
        );
      }
    };

    initializeNotifications();

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />

      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: THEME,
          tabBarInactiveTintColor: TEXT_MUTED,
          tabBarHideOnKeyboard: true,

          tabBarStyle: {
            height: 62 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: BORDER,
            elevation: 0,
          },

          tabBarItemStyle: {
            paddingVertical: 2,
          },

          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
            lineHeight: 15,
          },

          tabBarIconStyle: {
            marginBottom: 1,
          },

          sceneStyle: {
            backgroundColor: "#ffffff",
          },
        }}
      >
        {/* Main bottom navigation */}

        <Tabs.Screen
          name="index"
          options={{
            title: "Explore",
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Search
                size={focused ? size + 1 : size}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="wishlist"
          options={{
            title: "Wishlist",
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Heart
                size={focused ? size + 1 : size}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="trips"
          options={{
            title: "Trips",
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Building2
                size={focused ? size + 1 : size}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <MessageCircle
                size={focused ? size + 1 : size}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <User
                size={focused ? size + 1 : size}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />

        {/* General hidden routes */}

        <Tabs.Screen
          name="login"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="explore"
          options={{ href: null }}
        />

      

        <Tabs.Screen
          name="support"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="legal"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="chat/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="review/[id]"
          options={{ href: null }}
        />

        {/* Stay booking routes */}

        <Tabs.Screen
          name="property/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="booking/checkout"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="trip/[id]"
          options={{ href: null }}
        />

        {/* Experience routes */}

        <Tabs.Screen
          name="experience/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="experience/checkout"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="experience/booking-success"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="experience/bookings"
          options={{ href: null }}
        />

      

        {/* Profile routes */}

        <Tabs.Screen
          name="profile/edit"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="profile/payments"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="profile/security"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="profile/preferences"
          options={{ href: null }}
        />

        {/* Host main routes */}

        <Tabs.Screen
          name="host/start"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/dashboard"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/listings"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/stays"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/trips"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="notifications"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="map"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/reservations"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/trip-reservations"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/calendar"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/calendar/pricing"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/earnings"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/reviews"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/payouts"
          options={{ href: null }}
        />


        <Tabs.Screen
          name="host/guests"
          options={{ href: null }}
        />

        {/* Host listing creation/editing */}

        <Tabs.Screen
          name="host/stay/create"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/stay/edit/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/trip/create"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/trip/edit/[id]"
          options={{ href: null }}
        />

        {/* Host reservation details */}

        <Tabs.Screen
          name="host/reservation/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/trip-reservation/[id]"
          options={{ href: null }}
        />

        {/* Host payout routes */}

        <Tabs.Screen
          name="host/payout/[id]"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/payouts/bank"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/settings/tax"
          options={{ href: null }}
        />

        {/* Other host tools */}

        <Tabs.Screen
          name="host/checklist"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/insights"
          options={{ href: null }}
        />

        <Tabs.Screen
          name="host/report"
          options={{ href: null }}
        />
<Tabs.Screen
  name="experience/bookings/[id]"
  options={{
    href: null,
  }}
/>
        <Tabs.Screen
          name="host/activity"
          options={{ href: null }}
        />
      </Tabs>
    </>
  );
}
