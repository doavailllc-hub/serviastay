import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  CheckCircle2,
  ChevronLeft,
  Home,
  MapPin,
  ReceiptText,
  Users,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../../api/api";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const SUCCESS = "#188038";
const WARNING = "#a96300";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type ExperienceImage = {
  image_url?: string;
  imageUrl?: string;
  url?: string;
};

type Experience = {
  id: number | string;
  title?: string;
  location?: string;
  city?: string;
  image?: string;
  image_url?: string;
  images?: ExperienceImage[] | string | null;
  package_days?: number | string;
  package_nights?: number | string;
};

const firstParam = (
  value: string | string[] | undefined
) => (Array.isArray(value) ? value[0] || "" : value || "");

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "Selected date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return value.startsWith("/")
    ? `https://stay.dovail.com${value}`
    : `https://stay.dovail.com/${value}`;
};

const parseImages = (
  images: Experience["images"]
): string[] => {
  if (!images) return [];

  if (Array.isArray(images)) {
    return images
      .map(
        (item) =>
          item.image_url ||
          item.imageUrl ||
          item.url ||
          ""
      )
      .filter(Boolean)
      .map(normalizeImageUrl);
  }

  if (typeof images === "string") {
    try {
      return parseImages(JSON.parse(images));
    } catch {
      return images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map(normalizeImageUrl);
    }
  }

  return [];
};

const getObjectFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of [...keys, "data", "item"]) {
    const value = record[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value as T;
    }
  }

  return payload as T;
};

