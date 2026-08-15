import { useFocusEffect, useRouter } from "expo-router";
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    MessageCircle,
    Search,
    User,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
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
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";
const SUCCESS = "#177a45";
const WARNING = "#a96300";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type ReservationItem = {
  id: number | string;
  booking_id?: number | string;

  guest_id?: number | string;
  user_id?: number | string;

  guest_name?: string;
  user_name?: string;
  customer_name?: string;

  guest_email?: string;
  user_email?: string;
  email?: string;

  guest_phone?: string;
  phone?: string;
  mobile?: string;

  property_title?: string;
  property_name?: string;
  title?: string;

  checkin?: string;
  checkout?: string;
  check_in?: string;
  check_out?: string;

  guests?: number | string;
  guest_count?: number | string;

  total?: number | string;
  total_amount?: number | string;
  amount?: number | string;

  status?: string;
  booking_status?: string;
  payment_status?: string;

  created_at?: string;
};

type GuestSummary = {
  key: string;
  guestId?: string;
  name: string;
  email: string;
  phone: string;

  bookingCount: number;
  upcomingCount: number;
  completedCount: number;
  cancelledCount: number;

  totalValue: number;
  paidValue: number;

  latestReservation: ReservationItem;
  latestReservationDate: string;
  reservations: ReservationItem[];
};

