import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import type * as NotificationTypes from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

import api from "../api/api";
import { getStoredUser } from "./authService";

const PUSH_TOKEN_STORAGE_KEY =
  "dovail_stay_expo_push_token";

const ANDROID_CHANNEL_ID = "default";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type NotificationData = {
  screen?: string;
  route?: string;

  property_id?: number | string;
  propertyId?: number | string;

  trip_id?: number | string;
  tripId?: number | string;
  experience_id?: number | string;
  experienceId?: number | string;

  booking_id?: number | string;
  bookingId?: number | string;
  reservation_id?: number | string;
  reservationId?: number | string;

  conversation_id?: number | string;
  conversationId?: number | string;
  chat_id?: number | string;
  chatId?: number | string;

  notification_id?: number | string;
  notificationId?: number | string;

  [key: string]: unknown;
};

type NotificationsModule =
  typeof import("expo-notifications");

let notificationsPromise:
  | Promise<NotificationsModule | null>
  | undefined;

const isAndroidExpoGo =
  Platform.OS === "android" &&
  Constants.appOwnership === "expo";

const getNotifications = async () => {
  if (isAndroidExpoGo) {
    return null;
  }

  notificationsPromise ??= import("expo-notifications")
    .then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      return Notifications;
    })
    .catch((error) => {
      console.log(
        "Notification module unavailable:",
        error?.message || error
      );

      return null;
    });

  return notificationsPromise;
};

const getProjectId = () => {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId
  );
};

const getUserId = (user: StoredUser | null) =>
  user?.id ?? user?.user_id;

const createAndroidNotificationChannel =
  async () => {
    if (Platform.OS !== "android") {
      return;
    }

    const Notifications = await getNotifications();

    if (!Notifications) {
      return;
    }

    await Notifications.setNotificationChannelAsync(
      ANDROID_CHANNEL_ID,
      {
        name: "Dovail Stay",
        description:
          "Bookings, messages, payments and account updates",
        importance:
          Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2DB281",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      }
    );
  };

const requestNotificationPermission =
  async () => {
    const Notifications = await getNotifications();

    if (!Notifications) {
      return false;
    }

    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus =
      currentPermissions.status;

    if (finalStatus !== "granted") {
      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      finalStatus =
        requestedPermissions.status;
    }

    return finalStatus === "granted";
  };

const savePushTokenLocally = async (
  token: string
) => {
    await AsyncStorage.setItem(
      PUSH_TOKEN_STORAGE_KEY,
      token
    );
  };

export const getSavedPushToken =
  async () => {
    return AsyncStorage.getItem(
      PUSH_TOKEN_STORAGE_KEY
    );
  };

export const clearSavedPushToken =
  async () => {
    await AsyncStorage.removeItem(
      PUSH_TOKEN_STORAGE_KEY
    );
  };

const sendPushTokenToBackend = async (
  token: string
) => {
    const storedUser =
      (await getStoredUser()) as StoredUser | null;

    const userId = getUserId(storedUser);

    if (!userId) {
      return;
    }

    await api.post(
      "/notifications/register-device",
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        device_name:
          Device.deviceName ||
          Device.modelName ||
          "Mobile device",
      }
    );
  };

export const registerForPushNotifications =
  async (): Promise<string | null> => {
    try {
      const Notifications = await getNotifications();

      if (!Notifications) {
        console.log(
          "Push notifications require a development build on Android."
        );
        return null;
      }

      await createAndroidNotificationChannel();

      if (!Device.isDevice) {
        console.log(
          "Push notifications require a physical device."
        );

        return null;
      }

      const permissionGranted =
        await requestNotificationPermission();

      if (!permissionGranted) {
        console.log(
          "Notification permission was not granted."
        );

        return null;
      }

      const projectId = getProjectId();

      if (!projectId) {
        console.log(
          "Missing EAS projectId in Expo configuration."
        );

        return null;
      }

      const tokenResponse =
        await Notifications.getExpoPushTokenAsync(
          {
            projectId,
          }
        );

      const pushToken =
        tokenResponse.data;

      if (!pushToken) {
        return null;
      }

      await savePushTokenLocally(pushToken);

      try {
        await sendPushTokenToBackend(
          pushToken
        );
      } catch (backendError: any) {
        console.log(
          "Push token backend registration error:",
          backendError?.response?.data ||
            backendError?.message ||
            backendError
        );
      }

      return pushToken;
    } catch (error: any) {
      console.log(
        "Push notification registration error:",
        error?.message || error
      );

      return null;
    }
  };

