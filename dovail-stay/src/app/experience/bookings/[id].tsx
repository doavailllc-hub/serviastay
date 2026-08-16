import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
    Building2,
    ChevronLeft,
    MapPin,
    MessageCircle,
    ReceiptText,
    ShieldCheck
} from "lucide-react-native";
import React, {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

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
const DANGER = "#d93025";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type ExperienceImage = {
  image_url?: string;
  imageUrl?: string;
  url?: string;
};

type BookingDetails = {
  id: number | string;
  booking_id?: number | string;

  experience_id?: number | string;
  trip_id?: number | string;
  departure_id?: number | string;

  title?: string;
  experience_title?: string;
  trip_title?: string;
  package_name?: string;

  description?: string;
  itinerary?: string;
  includes?: string;
  exclusions?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  images?: ExperienceImage[] | string | null;

  location?: string;
  city?: string;
  destination?: string;

  package_days?: number | string;
  package_nights?: number | string;

  booking_date?: string;
  departure_date?: string;
  travel_date?: string;
  created_at?: string;

  guests?: number | string;
  travelers?: number | string;
  guest_count?: number | string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;
  taxes?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;
  payment_method?: string;

  razorpay_order_id?: string;
  razorpay_payment_id?: string;

  host_id?: number | string;
  host_name?: string;
  host_email?: string;
  host_phone?: string;

  conversation_id?: number | string;
  chat_id?: number | string;

  pickup_location?: string;
  pickup_note?: string;
  pickup_time?: string;
  pickup_contact?: string;

  hotel_name?: string;
  hotel_address?: string;
  hotel_checkin?: string;
  hotel_checkout?: string;

  cancellation_policy?: string;
};

const firstParam = (
  value: string | string[] | undefined
) => (Array.isArray(value) ? value[0] || "" : value || "");

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value?: string) =>
  String(value || "").trim().toLowerCase();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
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
  images: BookingDetails["images"]
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

const parseList = (value?: string) => {
  if (!value?.trim()) return [];

  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseItinerary = (value?: string) => {
  if (!value?.trim()) return [];

  const text = value.trim();
  const matches = [...text.matchAll(/Day\s*(\d+)\s*:\s*/gi)];

  if (!matches.length) {
    return [{ title: "Day 1", description: text }];
  }

  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index || text.length
        : text.length;

    return {
      title: `Day ${match[1]}`,
      description: text.slice(start, end).trim().replace(/\n+/g, " "),
    };
  });
};

const getObjectFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of [...keys, "data", "item", "booking"]) {
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

const getTitle = (booking: BookingDetails) =>
  booking.experience_title ||
  booking.trip_title ||
  booking.package_name ||
  booking.title ||
  "Trip package";

const getLocation = (booking: BookingDetails) =>
  booking.location ||
  booking.city ||
  booking.destination ||
  "Destination";

const getTravelDate = (booking: BookingDetails) =>
  booking.departure_date ||
  booking.travel_date ||
  booking.booking_date;

const getGuests = (booking: BookingDetails) =>
  Math.max(
    1,
    toNumber(
      booking.guests ??
        booking.travelers ??
        booking.guest_count
    )
  );

const getTotal = (booking: BookingDetails) =>
  toNumber(
    booking.total ??
      booking.total_amount ??
      booking.amount
  );

const getStatus = (booking: BookingDetails) =>
  booking.status ||
  booking.booking_status ||
  "Pending";

const isCancelled = (booking: BookingDetails) =>
  ["cancelled", "canceled", "rejected", "refunded"].includes(
    normalizeStatus(getStatus(booking))
  );

const isCompleted = (booking: BookingDetails) => {
  const status = normalizeStatus(getStatus(booking));

  if (status === "completed") return true;
  if (isCancelled(booking)) return false;

  const date = new Date(getTravelDate(booking) || "");

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
};

const canCancelBooking = (booking: BookingDetails) => {
  if (isCancelled(booking) || isCompleted(booking)) {
    return false;
  }

  const status = normalizeStatus(getStatus(booking));

  if (!["confirmed", "pending", "active"].includes(status)) {
    return false;
  }

  const travelDate = new Date(getTravelDate(booking) || "");

  return (
    Number.isNaN(travelDate.getTime()) ||
    travelDate.getTime() > Date.now()
  );
};

const getStatusTheme = (booking: BookingDetails) => {
  const status = normalizeStatus(getStatus(booking));

  if (
    status === "confirmed" ||
    status === "active" ||
    status === "upcoming"
  ) {
    return {
      label: getStatus(booking),
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (isCompleted(booking)) {
    return {
      label: "Completed",
      backgroundColor: "#E8F7F1",
      textColor: THEME,
    };
  }

  if (isCancelled(booking)) {
    return {
      label: "Cancelled",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: getStatus(booking),
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

const getPaymentTheme = (paymentStatus?: string) => {
  const status = normalizeStatus(paymentStatus);

  if (status === "paid" || status === "completed") {
    return {
      label: "Paid",
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (
    status === "refunded" ||
    status === "failed" ||
    status === "cancelled"
  ) {
    return {
      label: paymentStatus || "Refunded",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: paymentStatus || "Pending",
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

export default function ExperienceBookingDetailsScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    section?: string | string[];
  }>();

  const bookingId = firstParam(params.id);
  const requestedSection = firstParam(params.section);

  const [booking, setBooking] =
    useState<BookingDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  const loadBooking = useCallback(
    async (refresh = false) => {
      if (!bookingId) {
        setError("Booking ID is missing.");
        setLoading(false);
        return;
      }

      try {
        refresh ? setRefreshing(true) : setLoading(true);
        setError("");

        const user =
          (await getStoredUser()) as StoredUser | null;

        const userId = user?.id ?? user?.user_id;

        if (!userId) {
          router.replace("/login");
          return;
        }

        let response;

        try {
          response = await api.get(
            `/experience-bookings/details/${bookingId}`
          );
        } catch (firstError: any) {
          if (firstError?.response?.status !== 404) {
            throw firstError;
          }

          try {
            response = await api.get(
              `/experience-bookings/${bookingId}/details`
            );
          } catch (secondError: any) {
            if (secondError?.response?.status !== 404) {
              throw secondError;
            }

            response = await api.get(
              `/experience-bookings/${userId}`
            );
          }
        }

        let loadedBooking =
          getObjectFromResponse<BookingDetails>(
            response.data,
            ["experienceBooking", "tripBooking"]
          );

        if (Array.isArray(response.data)) {
          loadedBooking =
            response.data.find(
              (item: BookingDetails) =>
                String(item.booking_id || item.id) ===
                String(bookingId)
            ) || null;
        } else if (
          response.data &&
          typeof response.data === "object"
        ) {
          const record = response.data as Record<string, unknown>;

          for (const key of [
            "data",
            "items",
            "bookings",
            "experienceBookings",
          ]) {
            const value = record[key];

            if (Array.isArray(value)) {
              loadedBooking =
                value.find(
                  (item: BookingDetails) =>
                    String(item.booking_id || item.id) ===
                    String(bookingId)
                ) || null;
              break;
            }
          }
        }

        if (!loadedBooking) {
          throw new Error("Booking could not be found.");
        }

        setBooking(loadedBooking);
      } catch (requestError: any) {
        console.log(
          "Experience booking details error:",
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        setBooking(null);
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load this booking."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId]
  );

  useFocusEffect(
    useCallback(() => {
      loadBooking();
    }, [loadBooking])
  );

  const image = useMemo(() => {
    if (!booking) return FALLBACK_IMAGE;

    const images = parseImages(booking.images);

    return (
      images[0] ||
      normalizeImageUrl(
        booking.cover_image ||
          booking.image ||
          booking.image_url
      ) ||
      FALLBACK_IMAGE
    );
  }, [booking]);

  const itinerary = useMemo(
    () => parseItinerary(booking?.itinerary),
    [booking?.itinerary]
  );

  const includes = useMemo(
    () => parseList(booking?.includes),
    [booking?.includes]
  );

  const exclusions = useMemo(
    () => parseList(booking?.exclusions),
    [booking?.exclusions]
  );

  const openChat = () => {
    if (!booking) return;

    const chatId =
      booking.conversation_id ||
      booking.chat_id ||
      booking.host_id;

    if (!chatId) {
      Alert.alert(
        "Chat unavailable",
        "Host conversation details are not available for this booking."
      );
      return;
    }

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(chatId),
      },
    });
  };

  const openInvoice = async () => {
    if (!booking) return;

    try {
      const response = await api.get(
        `/experience-bookings/${booking.booking_id || booking.id}/invoice`
      );

      const invoiceUrl =
        response.data?.url ||
        response.data?.invoiceUrl ||
        response.data?.invoice_url;

      if (!invoiceUrl) {
        Alert.alert(
          "Invoice unavailable",
          "The invoice has not been generated yet."
        );
        return;
      }

      await Linking.openURL(invoiceUrl);
    } catch (requestError: any) {
      Alert.alert(
        "Invoice unavailable",
        requestError?.response?.data?.message ||
          "The invoice could not be opened."
      );
    }
  };

  const performCancellation = async () => {
    if (!booking || cancelling) return;

    try {
      setCancelling(true);

      const id = booking.booking_id || booking.id;

      try {
        await api.put(
          `/experience-bookings/${id}/cancel`,
          {
            reason:
              "Cancelled by guest from mobile app",
          }
        );
      } catch (firstError: any) {
        if (firstError?.response?.status !== 404) {
          throw firstError;
        }

        await api.patch(
          `/experience-bookings/${id}`,
          {
            status: "Cancelled",
            cancellation_reason:
              "Cancelled by guest from mobile app",
          }
        );
      }

      Alert.alert(
        "Booking cancelled",
        "Your trip booking has been cancelled.",
        [
          {
            text: "OK",
            onPress: () => loadBooking(),
          },
        ]
      );
    } catch (requestError: any) {
      Alert.alert(
        "Cancellation failed",
        requestError?.response?.data?.message ||
          "We could not cancel this booking."
      );
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancellation = () => {
    Alert.alert(
      "Cancel trip booking?",
      "Cancellation charges may apply according to the package policy.",
      [
        {
          text: "Keep booking",
          style: "cancel",
        },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: performCancellation,
        },
      ]
    );
  };

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
            Loading booking details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={WHITE}
        />

        <View style={styles.errorPage}>
          <Building2
            size={34}
            color={THEME}
          />

          <Text style={styles.errorTitle}>
            Booking unavailable
          </Text>

          <Text style={styles.errorText}>
            {error ||
              "This booking could not be loaded."}
          </Text>

          <Pressable
            onPress={() => loadBooking()}
            style={styles.primaryButton}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Try again
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.secondaryButton}
          >
            <Text
              style={styles.secondaryButtonText}
            >
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusTheme = getStatusTheme(booking);
  const paymentTheme =
    getPaymentTheme(booking.payment_status);

  const days = Math.max(
    1,
    toNumber(booking.package_days) || 1
  );

  const nights = Math.max(
    0,
    toNumber(booking.package_nights) ||
      days - 1
  );

  const total = getTotal(booking);
  const taxes = toNumber(booking.taxes);
  const subtotal = Math.max(0, total - taxes);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <View style={styles.page}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
            />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Booking details
            </Text>

            <Text style={styles.headerSubtitle}>
              #{booking.booking_id || booking.id}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                loadBooking(true)
              }
              colors={[THEME]}
              tintColor={THEME}
            />
          }
        >
          <Image
            source={{ uri: image }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.content}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      statusTheme.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        statusTheme.textColor,
                    },
                  ]}
                >
                  {statusTheme.label}
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      paymentTheme.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        paymentTheme.textColor,
                    },
                  ]}
                >
                  {paymentTheme.label}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>
              {getTitle(booking)}
            </Text>

            <View style={styles.locationRow}>
              <MapPin
                size={15}
                color={MUTED}
              />

              <Text style={styles.locationText}>
                {getLocation(booking)}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard
                label="Departure"
                value={formatDate(
                  getTravelDate(booking)
                )}
              />

              <SummaryCard
                label="Travelers"
                value={`${getGuests(booking)}`}
              />

              <SummaryCard
                label="Duration"
                value={`${days}D / ${nights}N`}
              />

              <SummaryCard
                label="Total"
                value={formatCurrency(total)}
              />
            </View>

            <SectionTitle title="Booking summary" />

            <View style={styles.infoCard}>
              <InfoRow
                label="Booking ID"
                value={`#${
                  booking.booking_id ||
                  booking.id
                }`}
              />

              <InfoRow
                label="Booked on"
                value={formatDate(
                  booking.created_at
                )}
              />

              <InfoRow
                label="Payment method"
                value={
                  booking.payment_method ||
                  "Not available"
                }
              />

              <InfoRow
                label="Payment status"
                value={
                  booking.payment_status ||
                  "Pending"
                }
                last
              />
            </View>

            <SectionTitle title="Pickup details" />

            <View style={styles.infoCard}>
              <InfoRow
                label="Pickup location"
                value={
                  booking.pickup_location ||
                  booking.pickup_note ||
                  "Will be shared before departure"
                }
              />

              <InfoRow
                label="Pickup time"
                value={
                  booking.pickup_time ||
                  "Will be shared"
                }
              />

              <InfoRow
                label="Pickup contact"
                value={
                  booking.pickup_contact ||
                  booking.host_phone ||
                  "Will be shared"
                }
                last
              />
            </View>

            <SectionTitle title="Hotel details" />

            <View style={styles.infoCard}>
              <InfoRow
                label="Hotel"
                value={
                  booking.hotel_name ||
                  "Will be shared before departure"
                }
              />

              <InfoRow
                label="Address"
                value={
                  booking.hotel_address ||
                  "Not available"
                }
              />

              <InfoRow
                label="Check-in"
                value={formatDate(
                  booking.hotel_checkin
                )}
              />

              <InfoRow
                label="Check-out"
                value={formatDate(
                  booking.hotel_checkout
                )}
                last
              />
            </View>

            {itinerary.length > 0 ? (
              <>
                <SectionTitle title="Itinerary" />

                <View style={styles.timeline}>
                  {itinerary.map((item, index) => (
                    <View
                      key={`${item.title}-${index}`}
                      style={styles.timelineRow}
                    >
                      <View
                        style={styles.timelineMarker}
                      >
                        <View
                          style={styles.timelineDot}
                        />

                        {index <
                        itinerary.length - 1 ? (
                          <View
                            style={styles.timelineLine}
                          />
                        ) : null}
                      </View>

                      <View
                        style={styles.timelineContent}
                      >
                        <Text
                          style={styles.timelineTitle}
                        >
                          {item.title}
                        </Text>

                        <Text
                          style={styles.timelineText}
                        >
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {includes.length > 0 ? (
              <>
                <SectionTitle title="Included" />
                <View style={styles.listCard}>
                  {includes.map((item) => (
                    <ListItem
                      key={item}
                      text={item}
                      positive
                    />
                  ))}
                </View>
              </>
            ) : null}

            {exclusions.length > 0 ? (
              <>
                <SectionTitle title="Not included" />
                <View style={styles.listCard}>
                  {exclusions.map((item) => (
                    <ListItem
                      key={item}
                      text={item}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <SectionTitle title="Price details" />

            <View style={styles.priceCard}>
              <PriceRow
                label="Trip subtotal"
                value={formatCurrency(subtotal)}
              />

              <PriceRow
                label="Taxes"
                value={formatCurrency(taxes)}
              />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Total
                </Text>

                <Text style={styles.totalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            <SectionTitle title="Support and documents" />

            <View style={styles.actionGrid}>
              <ActionCard
                title="Message host"
                icon={
                  <MessageCircle
                    size={21}
                    color={THEME}
                  />
                }
                onPress={openChat}
              />

              <ActionCard
                title="Open invoice"
                icon={
                  <ReceiptText
                    size={21}
                    color={THEME}
                  />
                }
                onPress={openInvoice}
              />
            </View>

            <View style={styles.policyCard}>
              <ShieldCheck
                size={20}
                color={THEME}
              />

              <Text style={styles.policyText}>
                {booking.cancellation_policy ||
                  "Cancellation is subject to the package policy and may include applicable charges."}
              </Text>
            </View>

            {canCancelBooking(booking) ? (
              <Pressable
                accessibilityRole="button"
                onPress={confirmCancellation}
                disabled={cancelling}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed &&
                    !cancelling &&
                    styles.cancelButtonPressed,
                  cancelling &&
                    styles.cancelButtonDisabled,
                ]}
              >
                {cancelling ? (
                  <ActivityIndicator
                    size="small"
                    color={DANGER}
                  />
                ) : (
                  <Text
                    style={styles.cancelButtonText}
                  >
                    Cancel booking
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.summaryValue}
      >
        {value}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>
        {label}
      </Text>

      <Text style={styles.priceValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionCard({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionCardPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        {icon}
      </View>

      <Text style={styles.actionTitle}>
        {title}
      </Text>
    </Pressable>
  );
}

function ListItem({
  text,
  positive = false,
}: {
  text: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.listItem}>
      <View
        style={[
          styles.listBullet,
          positive &&
            styles.listBulletPositive,
        ]}
      />

      <Text style={styles.listText}>
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

  page: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
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
    marginLeft: 6,
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 2,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  scrollContent: {
    paddingBottom: 44,
  },

  content: {
    paddingHorizontal: 18,
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

  errorPage: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    color: TEXT,
  },

  errorText: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    minHeight: 48,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor: THEME,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  secondaryButton: {
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
  },

  heroImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#f1f3f4",
  },

  badgeRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },

  title: {
    marginTop: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 24,
    lineHeight: 31,
    color: TEXT,
  },

  locationRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  locationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  summaryGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  summaryCard: {
    width: "48.5%",
    minHeight: 90,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    padding: 13,
  },

  summaryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: MUTED,
  },

  summaryValue: {
    marginTop: 8,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 19,
    color: TEXT,
  },

  sectionTitle: {
    marginTop: 25,
    marginBottom: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  infoCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 15,
  },

  infoRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  infoValue: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
    textAlign: "right",
  },

  timeline: {
    gap: 0,
  },

  timelineRow: {
    minHeight: 90,
    flexDirection: "row",
  },

  timelineMarker: {
    width: 24,
    alignItems: "center",
  },

  timelineDot: {
    width: 12,
    height: 12,
    marginTop: 4,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: THEME,
    backgroundColor: WHITE,
  },

  timelineLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
    backgroundColor: BORDER,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 20,
  },

  timelineTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  timelineText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  listCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 15,
    gap: 11,
  },

  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  listBullet: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: "#9aa0a6",
  },

  listBulletPositive: {
    backgroundColor: SUCCESS,
  },

  listText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: TEXT,
  },

  priceCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 15,
  },

  priceRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  priceLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  priceValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: TEXT,
  },

  totalRow: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: TEXT,
  },

  totalValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  actionGrid: {
    flexDirection: "row",
    gap: 10,
  },

  actionCard: {
    flex: 1,
    minHeight: 92,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },

  actionCardPressed: {
    backgroundColor: THEME_LIGHT,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTitle: {
    marginTop: 9,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: THEME,
  },

  policyCard: {
    marginTop: 18,
    borderRadius: 15,
    backgroundColor: THEME_LIGHT,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  policyText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  cancelButton: {
    minHeight: 50,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#efc8c5",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonPressed: {
    backgroundColor: "#fff7f7",
  },

  cancelButtonDisabled: {
    opacity: 0.6,
  },

  cancelButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: DANGER,
  },
});