type GuestFilter =
  | "all"
  | "repeat"
  | "upcoming"
  | "paid";

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const response = payload as Record<string, unknown>;

  const keys = [
    "data",
    "items",
    "results",
    "bookings",
    "reservations",
  ];

  for (const key of keys) {
    const value = response[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const normalizeStatus = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeSearchValue = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeDateValue = (value?: string) => {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  const timestamp = date.getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) {
    return "Date unavailable";
  }

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

const getReservationStatus = (
  reservation: ReservationItem
) =>
  reservation.status ||
  reservation.booking_status ||
  "Pending";

const getGuestId = (
  reservation: ReservationItem
) =>
  reservation.guest_id ?? reservation.user_id;

const getGuestName = (
  reservation: ReservationItem
) =>
  reservation.guest_name ||
  reservation.user_name ||
  reservation.customer_name ||
  "Guest";

const getGuestEmail = (
  reservation: ReservationItem
) =>
  reservation.guest_email ||
  reservation.user_email ||
  reservation.email ||
  "";

const getGuestPhone = (
  reservation: ReservationItem
) =>
  reservation.guest_phone ||
  reservation.phone ||
  reservation.mobile ||
  "";

const getPropertyTitle = (
  reservation: ReservationItem
) =>
  reservation.property_title ||
  reservation.property_name ||
  reservation.title ||
  `Reservation #${
    reservation.booking_id || reservation.id
  }`;

const getCheckin = (
  reservation: ReservationItem
) =>
  reservation.checkin || reservation.check_in;

const getCheckout = (
  reservation: ReservationItem
) =>
  reservation.checkout || reservation.check_out;

const getReservationTotal = (
  reservation: ReservationItem
) =>
  toNumber(
    reservation.total ??
      reservation.total_amount ??
      reservation.amount
  );

const isCancelled = (
  reservation: ReservationItem
) => {
  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    status === "cancelled" ||
    status === "canceled" ||
    status === "rejected"
  );
};

const isPaid = (
  reservation: ReservationItem
) => {
  const paymentStatus = normalizeStatus(
    reservation.payment_status
  );

  const bookingStatus = normalizeStatus(
    getReservationStatus(reservation)
  );

  return (
    !isCancelled(reservation) &&
    (paymentStatus === "paid" ||
      paymentStatus === "completed" ||
      bookingStatus === "completed")
  );
};

const isCompleted = (
  reservation: ReservationItem
) => {
  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  if (status === "completed") {
    return true;
  }

  if (isCancelled(reservation)) {
    return false;
  }

  const checkout = getCheckout(reservation);
  const checkoutTime = safeDateValue(checkout);

  return (
    checkoutTime > 0 &&
    checkoutTime < Date.now()
  );
};

const isUpcoming = (
  reservation: ReservationItem
) => {
  if (
    isCancelled(reservation) ||
    isCompleted(reservation)
  ) {
    return false;
  }

  const status = normalizeStatus(
    getReservationStatus(reservation)
  );

  if (
    status === "confirmed" ||
    status === "upcoming" ||
    status === "pending"
  ) {
    return true;
  }

  const checkout = getCheckout(reservation);
  const checkoutTime = safeDateValue(checkout);

  return (
    checkoutTime > 0 &&
    checkoutTime >= Date.now()
  );
};

const getLatestReservationDate = (
  reservation: ReservationItem
) =>
  reservation.created_at ||
  getCheckin(reservation) ||
  "";

const buildGuestKey = (
  reservation: ReservationItem
) => {
  const guestId = getGuestId(reservation);

  if (guestId !== null && guestId !== undefined) {
    return `id:${String(guestId)}`;
  }

  const email = normalizeSearchValue(
    getGuestEmail(reservation)
  );

  if (email) {
    return `email:${email}`;
  }

  const phone = normalizeSearchValue(
    getGuestPhone(reservation)
  );

  if (phone) {
    return `phone:${phone}`;
  }

  return `name:${normalizeSearchValue(
    getGuestName(reservation)
  )}`;
};

const getInitials = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "G";
  }

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0][0]}${
    words[words.length - 1][0]
  }`.toUpperCase();
};

export default function HostGuestsScreen() {
  const router = useRouter();

  const [reservations, setReservations] =
    useState<ReservationItem[]>([]);

  const [searchText, setSearchText] =
    useState("");

  const [filter, setFilter] =
    useState<GuestFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const loadGuests = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError("");

        const storedUser =
          (await getStoredUser()) as StoredUser | null;

        const hostId =
          storedUser?.id ?? storedUser?.user_id;

        if (!hostId) {
          setReservations([]);

          setError(
            "Please sign in again to view your guests."
          );

          return;
        }

        const response = await api.get(
          `/host/reservations/${hostId}`
        );

        const loadedReservations =
          getArrayFromResponse<ReservationItem>(
            response.data
          );

        setReservations(loadedReservations);
      } catch (requestError) {
        console.error(
          "Load host guests error:",
          requestError
        );

        setReservations([]);

        setError(
          "We could not load your guest directory. Check your connection and try again."
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
      loadGuests(true);
    }, [loadGuests])
  );

  const guests = useMemo<
    GuestSummary[]
  >(() => {
    const guestMap = new Map<
      string,
      GuestSummary
    >();

    reservations.forEach((reservation) => {
      const key = buildGuestKey(reservation);
      const guestId = getGuestId(reservation);

      const current = guestMap.get(key);

      const reservationDate =
        getLatestReservationDate(reservation);

      if (!current) {
        guestMap.set(key, {
          key,

          guestId:
            guestId !== null &&
            guestId !== undefined
              ? String(guestId)
              : undefined,

          name: getGuestName(reservation),
          email: getGuestEmail(reservation),
          phone: getGuestPhone(reservation),

          bookingCount: 1,
          upcomingCount: isUpcoming(
            reservation
          )
            ? 1
            : 0,

          completedCount: isCompleted(
            reservation
          )
            ? 1
            : 0,

          cancelledCount: isCancelled(
            reservation
          )
            ? 1
            : 0,

          totalValue: isCancelled(reservation)
            ? 0
            : getReservationTotal(
                reservation
              ),

          paidValue: isPaid(reservation)
            ? getReservationTotal(
                reservation
              )
            : 0,

          latestReservation: reservation,
          latestReservationDate:
            reservationDate,

          reservations: [reservation],
        });

        return;
      }

      current.bookingCount += 1;

      if (isUpcoming(reservation)) {
        current.upcomingCount += 1;
      }

      if (isCompleted(reservation)) {
        current.completedCount += 1;
      }

      if (isCancelled(reservation)) {
        current.cancelledCount += 1;
      }

      if (!isCancelled(reservation)) {
        current.totalValue +=
          getReservationTotal(reservation);
      }

      if (isPaid(reservation)) {
        current.paidValue +=
          getReservationTotal(reservation);
      }

      current.reservations.push(
        reservation
      );

      if (
        safeDateValue(reservationDate) >
        safeDateValue(
          current.latestReservationDate
        )
      ) {
        current.latestReservation =
          reservation;

        current.latestReservationDate =
          reservationDate;
      }

      if (
        !current.email &&
        getGuestEmail(reservation)
      ) {
        current.email =
          getGuestEmail(reservation);
      }

      if (
        !current.phone &&
        getGuestPhone(reservation)
      ) {
        current.phone =
          getGuestPhone(reservation);
      }

      if (
        current.name === "Guest" &&
        getGuestName(reservation) !== "Guest"
      ) {
        current.name =
          getGuestName(reservation);
      }
    });

    return Array.from(
      guestMap.values()
    ).sort(
      (first, second) =>
        safeDateValue(
          second.latestReservationDate
        ) -
        safeDateValue(
          first.latestReservationDate
        )
    );
  }, [reservations]);

  const filteredGuests = useMemo(() => {
    const query =
      normalizeSearchValue(searchText);

    return guests.filter((guest) => {
      if (
        filter === "repeat" &&
        guest.bookingCount < 2
      ) {
        return false;
      }

      if (
        filter === "upcoming" &&
        guest.upcomingCount < 1
      ) {
        return false;
      }

      if (
        filter === "paid" &&
        guest.paidValue <= 0
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        guest.name,
        guest.email,
        guest.phone,
        getPropertyTitle(
          guest.latestReservation
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [filter, guests, searchText]);

  const summary = useMemo(() => {
    return {
      total: guests.length,

      repeat: guests.filter(
        (guest) =>
          guest.bookingCount > 1
      ).length,

      upcoming: guests.filter(
        (guest) =>
          guest.upcomingCount > 0
      ).length,

      paid: guests.filter(
        (guest) =>
          guest.paidValue > 0
      ).length,
    };
  }, [guests]);

  const refreshGuests = () => {
    setRefreshing(true);
    loadGuests(false);
  };

  const openLatestReservation = (
    guest: GuestSummary
  ) => {
    router.push({
      pathname:
        "/host/reservation/[id]",
      params: {
        id: String(
          guest.latestReservation.id
        ),
      },
    });
  };

  const openGuestChat = (
    guest: GuestSummary
  ) => {
    if (!guest.guestId) {
      return;
    }

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: guest.guestId,
      },
    });
  };

  const renderGuest = ({
    item,
  }: {
    item: GuestSummary;
  }) => {
    const repeatGuest =
      item.bookingCount > 1;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          openLatestReservation(item)
        }
        style={({ pressed }) => [
          styles.guestCard,
          pressed &&
            styles.guestCardPressed,
        ]}
      >
        <View style={styles.guestHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(item.name)}
            </Text>
          </View>

          <View style={styles.guestIdentity}>
            <View style={styles.nameRow}>
              <Text
                style={styles.guestName}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              {repeatGuest ? (
                <View
                  style={
                    styles.repeatBadge
                  }
                >
                  <Text
                    style={
                      styles.repeatBadgeText
                    }
                  >
                    Repeat guest
                  </Text>
                </View>
              ) : null}
            </View>

            {item.email ? (
              <Text
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.email}
              </Text>
            ) : item.phone ? (
              <Text
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.phone}
              </Text>
            ) : (
              <Text
                style={styles.contactText}
              >
                Contact unavailable
              </Text>
            )}
          </View>

          {item.guestId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Message ${item.name}`}
              onPress={(event) => {
                event.stopPropagation();
                openGuestChat(item);
              }}
              style={({ pressed }) => [
                styles.messageButton,
                pressed &&
                  styles.messageButtonPressed,
              ]}
            >
              <MessageCircle
                size={18}
                color={THEME}
                strokeWidth={1.9}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.guestMetrics}>
          <GuestMetric
            label="Bookings"
            value={item.bookingCount}
          />

          <View style={styles.metricDivider} />

          <GuestMetric
            label="Upcoming"
            value={item.upcomingCount}
          />

          <View style={styles.metricDivider} />

          <GuestMetric
            label="Paid value"
            value={formatCurrency(
              item.paidValue
            )}
          />
        </View>

        <View style={styles.latestBooking}>
          <View style={styles.latestIcon}>
            <FileText
              size={18}
              color={THEME}
              strokeWidth={1.9}
            />
          </View>

          <View style={styles.latestContent}>
            <Text style={styles.latestLabel}>
              Latest reservation
            </Text>

            <Text
              style={styles.latestTitle}
              numberOfLines={1}
            >
              {getPropertyTitle(
                item.latestReservation
              )}
            </Text>

            <Text style={styles.latestDate}>
              {formatDate(
                item.latestReservationDate
              )}
            </Text>
          </View>

          <ChevronRight
            size={19}
            color={MUTED}
            strokeWidth={1.9}
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            {item.completedCount} completed
          </Text>

          <Text style={styles.footerDot}>
            ·
          </Text>

          <Text style={styles.footerText}>
            {item.cancelledCount} cancelled
          </Text>

          <Text
            style={styles.totalValue}
          >
            {formatCurrency(
              item.totalValue
            )}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
        />

        <View
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color={THEME}
          />

          <Text style={styles.loadingText}>
            Loading guests...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
            strokeWidth={2}
          />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Guests
          </Text>

          <Text style={styles.headerSubtitle}>
            Reservation guest directory
          </Text>
        </View>

        <View style={styles.headerCount}>
          <Text
            style={styles.headerCountText}
          >
            {summary.total}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredGuests}
        keyExtractor={(item) => item.key}
        renderItem={renderGuest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredGuests.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshGuests}
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        ListHeaderComponent={
          <>
            {error ? (
              <View style={styles.errorCard}>
                <Text
                  style={styles.errorText}
                >
                  {error}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    loadGuests(true)
                  }
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed &&
                      styles.buttonPressed,
                  ]}
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

            <View style={styles.summaryCard}>
              <SummaryItem
                label="Guests"
                value={summary.total}
              />

              <View
                style={styles.summaryDivider}
              />

              <SummaryItem
                label="Repeat"
                value={summary.repeat}
              />

              <View
                style={styles.summaryDivider}
              />

              <SummaryItem
                label="Upcoming"
                value={summary.upcoming}
              />

              <View
                style={styles.summaryDivider}
              />

              <SummaryItem
                label="Paid"
                value={summary.paid}
              />
            </View>

            <View style={styles.searchContainer}>
              <Search
                size={19}
                color={MUTED}
                strokeWidth={1.9}
              />

              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search guests"
                placeholderTextColor="#9aa3b1"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.searchInput}
              />
            </View>

            <View style={styles.filterRow}>
              <FilterButton
                label="All"
                active={filter === "all"}
                onPress={() =>
                  setFilter("all")
                }
              />

              <FilterButton
                label="Repeat"
                active={
                  filter === "repeat"
                }
                onPress={() =>
                  setFilter("repeat")
                }
              />

              <FilterButton
                label="Upcoming"
                active={
                  filter === "upcoming"
                }
                onPress={() =>
                  setFilter("upcoming")
                }
              />

              <FilterButton
                label="Paid"
                active={filter === "paid"}
                onPress={() =>
                  setFilter("paid")
                }
              />
            </View>

            {filteredGuests.length > 0 ? (
              <View
                style={
                  styles.listHeadingRow
                }
              >
                <Text
                  style={styles.listHeading}
                >
                  Guest directory
                </Text>

                <Text
                  style={styles.listCount}
                >
                  {filteredGuests.length}
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <User
                  size={30}
                  color={THEME}
                  strokeWidth={1.8}
                />
              </View>

              <Text style={styles.emptyTitle}>
                No guests found
              </Text>

              <Text style={styles.emptyText}>
                {searchText
                  ? "No guests match your search."
                  : filter === "all"
                    ? "Guests will appear after you receive reservations."
                    : `You do not have any ${filter} guests yet.`}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

type SummaryItemProps = {
  label: string;
  value: number;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>
        {value}
      </Text>

      <Text style={styles.summaryLabel}>
        {label}
      </Text>
    </View>
  );
}

type FilterButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function FilterButton({
  label,
  active,
  onPress,
}: FilterButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        active &&
          styles.activeFilterButton,
        pressed &&
          styles.filterButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.activeFilterText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type GuestMetricProps = {
  label: string;
  value: string | number;
};

function GuestMetric({
  label,
  value,
}: GuestMetricProps) {
  return (
    <View style={styles.metricItem}>
      <Text
        style={styles.metricValue}
        numberOfLines={1}
      >
        {value}
      </Text>

      <Text style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: "#f1f3f5",
  },
  headerContent: {
    flex: 1,
    marginLeft: 4,
  },
  headerTitle: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 20,
  },
  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  headerCount: {
    minWidth: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  headerCountText: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 14,
  },
  listContent: {
    flexGrow: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#f1cccc",
    backgroundColor: "#fff7f7",
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
  },
  errorText: {
    color: "#a93737",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 11,
    backgroundColor: THEME,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  summaryLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: BORDER,
  },
  searchContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: TEXT,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  activeFilterButton: {
    borderColor: THEME,
    backgroundColor: "#edf3ff",
  },
  filterButtonPressed: {
    opacity: 0.72,
  },
  filterText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  activeFilterText: {
    color: THEME,
  },
  listHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listHeading: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
  },
  listCount: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  guestCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
  },
  guestCardPressed: {
    opacity: 0.78,
  },
  guestHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: THEME,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  guestIdentity: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  guestName: {
    flexShrink: 1,
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  repeatBadge: {
    borderRadius: 999,
    backgroundColor: "#e9f7ef",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  repeatBadgeText: {
    color: SUCCESS,
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
  },
  contactText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 5,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonPressed: {
    backgroundColor: "#edf3ff",
  },
  guestMetrics: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fb",
    borderRadius: 13,
    paddingVertical: 13,
    marginTop: 15,
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  metricDivider: {
    width: 1,
    height: 34,
    backgroundColor: BORDER,
  },
  metricValue: {
    color: TEXT,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  metricLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    marginTop: 4,
  },
  latestBooking: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  latestIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  latestContent: {
    flex: 1,
    marginHorizontal: 11,
  },
  latestLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  latestTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginTop: 3,
  },
  latestDate: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 3,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 13,
    marginTop: 14,
  },
  footerText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  footerDot: {
    color: "#aab1bb",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginHorizontal: 6,
  },
  totalValue: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 14,
    marginLeft: "auto",
  },
  emptyState: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 20,
    marginTop: 18,
  },
  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },
});