import { router } from "expo-router";
import {
  ChevronLeft,
  FileText,
  Globe2,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

type LegalTab = "terms" | "privacy";

type LegalSection = {
  id: string;
  title: string;
  body: string[];
};

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    body: [
      "By using Dovail Stay, you agree to these terms and any policies referenced within them.",
      "You must use the platform lawfully and provide accurate information when creating an account, booking a stay or listing a property.",
    ],
  },
  {
    id: "account",
    title: "2. Account responsibility",
    body: [
      "You are responsible for protecting access to your account and verification codes.",
      "Do not share OTPs, payment PINs, banking passwords or other sensitive credentials with anyone.",
      "You must notify Dovail Stay support if you believe your account has been accessed without permission.",
    ],
  },
  {
    id: "bookings",
    title: "3. Bookings and reservations",
    body: [
      "A booking is created when the reservation is accepted by the platform and recorded successfully.",
      "Guests are responsible for checking property details, dates, guest count, total price and cancellation terms before confirming.",
      "Hosts are responsible for keeping availability, pricing, listing descriptions and property information accurate.",
    ],
  },
  {
    id: "payments",
    title: "4. Payments",
    body: [
      "Online payments may be processed through Razorpay or another approved payment provider.",
      "Dovail Stay does not store card PINs, UPI PINs, banking passwords or complete card credentials.",
      "Some properties may allow payment at the property, subject to host policy.",
    ],
  },
  {
    id: "cancellations",
    title: "5. Cancellations and refunds",
    body: [
      "Cancellation eligibility depends on booking status, host policy and applicable refund rules.",
      "Approved refunds are returned through the original payment method where possible.",
      "Bank and payment-provider processing times may vary.",
    ],
  },
  {
    id: "conduct",
    title: "6. User conduct",
    body: [
      "Users must communicate respectfully and must not misuse the platform for fraud, harassment, illegal activity or misleading listings.",
      "Dovail Stay may restrict or suspend accounts that violate platform rules or create safety risks.",
    ],
  },
  {
    id: "hosting",
    title: "7. Hosting responsibilities",
    body: [
      "Hosts must have the legal right to offer their property or trip on the platform.",
      "Hosts are responsible for required licences, taxes, safety standards and local-law compliance.",
      "Listings may remain pending until reviewed and approved.",
    ],
  },
  {
    id: "availability",
    title: "8. Platform availability",
    body: [
      "Dovail Stay aims to provide reliable service but cannot guarantee uninterrupted access at all times.",
      "Maintenance, network issues, third-party failures or security events may temporarily affect availability.",
    ],
  },
  {
    id: "liability",
    title: "9. Limitation of responsibility",
    body: [
      "Dovail Stay provides a platform connecting guests and hosts.",
      "Users remain responsible for their own conduct, listings, travel decisions and compliance with applicable laws.",
    ],
  },
  {
    id: "changes",
    title: "10. Updates to these terms",
    body: [
      "These terms may be updated as the platform, laws or services change.",
      "Continued use of Dovail Stay after updates means you accept the revised terms.",
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "collection",
    title: "1. Information we collect",
    body: [
      "We may collect account details such as name, email address, phone number and profile information.",
      "We may also collect booking details, property interactions, messages, payment references and device-related information.",
    ],
  },
  {
    id: "usage",
    title: "2. How information is used",
    body: [
      "Information is used to operate accounts, process bookings, support payments, improve safety and provide customer support.",
      "We may also use information to prevent fraud, investigate misuse and comply with legal requirements.",
    ],
  },
  {
    id: "payments",
    title: "3. Payment information",
    body: [
      "Payments may be handled by Razorpay or another approved payment provider.",
      "Dovail Stay may store transaction references, payment status and order identifiers.",
      "We do not store your UPI PIN, card PIN, banking password or full card credentials.",
    ],
  },
  {
    id: "messages",
    title: "4. Messages and communication",
    body: [
      "Messages sent through the platform may be stored to support booking communication, safety reviews and customer support.",
      "Do not share unnecessary sensitive personal or financial information in messages.",
    ],
  },
  {
    id: "sharing",
    title: "5. Information sharing",
    body: [
      "Relevant booking information may be shared between guests and hosts when necessary to complete a reservation.",
      "Information may also be shared with service providers supporting hosting, payments, email, cloud storage, security and analytics.",
    ],
  },
  {
    id: "storage",
    title: "6. Data storage and security",
    body: [
      "We use reasonable technical and organisational measures to protect stored information.",
      "No online system can guarantee complete security, so users should also protect their own devices and accounts.",
    ],
  },
  {
    id: "retention",
    title: "7. Data retention",
    body: [
      "Information may be retained as long as needed to provide services, resolve disputes, prevent fraud and meet legal obligations.",
      "Some transaction and booking records may need to be retained after account closure.",
    ],
  },
  {
    id: "choices",
    title: "8. Your choices",
    body: [
      "You may update certain profile details from your account settings.",
      "You may contact support to request access, correction or deletion of eligible personal information.",
    ],
  },
  {
    id: "children",
    title: "9. Children",
    body: [
      "Dovail Stay is not intended for children who are not legally able to create travel bookings or contracts.",
      "Accounts should be created and managed by eligible adults.",
    ],
  },
  {
    id: "updates",
    title: "10. Privacy updates",
    body: [
      "This privacy notice may be updated as services, technology or legal requirements change.",
      "The latest version should be reviewed periodically.",
    ],
  },
];

