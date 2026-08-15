import { router, useFocusEffect } from "expo-router";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  RefreshCw,
  Search,
  XCircle
} from "lucide-react-native";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

const FALLBACK_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type ReservationTab = "Stays" | "Trip packages";
type ReservationFilter =
  | "Upcoming"
  | "Completed"
  | "Cancelled";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type Reservation = {
  id: number | string;
  booking_id?: number | string;
  type?: "stay" | "trip";

  property_id?: number | string;
  experience_id?: number | string;
  departure_id?: number | string;

  title?: string;
  property_title?: string;
  experience_title?: string;
  trip_title?: string;
  package_name?: string;

  guest_name?: string;
  user_name?: string;
  fullname?: string;
  guest_email?: string;
  guest_phone?: string;

  location?: string;
  city?: string;
  destination?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  property_image?: string;
  images?: unknown;

  checkin?: string;
  checkout?: string;
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

  status?: string;
  booking_status?: string;
  payment_status?: string;
  payment_method?: string;

  package_days?: number | string;
  package_nights?: number | string;

  conversation_id?: number | string;
  chat_id?: number | string;
  user_id?: number | string;
};

const FILTERS: ReservationFilter[] = [
  "Upcoming",
  "Completed",
  "Cancelled",
];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value?: string) =>
  String(value || "Pending").trim().toLowerCase();

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

const imageFromUnknown = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") {
    try {
      return imageFromUnknown(JSON.parse(value));
    } catch {
      return normalizeImageUrl(value);
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image = imageFromUnknown(item);
      if (image) return image;
    }
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "url",
      "image_url",
      "imageUrl",
      "image",
      "path",
    ]) {
      const image = record[key];

      if (
        typeof image === "string" &&
        image.trim()
      ) {
        return normalizeImageUrl(image);
      }
    }
  }

  return "";
};

const getArrayFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of [
    ...keys,
    "data",
    "items",
    "results",
    "bookings",
    "reservations",
  ]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const parseDate = (value?: string) => {
  if (!value) return null;

  const normalized = value.includes("T")
    ? value
    : `${value.slice(0, 10)}T00:00:00`;

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string) => {
  const date = parseDate(value);

  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateRange = (
  start?: string,
  end?: string
) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate || !endDate) {
    return "Dates unavailable";
  }

  const startText =
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
    }).format(startDate);

  const endText =
    new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(endDate);

  return `${startText} – ${endText}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const getReservationStatus = (
  reservation: Reservation
) =>
  reservation.status ||
  reservation.booking_status ||
  "Pending";

const isCancelled = (
  reservation: Reservation
) =>
  [
    "cancelled",
    "canceled",
    "rejected",
    "declined",
    "refunded",
  ].includes(
    normalizeStatus(
      getReservationStatus(reservation)
    )
  );

const isCompleted = (
  reservation: Reservation
) => {
  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  if (
    [
      "completed",
      "checked-out",
      "checked out",
    ].includes(status)
  ) {
    return true;
  }

  if (isCancelled(reservation)) {
    return false;
  }

  const date =
    reservation.type === "trip"
      ? parseDate(
          reservation.departure_date ||
            reservation.travel_date ||
            reservation.booking_date
        )
      : parseDate(reservation.checkout);

  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date.getTime() < today.getTime();
};

const isUpcoming = (
  reservation: Reservation
) =>
  !isCancelled(reservation) &&
  !isCompleted(reservation);

const getCategory = (
  reservation: Reservation
): ReservationFilter => {
  if (isCancelled(reservation)) {
    return "Cancelled";
  }

  if (isCompleted(reservation)) {
    return "Completed";
  }

  return "Upcoming";
};

const getStatusTheme = (
  reservation: Reservation
) => {
  const category = getCategory(reservation);

  if (category === "Completed") {
    return {
      label: "Completed",
      backgroundColor: "#eaf1ff",
      textColor: THEME,
    };
  }

  if (category === "Cancelled") {
    return {
      label: "Cancelled",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  if (
    ["confirmed", "approved", "active"].includes(
      status
    )
  ) {
    return {
      label:
        getReservationStatus(reservation),
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  return {
    label:
      getReservationStatus(reservation),
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
    [
      "failed",
      "refunded",
      "cancelled",
    ].includes(status)
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

const getTitle = (reservation: Reservation) =>
  reservation.property_title ||
  reservation.experience_title ||
  reservation.trip_title ||
  reservation.package_name ||
  reservation.title ||
  (reservation.type === "trip"
    ? "Trip package"
    : "Stay reservation");

const getGuestName = (
  reservation: Reservation
) =>
  reservation.guest_name ||
  reservation.user_name ||
  reservation.fullname ||
  reservation.guest_email ||
  "Guest";

const getLocation = (
  reservation: Reservation
) =>
  reservation.location ||
  reservation.city ||
  reservation.destination ||
  "Location unavailable";

const getGuests = (
  reservation: Reservation
) =>
  Math.max(
    1,
    toNumber(
      reservation.guests ??
        reservation.travelers ??
        reservation.guest_count
    )
  );

const getTotal = (
  reservation: Reservation
) =>
  toNumber(
    reservation.total ??
      reservation.total_amount ??
      reservation.amount
  );

const getImage = (
  reservation: Reservation
) =>
  normalizeImageUrl(
    reservation.cover_image ||
      reservation.property_image ||
      reservation.image ||
      reservation.image_url
  ) ||
  imageFromUnknown(reservation.images) ||
  (reservation.type === "trip"
    ? FALLBACK_TRIP_IMAGE
    : FALLBACK_STAY_IMAGE);

const getPrimaryDate = (
  reservation: Reservation
) =>
  reservation.type === "trip"
    ? reservation.departure_date ||
      reservation.travel_date ||
      reservation.booking_date
    : reservation.checkin;

export default function HostReservationsScreen() {
  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [activeTab, setActiveTab] =
    useState<ReservationTab>("Stays");

  const [activeFilter, setActiveFilter] =
    useState<ReservationFilter>("Upcoming");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [stayReservations, setStayReservations] =
    useState<Reservation[]>([]);

  const [tripReservations, setTripReservations] =
    useState<Reservation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const loadReservations = useCallback(
    async (refresh = false) => {
      try {
        refresh
          ? setRefreshing(true)
          : setLoading(true);

        setLoadFailed(false);

        const storedUser =
          (await getStoredUser()) as StoredUser | null;

        const hostId =
          storedUser?.id ?? storedUser?.user_id;

        if (!storedUser || !hostId) {
          setUser(null);
          router.replace("/login");
          return;
        }

        setUser(storedUser);

        const [stayResult, tripResult] =
          await Promise.allSettled([
            api.get(
              `/host/reservations/${hostId}`
            ),

            api
              .get("/host/package-bookings")
              .catch(async (error: any) => {
                if (
                  error?.response?.status !==
                  404
                ) {
                  throw error;
                }

                return api.get(
                  "/host/package-bookings"
                );
              }),
          ]);

        if (
          stayResult.status === "fulfilled"
        ) {
          setStayReservations(
            getArrayFromResponse<Reservation>(
              stayResult.value.data,
              [
                "stayReservations",
                "hostReservations",
              ]
            ).map((item) => ({
              ...item,
              type: "stay",
            }))
          );
        } else {
          setStayReservations([]);
        }

        if (
          tripResult.status === "fulfilled"
        ) {
          setTripReservations(
            getArrayFromResponse<Reservation>(
              tripResult.value.data,
              [
                "tripReservations",
                "experienceBookings",
                "packageBookings",
              ]
            ).map((item) => ({
              ...item,
              type: "trip",
            }))
          );
        } else {
          setTripReservations([]);
        }

        if (
          stayResult.status === "rejected" &&
          tripResult.status === "rejected"
        ) {
          setLoadFailed(true);
        }
      } catch (error: any) {
        console.log(
          "Host reservations load error:",
          error?.response?.data ||
            error?.message ||
            error
        );

        setStayReservations([]);
        setTripReservations([]);
        setLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [loadReservations])
  );

  const currentReservations =
    activeTab === "Stays"
      ? stayReservations
      : tripReservations;

  const counts = useMemo(
    () => ({
      Upcoming:
        currentReservations.filter(
          (item) =>
            getCategory(item) === "Upcoming"
        ).length,
      Completed:
        currentReservations.filter(
          (item) =>
            getCategory(item) === "Completed"
        ).length,
      Cancelled:
        currentReservations.filter(
          (item) =>
            getCategory(item) === "Cancelled"
        ).length,
    }),
    [currentReservations]
  );

  const filteredReservations =
    useMemo(() => {
      const query =
        searchQuery.trim().toLowerCase();

      return currentReservations
        .filter(
          (item) =>
            getCategory(item) === activeFilter
        )
        .filter((item) => {
          if (!query) return true;

          const searchable = [
            getTitle(item),
            getGuestName(item),
            getLocation(item),
            item.guest_email,
            item.guest_phone,
            item.status,
            item.payment_status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchable.includes(query);
        })
        .sort((first, second) => {
          const firstDate = parseDate(
            getPrimaryDate(first)
          )?.getTime();

          const secondDate = parseDate(
            getPrimaryDate(second)
          )?.getTime();

          if (
            activeFilter === "Upcoming"
          ) {
            return (
              (firstDate ?? Number.MAX_SAFE_INTEGER) -
              (secondDate ?? Number.MAX_SAFE_INTEGER)
            );
          }

          return (
            (secondDate ?? 0) -
            (firstDate ?? 0)
          );
        });
    }, [
      activeFilter,
      currentReservations,
      searchQuery,
    ]);

  const openReservation = (
    reservation: Reservation
  ) => {
    if (reservation.type === "trip") {
      router.push({
        pathname:
          "/host/trip-reservation/[id]",
        params: {
          id: String(
            reservation.booking_id ||
              reservation.id
          ),
        },
      });

      return;
    }

    router.push({
      pathname: "/host/reservation/[id]",
      params: {
        id: String(
          reservation.booking_id ||
            reservation.id
        ),
      },
    });
  };

  const openMessage = (
    reservation: Reservation
  ) => {
    const conversationId =
      reservation.conversation_id ||
      reservation.chat_id ||
      reservation.user_id;

    if (!conversationId) {
      router.push("/messages");
      return;
    }

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: String(conversationId),
      },
    });
  };

  const renderReservation = ({
    item,
  }: {
    item: Reservation;
  }) => {
    const statusTheme =
      getStatusTheme(item);

    const paymentTheme =
      getPaymentTheme(
        item.payment_status
      );

    const guests = getGuests(item);

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
      <View style={styles.reservationCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            openReservation(item)
          }
          style={({ pressed }) => [
            styles.cardMain,
            pressed && styles.cardPressed,
          ]}
        >
          <Image
            source={{
              uri: getImage(item),
            }}
            style={styles.reservationImage}
            resizeMode="cover"
          />

          <View style={styles.reservationContent}>
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

            <Text
              numberOfLines={1}
              style={styles.reservationTitle}
            >
              {getTitle(item)}
            </Text>

            <Text
              numberOfLines={1}
              style={styles.guestName}
            >
              {getGuestName(item)}
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
              {item.type === "trip"
                ? formatDate(
                    item.departure_date ||
                      item.travel_date ||
                      item.booking_date
                  )
                : formatDateRange(
                    item.checkin,
                    item.checkout
                  )}
            </Text>

            <Text style={styles.detailsText}>
              {item.type === "trip"
                ? `${days} days · ${nights} nights · ${guests} ${
                    guests === 1
                      ? "traveler"
                      : "travelers"
                  }`
                : `${guests} ${
                    guests === 1
                      ? "guest"
                      : "guests"
                  }`}
            </Text>
          </View>

          <ChevronRight
            size={18}
            color="#9aa0a6"
          />
        </Pressable>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.bookingLabel}>
              BOOKING
            </Text>

            <Text style={styles.bookingValue}>
              #
              {item.booking_id ||
                item.id}
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
          <Pressable
            onPress={() =>
              openReservation(item)
            }
            style={({ pressed }) => [
              styles.actionButton,
              pressed &&
                styles.actionButtonPressed,
            ]}
          >
            <Building2
              size={16}
              color={THEME}
            />

            <Text
              style={styles.actionButtonText}
            >
              View details
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              openMessage(item)
            }
            style={({ pressed }) => [
              styles.actionButton,
              pressed &&
                styles.actionButtonPressed,
            ]}
          >
            <MessageCircle
              size={16}
              color={THEME}
            />

            <Text
              style={styles.actionButtonText}
            >
              Message guest
            </Text>
          </Pressable>
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
            Loading reservations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <FlatList
        data={filteredReservations}
        key={`${activeTab}-${activeFilter}`}
        keyExtractor={(item) =>
          `${item.type}-${
            item.booking_id || item.id
          }`
        }
        renderItem={renderReservation}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredReservations.length ===
            0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadReservations(true)
            }
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.eyebrow}>
                Hosting
              </Text>

              <Text style={styles.title}>
                Reservations
              </Text>

              <Text style={styles.subtitle}>
                Manage stay and trip package
                bookings from one place.
              </Text>
            </View>

            {loadFailed ? (
              <View style={styles.errorCard}>
                <RefreshCw
                  size={19}
                  color={DANGER}
                />

                <View
                  style={
                    styles.errorContent
                  }
                >
                  <Text
                    style={styles.errorTitle}
                  >
                    Reservations could not load
                  </Text>

                  <Text
                    style={styles.errorText}
                  >
                    Pull down to refresh or try
                    again.
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    loadReservations()
                  }
                  style={styles.retryButton}
                >
                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.tabRow}>
              <TabButton
                label="Stays"
                count={stayReservations.length}
                active={activeTab === "Stays"}
                onPress={() => {
                  setActiveTab("Stays");
                  setActiveFilter("Upcoming");
                  setSearchQuery("");
                }}
              />

              <TabButton
                label="Trip packages"
                count={tripReservations.length}
                active={
                  activeTab ===
                  "Trip packages"
                }
                onPress={() => {
                  setActiveTab(
                    "Trip packages"
                  );
                  setActiveFilter("Upcoming");
                  setSearchQuery("");
                }}
              />
            </View>

            <View style={styles.searchBox}>
              <Search
                size={19}
                color={MUTED}
              />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search guest or listing"
                placeholderTextColor="#9aa0a6"
                style={styles.searchInput}
              />
            </View>

            <View
              style={styles.filterContainer}
            >
              {FILTERS.map((filter) => {
                const active =
                  activeFilter === filter;

                return (
                  <Pressable
                    key={filter}
                    onPress={() =>
                      setActiveFilter(filter)
                    }
                    style={[
                      styles.filterButton,
                      active &&
                        styles.filterButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active &&
                          styles.filterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>

                    <View
                      style={[
                        styles.countBadge,
                        active &&
                          styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          active &&
                            styles.countTextActive,
                        ]}
                      >
                        {counts[filter]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.resultText}>
              {filteredReservations.length}{" "}
              {filteredReservations.length === 1
                ? "reservation"
                : "reservations"}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              {activeFilter === "Upcoming" ? (
                <Clock3
                  size={31}
                  color={THEME}
                />
              ) : activeFilter ===
                "Completed" ? (
                <CheckCircle2
                  size={31}
                  color={THEME}
                />
              ) : (
                <XCircle
                  size={31}
                  color={THEME}
                />
              )}
            </View>

            <Text style={styles.emptyTitle}>
              No{" "}
              {activeFilter.toLowerCase()}{" "}
              reservations
            </Text>

            <Text style={styles.emptyText}>
              {searchQuery
                ? "Try another guest or listing name."
                : `Your ${activeFilter.toLowerCase()} ${
                    activeTab === "Stays"
                      ? "stay"
                      : "trip package"
                  } bookings will appear here.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function TabButton({
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
      style={[
        styles.tabButton,
        active && styles.tabButtonActive,
      ]}
    >
      <Text
        style={[
          styles.tabText,
          active && styles.tabTextActive,
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.tabCount,
          active && styles.tabCountActive,
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },

  emptyList: {
    flexGrow: 1,
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

  header: {
    paddingTop: 18,
    paddingBottom: 20,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  title: {
    marginTop: 4,
    fontFamily:
      "PlusJakartaSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: TEXT,
  },

  subtitle: {
    marginTop: 7,
    maxWidth: 330,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  errorCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f2c7c4",
    borderRadius: 16,
    backgroundColor: "#fff7f7",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: DANGER,
  },

  errorText: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  retryButton: {
    borderRadius: 10,
    backgroundColor: THEME,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  retryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: WHITE,
  },

  tabRow: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
  },

  tabButton: {
    flex: 1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  tabButtonActive: {
    borderBottomColor: THEME,
  },

  tabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: MUTED,
  },

  tabTextActive: {
    color: THEME,
  },

  tabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#f1f3f4",
    paddingHorizontal: 6,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },

  tabCountActive: {
    backgroundColor: THEME_LIGHT,
    color: THEME,
  },

  searchBox: {
    minHeight: 52,
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: WHITE,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    minHeight: 50,
    marginLeft: 10,
    paddingVertical: 0,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
  },

  filterContainer: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },

  filterButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  filterButtonActive: {
    backgroundColor: WHITE,
    elevation: 1,
  },

  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  filterTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: THEME,
  },

  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e4e7eb",
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeActive: {
    backgroundColor: THEME_LIGHT,
  },

  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: MUTED,
  },

  countTextActive: {
    color: THEME,
  },

  resultText: {
    marginTop: 15,
    marginBottom: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  reservationCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 19,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  cardMain: {
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  cardPressed: {
    opacity: 0.87,
  },

  reservationImage: {
    width: 108,
    height: 132,
    borderRadius: 14,
    backgroundColor: "#f1f3f4",
  },

  reservationContent: {
    flex: 1,
    paddingLeft: 12,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    textTransform: "capitalize",
  },

  reservationTitle: {
    marginTop: 8,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 13,
    lineHeight: 18,
    color: TEXT,
  },

  guestName: {
    marginTop: 5,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: TEXT,
  },

  locationRow: {
    marginTop: 6,
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
    marginTop: 7,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: TEXT,
  },

  detailsText: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    lineHeight: 14,
    color: MUTED,
  },

  cardFooter: {
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

  bookingLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.6,
    color: MUTED,
  },

  bookingValue: {
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
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  actionRow: {
    minHeight: 58,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    minHeight: 420,
    paddingHorizontal: 28,
    paddingBottom: 70,
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
    fontFamily:
      "PlusJakartaSans_700Bold",
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
});
