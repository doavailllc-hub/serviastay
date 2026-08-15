import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "dovail.auth.token";
const LEGACY_TOKEN_KEY = "token";
const USER_KEY = "user";

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(LEGACY_TOKEN_KEY);
  }

  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  return legacyToken;
}

export async function saveSession(token: string, user: unknown) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getSessionUser<T = any>(): Promise<T | null> {
  const value = await AsyncStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    await AsyncStorage.removeItem(USER_KEY);
    return null;
  }
}

export async function saveSessionUser(user: unknown) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await Promise.all([
    AsyncStorage.removeItem(LEGACY_TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
    Platform.OS === "web"
      ? Promise.resolve()
      : SecureStore.deleteItemAsync(TOKEN_KEY),
  ]);
}
