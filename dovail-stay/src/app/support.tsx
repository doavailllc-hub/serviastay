import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
    ChevronLeft,
    FileText,
    Mail,
    MessageCircle,
    Search,
    ShieldCheck,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

type HelpItem = {
  id: string;
  title: string;
  description: string;
  answer: string;
  category: string;
};

const HELP_ITEMS: HelpItem[] = [
  {
    id: "booking",
    title: "How do I make a booking?",
    description: "Choose dates, guests and confirm your reservation.",
    answer:
      "Open a stay, select your check-in and checkout dates, add guests, then tap Reserve. Review the booking details and choose Razorpay or pay at property.",
    category: "Bookings",
  },
  {
    id: "payment",
    title: "Which payment methods are supported?",
    description: "Learn about Razorpay and pay-at-property options.",
    answer:
      "Dovail Stay supports online payments through Razorpay and pay-at-property bookings where enabled by the host.",
    category: "Payments",
  },
  {
    id: "cancel",
    title: "How can I cancel a booking?",
    description: "Review cancellation options for your reservation.",
    answer:
      "Open Trips, select the booking and check whether cancellation is available. Cancellation rules depend on the host policy and booking status.",
    category: "Bookings",
  },
  {
    id: "refund",
    title: "When will I receive a refund?",
    description: "Understand refund review and processing times.",
    answer:
      "Approved refunds are returned through the original payment method. Processing time depends on Razorpay, your bank and the refund status.",
    category: "Payments",
  },
  {
    id: "host",
    title: "How do I become a host?",
    description: "List a stay or trip on Dovail Stay.",
    answer:
      "Open Profile and select Start hosting. Complete your verification, add listing details, upload photos and submit the listing for review.",
    category: "Hosting",
  },
  {
    id: "verification",
    title: "Why is identity verification required?",
    description: "Learn how verification protects the platform.",
    answer:
      "Identity verification helps protect guests, hosts and payments. It may be required before hosting or accessing certain account features.",
    category: "Account",
  },
  {
    id: "messages",
    title: "How do I contact a host?",
    description: "Use secure in-app messaging.",
    answer:
      "Open the stay or booking details and tap Message host. All conversations remain available in the Messages section.",
    category: "Messages",
  },
  {
    id: "security",
    title: "How do I keep my account secure?",
    description: "Protect your OTP and payment information.",
    answer:
      "Never share your OTP, card PIN, UPI PIN or banking password. Dovail Stay support will never ask for these details.",
    category: "Account",
  },
];

const categories = ["All", "Bookings", "Payments", "Hosting", "Account", "Messages"];

