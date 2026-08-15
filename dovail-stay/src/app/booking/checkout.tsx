import { router, useLocalSearchParams } from "expo-router";
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronLeft,
  CreditCard,
  MapPin,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";
import { openRazorpayCheckout } from "../../services/razorpay";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80";

type PaymentMethod = "razorpay" | "cash";

type Property = {
  id: number | string;
  title?: string;
  location?: string;
  image?: string;
  cover_image?: string;
  image_url?: string;
  thumbnail?: string;
  price?: number | string;
};

type RouteParams = {
  propertyId?: string | string[];
  checkin?: string | string[];
  checkout?: string | string[];
  guests?: string | string[];
  adults?: string | string[];
  children?: string | string[];
  infants?: string | string[];
  pets?: string | string[];
  nights?: string | string[];
  price?: string | string[];
  subtotal?: string | string[];
  taxes?: string | string[];
  total?: string | string[];
};

type PaymentData = {
  payment_method: PaymentMethod;
  payment_status: "paid" | "pending";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
};

function getParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) {
    return value[0] || fallback;
  }

  return value || fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatDate(value: string): string {
  if (!value) return "Not selected";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPropertyImage(property: Property | null): string {
  if (!property) return FALLBACK_IMAGE;

  return (
    property.image ||
    property.cover_image ||
    property.image_url ||
    property.thumbnail ||
    FALLBACK_IMAGE
  );
}

export default function CheckoutScreen() {
  const params = useLocalSearchParams<RouteParams>();

  const propertyId = getParam(params.propertyId);
  const checkin = getParam(params.checkin);
  const checkout = getParam(params.checkout);

  const guests = Math.max(1, safeNumber(getParam(params.guests, "1"), 1));
  const adults = Math.max(1, safeNumber(getParam(params.adults, "1"), 1));
  const children = Math.max(
    0,
    safeNumber(getParam(params.children, "0"))
  );
  const infants = Math.max(0, safeNumber(getParam(params.infants, "0")));
  const pets = Math.max(0, safeNumber(getParam(params.pets, "0")));

  const nights = Math.max(1, safeNumber(getParam(params.nights, "1"), 1));

  const passedPrice = Math.max(
    0,
    safeNumber(getParam(params.price, "0"))
  );

  const passedSubtotal = Math.max(
    0,
    safeNumber(getParam(params.subtotal, "0"))
  );

  const passedTaxes = Math.max(
    0,
    safeNumber(getParam(params.taxes, "0"))
  );

  const passedTotal = Math.max(
    0,
    safeNumber(getParam(params.total, "0"))
  );

  const [property, setProperty] = useState<Property | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("razorpay");

  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      setPropertyLoading(false);
      return;
    }

    try {
      setPropertyLoading(true);

      const response = await api.get(`/properties/${propertyId}`);
      setProperty(response.data);
    } catch (error) {
      console.log("Checkout property load error:", error);
      setProperty(null);
    } finally {
      setPropertyLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const price = useMemo(() => {
    return passedPrice || Math.max(0, safeNumber(property?.price));
  }, [passedPrice, property?.price]);

  const subtotal = useMemo(() => {
    return passedSubtotal || price * nights;
  }, [passedSubtotal, price, nights]);

  const taxes = useMemo(() => {
    return passedTaxes || Math.round(subtotal * 0.12);
  }, [passedTaxes, subtotal]);

  const total = useMemo(() => {
    return passedTotal || subtotal + taxes;
  }, [passedTotal, subtotal, taxes]);

  const validateBooking = (): boolean => {
    if (!propertyId) {
      Alert.alert(
        "Property missing",
        "Please return to the stay and start your reservation again."
      );
      return false;
    }

    if (!checkin || !checkout) {
      Alert.alert(
        "Dates missing",
        "Please select check-in and checkout dates."
      );
      return false;
    }

    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      Alert.alert(
        "Invalid dates",
        "Checkout must be after the check-in date."
      );
      return false;
    }

    if (guests < 1) {
      Alert.alert("Guests missing", "Add at least one guest.");
      return false;
    }

    if (total <= 0) {
      Alert.alert(
        "Price unavailable",
        "The booking total could not be calculated."
      );
      return false;
    }

    return true;
  };

  const createRazorpayPayment = async (
    user: any
  ): Promise<PaymentData> => {
    if (Platform.OS === "web") {
      throw new Error(
        "Razorpay native checkout is not available in web preview. Test it using an Android or iOS development build."
      );
    }

    const orderResponse = await api.post("/payments/create-order", {
      amount: total,
      currency: "INR",
      property_id: Number(propertyId),
      user_id: user.id,
      checkin,
      checkout,
      guests,
    });

    const responseData = orderResponse.data || {};
    const order = responseData.order || responseData;

    const orderId = String(order.id || order.order_id || "");

    const publicKey = String(
      responseData.key_id ||
        responseData.key ||
        process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
        ""
    );

    if (!orderId) {
      throw new Error("Razorpay order ID was not returned by the server.");
    }

    if (!publicKey) {
      throw new Error(
        "Razorpay public Key ID is missing. Add EXPO_PUBLIC_RAZORPAY_KEY_ID to the mobile app .env file."
      );
    }

    const orderAmount =
      safeNumber(order.amount) || Math.round(total * 100);

    const paymentResult = await openRazorpayCheckout({
      key: publicKey,
      order_id: orderId,
      amount: orderAmount,
      currency: String(order.currency || "INR"),
      name: "Dovail Stay",
      description: property?.title || "Stay reservation",
      image: "https://stay.dovail.com/logo.png",
      prefill: {
        name: user.fullname || user.name || "Dovail Guest",
        email: user.email || "",
        contact: user.phone || user.mobile || "",
      },
      theme: {
        color: THEME,
      },
    });

    const verifyResponse = await api.post("/payments/verify", {
      razorpay_order_id: paymentResult.razorpay_order_id,
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_signature: paymentResult.razorpay_signature,
    });

    const verifyData = verifyResponse.data || {};

    if (
      verifyData.success === false ||
      verifyData.verified === false ||
      verifyData.valid === false
    ) {
      throw new Error("Payment verification failed.");
    }

    return {
      payment_method: "razorpay",
      payment_status: "paid",
      razorpay_order_id: paymentResult.razorpay_order_id,
      razorpay_payment_id: paymentResult.razorpay_payment_id,
      razorpay_signature: paymentResult.razorpay_signature,
    };
  };

  const confirmBooking = async () => {
    if (bookingLoading || !validateBooking()) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setBookingLoading(true);

      let paymentData: PaymentData = {
        payment_method: "cash",
        payment_status: "pending",
        razorpay_order_id: null,
        razorpay_payment_id: null,
        razorpay_signature: null,
      };

      if (paymentMethod === "razorpay") {
        paymentData = await createRazorpayPayment(user);
      }

      const bookingResponse = await api.post("/bookings", {
        property_id: Number(propertyId),
        user_id: user.id,
        checkin,
        checkout,
        guests,
        total,

        payment_method: paymentData.payment_method,
        payment_status: paymentData.payment_status,

        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,

        coupon_code: null,
        discount: 0,
      });

      Alert.alert(
        paymentMethod === "razorpay"
          ? "Payment successful"
          : "Booking confirmed",
        bookingResponse.data?.message ||
          "Your reservation has been created successfully.",
        [
          {
            text: "View trips",
            onPress: () => router.replace("/trips"),
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error: any) {
      console.log("Payment or booking failed:", error);

      const errorCode =
        error?.code ??
        error?.error?.code ??
        error?.response?.data?.code;

      const description =
        error?.description ||
        error?.error?.description ||
        error?.response?.data?.description;

      const message = String(
        error?.response?.data?.message ||
          description ||
          error?.message ||
          ""
      );

      const cancelled =
        errorCode === 0 ||
        errorCode === "0" ||
        message.toLowerCase().includes("cancel");

      if (cancelled) {
        Alert.alert(
          "Payment cancelled",
          "No payment was taken. You can try again."
        );
        return;
      }

      if (error?.response?.status === 409) {
        Alert.alert(
          "Dates unavailable",
          error?.response?.data?.message ||
            "This stay is already booked for the selected dates.",
          [
            {
              text: "Select other dates",
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      Alert.alert(
        paymentMethod === "razorpay"
          ? "Payment failed"
          : "Booking failed",
        message || "The reservation could not be completed."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (propertyLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <CheckoutSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>

        <Text style={styles.headerTitle}>Confirm booking</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.propertyCard}>
          <Image
            source={{ uri: getPropertyImage(property) }}
            style={styles.propertyImage}
            resizeMode="cover"
          />

          <View style={styles.propertyContent}>
            <Text numberOfLines={2} style={styles.propertyTitle}>
              {property?.title || "Dovail Stay"}
            </Text>

            <View style={styles.locationRow}>
              <MapPin size={14} color={MUTED} />

              <Text numberOfLines={1} style={styles.location}>
                {property?.location || "Location not specified"}
              </Text>
            </View>

            <View style={styles.priceLine}>
              <Text style={styles.nightlyPrice}>
                ₹{price.toLocaleString("en-IN")}
              </Text>

              <Text style={styles.nightlySuffix}> / night</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your reservation</Text>

        <View style={styles.detailsCard}>
          <InfoRow
            icon={<CalendarDays size={20} color={THEME} />}
            title="Dates"
            value={`${formatDate(checkin)}\n${formatDate(checkout)}`}
          />

          <View style={styles.rowDivider} />

          <InfoRow
            icon={<Users size={20} color={THEME} />}
            title="Guests"
            value={[
              `${guests} guest${guests === 1 ? "" : "s"}`,
              adults > 0
                ? `${adults} adult${adults === 1 ? "" : "s"}`
                : "",
              children > 0
                ? `${children} child${children === 1 ? "" : "ren"}`
                : "",
              infants > 0
                ? `${infants} infant${infants === 1 ? "" : "s"}`
                : "",
              pets > 0 ? `${pets} pet${pets === 1 ? "" : "s"}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </View>

        <Text style={styles.sectionTitle}>Payment method</Text>

        <View style={styles.paymentOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.paymentCard,
              paymentMethod === "razorpay" &&
                styles.paymentCardSelected,
              pressed && styles.paymentCardPressed,
            ]}
            onPress={() => setPaymentMethod("razorpay")}
          >
            <View style={styles.paymentIcon}>
              <Smartphone size={21} color={THEME} />
            </View>

            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Pay online</Text>

              <Text style={styles.paymentSubtitle}>
                UPI, cards, net banking and supported wallets
              </Text>
            </View>

            <SelectionCircle selected={paymentMethod === "razorpay"} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.paymentCard,
              paymentMethod === "cash" && styles.paymentCardSelected,
              pressed && styles.paymentCardPressed,
            ]}
            onPress={() => setPaymentMethod("cash")}
          >
            <View style={styles.paymentIcon}>
              <Banknote size={21} color={THEME} />
            </View>

            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Pay at property</Text>

              <Text style={styles.paymentSubtitle}>
                Reserve now and pay according to the host policy
              </Text>
            </View>

            <SelectionCircle selected={paymentMethod === "cash"} />
          </Pressable>
        </View>

        {Platform.OS === "web" && paymentMethod === "razorpay" && (
          <View style={styles.webNotice}>
            <CreditCard size={18} color={THEME} />

            <Text style={styles.webNoticeText}>
              Razorpay native checkout must be tested using an Android or
              iOS development build. Web preview can still be used for UI.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Price details</Text>

        <View style={styles.priceCard}>
          <PriceRow
            label={`₹${price.toLocaleString("en-IN")} × ${nights} night${
              nights === 1 ? "" : "s"
            }`}
            value={subtotal}
          />

          <PriceRow label="Taxes (12%)" value={taxes} />

          <View style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>

            <Text style={styles.totalValue}>
              ₹{total.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        <View style={styles.secureBox}>
          <View style={styles.secureIcon}>
            <ShieldCheck size={21} color={THEME} />
          </View>

          <View style={styles.secureContent}>
            <Text style={styles.secureTitle}>Secure reservation</Text>

            <Text style={styles.secureText}>
              Payment details are handled securely. Your reservation can be
              reviewed from the Trips section.
            </Text>
          </View>
        </View>

        <View style={styles.policyBox}>
          <Text style={styles.policyTitle}>Before you book</Text>

          <Text style={styles.policyText}>
            Confirm the dates, guest count, payment method and property
            information. Cancellation rules may depend on the host policy.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>

          <Text style={styles.footerTotalValue}>
            ₹{total.toLocaleString("en-IN")}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.confirmButton,
            pressed &&
              !bookingLoading &&
              styles.confirmButtonPressed,
            bookingLoading && styles.confirmButtonDisabled,
          ]}
          onPress={confirmBooking}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.confirmButtonText}>
              {paymentMethod === "razorpay"
                ? `Pay ₹${total.toLocaleString("en-IN")}`
                : "Confirm booking"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function SelectionCircle({ selected }: { selected: boolean }) {
  return (
    <View
      style={[
        styles.selectionCircle,
        selected && styles.selectionCircleSelected,
      ]}
    >
      {selected && <Check size={14} color={WHITE} strokeWidth={3} />}
    </View>
  );
}

function PriceRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>

      <Text style={styles.priceValue}>
        ₹{Number(value || 0).toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

function CheckoutSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader} />

      <View style={styles.skeletonProperty}>
        <View style={styles.skeletonImage} />

        <View style={styles.skeletonPropertyText}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonShortLine} />
        </View>
      </View>

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonCard} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonCardSmall} />
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
    paddingHorizontal: 16,
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
    paddingTop: 20,
    paddingBottom: 132,
  },

  propertyCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    flexDirection: "row",
    gap: 14,
  },

  propertyImage: {
    width: 104,
    height: 104,
    borderRadius: 17,
    backgroundColor: "#f1f3f4",
  },

  propertyContent: {
    flex: 1,
    justifyContent: "center",
  },

  propertyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
    color: TEXT,
  },

  locationRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  location: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  priceLine: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "baseline",
  },

  nightlyPrice: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  nightlySuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.3,
    color: TEXT,
  },

  detailsCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
  },

  infoRow: {
    minHeight: 82,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
  },

  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  infoValue: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  rowDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
  },

  paymentOptions: {
    gap: 12,
  },

  paymentCard: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  paymentCardSelected: {
    borderWidth: 1.5,
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  paymentCardPressed: {
    opacity: 0.88,
  },

  paymentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  paymentSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#c7cdd3",
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  selectionCircleSelected: {
    borderColor: THEME,
    backgroundColor: THEME,
  },

  webNotice: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: THEME_LIGHT,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  webNoticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  priceCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    padding: 17,
    gap: 14,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  priceLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },

  priceValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: TEXT,
  },

  totalDivider: {
    height: 1,
    backgroundColor: BORDER,
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  totalLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  totalValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  secureBox: {
    marginTop: 22,
    borderRadius: 20,
    backgroundColor: THEME_LIGHT,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  secureIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  secureContent: {
    flex: 1,
  },

  secureTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  secureText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  policyBox: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: SURFACE,
    padding: 16,
  },

  policyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  policyText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 90,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  footerTotal: {
    flex: 1,
  },

  footerTotalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  footerTotalValue: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  confirmButton: {
    minWidth: 168,
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  confirmButtonDisabled: {
    opacity: 0.7,
  },

  confirmButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  skeletonHeader: {
    width: "46%",
    height: 22,
    marginBottom: 24,
    borderRadius: 8,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonProperty: {
    flexDirection: "row",
    gap: 14,
  },

  skeletonImage: {
    width: 104,
    height: 104,
    borderRadius: 17,
    backgroundColor: "#eceff1",
  },

  skeletonPropertyText: {
    flex: 1,
    paddingTop: 8,
  },

  skeletonTitle: {
    width: "82%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonLine: {
    width: "66%",
    height: 13,
    marginTop: 12,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonShortLine: {
    width: "45%",
    height: 15,
    marginTop: 12,
    borderRadius: 7,
    backgroundColor: "#eceff1",
  },

  skeletonSectionTitle: {
    width: "43%",
    height: 21,
    marginTop: 30,
    marginBottom: 13,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonCard: {
    width: "100%",
    height: 170,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },

  skeletonCardSmall: {
    width: "100%",
    height: 90,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },
});