export default function LegalScreen() {
  const [activeTab, setActiveTab] = useState<LegalTab>("terms");
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "acceptance"
  );

  const sections = useMemo(
    () => (activeTab === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS),
    [activeTab]
  );

  const openWebsite = async () => {
    await Linking.openURL("https://stay.dovail.com");
  };

  const contactSupport = async () => {
    await Linking.openURL(
      "mailto:business@dovail.com?subject=Dovail%20Stay%20Legal%20Question"
    );
  };

  const switchTab = (tab: LegalTab) => {
    setActiveTab(tab);

    setExpandedSection(
      tab === "terms"
        ? TERMS_SECTIONS[0].id
        : PRIVACY_SECTIONS[0].id
    );
  };

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
          <Text style={styles.headerTitle}>Terms and privacy</Text>

          <Text style={styles.headerSubtitle}>
            Dovail Stay legal information
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ShieldCheck size={27} color={THEME} />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Clear and transparent policies
            </Text>

            <Text style={styles.heroText}>
              Review how Dovail Stay works, your responsibilities and how
              personal information is handled.
            </Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <Pressable
            style={[
              styles.tabButton,
              activeTab === "terms" && styles.tabButtonActive,
            ]}
            onPress={() => switchTab("terms")}
          >
            <FileText
              size={18}
              color={activeTab === "terms" ? WHITE : MUTED}
            />

            <Text
              style={[
                styles.tabText,
                activeTab === "terms" && styles.tabTextActive,
              ]}
            >
              Terms
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,
              activeTab === "privacy" && styles.tabButtonActive,
            ]}
            onPress={() => switchTab("privacy")}
          >
            <ShieldCheck
              size={18}
              color={activeTab === "privacy" ? WHITE : MUTED}
            />

            <Text
              style={[
                styles.tabText,
                activeTab === "privacy" && styles.tabTextActive,
              ]}
            >
              Privacy
            </Text>
          </Pressable>
        </View>

        <View style={styles.updatedBox}>
          <Text style={styles.updatedLabel}>Last updated</Text>

          <Text style={styles.updatedValue}>July 2026</Text>
        </View>

        <Text style={styles.pageTitle}>
          {activeTab === "terms"
            ? "Dovail Stay Terms of Service"
            : "Dovail Stay Privacy Notice"}
        </Text>

        <Text style={styles.pageIntro}>
          {activeTab === "terms"
            ? "These terms explain the rules for using the Dovail Stay platform as a guest, host or account holder."
            : "This notice explains what information Dovail Stay may collect, why it is used and the choices available to you."}
        </Text>

        <View style={styles.sectionsCard}>
          {sections.map((section, index) => {
            const expanded = expandedSection === section.id;

            return (
              <View key={section.id}>
                <Pressable
                  style={({ pressed }) => [
                    styles.sectionHeader,
                    pressed && styles.sectionHeaderPressed,
                  ]}
                  onPress={() =>
                    setExpandedSection(expanded ? null : section.id)
                  }
                >
                  <Text style={styles.sectionHeaderTitle}>
                    {section.title}
                  </Text>

                  <ChevronLeft
                    size={19}
                    color="#9aa0a6"
                    style={[
                      styles.sectionChevron,
                      expanded && styles.sectionChevronExpanded,
                    ]}
                  />
                </Pressable>

                {expanded && (
                  <View style={styles.sectionBody}>
                    {section.body.map((paragraph, paragraphIndex) => (
                      <View
                        key={`${section.id}-${paragraphIndex}`}
                        style={styles.paragraphRow}
                      >
                        <View style={styles.paragraphDot} />

                        <Text style={styles.paragraphText}>
                          {paragraph}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {index < sections.length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.securityNotice}>
          <ShieldCheck size={22} color={THEME} />

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Security reminder
            </Text>

            <Text style={styles.securityText}>
              Dovail Stay will never ask for your OTP, UPI PIN, card PIN or
              banking password.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact and company</Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon={<Globe2 size={20} color={THEME} />}
            title="Website"
            value="stay.dovail.com"
            onPress={openWebsite}
          />

          <View style={styles.infoDivider} />

          <InfoRow
            icon={<User size={20} color={THEME} />}
            title="Legal or privacy questions"
            value="business@dovail.com"
            onPress={contactSupport}
          />
        </View>

        <Text style={styles.footerText}>
          These mobile policy pages are intended to reflect the Dovail Stay
          service. Final legal text should remain consistent with the policies
          published on the official website.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.infoRow,
        pressed && styles.infoRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>

      <ChevronLeft
        size={18}
        color="#9aa0a6"
        style={styles.chevronRight}
      />
    </Pressable>
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
    fontSize: 19,
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
    paddingBottom: 50,
  },

  heroCard: {
    borderRadius: 24,
    backgroundColor: THEME_LIGHT,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  heroContent: {
    flex: 1,
  },

  heroTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    lineHeight: 23,
    color: TEXT,
  },

  heroText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  tabContainer: {
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },

  tabButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  tabButtonActive: {
    backgroundColor: THEME,
  },

  tabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: MUTED,
  },

  tabTextActive: {
    color: WHITE,
  },

  updatedBox: {
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: SURFACE,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  updatedLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  updatedValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  pageTitle: {
    marginTop: 26,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: TEXT,
  },

  pageIntro: {
    marginTop: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
  },

  sectionsCard: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  sectionHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sectionHeaderPressed: {
    backgroundColor: SURFACE,
  },

  sectionHeaderTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: TEXT,
  },

  sectionChevron: {
    transform: [{ rotate: "-90deg" }],
  },

  sectionChevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },

  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 12,
  },

  paragraphRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  paragraphDot: {
    width: 5,
    height: 5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: THEME,
  },

  paragraphText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 21,
    color: MUTED,
  },

  divider: {
    height: 1,
    marginLeft: 16,
    backgroundColor: "#f1f3f4",
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

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  securityText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: TEXT,
  },

  infoCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  infoRow: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  infoRowPressed: {
    backgroundColor: SURFACE,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  infoValue: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: THEME,
  },

  infoDivider: {
    height: 1,
    marginLeft: 69,
    backgroundColor: "#f1f3f4",
  },

  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },

  footerText: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: "#9aa0a6",
    textAlign: "center",
  },
});