export default function SupportScreen() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return HELP_ITEMS.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const searchable = [
        item.title,
        item.description,
        item.answer,
        item.category,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [activeCategory, query]);

  const sendEmail = async () => {
    const emailUrl =
      "mailto:business@dovail.com?subject=Dovail%20Stay%20Support";

    try {
      const supported = await Linking.canOpenURL(emailUrl);

      if (!supported) {
        Alert.alert(
          "Email unavailable",
          "Please email business@dovail.com from your preferred email app."
        );
        return;
      }

      await Linking.openURL(emailUrl);
    } catch {
      Alert.alert(
        "Could not open email",
        "Please contact business@dovail.com."
      );
    }
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
          <Text style={styles.headerTitle}>Help centre</Text>
          <Text style={styles.headerSubtitle}>
            Find answers and contact support
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MessageCircle size={26} color={THEME} />
          </View>

          <Text style={styles.heroTitle}>How can we help?</Text>

          <Text style={styles.heroText}>
            Search common questions about bookings, payments, hosting and your
            Dovail Stay account.
          </Text>

          <View style={styles.searchBox}>
            <Search size={19} color="#80868b" />

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search help topics"
              placeholderTextColor="#80868b"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((category) => {
            const active = category === activeCategory;

            return (
              <Pressable
                key={category}
                style={[
                  styles.categoryButton,
                  active && styles.categoryButtonActive,
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Popular help topics</Text>

        <View style={styles.helpCard}>
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={28} color={THEME} />

              <Text style={styles.emptyTitle}>No matching help topics</Text>

              <Text style={styles.emptyText}>
                Try another keyword or select a different category.
              </Text>

              <Pressable
                style={styles.clearButton}
                onPress={() => {
                  setQuery("");
                  setActiveCategory("All");
                }}
              >
                <Text style={styles.clearButtonText}>Clear filters</Text>
              </Pressable>
            </View>
          ) : (
            filteredItems.map((item, index) => {
              const expanded = expandedId === item.id;

              return (
                <View key={item.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.helpItem,
                      pressed && styles.helpItemPressed,
                    ]}
                    onPress={() =>
                      setExpandedId(expanded ? null : item.id)
                    }
                  >
                    <View style={styles.helpItemContent}>
                      <Text style={styles.helpItemTitle}>{item.title}</Text>

                      <Text style={styles.helpItemDescription}>
                        {item.description}
                      </Text>

                      {expanded && (
                        <Text style={styles.helpAnswer}>{item.answer}</Text>
                      )}
                    </View>

                    <ChevronLeft
                      size={19}
                      color="#9aa0a6"
                      style={[
                        styles.chevron,
                        expanded && styles.chevronExpanded,
                      ]}
                    />
                  </Pressable>

                  {index < filteredItems.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionTitle}>Contact support</Text>

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Mail size={22} color={THEME} />
          </View>

          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Email support</Text>

            <Text style={styles.contactText}>
              Send your booking ID and a clear description of the issue.
            </Text>

            <Text style={styles.contactEmail}>business@dovail.com</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.contactButtonPressed,
            ]}
            onPress={sendEmail}
          >
            <Text style={styles.contactButtonText}>Email us</Text>
          </Pressable>
        </View>

        <View style={styles.securityCard}>
          <ShieldCheck size={22} color={THEME} />

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Stay safe</Text>

            <Text style={styles.securityText}>
              Never share OTPs, banking passwords, card PINs or UPI PINs with
              anyone claiming to be Dovail Stay support.
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.legalButton,
            pressed && styles.legalButtonPressed,
          ]}
          onPress={() => router.push("/legal")}
        >
          <View style={styles.legalIcon}>
            <FileText size={20} color={TEXT} />
          </View>

          <View style={styles.legalContent}>
            <Text style={styles.legalTitle}>Terms and privacy</Text>
            <Text style={styles.legalText}>
              Read Dovail Stay policies and legal information
            </Text>
          </View>

          <ChevronLeft
            size={19}
            color="#9aa0a6"
            style={styles.chevronRight}
          />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
    alignItems: "center",
  },

  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    marginTop: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 23,
    color: TEXT,
    textAlign: "center",
  },

  heroText: {
    marginTop: 8,
    maxWidth: 330,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  searchBox: {
    width: "100%",
    minHeight: 54,
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: WHITE,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
  },

  categoryList: {
    paddingTop: 20,
    paddingRight: 18,
    gap: 9,
  },

  categoryButton: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    backgroundColor: WHITE,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryButtonActive: {
    borderColor: THEME,
    backgroundColor: THEME,
  },

  categoryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  categoryTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: TEXT,
  },

  helpCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  helpItem: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  helpItemPressed: {
    backgroundColor: SURFACE,
  },

  helpItemContent: {
    flex: 1,
  },

  helpItemTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  helpItemDescription: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  helpAnswer: {
    marginTop: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: TEXT,
  },

  chevron: {
    marginTop: 3,
    transform: [{ rotate: "-90deg" }],
  },

  chevronExpanded: {
    transform: [{ rotate: "90deg" }],
  },

  divider: {
    height: 1,
    marginLeft: 16,
    backgroundColor: "#f1f3f4",
  },

  emptyState: {
    minHeight: 250,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 7,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  clearButton: {
    minHeight: 42,
    marginTop: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  clearButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
  },

  contactCard: {
    borderRadius: 22,
    backgroundColor: SURFACE,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  contactContent: {
    flex: 1,
  },

  contactTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  contactText: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: MUTED,
  },

  contactEmail: {
    marginTop: 5,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: THEME,
  },

  contactButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: THEME,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  contactButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.97 }],
  },

  contactButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: WHITE,
  },

  securityCard: {
    marginTop: 18,
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

  legalButton: {
    minHeight: 78,
    marginTop: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  legalButtonPressed: {
    backgroundColor: SURFACE,
  },

  legalIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  legalContent: {
    flex: 1,
  },

  legalTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  legalText: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },
});