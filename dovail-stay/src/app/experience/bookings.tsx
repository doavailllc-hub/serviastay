import { router, useFocusEffect } from "expo-router";
import {
    Building2,
    ChevronLeft,
    FileText,
    MapPin,
    MessageCircle,
    ReceiptText
} from "lucide-react-native";
import React, {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";
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

type BookingFilter =
  | "upcoming"
  | "completed"
  | "cancelled";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type ExperienceImage = {
  image_url?: string;
  imageUrl?: string;
  url?: string;
};

type ExperienceBooking = {
  id: number | string;
  booking_id?: number | string;

  experience_id?: number | string;
  trip_id?: number | string;
  departure_id?: number | string;

  title?: string;
  experience_title?: string;
  trip_title?: string;
  package_name?: string;

  location?: string;
  city?: string;
  destination?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  images?: ExperienceImage[] | string | null;

  booking_date?: string;
  departure_date?: string;
  travel_date?: string;
  created_at?: string;

  package_days?: number | string;
  package_nights?: number | string;

  guests?: number | string;
  travelers?: number | string;
  guest_count?: number | string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;
  payment_method?: string;

  host_id?: number | string;
  conversation_id?: number | string;
  chat_id?: number | string;

  pickup_location?: string;
  pickup_note?: string;
  hotel_name?: string;
  itinerary?: string;
};

const getArrayFromResponse = <T,>(
  payload: unknown
): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of [
    "data",
    "items",
    "results",
    "bookings",
    "experienceBookings",
    "tripBookings",
  ]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

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
  if (!value) return "Date unavailable";

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
  images: ExperienceBooking["images"]
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

const getImage = (booking: ExperienceBooking) => {
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
};

const getTitle = (booking: ExperienceBooking) =>
  booking.experience_title ||
  booking.trip_title ||
  booking.package_name ||
  booking.title ||
  "Trip package";

const getLocation = (booking: ExperienceBooking) =>
  booking.location ||
  booking.city ||
  booking.destination ||
  "Destination";

const getTravelDate = (
  booking: ExperienceBooking
) =>
  booking.departure_date ||
  booking.travel_date ||
  booking.booking_date;

const getGuests = (booking: ExperienceBooking) =>
  Math.max(
    1,
    toNumber(
      booking.guests ??
        booking.travelers ??
        booking.guest_count
    )
  );

const getTotal = (booking: ExperienceBooking) =>
  toNumber(
    booking.total ??
      booking.total_amount ??
      booking.amount
  );

const getStatus = (booking: ExperienceBooking) =>
  booking.status ||
  booking.booking_status ||
  "Pending";

const isCancelled = (
  booking: ExperienceBooking
) => {
  const status = normalizeStatus(
    getStatus(booking)
  );

  return [
    "cancelled",
    "canceled",
    "rejected",
    "refunded",
  ].includes(status);
};

const isCompleted = (
  booking: ExperienceBooking
) => {
  const status = normalizeStatus(
    getStatus(booking)
  );

  if (status === "completed") {
    return true;
  }

  if (isCancelled(booking)) {
    return false;
  }

  const dateValue = getTravelDate(booking);

  if (!dateValue) return false;

  const date = new Date(dateValue);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
};

const isUpcoming = (
  booking: ExperienceBooking
) => {
  if (
    isCancelled(booking) ||
    isCompleted(booking)
  ) {
    return false;
  }

  const dateValue = getTravelDate(booking);

  if (!dateValue) {
    return true;
  }

  const date = new Date(dateValue);

  return (
    Number.isNaN(date.getTime()) ||
    date.getTime() >= Date.now()
  );
};

const getBookingStatusTheme = (
  booking: ExperienceBooking
) => {
  const status = normalizeStatus(
    getStatus(booking)
  );

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
      backgroundColor: "#eaf1ff",
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

const getPaymentTheme = (
  paymentStatus?: string
) => {
  const status = normalizeStatus(paymentStatus);

  if (
    status === "paid" ||
    status === "completed"
  ) {
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
      label:
        paymentStatus || "Refunded",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label:
      paymentStatus || "Pending",
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

export default function ExperienceBookingsScreen() {
  const [bookings, setBookings] = useState<
    ExperienceBooking[]
  >([]);

  const [filter, setFilter] =
    useState<BookingFilter>("upcoming");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBookings = useCallback(
    async (refresh = false) => {
      try {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        setError("");

        const user =
          (await getStoredUser()) as StoredUser | null;

        const userId =
          user?.id ?? user?.user_id;

        if (!userId) {
          setBookings([]);
          router.replace("/login");
          return;
        }

        let response;

        try {
          response = await api.get(
            "/my-experience-bookings"
          );
        } catch (primaryError: any) {
          if (
            primaryError?.response?.status !==
            404
          ) {
            throw primaryError;
          }

          response = await api.get(
            `/experience-bookings/${userId}`
          );
        }

        const loaded =
          getArrayFromResponse<ExperienceBooking>(
            response.data
          );

        const sorted = [...loaded].sort(
          (first, second) => {
            const firstDate = new Date(
              getTravelDate(first) ||
                first.created_at ||
                0
            ).getTime();

            const secondDate = new Date(
              getTravelDate(second) ||
                second.created_at ||
                0
            ).getTime();

            return secondDate - firstDate;
          }
        );

        setBookings(sorted);
      } catch (requestError: any) {
        console.log(
          "My experience bookings error:",
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        setBookings([]);
        setError(
          requestError?.response?.data
            ?.message ||
            "We could not load your trip bookings."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const summary = useMemo(
    () => ({
      upcoming:
        bookings.filter(isUpcoming).length,
      completed:
        bookings.filter(isCompleted).length,
      cancelled:
        bookings.filter(isCancelled).length,
    }),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    if (filter === "completed") {
      return bookings.filter(isCompleted);
    }

    if (filter === "cancelled") {
      return bookings.filter(isCancelled);
    }

    return bookings.filter(isUpcoming);
  }, [bookings, filter]);

  const openDetails = (
    booking: ExperienceBooking
  ) => {
    router.push({
      pathname: "/experience/bookings/[id]",
      params: {
        id: String(
          booking.booking_id || booking.id
        ),
      },
    });
  };

  const openChat = (
    booking: ExperienceBooking
  ) => {
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

  const openInvoice = (
    booking: ExperienceBooking
  ) => {
    router.push({
      pathname: "/experience/bookings/[id]",
      params: {
        id: String(
          booking.booking_id || booking.id
        ),
        section: "invoice",
      },
    });
  };

  const renderBooking = ({
    item,
  }: {
    item: ExperienceBooking;
  }) => {
    const statusTheme =
      getBookingStatusTheme(item);

    const paymentTheme =
      getPaymentTheme(
        item.payment_status
      );

    const days = Math.max(
      1,
      toNumber(item.package_days) || 1
    );

    const nights = Math.max(
      0,
      toNumber(item.package_nights) ||
        days - 1
    );

    return (
      <View style={styles.bookingCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            openDetails(item)
          }
          style={({ pressed }) => [
            styles.cardMain,
            pressed && styles.cardPressed,
          ]}
        >
          <Image
            source={{ uri: getImage(item) }}
            style={styles.bookingImage}
            resizeMode="cover"
          />

          <View style={styles.bookingContent}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      statusTheme.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
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
                  styles.paymentBadge,
                  {
                    backgroundColor:
                      paymentTheme.backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentText,
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

            <Text
              numberOfLines={2}
              style={styles.bookingTitle}
            >
              {getTitle(item)}
            </Text>

            <View style={styles.locationRow}>
              <MapPin
                size={13}
                color={MUTED}
              />

              <Text
                numberOfLines={1}
                style={styles.locationText}
              >
                {getLocation(item)}
              </Text>
            </View>

            <Text style={styles.dateText}>
              {formatDate(
                getTravelDate(item)
              )}
            </Text>

            <Text style={styles.detailsText}>
              {days} days · {nights} nights ·{" "}
              {getGuests(item)}{" "}
              {getGuests(item) === 1
                ? "traveler"
                : "travelers"}
            </Text>
          </View>
        </Pressable>

        <View style={styles.bookingMeta}>
          <View>
            <Text style={styles.referenceLabel}>
              BOOKING
            </Text>

            <Text style={styles.referenceValue}>
              #
              {item.booking_id || item.id}
            </Text>
          </View>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              {formatCurrency(
                getTotal(item)
              )}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <ActionButton
            title="View details"
            icon={
              <FileText
                size={16}
                color={THEME}
              />
            }
            onPress={() =>
              openDetails(item)
            }
          />

          <ActionButton
            title="Message"
            icon={
              <MessageCircle
                size={16}
                color={THEME}
              />
            }
            onPress={() => openChat(item)}
          />

          <ActionButton
            title="Invoice"
            icon={
              <ReceiptText
                size={16}
                color={THEME}
              />
            }
            onPress={() =>
              openInvoice(item)
            }
          />
        </View>
      </View>
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
            Loading your trip bookings...
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
              Trip bookings
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your package reservations
            </Text>
          </View>
        </View>

        <FlatList
          data={filteredBookings}
          keyExtractor={(item) =>
            String(
              item.booking_id || item.id
            )
          }
          renderItem={renderBooking}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredBookings.length === 0 &&
              styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                loadBookings(true)
              }
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.filterRow}>
                <FilterButton
                  label="Upcoming"
                  count={summary.upcoming}
                  active={
                    filter === "upcoming"
                  }
                  onPress={() =>
                    setFilter("upcoming")
                  }
                />

                <FilterButton
                  label="Completed"
                  count={summary.completed}
                  active={
                    filter === "completed"
                  }
                  onPress={() =>
                    setFilter("completed")
                  }
                />

                <FilterButton
                  label="Cancelled"
                  count={summary.cancelled}
                  active={
                    filter === "cancelled"
                  }
                  onPress={() =>
                    setFilter("cancelled")
                  }
                />
              </View>

              {error ? (
                <View style={styles.errorCard}>
                  <Text
                    style={styles.errorText}
                  >
                    {error}
                  </Text>

                  <Pressable
                    onPress={() =>
                      loadBookings()
                    }
                    style={styles.retryButton}
                  >
                    <Text
                      style={
                        styles.retryButtonText
                      }
                    >
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Building2
                    size={31}
                    color={THEME}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No {filter} trips
                </Text>

                <Text style={styles.emptyText}>
                  {filter === "upcoming"
                    ? "Your upcoming trip package bookings will appear here."
                    : `You do not have any ${filter} trip bookings.`}
                </Text>

                {filter === "upcoming" ? (
                  <Pressable
                    onPress={() =>
                      router.replace("/")
                    }
                    style={styles.exploreButton}
                  >
                    <Text
                      style={
                        styles.exploreButtonText
                      }
                    >
                      Explore trips
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function FilterButton({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active &&
          styles.filterButtonActive,
        pressed &&
          styles.filterButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.filterLabel,
          active && styles.filterLabelActive,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.filterCount,
          active && styles.filterCountActive,
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function ActionButton({
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
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
    >
      {icon}

      <Text style={styles.actionButtonText}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  page: {
    flex: 1,
    backgroundColor: SURFACE,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
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

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  emptyList: {
    flexGrow: 1,
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },

  filterButton: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  filterButtonPressed: {
    opacity: 0.8,
  },

  filterLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: MUTED,
  },

  filterLabelActive: {
    color: THEME,
  },

  filterCount: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: TEXT,
  },

  filterCountActive: {
    color: THEME,
  },

  errorCard: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#f2c7c4",
    borderRadius: 15,
    backgroundColor: "#fff7f7",
    padding: 14,
  },

  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: DANGER,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: THEME,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  retryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: WHITE,
  },

  bookingCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  cardMain: {
    padding: 11,
    flexDirection: "row",
  },

  cardPressed: {
    opacity: 0.86,
  },

  bookingImage: {
    width: 116,
    height: 132,
    borderRadius: 14,
    backgroundColor: "#f1f3f4",
  },

  bookingContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 1,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "capitalize",
  },

  paymentBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  paymentText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "capitalize",
  },

  bookingTitle: {
    marginTop: 9,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 19,
    color: TEXT,
  },

  locationRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  locationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  dateText: {
    marginTop: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: TEXT,
  },

  detailsText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
    color: MUTED,
  },

  bookingMeta: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  referenceLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.6,
    color: MUTED,
  },

  referenceValue: {
    marginTop: 3,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: TEXT,
  },

  totalBlock: {
    alignItems: "flex-end",
  },

  totalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: MUTED,
  },

  totalValue: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  actionRow: {
    minHeight: 58,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: THEME_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  actionButtonPressed: {
    opacity: 0.72,
  },

  actionButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: THEME,
  },

  emptyState: {
    flex: 1,
    minHeight: 430,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  exploreButton: {
    minHeight: 46,
    marginTop: 20,
    borderRadius: 13,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  exploreButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },
});
