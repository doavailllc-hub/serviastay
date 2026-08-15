import { router, useFocusEffect } from "expo-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  User,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import api from "../../api/api";
import {
  getStoredUser,
  saveStoredUser,
} from "../../services/authService";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const SUCCESS = "#16803d";

type ProfileUser = {
  id: number | string;
  fullname?: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  role?: string;
};

export default function EditProfileScreen() {
  const [user, setUser] = useState<ProfileUser | null>(null);

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = await getStoredUser();

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      let profile = storedUser;

      try {
        const response = await api.get(`/user/${storedUser.id}`);

        if (response.data) {
          profile = {
            ...storedUser,
            ...response.data,
          };
        }
      } catch (error) {
        console.log("Remote profile load error:", error);
      }

      setUser(profile);
      setFullname(profile.fullname || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const initial = useMemo(() => {
    return (
      fullname.trim().charAt(0).toUpperCase() ||
      email.trim().charAt(0).toUpperCase() ||
      "D"
    );
  }, [fullname, email]);

  const hasChanges = useMemo(() => {
    if (!user) return false;

    return (
      fullname.trim() !== String(user.fullname || "").trim() ||
      phone.trim() !== String(user.phone || "").trim()
    );
  }, [fullname, phone, user]);

  const validate = () => {
    if (fullname.trim().length < 2) {
      Alert.alert(
        "Name required",
        "Please enter your full name."
      );
      return false;
    }

    if (
      phone.trim() &&
      !/^[0-9+\-\s()]{7,20}$/.test(phone.trim())
    ) {
      Alert.alert(
        "Invalid phone number",
        "Please enter a valid phone number."
      );
      return false;
    }

    return true;
  };

  const saveProfile = async () => {
    if (!user || saving || !hasChanges || !validate()) return;

    try {
      setSaving(true);
      setSaved(false);

      const payload = {
        fullname: fullname.trim(),
        phone: phone.trim() || null,
      };

      const response = await api.put(
        `/user/${user.id}`,
        payload
      );

      const updatedUser = {
        ...user,
        ...payload,
        ...(response.data?.user || response.data || {}),
      };

      await saveStoredUser(updatedUser);

      setUser(updatedUser);
      setFullname(updatedUser.fullname || "");
      setPhone(updatedUser.phone || "");

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error: any) {
      console.log(
        "Profile save error:",
        error?.response?.data || error?.message || error
      );

      Alert.alert(
        "Could not save profile",
        error?.response?.data?.message ||
          "Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = () => {
    Alert.alert(
      "Profile photo",
      "Image picker and S3 upload will be connected in the next step."
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <EditProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={TEXT} />
          </Pressable>

          <Text style={styles.headerTitle}>Edit profile</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.photoSection}>
            <View style={styles.avatarWrap}>
              {user.profile_image ? (
                <Image
                  source={{ uri: user.profile_image }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {initial}
                  </Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.cameraButton,
                  pressed && styles.cameraButtonPressed,
                ]}
                onPress={changePhoto}
              >
                <Camera size={18} color={WHITE} />
              </Pressable>
            </View>

            <Text style={styles.photoTitle}>
              Profile photo
            </Text>

            <Text style={styles.photoSubtitle}>
              Add a clear photo so hosts and guests can recognise you.
            </Text>

            <Pressable
              style={styles.changePhotoButton}
              onPress={changePhoto}
            >
              <Text style={styles.changePhotoText}>
                Change photo
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>
            Personal information
          </Text>

          <View style={styles.formCard}>
            <Field
              icon={<User size={19} color={THEME} />}
              label="Full name"
              value={fullname}
              onChangeText={setFullname}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />

            <View style={styles.fieldDivider} />

            <Field
              icon={<Mail size={19} color={THEME} />}
              label="Email address"
              value={email}
              onChangeText={() => {}}
              placeholder="Email"
              keyboardType="email-address"
              editable={false}
              helper="Email changes require verification."
            />

            <View style={styles.fieldDivider} />

            <Field
              icon={<Phone size={19} color={THEME} />}
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="Add phone number"
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              Why we ask for this
            </Text>

            <Text style={styles.infoText}>
              Your profile information helps hosts identify guests and
              supports booking, verification and account recovery.
            </Text>
          </View>

          {saved && (
            <View style={styles.successBox}>
              <CheckCircle2 size={20} color={SUCCESS} />

              <Text style={styles.successText}>
                Profile updated successfully.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (!hasChanges || saving) &&
                styles.saveButtonDisabled,
              pressed &&
                hasChanges &&
                !saving &&
                styles.saveButtonPressed,
            ]}
            onPress={saveProfile}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <Text style={styles.saveButtonText}>
                Save changes
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?:
    | "default"
    | "email-address"
    | "phone-pad";
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
  editable?: boolean;
  helper?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}>{icon}</View>

      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9aa0a6"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          style={[
            styles.input,
            !editable && styles.inputDisabled,
          ]}
        />

        {helper ? (
          <Text style={styles.fieldHelper}>
            {helper}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function EditProfileSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader} />

      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonPhotoTitle} />
      <View style={styles.skeletonPhotoLine} />

      <View style={styles.skeletonSectionTitle} />

      <View style={styles.skeletonCard}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={styles.skeletonField}
          >
            <View style={styles.skeletonIcon} />

            <View style={styles.skeletonFieldContent}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonInput} />
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

  page: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    height: 64,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonPressed: {
    backgroundColor: SURFACE,
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    color: TEXT,
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 120,
  },

  photoSection: {
    alignItems: "center",
  },

  avatarWrap: {
    position: "relative",
  },

  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 34,
    backgroundColor: "#f1f3f4",
  },

  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 34,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 38,
    color: WHITE,
  },

  cameraButton: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4,
    borderColor: WHITE,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  cameraButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.95 }],
  },

  photoTitle: {
    marginTop: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  photoSubtitle: {
    marginTop: 7,
    maxWidth: 320,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  changePhotoButton: {
    minHeight: 42,
    marginTop: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  changePhotoText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
  },

  sectionTitle: {
    marginTop: 30,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  formCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
  },

  field: {
    minHeight: 96,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldContent: {
    flex: 1,
  },

  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  input: {
    minHeight: 38,
    marginTop: 3,
    paddingHorizontal: 0,
    paddingVertical: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: TEXT,
  },

  inputDisabled: {
    color: "#80868b",
  },

  fieldHelper: {
    marginTop: 2,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },

  fieldDivider: {
    height: 1,
    marginLeft: 50,
    backgroundColor: "#f1f3f4",
  },

  infoBox: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: SURFACE,
    padding: 16,
  },

  infoTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  infoText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  successBox: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#ecf8ef",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  successText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: SUCCESS,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 84,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
  },

  saveButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    backgroundColor: "#cdd4de",
  },

  saveButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.99 }],
  },

  saveButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  skeletonHeader: {
    width: "42%",
    height: 22,
    borderRadius: 8,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonAvatar: {
    width: 104,
    height: 104,
    marginTop: 34,
    borderRadius: 34,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonPhotoTitle: {
    width: "36%",
    height: 19,
    marginTop: 18,
    borderRadius: 8,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonPhotoLine: {
    width: "68%",
    height: 12,
    marginTop: 10,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
    alignSelf: "center",
  },

  skeletonSectionTitle: {
    width: "44%",
    height: 21,
    marginTop: 32,
    marginBottom: 13,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonCard: {
    borderRadius: 22,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
  },

  skeletonField: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#eceff1",
  },

  skeletonFieldContent: {
    flex: 1,
  },

  skeletonLabel: {
    width: "32%",
    height: 11,
    borderRadius: 6,
    backgroundColor: "#eceff1",
  },

  skeletonInput: {
    width: "72%",
    height: 15,
    marginTop: 10,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },
});