export default function ExperienceBookingSuccessScreen() {
  const params = useLocalSearchParams<{
    bookingId?: string | string[];
    id?: string | string[];
    departureId?: string | string[];
    selectedDate?: string | string[];
    guests?: string | string[];
    total?: string | string[];
    paymentStatus?: string | string[];
  }>();

  const bookingId = firstParam(params.bookingId);
  const experienceId = firstParam(params.id);
  const departureId = firstParam(params.departureId);
  const selectedDate = firstParam(params.selectedDate);
  const guests = Math.max(
    1,
    toNumber(firstParam(params.guests) || 1)
  );
  const total = toNumber(firstParam(params.total));
  const paymentStatus =
    firstParam(params.paymentStatus) || "Confirmed";

  const [experience, setExperience] =
    useState<Experience | null>(null);
  const [loading, setLoading] = useState(
    Boolean(experienceId)
  );

  const loadExperience = useCallback(async () => {
    if (!experienceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/experiences/${experienceId}`
      );

      setExperience(
        getObjectFromResponse<Experience>(
          response.data,
          ["experience", "trip"]
        )
      );
    } catch (error) {
      console.log(
        "Booking success experience load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    loadExperience();
  }, [loadExperience]);

  const image = useMemo(() => {
    if (!experience) return FALLBACK_IMAGE;

    const images = parseImages(
      experience.images
    );

    return (
      images[0] ||
      normalizeImageUrl(
        experience.image ||
          experience.image_url
      ) ||
      FALLBACK_IMAGE
    );
  }, [experience]);

  const days = Math.max(
    1,
    toNumber(
      experience?.package_days
    ) || 1
  );

  const nights = Math.max(
    0,
    toNumber(
      experience?.package_nights
    ) ||
      days - 1
  );

  const paid =
    paymentStatus.toLowerCase() === "paid";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={WHITE}
        />

        <View style={styles.loadingPage}>
          <ActivityIndicator
            size="large"
            color={THEME}
          />

          <Text style={styles.loadingText}>
            Preparing booking confirmation...
          </Text>
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/experience/bookings")}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
            />
          </Pressable>
        </View>

        <View style={styles.successIcon}>
          <CheckCircle2
            size={44}
            color={THEME}
          />
        </View>

        <Text style={styles.title}>
          Trip package booked
        </Text>

        <Text style={styles.subtitle}>
          Your reservation has been created successfully.
          Pickup, hotel and itinerary details will appear in
          your trip booking.
        </Text>

        <View style={styles.bookingCard}>
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.cardContent}>
            <Text style={styles.bookingReference}>
              Booking #{bookingId || "Confirmed"}
            </Text>

            <Text
              numberOfLines={2}
              style={styles.tripTitle}
            >
              {experience?.title ||
                "Dovail Stay Trip Package"}
            </Text>

            <View style={styles.locationRow}>
              <MapPin
                size={15}
                color={MUTED}
              />

              <Text
                numberOfLines={1}
                style={styles.locationText}
              >
                {experience?.location ||
                  experience?.city ||
                  "Destination"}
              </Text>
            </View>

            {departureId ? (
              <Text style={styles.departureText}>
                Departure #{departureId}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoCard
            icon={
              <ReceiptText
                size={19}
                color={THEME}
              />
            }
            label="Departure"
            value={formatDate(selectedDate)}
          />

          <InfoCard
            icon={
              <Home
                size={19}
                color={THEME}
              />
            }
            label="Duration"
            value={`${days} Days / ${nights} Nights`}
          />

          <InfoCard
            icon={
              <Users
                size={19}
                color={THEME}
              />
            }
            label="Travelers"
            value={`${guests} ${
              guests === 1
                ? "traveler"
                : "travelers"
            }`}
          />

          <InfoCard
            icon={
              <ReceiptText
                size={19}
                color={THEME}
              />
            }
            label="Total"
            value={formatCurrency(total)}
          />
        </View>

        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: paid
                  ? SUCCESS
                  : WARNING,
              },
            ]}
          />

          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {paid
                ? "Payment successful"
                : "Booking pending payment"}
            </Text>

            <Text style={styles.statusText}>
              {paid
                ? "Your payment was verified and the trip is confirmed."
                : "Your reservation is saved. Complete payment according to the selected option."}
            </Text>
          </View>
        </View>

        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>
            What’s next?
          </Text>

          <NextItem text="The host will review your reservation details." />
          <NextItem text="Pickup instructions will be shared before departure." />
          <NextItem text="Hotel and itinerary details will appear in My Trips." />
          <NextItem text="You can contact support if you need help." />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.replace("/trips")
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          <Home
            size={19}
            color={WHITE}
          />

          <Text style={styles.primaryButtonText}>
            View my bookings
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.replace("/")
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            Explore more packages
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        {icon}
      </View>

      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}

function NextItem({
  text,
}: {
  text: string;
}) {
  return (
    <View style={styles.nextItem}>
      <CheckCircle2
        size={17}
        color={THEME}
      />

      <Text style={styles.nextItemText}>
        {text}
      </Text>
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
    paddingBottom: 44,
  },

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  topBar: {
    minHeight: 58,
    justifyContent: "center",
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

  successIcon: {
    alignSelf: "center",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  title: {
    marginTop: 22,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 27,
    lineHeight: 34,
    color: TEXT,
    textAlign: "center",
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 10,
    paddingHorizontal: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  bookingCard: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    padding: 10,
    flexDirection: "row",
  },

  image: {
    width: 108,
    height: 106,
    borderRadius: 14,
    backgroundColor: "#f1f3f4",
  },

  cardContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 3,
  },

  bookingReference: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MUTED,
  },

  tripTitle: {
    marginTop: 6,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 15,
    lineHeight: 20,
    color: TEXT,
  },

  locationRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  locationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  departureText: {
    marginTop: 7,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: THEME,
  },

  infoGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  infoCard: {
    width: "48.5%",
    minHeight: 118,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 14,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    marginTop: 11,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: MUTED,
  },

  infoValue: {
    marginTop: 5,
    fontFamily:
      "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
    color: TEXT,
  },

  statusCard: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: SURFACE,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  statusDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 5,
  },

  statusContent: {
    flex: 1,
    marginLeft: 11,
  },

  statusTitle: {
    fontFamily:
      "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  statusText: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: MUTED,
  },

  nextCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#dbe5fb",
    borderRadius: 17,
    backgroundColor: THEME_LIGHT,
    padding: 16,
  },

  nextTitle: {
    marginBottom: 12,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  nextItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 11,
  },

  nextItemText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  primaryButton: {
    minHeight: 52,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
    minHeight: 50,
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonPressed: {
    backgroundColor: SURFACE,
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },
});