import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  Building2,
  Camera,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe2,
  Heart,
  LogOut,
  MessageCircle,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../api/api";
import {
  getStoredUser,
  logoutUser,
} from "../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const DANGER = "#d93025";
const SUCCESS = "#188038";

type UserProfile = {
  id: number | string;
  user_id?: number | string;
  fullname?: string;
  name?: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  profileImage?: string;
  avatar?: string;
  avatar_url?: string;
  imageUrl?: string;
  role?: string;
};

type PickerAsset = ImagePicker.ImagePickerAsset & {
  fileName?: string | null;
  mimeType?: string | null;
};

const getUserId = (user: UserProfile | null) =>
  user?.id ?? user?.user_id;

const getDisplayName = (user: UserProfile | null) =>
  user?.fullname?.trim() ||
  user?.name?.trim() ||
  "Dovail Guest";

const normalizeRemoteImage = (value?: string) => {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://") ||
    value.startsWith("content://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://stay.dovail.com${value}`;
  }

  return `https://stay.dovail.com/${value}`;
};

const extractProfileImage = (payload: unknown): string => {
  if (!payload) return "";
  if (typeof payload === "string") return payload.trim();
  if (typeof payload !== "object" || Array.isArray(payload)) return "";

  const record = payload as Record<string, unknown>;
  for (const key of ["profile_image", "profileImage", "avatar", "avatar_url", "imageUrl", "image", "url", "path"]) {
    if (typeof record[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }

  return extractProfileImage(record.data) || extractProfileImage(record.user);
};

const withCacheRevision = (url: string) =>
  `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;

const extractProfile = (
  payload: unknown
): Partial<UserProfile> | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const objectPayload = payload as Record<string, unknown>;

  if (
    objectPayload.data &&
    typeof objectPayload.data === "object" &&
    !Array.isArray(objectPayload.data)
  ) {
    return objectPayload.data as Partial<UserProfile>;
  }

  if (
    objectPayload.user &&
    typeof objectPayload.user === "object" &&
    !Array.isArray(objectPayload.user)
  ) {
    return objectPayload.user as Partial<UserProfile>;
  }

  return objectPayload as Partial<UserProfile>;
};

const getUploadFileName = (asset: PickerAsset) => {
  if (asset.fileName?.trim()) {
    return asset.fileName;
  }

  const extension =
    asset.mimeType?.split("/")[1] ||
    asset.uri.split(".").pop()?.split("?")[0] ||
    "jpg";

  return `profile-${Date.now()}.${extension}`;
};

const getUploadMimeType = (asset: PickerAsset) => {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  const extension = getUploadFileName(asset)
    .split(".")
    .pop()
    ?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";

  return "image/jpeg";
};

const clearStoredSession = async () => {
  try {
    await logoutUser();
  } catch (error) {
    console.log("logoutUser service error:", error);
  }

  await AsyncStorage.multiRemove([
    "token",
    "user",
    "adminToken",
    "adminUser",
  ]);
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [profileImageFailed, setProfileImageFailed] = useState(false);

  const persistUser = useCallback(
    async (nextUser: UserProfile) => {
      setUser(nextUser);
      await AsyncStorage.setItem(
        "user",
        JSON.stringify(nextUser)
      );
    },
    []
  );

  const loadProfile = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setProfileLoadFailed(false);

        const storedUser =
          (await getStoredUser()) as UserProfile | null;

        if (!storedUser) {
          setUser(null);
          return;
        }

        setUser(storedUser);

        const userId = getUserId(storedUser);

        if (!userId) {
          setProfileLoadFailed(true);
          return;
        }

        try {
          const response = await api.get(
            `/user/${userId}`
          );

          const remoteProfile =
            extractProfile(response.data);

          if (remoteProfile) {
            const remoteImage = extractProfileImage(remoteProfile);
            const mergedUser: UserProfile = {
              ...storedUser,
              ...remoteProfile,
              id:
                remoteProfile.id ??
                storedUser.id ??
                userId,
              profile_image: normalizeRemoteImage(
                remoteImage || storedUser.profile_image
              ),
            };

            if (mergedUser.profile_image) {
              mergedUser.profile_image =
                normalizeRemoteImage(
                  mergedUser.profile_image
                );
            }

            await persistUser(mergedUser);
            setProfileImageFailed(false);
          }
        } catch (error: any) {
          console.log(
            "Remote profile load error:",
            error?.response?.data ||
              error?.message ||
              error
          );

          if (error?.response?.status === 401) {
            await clearStoredSession();
            setUser(null);
            return;
          }

          setProfileLoadFailed(true);
        }
      } catch (error: any) {
        console.log(
          "Profile load error:",
          error?.message || error
        );
        setProfileLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [persistUser]
  );

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const initial = useMemo(() => {
    return (
      getDisplayName(user)
        .charAt(0)
        .toUpperCase() ||
      user?.email
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() ||
      "D"
    );
  }, [user]);

  const isHost = useMemo(() => {
    const role = String(
      user?.role || ""
    ).toLowerCase();

    return role === "host" || role === "admin";
  }, [user?.role]);

  const confirmLogout = () => {
    if (logoutLoading) return;

    Alert.alert(
      "Log out?",
      "You will need to verify your email again to access your account.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      setLogoutLoading(true);

      await clearStoredSession();

      setUser(null);
      router.replace("/login");
    } catch (error) {
      console.log(
        "Profile logout error:",
        error
      );

      Alert.alert(
        "Logout failed",
        "The local session could not be cleared. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const requestPhotoPermission = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Photo permission required",
        "Allow access to your photos to update your profile picture."
      );

      return false;
    }

    return true;
  };

  const chooseProfilePhoto = async () => {
    if (!user || imageUploading) return;

    const userId = getUserId(user);

    if (!userId) {
      Alert.alert(
        "Profile unavailable",
        "Please sign in again before changing your profile photo."
      );
      return;
    }

    const hasPermission =
      await requestPhotoPermission();

    if (!hasPermission) return;
    const previousImage = user.profile_image;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.82,
          exif: false,
        });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0] as PickerAsset;

      if (
        typeof asset.fileSize === "number" &&
        asset.fileSize > 8 * 1024 * 1024
      ) {
        Alert.alert(
          "Image too large",
          "Please select an image smaller than 8 MB."
        );
        return;
      }

      setImageUploading(true);
      setProfileImageFailed(false);
      setUser((current) => current ? { ...current, profile_image: asset.uri } : current);

      const formData = new FormData();

      formData.append(
        "image",
        {
          uri: asset.uri,
          name: getUploadFileName(asset),
          type: getUploadMimeType(asset),
        } as any
      );

      const response = await api.post(
        `/user/${userId}/profile-image`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
          timeout: 60000,
        }
      );

      const uploadedImage = extractProfileImage(response.data);

      if (!uploadedImage) {
        throw new Error(
          "The server did not return the uploaded image URL."
        );
      }

      const nextUser: UserProfile = {
        ...user,
        profile_image: withCacheRevision(normalizeRemoteImage(uploadedImage)),
      };

      await persistUser(nextUser);
      setProfileImageFailed(false);

      Alert.alert(
        "Photo updated",
        "Your profile picture has been updated."
      );
    } catch (error: any) {
      setUser((current) => current ? { ...current, profile_image: previousImage } : current);
      setProfileImageFailed(false);
      console.log(
        "Profile image upload error:",
        error?.response?.data ||
          error?.message ||
          error
      );

      Alert.alert(
        "Upload failed",
        error?.response?.data?.message ||
          "Your profile image could not be uploaded. Please try again."
      );
    } finally {
      setImageUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={WHITE}
        />
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={WHITE}
        />

        <View style={styles.guestPage}>
          <View style={styles.guestIcon}>
            <User
              size={32}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <Text style={styles.guestTitle}>
            Log in to your account
          </Text>

          <Text style={styles.guestText}>
            Manage reservations, saved stays,
            messages, payments and hosting tools.
          </Text>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.primaryButtonPressed,
            ]}
            onPress={() =>
              router.push("/login")
            }
          >
            <Text
              style={styles.primaryButtonText}
            >
              Log in or sign up
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() =>
              router.replace("/")
            }
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Continue exploring
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadProfile(true)
            }
            colors={[THEME]}
            tintColor={THEME}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Profile
          </Text>

          <Text style={styles.subtitle}>
            Account details and settings
          </Text>
        </View>

        {profileLoadFailed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              loadProfile(true)
            }
            style={({ pressed }) => [
              styles.warningCard,
              pressed &&
                styles.menuItemPressed,
            ]}
          >
            <Text
              style={styles.warningTitle}
            >
              Profile refresh failed
            </Text>

            <Text
              style={styles.warningText}
            >
              Showing saved account details. Tap
              to try again.
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.profileCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={chooseProfilePhoto}
            disabled={imageUploading}
            style={styles.avatarWrap}
          >
            {user.profile_image && !profileImageFailed ? (
              <Image
                source={{
                  uri: normalizeRemoteImage(
                    user.profile_image
                  ),
                }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={() => setProfileImageFailed(true)}
              />
            ) : (
              <View
                style={styles.avatarFallback}
              >
                <Text
                  style={styles.avatarText}
                >
                  {initial}
                </Text>
              </View>
            )}

            <View style={styles.cameraButton}>
              {imageUploading ? (
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />
              ) : (
                <Camera
                  size={15}
                  color={WHITE}
                  strokeWidth={2}
                />
              )}
            </View>
          </Pressable>

          <View style={styles.profileInfo}>
            <Text
              numberOfLines={1}
              style={styles.profileName}
            >
              {getDisplayName(user)}
            </Text>

            <Text
              numberOfLines={1}
              style={styles.profileEmail}
            >
              {user.email ||
                "Email not available"}
            </Text>

            <View style={styles.verifiedRow}>
              <ShieldCheck
                size={14}
                color={SUCCESS}
                strokeWidth={2}
              />

              <Text
                style={styles.verifiedText}
              >
                Verified account
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.editProfileButton}
              onPress={() =>
                router.push("/profile/edit")
              }
            >
              <Text
                style={styles.editProfileText}
              >
                Edit profile
              </Text>

              <ChevronRight
                size={16}
                color={THEME}
                strokeWidth={2}
              />
            </Pressable>
          </View>
        </View>

        {isHost ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch to hosting"
            onPress={() => router.push("/host/dashboard")}
            style={({ pressed }) => [
              styles.hostSwitch,
              pressed && styles.menuItemPressed,
            ]}
          >
            <View style={styles.hostSwitchIcon}>
              <Building2
                size={21}
                color={THEME}
                strokeWidth={2}
              />
            </View>

            <View style={styles.hostSwitchContent}>
              <Text style={styles.hostSwitchTitle}>
                Switch to hosting
              </Text>

              <Text style={styles.hostSwitchText}>
                Manage listings, reservations and earnings
              </Text>
            </View>

            <ChevronRight
              size={19}
              color="#9aa0a6"
            />
          </Pressable>
        ) : null}

        <SectionTitle title="Your activity" />

        <View style={styles.menuCard}>
          <MenuItem
            icon={
              <Building2
                size={20}
                color={TEXT}
              />
            }
            title="Trips"
            subtitle="Upcoming and past reservations"
            onPress={() =>
              router.push("/trips")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <Heart
                size={20}
                color={TEXT}
              />
            }
            title="Wishlist"
            subtitle="Saved stays"
            onPress={() =>
              router.push("/wishlist")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <MessageCircle
                size={20}
                color={TEXT}
              />
            }
            title="Messages"
            subtitle="Chat with hosts and guests"
            onPress={() =>
              router.push("/messages")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <Bell
                size={20}
                color={TEXT}
              />
            }
            title="Notifications"
            subtitle="Booking and account updates"
            onPress={() =>
              router.push("/notifications")
            }
          />
        </View>

        <SectionTitle title="Payments and account" />

        <View style={styles.menuCard}>
          <MenuItem
            icon={
              <FileText
                size={20}
                color={TEXT}
              />
            }
            title="Payments"
            subtitle="Payment methods and transactions"
            onPress={() =>
              router.push("/profile/payments")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <ShieldCheck
                size={20}
                color={TEXT}
              />
            }
            title="Identity and security"
            subtitle="Verification and account security"
            onPress={() =>
              router.push("/profile/security")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <Globe2
                size={20}
                color={TEXT}
              />
            }
            title="Language and currency"
            subtitle="English and Indian rupee"
            onPress={() =>
              router.push("/profile/preferences")
            }
          />
        </View>

        <SectionTitle title="Hosting" />

        <View style={styles.hostCard}>
          <View style={styles.hostIcon}>
            <Building2
              size={23}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.hostContent}>
            <Text style={styles.hostTitle}>
              {isHost
                ? "Switch to hosting"
                : "Become a host"}
            </Text>

            <Text style={styles.hostText}>
              {isHost
                ? "Manage listings, reservations, calendar and earnings."
                : "Create a stay or trip listing and start earning."}
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.hostButton,
                pressed &&
                  styles.hostButtonPressed,
              ]}
              onPress={() =>
                router.push(
                  isHost
                    ? "/host/dashboard"
                    : "/host/start"
                )
              }
            >
              <Text
                style={styles.hostButtonText}
              >
                {isHost
                  ? "Switch to hosting"
                  : "Get started"}
              </Text>
            </Pressable>
          </View>
        </View>

        <SectionTitle title="Support" />

        <View style={styles.menuCard}>
          <MenuItem
            icon={
              <CircleHelp
                size={20}
                color={TEXT}
              />
            }
            title="Help centre"
            subtitle="Support and answers"
            onPress={() =>
              router.push("/support")
            }
          />

          <MenuDivider />

          <MenuItem
            icon={
              <FileText
                size={20}
                color={TEXT}
              />
            }
            title="Terms and privacy"
            subtitle="Policies and legal information"
            onPress={() =>
              router.push("/legal")
            }
          />
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.logoutButtonPressed,
            logoutLoading &&
              styles.disabledButton,
          ]}
          onPress={confirmLogout}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator
              size="small"
              color={DANGER}
            />
          ) : (
            <>
              <LogOut
                size={18}
                color={DANGER}
              />

              <Text
                style={styles.logoutText}
              >
                Log out
              </Text>
            </>
          )}
        </Pressable>

        <Text style={styles.versionText}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text style={styles.sectionTitle}>
      {title}
    </Text>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.menuItem,
        pressed &&
          styles.menuItemPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        {icon}
      </View>

      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>
          {title}
        </Text>

        <Text style={styles.menuSubtitle}>
          {subtitle}
        </Text>
      </View>

      <ChevronRight
        size={18}
        color="#9aa0a6"
      />
    </Pressable>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

function ProfileSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View
        style={styles.skeletonHeaderTitle}
      />
      <View
        style={styles.skeletonHeaderLine}
      />

      <View
        style={styles.skeletonProfileCard}
      >
        <View style={styles.skeletonAvatar} />

        <View
          style={styles.skeletonProfileInfo}
        >
          <View style={styles.skeletonName} />
          <View style={styles.skeletonEmail} />
          <View
            style={styles.skeletonButton}
          />
        </View>
      </View>

      <View
        style={styles.skeletonSectionTitle}
      />

      <View
        style={styles.skeletonMenuCard}
      >
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={styles.skeletonMenuRow}
          >
            <View
              style={styles.skeletonMenuIcon}
            />

            <View
              style={styles.skeletonMenuText}
            >
              <View
                style={
                  styles.skeletonMenuTitle
                }
              />
              <View
                style={
                  styles.skeletonMenuSubtitle
                }
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
  },

  header: {
    paddingBottom: 18,
  },

  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: TEXT,
  },

  subtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },

  warningCard: {
    borderWidth: 1,
    borderColor: "#f4d9a6",
    borderRadius: 14,
    backgroundColor: "#fff9ec",
    padding: 13,
    marginBottom: 14,
  },

  warningTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#8a4f00",
  },

  warningText: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "#8a4f00",
  },

  profileCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  avatarWrap: {
    position: "relative",
    width: 76,
    height: 76,
  },

  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#f1f3f4",
  },

  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 28,
    color: WHITE,
  },

  cameraButton: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: WHITE,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    lineHeight: 24,
    color: TEXT,
  },

  profileEmail: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  verifiedRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  verifiedText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: SUCCESS,
  },

  editProfileButton: {
    alignSelf: "flex-start",
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  editProfileText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
  },

  hostSwitch: {
    minHeight: 70,
    marginTop: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  hostSwitchIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  hostSwitchContent: {
    flex: 1,
    marginLeft: 12,
  },

  hostSwitchTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  hostSwitchText: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
    color: TEXT,
  },

  menuCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  menuItem: {
    minHeight: 68,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  menuItemPressed: {
    backgroundColor: SURFACE,
  },

  menuIcon: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  menuSubtitle: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },

  menuDivider: {
    height: 1,
    marginLeft: 53,
    backgroundColor: "#f1f3f4",
  },

  hostCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  hostIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  hostContent: {
    flex: 1,
  },

  hostTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  hostText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  hostButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: THEME,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  hostButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  hostButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: WHITE,
  },

  logoutButton: {
    minHeight: 48,
    marginTop: 26,
    borderWidth: 1,
    borderColor: "#f3d3d0",
    borderRadius: 13,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutButtonPressed: {
    backgroundColor: "#fff8f7",
  },

  disabledButton: {
    opacity: 0.65,
  },

  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: DANGER,
  },

  versionText: {
    marginTop: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#9aa0a6",
    textAlign: "center",
  },

  guestPage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  guestIcon: {
    width: 72,
    height: 72,
    borderRadius: 23,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  guestTitle: {
    marginTop: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    lineHeight: 29,
    color: TEXT,
    textAlign: "center",
  },

  guestText: {
    marginTop: 9,
    maxWidth: 320,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 24,
    minWidth: 175,
    height: 50,
    borderRadius: 13,
    backgroundColor: THEME,
    paddingHorizontal: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  secondaryButton: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
  },

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  skeletonHeaderTitle: {
    width: "34%",
    height: 27,
    borderRadius: 9,
    backgroundColor: "#eceff1",
  },

  skeletonHeaderLine: {
    width: "58%",
    height: 12,
    marginTop: 9,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
  },

  skeletonProfileCard: {
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    padding: 16,
    flexDirection: "row",
    gap: 15,
  },

  skeletonAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#eceff1",
  },

  skeletonProfileInfo: {
    flex: 1,
    paddingTop: 4,
  },

  skeletonName: {
    width: "70%",
    height: 17,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonEmail: {
    width: "82%",
    height: 11,
    marginTop: 9,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
  },

  skeletonButton: {
    width: "40%",
    height: 12,
    marginTop: 13,
    borderRadius: 6,
    backgroundColor: "#eceff1",
  },

  skeletonSectionTitle: {
    width: "34%",
    height: 18,
    marginTop: 26,
    marginBottom: 11,
    borderRadius: 7,
    backgroundColor: "#eceff1",
  },

  skeletonMenuCard: {
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 15,
  },

  skeletonMenuRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  skeletonMenuIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonMenuText: {
    flex: 1,
  },

  skeletonMenuTitle: {
    width: "48%",
    height: 13,
    borderRadius: 6,
    backgroundColor: "#eceff1",
  },

  skeletonMenuSubtitle: {
    width: "72%",
    height: 10,
    marginTop: 7,
    borderRadius: 5,
    backgroundColor: "#f1f3f4",
  },
});
