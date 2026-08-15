import { router, useFocusEffect } from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  FileText,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../../api/api";
import {
  getStoredUser,
  logoutUser,
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
const SUCCESS_LIGHT = "#ecf8ef";
const WARNING = "#b45309";
const WARNING_LIGHT = "#fff7e6";
const DANGER = "#d93025";
const DANGER_LIGHT = "#fff4f3";

type SecurityUser = {
  id: number | string;
  fullname?: string;
  email?: string;
  phone?: string;
  role?: string;

  email_verified?: boolean | number;
  phone_verified?: boolean | number;

  kyc_status?: string;
  verification_status?: string;
  identity_status?: string;

  created_at?: string;
};

function normalize(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function SecurityScreen() {
  const [user, setUser] = useState<SecurityUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const loadSecurityProfile = useCallback(async () => {
    try {
      setLoading(true);

      const storedUser = await getStoredUser();

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      let profile: SecurityUser = storedUser;

      try {
        const response = await api.get(`/user/${storedUser.id}`);

        if (response.data) {
          profile = {
            ...storedUser,
            ...response.data,
          };
        }
      } catch (error) {
        console.log("Security profile load error:", error);
      }

      setUser(profile);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSecurityProfile();
    }, [loadSecurityProfile])
  );

  const verificationStatus = useMemo(() => {
    const status = normalize(
      user?.kyc_status ||
        user?.verification_status ||
        user?.identity_status
    );

    if (
      status === "verified" ||
      status === "approved" ||
      status === "completed"
    ) {
      return {
        label: "Identity verified",
        description:
          "Your identity verification has been approved.",
        color: SUCCESS,
        background: SUCCESS_LIGHT,
        verified: true,
      };
    }

    if (
      status === "pending" ||
      status === "submitted" ||
      status === "under review"
    ) {
      return {
        label: "Verification under review",
        description:
          "Your submitted identity information is being reviewed.",
        color: WARNING,
        background: WARNING_LIGHT,
        verified: false,
      };
    }

    if (
      status === "rejected" ||
      status === "declined" ||
      status === "failed"
    ) {
      return {
        label: "Verification needs attention",
        description:
          "Review your verification information and submit it again.",
        color: DANGER,
        background: DANGER_LIGHT,
        verified: false,
      };
    }

    return {
      label: "Identity not verified",
      description:
        "Verify your identity to improve account security and hosting access.",
      color: THEME,
      background: THEME_LIGHT,
      verified: false,
    };
  }, [user]);

  const emailVerified =
    user?.email_verified === true ||
    Number(user?.email_verified) === 1 ||
    Boolean(user?.email);

  const phoneVerified =
    user?.phone_verified === true ||
    Number(user?.phone_verified) === 1;

  const confirmLogout = () => {
    Alert.alert(
      "Log out of this device?",
      "You will need to verify your email again before accessing your account.",
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

      await logoutUser();
      router.replace("/login");
    } catch (error) {
      Alert.alert(
        "Logout failed",
        "We could not log you out. Please try again."
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const showPasswordlessInfo = () => {
    Alert.alert(
      "Passwordless login",
      "Dovail Stay uses email OTP verification instead of a traditional password. Never share your verification code with anyone."
    );
  };

  const showDeleteAccountInfo = () => {
    Alert.alert(
      "Delete account",
      "Permanent account deletion must be reviewed securely. Contact Dovail Stay support to begin the account deletion process.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Contact support",
          onPress: () => router.push("/support"),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <SecuritySkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Identity and security
          </Text>

          <Text style={styles.headerSubtitle}>
            Protect and verify your account
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.verificationCard,
            {
              backgroundColor:
                verificationStatus.background,
            },
          ]}
        >
          <View style={styles.verificationIcon}>
            {verificationStatus.verified ? (
              <CheckCircle2
                size={25}
                color={verificationStatus.color}
              />
            ) : (
              <ShieldCheck
                size={25}
                color={verificationStatus.color}
              />
            )}
          </View>

          <View style={styles.verificationContent}>
            <Text
              style={[
                styles.verificationTitle,
                {
                  color: verificationStatus.color,
                },
              ]}
            >
              {verificationStatus.label}
            </Text>

            <Text style={styles.verificationText}>
              {verificationStatus.description}
            </Text>

            {!verificationStatus.verified && (
              <Pressable
                style={({ pressed }) => [
                  styles.verifyButton,
                  pressed &&
                    styles.verifyButtonPressed,
                ]}
                onPress={() =>
                  router.push("/profile/verification")
                }
              >
                <Text style={styles.verifyButtonText}>
                  Open verification
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Account verification
        </Text>

        <View style={styles.card}>
          <StatusRow
            icon={<User size={20} color={THEME} />}
            title="Email address"
            value={user.email || "Email not available"}
            status={
              emailVerified ? "Verified" : "Not verified"
            }
            verified={emailVerified}
          />

          <View style={styles.divider} />

          <StatusRow
            icon={<User size={20} color={THEME} />}
            title="Phone number"
            value={user.phone || "Phone number not added"}
            status={
              phoneVerified
                ? "Verified"
                : user.phone
                  ? "Not verified"
                  : "Not added"
            }
            verified={phoneVerified}
          />

          <View style={styles.divider} />

          <StatusRow
            icon={
              <ShieldCheck
                size={20}
                color={THEME}
              />
            }
            title="Identity verification"
            value={verificationStatus.label}
            status={
              verificationStatus.verified
                ? "Verified"
                : "Action required"
            }
            verified={verificationStatus.verified}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Login and access
        </Text>

        <View style={styles.card}>
          <SecurityMenuItem
            icon={
              <ShieldCheck
                size={20}
                color={TEXT}
              />
            }
            title="Passwordless OTP login"
            subtitle="Your account uses secure email verification codes"
            onPress={showPasswordlessInfo}
          />

          <View style={styles.divider} />

          <SecurityMenuItem
            icon={<Bell size={20} color={TEXT} />}
            title="Security notifications"
            subtitle="Review recent booking and account notifications"
            onPress={() =>
              router.push("/notifications")
            }
          />

          <View style={styles.divider} />

          <SecurityMenuItem
            icon={<LogOut size={20} color={TEXT} />}
            title="Log out of this device"
            subtitle="Remove your current local login session"
            onPress={confirmLogout}
            loading={logoutLoading}
          />
        </View>

        <Text style={styles.sectionTitle}>
          Account information
        </Text>

        <View style={styles.detailsCard}>
          <DetailRow
            label="Account ID"
            value={String(user.id)}
          />

          <DetailRow
            label="Account type"
            value={
              user.role
                ? user.role.charAt(0).toUpperCase() +
                  user.role.slice(1)
                : "Guest"
            }
          />

          <DetailRow
            label="Joined"
            value={formatDate(user.created_at)}
          />
        </View>

        <View style={styles.securityNotice}>
          <ShieldCheck size={22} color={THEME} />

          <View style={styles.securityNoticeContent}>
            <Text style={styles.securityNoticeTitle}>
              Keep your account secure
            </Text>

            <Text style={styles.securityNoticeText}>
              Dovail Stay will never ask you to share an OTP,
              Razorpay PIN, card PIN or banking password.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Privacy and account control
        </Text>

        <View style={styles.card}>
          <SecurityMenuItem
            icon={<FileText size={20} color={TEXT} />}
            title="Privacy policy"
            subtitle="Learn how your personal information is used"
            onPress={() => router.push("/legal")}
          />

          <View style={styles.divider} />

          <SecurityMenuItem
            icon={<User size={20} color={DANGER} />}
            title="Delete account"
            subtitle="Request permanent deletion of your Dovail account"
            onPress={showDeleteAccountInfo}
            danger
          />
        </View>

        <Text style={styles.footerText}>
          Security support is available through the Dovail
          Stay help centre.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  icon,
  title,
  value,
  status,
  verified,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  status: string;
  verified: boolean;
}) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusIcon}>
        {icon}
      </View>

      <View style={styles.statusContent}>
        <Text style={styles.statusTitle}>
          {title}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.statusValue}
        >
          {value}
        </Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          verified
            ? styles.statusBadgeVerified
            : styles.statusBadgePending,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            verified
              ? styles.statusBadgeTextVerified
              : styles.statusBadgeTextPending,
          ]}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}

function SecurityMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  loading = false,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <View
        style={[
          styles.menuIcon,
          danger && styles.menuIconDanger,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={danger ? DANGER : THEME}
          />
        ) : (
          icon
        )}
      </View>

      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            danger && styles.menuTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.menuSubtitle}>
          {subtitle}
        </Text>
      </View>

      <ChevronLeft
        size={18}
        color="#9aa0a6"
        style={styles.chevronRight}
      />
    </Pressable>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={styles.detailValue}
      >
        {value}
      </Text>
    </View>
  );
}

function SecuritySkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader} />

      <View style={styles.skeletonVerification} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonCard} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonCard} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonDetails} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 42,
  },

  verificationCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  verificationContent: {
    flex: 1,
  },

  verificationTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
  },

  verificationText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  verifyButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: THEME,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  verifyButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  verifyButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    lineHeight: 26,
    color: TEXT,
  },

  card: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  statusRow: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  statusContent: {
    flex: 1,
  },

  statusTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  statusValue: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  statusBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  statusBadgeVerified: {
    backgroundColor: SUCCESS_LIGHT,
  },

  statusBadgePending: {
    backgroundColor: WARNING_LIGHT,
  },

  statusBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
  },

  statusBadgeTextVerified: {
    color: SUCCESS,
  },

  statusBadgeTextPending: {
    color: WARNING,
  },

  divider: {
    height: 1,
    marginLeft: 66,
    backgroundColor: "#f1f3f4",
  },

  menuItem: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  menuItemPressed: {
    backgroundColor: SURFACE,
  },

  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  menuIconDanger: {
    backgroundColor: DANGER_LIGHT,
  },

  menuContent: {
    flex: 1,
  },

  menuTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  menuTitleDanger: {
    color: DANGER,
  },

  menuSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },

  detailsCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    padding: 17,
    gap: 15,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },

  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  detailValue: {
    maxWidth: "58%",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: TEXT,
    textAlign: "right",
  },

  securityNotice: {
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: THEME_LIGHT,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  securityNoticeContent: {
    flex: 1,
  },

  securityNoticeTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  securityNoticeText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  footerText: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: "#9aa0a6",
    textAlign: "center",
  },

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  skeletonHeader: {
    width: "56%",
    height: 22,
    borderRadius: 8,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonVerification: {
    width: "100%",
    height: 150,
    marginTop: 28,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },

  skeletonSectionTitle: {
    width: "43%",
    height: 20,
    marginTop: 30,
    marginBottom: 13,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonCard: {
    width: "100%",
    height: 246,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },

  skeletonDetails: {
    width: "100%",
    height: 145,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },
});