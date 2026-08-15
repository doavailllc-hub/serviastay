import { router } from "expo-router";
import {
    Building2,
    ChevronLeft,
    Globe2,
    ShieldCheck,
} from "lucide-react-native";
import {
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

type HostingType = "stay" | "trip";

export default function HostStartScreen() {
  const selectHostingType = (type: HostingType) => {
    if (type === "stay") {
      router.push("/host/stay/create");
      return;
    }

    router.push("/host/trip/create");
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

        <Text style={styles.headerTitle}>Start hosting</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Dovail Stay hosting</Text>

          <Text style={styles.title}>
            What would you like to host?
          </Text>

          <Text style={styles.subtitle}>
            Choose a listing type to begin. You can manage stays and trip
            packages separately from your host dashboard.
          </Text>
        </View>

        <View style={styles.options}>
          <HostingCard
            icon={<Building2 size={29} color={THEME} />}
            title="Stay"
            description="List a home, apartment, villa, resort, room or other accommodation."
            details={[
              "Set nightly pricing",
              "Add rooms and amenities",
              "Manage availability",
            ]}
            onPress={() => selectHostingType("stay")}
          />

          <HostingCard
            icon={<Globe2 size={29} color={THEME} />}
            title="Trip"
            description="Create a tour, holiday package, activity or guided travel experience."
            details={[
              "Create package itinerary",
              "Add departure dates",
              "Set traveler pricing",
            ]}
            onPress={() => selectHostingType("trip")}
          />
        </View>

        <View style={styles.processCard}>
          <Text style={styles.processTitle}>How it works</Text>

          <ProcessRow
            number="1"
            title="Create your listing"
            description="Add complete information, pricing and photos."
          />

          <View style={styles.processDivider} />

          <ProcessRow
            number="2"
            title="Submit for review"
            description="Dovail Stay reviews your listing before publishing."
          />

          <View style={styles.processDivider} />

          <ProcessRow
            number="3"
            title="Start receiving bookings"
            description="Manage reservations, messages and earnings from Host Mode."
          />
        </View>

        <View style={styles.securityBox}>
          <View style={styles.securityIcon}>
            <ShieldCheck size={22} color={THEME} />
          </View>

          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>
              Hosting verification
            </Text>

            <Text style={styles.securityText}>
              Identity verification and listing approval may be required before
              your stay or trip becomes publicly visible.
            </Text>

            <Pressable
              style={styles.verificationButton}
              onPress={() => router.push("/profile/security")}
            >
              <Text style={styles.verificationButtonText}>
                Check verification
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerText}>
          Listings must follow local laws, safety requirements and Dovail Stay
          hosting policies.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function HostingCard({
  icon,
  title,
  description,
  details,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.hostingCard,
        pressed && styles.hostingCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.hostingIcon}>{icon}</View>

      <View style={styles.hostingContent}>
        <Text style={styles.hostingTitle}>{title}</Text>

        <Text style={styles.hostingDescription}>
          {description}
        </Text>

        <View style={styles.detailList}>
          {details.map((detail) => (
            <View key={detail} style={styles.detailRow}>
              <View style={styles.detailDot} />

              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.continueRow}>
          <Text style={styles.continueText}>
            Continue with {title}
          </Text>

          <ChevronLeft
            size={19}
            color={THEME}
            style={styles.chevronRight}
          />
        </View>
      </View>
    </Pressable>
  );
}

function ProcessRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.processRow}>
      <View style={styles.processNumber}>
        <Text style={styles.processNumberText}>{number}</Text>
      </View>

      <View style={styles.processContent}>
        <Text style={styles.processRowTitle}>{title}</Text>

        <Text style={styles.processDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
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
    paddingTop: 24,
    paddingBottom: 50,
  },

  intro: {
    paddingBottom: 24,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: THEME,
  },

  title: {
    marginTop: 7,
    maxWidth: 340,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.9,
    color: TEXT,
  },

  subtitle: {
    marginTop: 10,
    maxWidth: 350,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
  },

  options: {
    gap: 16,
  },

  hostingCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    backgroundColor: WHITE,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15,
  },

  hostingCardPressed: {
    borderColor: THEME,
    backgroundColor: "#fbfdff",
    transform: [{ scale: 0.992 }],
  },

  hostingIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  hostingContent: {
    flex: 1,
  },

  hostingTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    color: TEXT,
  },

  hostingDescription: {
    marginTop: 7,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  detailList: {
    marginTop: 14,
    gap: 8,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  detailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME,
  },

  detailText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: TEXT,
  },

  continueRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  continueText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
  },

  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },

  processCard: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    paddingHorizontal: 17,
  },

  processTitle: {
    paddingTop: 18,
    paddingBottom: 6,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  processRow: {
    minHeight: 90,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  processNumber: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  processNumberText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: THEME,
  },

  processContent: {
    flex: 1,
  },

  processRowTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  processDescription: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  processDivider: {
    height: 1,
    marginLeft: 49,
    backgroundColor: "#f1f3f4",
  },

  securityBox: {
    marginTop: 20,
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    padding: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  securityIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  verificationButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    marginTop: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  verificationButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
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