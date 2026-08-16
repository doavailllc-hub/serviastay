import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    CreditCard,
    MapPin,
    ShieldCheck
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
    View
} from "react-native";
import api from "../../api/api";
import { getStoredUser } from "../../services/authService";
import { openRazorpayCheckout } from "../../services/razorpay";
import {
  formatDisplayDate,
  isTodayOrFuture,
  toApiDate,
} from "../../utils/date";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const SUCCESS = "#188038";
const DANGER = "#d93025";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type PaymentMethod = "razorpay" | "pay_later";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
  fullname?: string;
  name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
};

type ExperienceImage = {
  image_url?: string;
  imageUrl?: string;
  url?: string;
};

type Experience = {
  id: number | string;
  title?: string;
  description?: string;
  location?: string;
  city?: string;
  price?: number | string;
  image?: string;
  image_url?: string;
  images?: ExperienceImage[] | string | null;
  package_days?: number | string;
  package_nights?: number | string;
};

type ExperienceDeparture = {
  id: number | string;
  departure_id?: number | string;
  departure_date?: string;
  date?: string;
  start_date?: string;
  total_seats?: number | string;
  available_seats?: number | string;
  capacity?: number | string;
  booked_seats?: number | string;
  status?: string;
  price_override?: number | string;
  price?: number | string;
};

const normalizeDeparture = (departure: ExperienceDeparture): ExperienceDeparture => ({
  ...departure,
  id: departure.id ?? departure.departure_id ?? "",
  departure_date: departure.departure_date || departure.date || departure.start_date,
  total_seats: departure.total_seats ?? departure.capacity ?? departure.available_seats ?? 0,
  booked_seats: departure.booked_seats ?? 0,
  price_override: departure.price_override ?? departure.price,
});

const getRemainingSeats = (departure: ExperienceDeparture) =>
  departure.available_seats != null
    ? toNumber(departure.available_seats)
    : toNumber(departure.total_seats) - toNumber(departure.booked_seats);

const getDepartures = (payload: unknown): ExperienceDeparture[] => {
  if (Array.isArray(payload)) return payload.map(normalizeDeparture);
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["departures", "data", "items", "results"]) {
    const departures = getDepartures(record[key]);
    if (departures.length) return departures;
  }
  return [];
};

const firstParam = (
  value: string | string[] | undefined
) => (Array.isArray(value) ? value[0] || "" : value || "");

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

const parseImageList = (
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
      return parseImageList(JSON.parse(images));
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  return formatDisplayDate(value, "Not selected");
};

const getUserId = (user: StoredUser | null) =>
  user?.id ?? user?.user_id;