export const unregisterPushNotifications =
  async () => {
    try {
      const storedToken =
        await getSavedPushToken();

      const storedUser =
        (await getStoredUser()) as StoredUser | null;

      const userId = getUserId(storedUser);

      if (storedToken && userId) {
        try {
          await api.delete(
            "/notifications/register-device",
            {
              data: {
                user_id: userId,
                expo_push_token:
                  storedToken,
              },
            }
          );
        } catch (backendError: any) {
          console.log(
            "Push token removal error:",
            backendError?.response?.data ||
              backendError?.message ||
              backendError
          );
        }
      }
    } finally {
      await clearSavedPushToken();
    }
  };

const getNotificationData = (
  response:
    | NotificationTypes.NotificationResponse
    | NotificationTypes.Notification
): NotificationData => {
  if ("notification" in response) {
    return (
      response.notification.request.content
        .data as NotificationData
    );
  }

  return response.request.content
    .data as NotificationData;
};

export const openNotificationDestination = (
  response:
    | NotificationTypes.NotificationResponse
    | NotificationTypes.Notification
) => {
  const data =
    getNotificationData(response);

  const explicitRoute =
    data.route || data.screen;

  if (
    explicitRoute &&
    typeof explicitRoute === "string"
  ) {
    router.push(explicitRoute as never);
    return;
  }

  const propertyId =
    data.property_id ?? data.propertyId;

  if (propertyId) {
    router.push({
      pathname: "/property/[id]",
      params: {
        id: String(propertyId),
      },
    });

    return;
  }

  const tripId =
    data.trip_id ??
    data.tripId ??
    data.experience_id ??
    data.experienceId;

  if (tripId) {
    router.push({
      pathname: "/experience/[id]",
      params: {
        id: String(tripId),
      },
    });

    return;
  }

  const reservationId =
    data.reservation_id ??
    data.reservationId;

  if (reservationId) {
    router.push({
      pathname:
        "/host/reservation/[id]",
      params: {
        id: String(reservationId),
      },
    });

    return;
  }

  const bookingId =
    data.booking_id ?? data.bookingId;

  if (bookingId) {
    router.push({
      pathname: "/trip/[id]",
      params: {
        id: String(bookingId),
      },
    });

    return;
  }

  const conversationId =
    data.conversation_id ??
    data.conversationId ??
    data.chat_id ??
    data.chatId;

  if (conversationId) {
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(conversationId),
      },
    });

    return;
  }

  router.push("/notifications");
};

export const addNotificationListeners =
  async ({
    onNotificationReceived,
  }: {
    onNotificationReceived?: (
      notification: NotificationTypes.Notification
    ) => void;
  } = {}) => {
    const Notifications = await getNotifications();

    if (!Notifications) {
      return () => {};
    }

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(
        (notification) => {
          onNotificationReceived?.(
            notification
          );
        }
      );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          openNotificationDestination(
            response
          );
        }
      );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  };

export const handleInitialNotification =
  async () => {
    try {
      const Notifications = await getNotifications();

      if (!Notifications) {
        return;
      }

      const response =
        await Notifications.getLastNotificationResponseAsync();

      if (response) {
        openNotificationDestination(
          response
        );
      }
    } catch (error) {
      console.log(
        "Initial notification error:",
        error
      );
    }
  };

export const scheduleLocalNotification =
  async ({
    title,
    body,
    data = {},
    seconds = 1,
  }: {
    title: string;
    body: string;
    data?: NotificationData;
    seconds?: number;
  }) => {
    const Notifications = await getNotifications();

    if (!Notifications) {
      throw new Error(
        "Notifications are unavailable in Expo Go on Android. Use a development build."
      );
    }

    return Notifications.scheduleNotificationAsync(
      {
        content: {
          title,
          body,
          data,
          sound: "default",
        },
        trigger: {
          type:
            Notifications.SchedulableTriggerInputTypes
              .TIME_INTERVAL,
          seconds: Math.max(1, seconds),
          repeats: false,
          channelId:
            Platform.OS === "android"
              ? ANDROID_CHANNEL_ID
              : undefined,
        },
      }
    );
  };
