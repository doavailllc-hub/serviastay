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
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useFonts } from "expo-font";
import { Tabs, type ErrorBoundaryProps, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  Building2,
  Heart,
  MessageCircle,
  Search,
  User,
} from "lucide-react-native";
import { fontFamily, icon, palette } from "../constants/theme";
import { initializeDisplayCurrency, subscribeToCurrency } from "../utils/currency";

import {
  addNotificationListeners,
  handleInitialNotification,
  registerForPushNotifications,
} from "../services/notificationService";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash may already be controlled during Fast Refresh.
});

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={errorStyles.screen}>
      <View style={errorStyles.icon}>
        <Text style={errorStyles.iconText}>!</Text>
      </View>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>
        {__DEV__ ? error.message : "We couldn't open this screen. Please try again."}
      </Text>
      <Pressable onPress={retry} style={errorStyles.button}>
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <RootNavigation />
    </SafeAreaProvider>
  );
}

const errorStyles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.canvas,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceMuted,
  },
  iconText: { fontSize: 28, fontFamily: fontFamily.displayExtraBold, color: palette.ink },
  title: { marginTop: 20, fontSize: 22, fontFamily: fontFamily.displayBold, color: palette.ink },
  message: {
    marginTop: 9,
    maxWidth: 320,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: palette.muted,
  },
  button: {
    minWidth: 140,
    height: 50,
    marginTop: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.ink,
  },
  buttonText: { fontSize: 14, fontFamily: fontFamily.bodySemibold, color: palette.inverse },
});

function RootNavigation() {
  const [, setCurrencyRevision] = useState(0);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const tabRoutes = ["/", "/wishlist", "/trips", "/messages", "/profile"];
  const hideTabBar = !tabRoutes.includes(pathname);

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
    const unsubscribe = subscribeToCurrency(() => {
      setCurrencyRevision((revision) => revision + 1);
    });
    initializeDisplayCurrency().catch((error) => {
      console.log("Currency initialization error:", error);
    });
    return unsubscribe;
  }, []);

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

        cleanup = await addNotificationListeners();

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
      <StatusBar style="dark" animated />

      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,

          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.ink,
          tabBarHideOnKeyboard: true,

          tabBarStyle: hideTabBar ? { display: "none" } : {
            height: 58 + insets.bottom,
            paddingTop: 7,
            paddingBottom: Math.max(insets.bottom, 7),
            backgroundColor: palette.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
            elevation: 0,
            shadowOpacity: 0,
          },

          tabBarItemStyle: {
            paddingVertical: 2,
            borderRadius: 18,
            overflow: "hidden",
          },
          tabBarActiveBackgroundColor: palette.transparent,

          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 10,
            lineHeight: 15,
            letterSpacing: 0.1,
          },

          tabBarIconStyle: {
            marginBottom: 1,
          },

          sceneStyle: {
            backgroundColor: palette.canvas,
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
                strokeWidth={focused ? icon.strokeWidthActive : icon.strokeWidth}
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
                strokeWidth={focused ? icon.strokeWidthActive : icon.strokeWidth}
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
                strokeWidth={focused ? icon.strokeWidthActive : icon.strokeWidth}
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
                strokeWidth={focused ? icon.strokeWidthActive : icon.strokeWidth}
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
                strokeWidth={focused ? icon.strokeWidthActive : icon.strokeWidth}
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
          name="+not-found"
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
          name="profile/verification"
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