export default function ExperienceCheckoutScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    departureId?: string | string[];
    selectedDate?: string | string[];
    guests?: string | string[];
  }>();

  const id = firstParam(params.id);
  const departureId = firstParam(params.departureId);
  const selectedDate = firstParam(params.selectedDate);
  const guests = Math.max(
    1,
    toNumber(firstParam(params.guests) || 1)
  );

  const [experience, setExperience] =
    useState<Experience | null>(null);

  const [departure, setDeparture] =
    useState<ExperienceDeparture | null>(null);

  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("razorpay");

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const loginRedirect = `/experience/checkout?id=${encodeURIComponent(id)}&departureId=${encodeURIComponent(departureId)}&selectedDate=${encodeURIComponent(selectedDate)}&guests=${guests}`;

  const loadCheckout = useCallback(async () => {
    if (!id) {
      setError("Trip package ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const storedUser =
        (await getStoredUser()) as StoredUser | null;

      if (!storedUser || !getUserId(storedUser)) {
        router.replace({
          pathname: "/login",
          params: { redirect: loginRedirect },
        });
        return;
      }

      setUser(storedUser);

      const experienceResponse = await api.get(
        `/experiences/${id}`
      );

      const loadedExperience =
        getObjectFromResponse<Experience>(
          experienceResponse.data,
          ["experience", "trip"]
        );

      if (!loadedExperience) {
        throw new Error(
          "Trip package could not be loaded."
        );
      }

      setExperience(loadedExperience);

      if (departureId) {
        try {
          const departureResponse = await api.get(
            `/trip-packages/${id}/departures`
          );

          const list = getDepartures(departureResponse.data);

          const matched = list.find(
            (item: ExperienceDeparture) =>
              String(item.id) ===
              String(departureId)
          );

          if (!matched) {
            throw new Error(
              "The selected departure no longer exists. Go back and choose another date."
            );
          }

          if (matched) {
            const remaining = getRemainingSeats(matched);

            const available =
              ["active", "available", "open", "bookable"].includes(
                String(matched.status || "active").toLowerCase()
              ) &&
              isTodayOrFuture(matched.departure_date) &&
              remaining >= guests;

            if (!available) {
              throw new Error(
                "The selected departure no longer has enough seats."
              );
            }

            setDeparture(matched);
          }
        } catch (departureError: any) {
          throw new Error(
            departureError?.message ||
              "The selected departure is unavailable."
          );
        }
      }
    } catch (requestError: any) {
      console.log(
        "Experience checkout load error:",
        requestError?.response?.data ||
          requestError?.message ||
          requestError
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load payment details."
      );
    } finally {
      setLoading(false);
    }
  }, [departureId, guests, id]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  const image = useMemo(() => {
    if (!experience) return FALLBACK_IMAGE;

    const images = parseImageList(
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

  const price = useMemo(() => {
    const override = toNumber(
      departure?.price_override
    );

    return override > 0
      ? override
      : toNumber(experience?.price);
  }, [
    departure?.price_override,
    experience?.price,
  ]);

  const subtotal = price * guests;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;
  const bookingDate = toApiDate(
    departure?.departure_date || selectedDate
  );

  const createBooking = useCallback(
    async ({
      paymentStatus,
      paymentId = null,
      orderId = null,
    }: {
      paymentStatus: string;
      paymentId?: string | null;
      orderId?: string | null;
    }) => {
      if (!experience || !user) {
        throw new Error(
          "Booking details are incomplete."
        );
      }

      const userId = getUserId(user);

      if (!userId) {
        router.replace({
          pathname: "/login",
          params: { redirect: loginRedirect },
        });
        return;
      }

      const response = await api.post(
        "/experience-bookings",
        {
          experience_id: Number(id),
          user_id: Number(userId),
          departure_id: departureId
            ? Number(departureId)
            : null,
          booking_date: bookingDate,
          guests,
          total,
          taxes,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          status:
            paymentStatus === "Paid"
              ? "Confirmed"
              : "Pending",
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
        }
      );

      router.replace({
        pathname:
          "/experience/booking-success",
        params: {
          bookingId: String(
            response.data?.bookingId ||
              response.data?.id ||
              ""
          ),
          id: String(experience.id),
          departureId,
          selectedDate:
            bookingDate,
          guests: String(guests),
          total: String(total),
          paymentStatus,
        },
      });
    },
    [
      departure?.departure_date,
      departureId,
      experience,
      guests,
      id,
      paymentMethod,
      selectedDate,
      bookingDate,
      taxes,
      total,
      user,
    ]
  );

  const payWithRazorpay =
    useCallback(async () => {
      if (!experience || !user) {
        throw new Error(
          "Payment details are incomplete."
        );
      }

      const userId = getUserId(user);

      if (!userId) {
        router.replace({
          pathname: "/login",
          params: { redirect: loginRedirect },
        });
        return;
      }

      const orderResponse = await api.post(
        "/experience-payments/create-order",
        {
          experience_id: Number(id),
          user_id: Number(userId),
          amount: total,
          currency: "INR",
          guests,
          booking_date: bookingDate,
          departure_id: departureId
            ? Number(departureId)
            : null,
        }
      );

      const order =
        orderResponse.data?.order;

      const key = orderResponse.data?.key;

      if (!order?.id || !key) {
        throw new Error(
          "The payment order could not be created."
        );
      }

      const result =
        await openRazorpayCheckout({
          key,
          amount: Number(order.amount),
          currency:
            order.currency || "INR",
          order_id: order.id,
          name: "Dovail Stay",
          description:
            experience.title ||
            "Trip package payment",
          image:
            "https://stay.dovail.com/favicon.png",
          prefill: {
            name:
              user.fullname ||
              user.name ||
              "",
            email: user.email || "",
            contact:
              user.phone ||
              user.phone_number ||
              "",
          },
          theme: {
            color: THEME,
          },
          notes: {
            experience_id: String(id),
            user_id: String(userId),
            guests: String(guests),
            departure_id:
              departureId || "",
          },
        });

      await api.post(
        "/experience-payments/verify",
        {
          razorpay_order_id:
            result.razorpay_order_id,
          razorpay_payment_id:
            result.razorpay_payment_id,
          razorpay_signature:
            result.razorpay_signature,
        }
      );

      await createBooking({
        paymentStatus: "Paid",
        paymentId:
          result.razorpay_payment_id,
        orderId:
          result.razorpay_order_id,
      });
    }, [
      createBooking,
      departure?.departure_date,
      departureId,
      experience,
      guests,
      id,
      selectedDate,
      bookingDate,
      total,
      user,
    ]);

  const handlePayment = async () => {
    if (paying) return;

    try {
      setPaying(true);
      setError("");

      if (!experience) {
        throw new Error(
          "Trip package details are missing."
        );
      }

      if (
        !bookingDate
      ) {
        throw new Error(
          "Travel date is missing. Go back and select a departure."
        );
      }

      if (!isTodayOrFuture(bookingDate)) {
        throw new Error(
          "The selected travel date has passed. Go back and choose a future departure."
        );
      }

      if (guests <= 0) {
        throw new Error(
          "Select at least one traveler."
        );
      }

      if (total <= 0) {
        throw new Error(
          "The booking amount is invalid."
        );
      }

      if (
        paymentMethod === "pay_later"
      ) {
        await createBooking({
          paymentStatus: "Pay at trip",
        });

        return;
      }

      await payWithRazorpay();
    } catch (paymentError: any) {
      console.log(
        "Experience payment error:",
        paymentError?.response?.data ||
          paymentError?.description ||
          paymentError?.message ||
          paymentError
      );

      const cancelled =
        paymentError?.code === 0 ||
        String(
          paymentError?.description || ""
        )
          .toLowerCase()
          .includes("cancel");

      if (!cancelled) {
        setError(
          paymentError?.response?.data
            ?.message ||
            paymentError?.description ||
            paymentError?.message ||
            "Payment could not be completed."
        );
      }
    } finally {
      setPaying(false);
    }
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
            Loading payment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !experience) {
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
            Payment unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={() =>
              loadCheckout()
            }
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

  if (!experience) {
    return null;
  }

  const days = Math.max(
    1,
    toNumber(
      experience.package_days
    ) || 1
  );

  const nights = Math.max(
    0,
    toNumber(
      experience.package_nights
    ) ||
      days - 1
  );

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

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              Confirm and pay
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Secure trip package checkout
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
        >
          <View style={styles.packageCard}>
            <Image
              source={{ uri: image }}
              style={styles.packageImage}
            />

            <View style={styles.packageContent}>
              <Text
                numberOfLines={2}
                style={styles.packageTitle}
              >
                {experience.title ||
                  "Trip package"}
              </Text>

              <View
                style={styles.locationRow}
              >
                <MapPin
                  size={14}
                  color={MUTED}
                />

                <Text
                  numberOfLines={1}
                  style={
                    styles.locationText
                  }
                >
                  {experience.location ||
                    experience.city ||
                    "Destination"}
                </Text>
              </View>

              <Text
                style={styles.durationText}
              >
                {days} days · {nights} nights
              </Text>
            </View>
          </View>

          <SectionTitle title="Trip summary" />

          <View style={styles.summaryCard}>
            <SummaryRow
              label="Travel date"
              value={formatDate(
                departure?.departure_date ||
                  selectedDate
              )}
            />

            <SummaryRow
              label="Travelers"
              value={`${guests} ${
                guests === 1
                  ? "traveler"
                  : "travelers"
              }`}
            />

            <SummaryRow
              label="Departure"
              value={
                departureId
                  ? `#${departureId}`
                  : "Flexible"
              }
              last
            />
          </View>

          <SectionTitle title="Payment method" />

          <View style={styles.paymentList}>
            <PaymentOption
              active={
                paymentMethod ===
                "razorpay"
              }
              icon={
                <CreditCard
                  size={21}
                  color={
                    paymentMethod ===
                    "razorpay"
                      ? WHITE
                      : TEXT
                  }
                />
              }
              title="Razorpay secure checkout"
              description="Pay by UPI, card, net banking or wallet."
              onPress={() =>
                setPaymentMethod(
                  "razorpay"
                )
              }
            />

            <PaymentOption
              active={
                paymentMethod ===
                "pay_later"
              }
              icon={
                <ShieldCheck
                  size={21}
                  color={
                    paymentMethod ===
                    "pay_later"
                      ? WHITE
                      : TEXT
                  }
                />
              }
              title="Pay at trip"
              description="Reserve now and pay before or during the trip."
              onPress={() =>
                setPaymentMethod(
                  "pay_later"
                )
              }
            />
          </View>

          <View style={styles.secureNotice}>
            <CheckCircle2
              size={20}
              color={THEME}
            />

            <Text
              style={styles.secureNoticeText}
            >
              Paid bookings are confirmed after
              secure payment verification.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text
                style={styles.errorCardText}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <SectionTitle title="Price details" />

          <View style={styles.priceCard}>
            <PriceRow
              label={`${formatCurrency(
                price
              )} × ${guests}`}
              value={formatCurrency(
                subtotal
              )}
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
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerTotal}>
              {formatCurrency(total)}
            </Text>

            <Text
              style={styles.footerCaption}
            >
              Total payable
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handlePayment}
            disabled={paying}
            style={({ pressed }) => [
              styles.payButton,
              pressed &&
                !paying &&
                styles.payButtonPressed,
              paying &&
                styles.payButtonDisabled,
            ]}
          >
            {paying ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />

                <Text
                  style={styles.payButtonText}
                >
                  Processing...
                </Text>
              </View>
            ) : (
              <Text
                style={styles.payButtonText}
              >
                {paymentMethod ===
                "pay_later"
                  ? "Confirm booking"
                  : `Pay ${formatCurrency(
                      total
                    )}`}
              </Text>
            )}
          </Pressable>
        </View>
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

function SummaryRow({
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
        styles.summaryRow,
        last && styles.summaryRowLast,
      ]}
    >
      <Text style={styles.summaryLabel}>
        {label}
      </Text>

      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function PaymentOption({
  active,
  icon,
  title,
  description,
  onPress,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.paymentOption,
        active &&
          styles.paymentOptionActive,
        pressed &&
          styles.paymentOptionPressed,
      ]}
    >
      <View
        style={[
          styles.paymentIcon,
          active &&
            styles.paymentIconActive,
        ]}
      >
        {icon}
      </View>

      <View style={styles.paymentContent}>
        <Text style={styles.paymentTitle}>
          {title}
        </Text>

        <Text
          style={
            styles.paymentDescription
          }
        >
          {description}
        </Text>
      </View>

      <View
        style={[
          styles.radio,
          active &&
            styles.radioActive,
        ]}
      >
        {active ? (
          <View
            style={styles.radioInner}
          />
        ) : null}
      </View>
    </Pressable>
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

  headerText: {
    marginLeft: 7,
  },

  headerTitle: {
    fontFamily:
      "PlusJakartaSans_700Bold",
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 128,
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
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 21,
    color: TEXT,
    textAlign: "center",
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

  packageCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    backgroundColor: WHITE,
    padding: 10,
    flexDirection: "row",
  },

  packageImage: {
    width: 104,
    height: 96,
    borderRadius: 13,
    backgroundColor: "#f1f3f4",
  },

  packageContent: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 3,
  },

  packageTitle: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 14,
    lineHeight: 19,
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

  durationText: {
    marginTop: 7,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: TEXT,
  },

  sectionTitle: {
    marginTop: 25,
    marginBottom: 11,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 15,
  },

  summaryRow: {
    minHeight: 57,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  summaryRowLast: {
    borderBottomWidth: 0,
  },

  summaryLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  summaryValue: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
    textAlign: "right",
  },

  paymentList: {
    gap: 10,
  },

  paymentOption: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: WHITE,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  paymentOptionActive: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  paymentOptionPressed: {
    opacity: 0.82,
  },

  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentIconActive: {
    backgroundColor: THEME,
  },

  paymentContent: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 9,
  },

  paymentTitle: {
    fontFamily:
      "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  paymentDescription: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#c6cbd1",
    alignItems: "center",
    justifyContent: "center",
  },

  radioActive: {
    borderColor: THEME,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME,
  },

  secureNotice: {
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: THEME_LIGHT,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  secureNoticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  errorCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#f2c7c4",
    borderRadius: 14,
    backgroundColor: "#fff7f7",
    padding: 13,
  },

  errorCardText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    color: DANGER,
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
    gap: 12,
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
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: TEXT,
  },

  totalValue: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 88,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  footerTotal: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  footerCaption: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  payButton: {
    minWidth: 168,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  payButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  payButtonDisabled: {
    opacity: 0.7,
  },

  payButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
});
