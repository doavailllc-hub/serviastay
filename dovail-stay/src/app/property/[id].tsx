import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  Snowflake,
  Star,
  Tv,
  Users,
  Utensils,
  Waves,
  Wifi,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  Share as NativeShare,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const SURFACE = "#f8fafc";
const WHITE = "#ffffff";
const DANGER = "#dc2626";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAY_MS = 86_400_000;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

type PropertyImage = {
  image_url?: string;
  url?: string;
  image?: string;
};

type Property = {
  id: number;
  user_id?: number;
  title?: string;
  description?: string;
  location?: string;
  price?: number | string;
  rating?: number | string;
  guests?: number | string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  image?: string;
  image_url?: string;
  cover_image?: string;
  images?: Array<PropertyImage | string>;
  amenities?: string[] | string;
};

type Review = {
  id: number | string;
  guest_name?: string;
  user_name?: string;
  rating?: number | string;
  review?: string;
  comment?: string;
  created_at?: string;
};

type BookedRange = {
  checkin?: string;
  checkout?: string;
  start?: string;
  end?: string;
};

type GuestType = "adults" | "children" | "infants" | "pets";

function toLocalISO(date = new Date()) {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

function parseISODate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDaysISO(dateString: string, days: number) {
  const date = parseISODate(dateString);
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDate(dateString: string) {
  if (!dateString) return "Add date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(parseISODate(dateString));
}

function formatFullDate(dateString: string) {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseISODate(dateString));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();

  const blanks = Array.from({ length: firstDay.getDay() }, () => null);

  const days = Array.from(
    { length: totalDays },
    (_, index) => new Date(year, month, index + 1),
  );

  return [...blanks, ...days];
}

function getUniqueImages(property: Property | null) {
  if (!property) return [FALLBACK_IMAGE];

  const nestedImages = Array.isArray(property.images)
    ? property.images.map((item) => {
        if (typeof item === "string") return item;

        return item.image_url || item.url || item.image || "";
      })
    : [];

  const list = [
    property.image,
    property.cover_image,
    property.image_url,
    ...nestedImages,
  ].filter(Boolean) as string[];

  return list.length ? [...new Set(list)] : [FALLBACK_IMAGE];
}

function parseAmenities(value: Property["amenities"]) {
  if (Array.isArray(value)) return value;

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeRange(range: BookedRange) {
  return {
    start: range.checkin || range.start || "",
    end: range.checkout || range.end || "",
  };
}

export default function PropertyDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const propertyId = Array.isArray(params.id) ? params.id[0] : params.id;

  const galleryRef = useRef<ScrollView>(null);

  const today = useMemo(() => toLocalISO(), []);
  const tomorrow = useMemo(() => addDaysISO(today, 1), [today]);

  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));

  const [checkin, setCheckin] = useState(today);
  const [checkout, setCheckout] = useState(tomorrow);

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);

  const loadProperty = useCallback(async () => {
    if (!propertyId) {
      setLoadError("Property ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const propertyResponse = await api.get(`/properties/${propertyId}`);

      setProperty(propertyResponse.data);

      const results = await Promise.allSettled([
        api.get(`/reviews/${propertyId}`),
        api.get(`/properties/${propertyId}/booked-dates`),
      ]);

      const reviewResult = results[0];
      const bookedResult = results[1];

      if (reviewResult.status === "fulfilled") {
        const reviewData = reviewResult.value.data;

        setReviews(
          Array.isArray(reviewData)
            ? reviewData
            : Array.isArray(reviewData?.reviews)
              ? reviewData.reviews
              : [],
        );
      } else {
        setReviews([]);
      }

      if (bookedResult.status === "fulfilled") {
        setBookedRanges(
          Array.isArray(bookedResult.value.data) ? bookedResult.value.data : [],
        );
      } else {
        setBookedRanges([]);
      }
    } catch (error: any) {
      console.log("Property load error:", error);

      setLoadError(
        error?.response?.data?.message || "This stay could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  const images = useMemo(() => getUniqueImages(property), [property]);

  const amenities = useMemo(
    () => parseAmenities(property?.amenities),
    [property?.amenities],
  );

  const maxGuests = Math.max(1, Number(property?.guests || 1));

  const totalGuests = adults + children;

  const price = Math.max(0, Number(property?.price || 0));

  const nights = useMemo(() => {
    if (!checkin || !checkout) return 0;

    const difference =
      parseISODate(checkout).getTime() - parseISODate(checkin).getTime();

    const calculated = Math.round(difference / DAY_MS);

    return calculated > 0 ? calculated : 0;
  }, [checkin, checkout]);

  const subtotal = price * nights;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const rating =
    Number(property?.rating || 0) > 0
      ? Number(property?.rating).toFixed(1)
      : "New";

  const isDateBooked = useCallback(
    (dateISO: string) => {
      return bookedRanges.some((range) => {
        const normalized = normalizeRange(range);

        if (!normalized.start || !normalized.end) {
          return false;
        }

        return dateISO >= normalized.start && dateISO < normalized.end;
      });
    },
    [bookedRanges],
  );

  const rangeContainsBookedDate = useCallback(
    (startISO: string, endISO: string) => {
      let current = startISO;

      while (current < endISO) {
        if (isDateBooked(current)) return true;
        current = addDaysISO(current, 1);
      }

      return false;
    },
    [isDateBooked],
  );

  const handleDateSelect = (dateISO: string) => {
    if (dateISO < today || isDateBooked(dateISO)) return;

    if (!checkin || checkout) {
      setCheckin(dateISO);
      setCheckout("");
      return;
    }

    if (dateISO <= checkin) {
      setCheckin(dateISO);
      setCheckout("");
      return;
    }

    if (rangeContainsBookedDate(checkin, dateISO)) {
      Alert.alert(
        "Dates unavailable",
        "One or more nights in this range are already booked.",
      );
      return;
    }

    setCheckout(dateISO);
  };

  const confirmDates = () => {
    if (!checkin || !checkout || nights < 1) {
      Alert.alert(
        "Select dates",
        "Please select valid check-in and checkout dates.",
      );
      return;
    }

    setDateModalOpen(false);
  };

  const changeGuest = (type: GuestType, direction: 1 | -1) => {
    if (type === "adults") {
      setAdults((current) => {
        const next = current + direction;

        if (next < 1) return 1;

        if (direction > 0 && totalGuests >= maxGuests) {
          return current;
        }

        return next;
      });

      return;
    }

    if (type === "children") {
      setChildren((current) => {
        const next = current + direction;

        if (next < 0) return 0;

        if (direction > 0 && totalGuests >= maxGuests) {
          return current;
        }

        return next;
      });

      return;
    }

    if (type === "infants") {
      setInfants((current) => Math.max(0, current + direction));

      return;
    }

    setPets((current) => Math.max(0, current + direction));
  };

  const addWishlist = async () => {
    if (!property || saving) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (saved) {
        Alert.alert("Already saved", "This stay is already in your wishlist.");
        return;
      }

      setSaving(true);

      await api.post("/wishlist", {
        user_id: user.id,
        property_id: property.id,
      });

      setSaved(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Could not save this stay.";

      if (String(message).toLowerCase().includes("already")) {
        setSaved(true);
        return;
      }

      Alert.alert("Wishlist", message);
    } finally {
      setSaving(false);
    }
  };

  const shareProperty = async () => {
    if (!property) return;

    try {
      await NativeShare.share({
        title: property.title || "Dovail Stay",
        message: `${
          property.title || "Dovail Stay"
        }\nhttps://stay.dovail.com/reserve/${property.id}`,
      });
    } catch (error) {
      console.log("Share failed:", error);
    }
  };

  const messageHost = async () => {
    if (!property || startingConversation) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const hostId = Number(property.user_id);

      if (!hostId) {
        Alert.alert(
          "Host unavailable",
          "Host information is missing for this stay.",
        );
        return;
      }

      if (Number(user.id) === hostId) {
        Alert.alert("Your listing", "You cannot message yourself.");
        return;
      }

      setStartingConversation(true);

      await api.post("/conversations/start", {
        sender_id: user.id,
        receiver_id: hostId,
        property_id: property.id,
        message: `Hi, I’m interested in ${property.title}. Is it available?`,
      });

      router.push("/messages");
    } catch (error: any) {
      Alert.alert(
        "Message failed",
        error?.response?.data?.message || "Could not start this conversation.",
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const continueToCheckout = async () => {
    if (!property) return;

    if (!checkin || !checkout || nights < 1) {
      setDateModalOpen(true);
      return;
    }

    if (totalGuests < 1) {
      setGuestModalOpen(true);
      return;
    }

    const user = await getStoredUser();

    if (!user) {
      setBookingModalOpen(false);
      router.push("/login");
      return;
    }

    setBookingModalOpen(false);

    router.push({
      pathname: "/booking/checkout",
      params: {
        propertyId: String(property.id),
        checkin,
        checkout,
        guests: String(totalGuests),
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        pets: String(pets),
        nights: String(nights),
        price: String(price),
        subtotal: String(subtotal),
        taxes: String(taxes),
        total: String(total),
      },
    });
  };

  const handleGalleryScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);

    setGalleryIndex(index);
  };

  if (loading) {
    return <PropertySkeleton />;
  }

  if (loadError || !property) {
    return (
      <SafeAreaView
        style={styles.safe}
        edges={["top", "bottom", "left", "right"]}
      >
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={styles.errorPage}>
          <View style={styles.errorIcon}>
            <BuildingIcon />
          </View>

          <Text style={styles.errorTitle}>Stay not available</Text>

          <Text style={styles.errorText}>
            {loadError || "This property could not be found."}
          </Text>

          <Pressable
            style={styles.errorButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.errorButtonText}>Back to explore</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.pageContent,
          { paddingBottom: 104 + insets.bottom },
        ]}
      >
        <View style={styles.gallery}>
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
          >
            {images.map((image, index) => (
              <Pressable
                key={`${image}-${index}`}
                onPress={() => {
                  setGalleryIndex(index);
                  setGalleryModalOpen(true);
                }}
              >
                <Image
                  source={{ uri: image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                  onError={() => {
                    if (index === 0) {
                      setProperty((current) =>
                        current
                          ? {
                              ...current,
                              image: FALLBACK_IMAGE,
                            }
                          : current,
                      );
                    }
                  }}
                />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={23} color={TEXT} strokeWidth={2.3} />
          </Pressable>

          <View style={[styles.topActions, { top: insets.top + 10 }]}>
            <Pressable style={styles.roundButton} onPress={shareProperty}>
              <Share2 size={19} color={TEXT} strokeWidth={2.1} />
            </Pressable>

            <Pressable
              style={styles.roundButton}
              onPress={addWishlist}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={THEME} />
              ) : (
                <Heart
                  size={20}
                  color={saved ? THEME : TEXT}
                  fill={saved ? THEME : "transparent"}
                  strokeWidth={2.1}
                />
              )}
            </Pressable>
          </View>

          <View style={styles.galleryCounter}>
            <Text style={styles.galleryCounterText}>
              {galleryIndex + 1}/{images.length}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{property.title || "Beautiful stay"}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingRow}>
              <Star
                size={14}
                color="#717171"
                fill={rating === "New" ? "transparent" : "#717171"}
              />

              <Text style={styles.ratingText}>{rating}</Text>
            </View>

            <Text style={styles.metaDivider}>·</Text>

            <MapPin size={14} color="#717171" />

            <Text numberOfLines={1} style={styles.location}>
              {property.location || "Location not added"}
            </Text>
          </View>

          <Text style={styles.capacity}>
            {maxGuests} guest
            {maxGuests === 1 ? "" : "s"} · {Number(property.bedrooms || 1)}{" "}
            bedroom
            {Number(property.bedrooms || 1) === 1 ? "" : "s"} ·{" "}
            {Number(property.bathrooms || 1)} bath
            {Number(property.bathrooms || 1) === 1 ? "" : "s"}
          </Text>

          <SectionDivider />

          <View style={styles.featureList}>
            <FeatureRow
              icon={<ShieldCheck size={21} color={THEME} />}
              title="Secure reservation"
              description="Your booking details and payment information stay protected."
            />

            <FeatureRow
              icon={<CalendarDays size={21} color={THEME} />}
              title="Flexible date selection"
              description="Choose available dates and confirm your stay in a few steps."
            />

            <FeatureRow
              icon={<Star size={21} color={THEME} />}
              title="Guest-ready stay"
              description="Clean spaces, useful amenities and a smooth arrival experience."
            />
          </View>

          <SectionDivider />

          <SectionTitle>About this place</SectionTitle>

          <Text style={styles.description}>
            {property.description ||
              "A comfortable, professionally managed stay with essential amenities and a smooth booking experience."}
          </Text>

          {amenities.length > 0 && (
            <>
              <SectionDivider />

              <SectionTitle>What this place offers</SectionTitle>

              <View style={styles.amenitiesGrid}>
                {amenities.slice(0, 8).map((amenity) => (
                  <AmenityItem
                    key={String(amenity)}
                    amenity={String(amenity)}
                  />
                ))}
              </View>
            </>
          )}

          <SectionDivider />

          <SectionTitle>Photos</SectionTitle>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {images.map((image, index) => (
              <Pressable
                key={`thumb-${image}-${index}`}
                onPress={() => {
                  setGalleryIndex(index);
                  setGalleryModalOpen(true);
                }}
              >
                <Image source={{ uri: image }} style={styles.photoThumbnail} />
              </Pressable>
            ))}
          </ScrollView>

          <SectionDivider />

          <View style={styles.hostCard}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarText}>H</Text>
            </View>

            <View style={styles.hostInfo}>
              <Text style={styles.hostTitle}>Hosted on Dovail Stay</Text>

              <Text style={styles.hostSubtitle}>
                Contact the host before booking if you have questions.
              </Text>
            </View>

            <Pressable
              style={styles.hostMessageButton}
              onPress={messageHost}
              disabled={startingConversation}
            >
              {startingConversation ? (
                <ActivityIndicator size="small" color={THEME} />
              ) : (
                <MessageCircle size={19} color={THEME} />
              )}
            </Pressable>
          </View>

          <SectionDivider />

          <View style={styles.reviewsHeader}>
            <SectionTitle noMargin>Reviews</SectionTitle>

            <View style={styles.reviewRatingSummary}>
              <Star
                size={15}
                color="#717171"
                fill={rating === "New" ? "transparent" : "#717171"}
              />
              <Text style={styles.reviewRatingSummaryText}>{rating}</Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>

              <Text style={styles.emptyReviewsText}>
                Reviews from completed stays will appear here.
              </Text>
            </View>
          ) : (
            reviews
              .slice(0, 4)
              .map((review) => (
                <ReviewCard key={String(review.id)} review={review} />
              ))
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Pressable
          style={styles.bottomPriceArea}
          onPress={() => setBookingModalOpen(true)}
        >
          <Text style={styles.bottomPrice}>
            ₹{price.toLocaleString("en-IN")}
            <Text style={styles.bottomPriceSuffix}> / night</Text>
          </Text>

          <Text style={styles.bottomDates}>
            {formatDate(checkin)} –{" "}
            {checkout ? formatDate(checkout) : "Add checkout"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.reserveButton,
            pressed && styles.reserveButtonPressed,
          ]}
          onPress={() => setBookingModalOpen(true)}
        >
          <Text style={styles.reserveButtonText}>Reserve</Text>
        </Pressable>
      </View>

      <BookingModal
        visible={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        property={property}
        price={price}
        checkin={checkin}
        checkout={checkout}
        totalGuests={totalGuests}
        infants={infants}
        pets={pets}
        nights={nights}
        subtotal={subtotal}
        taxes={taxes}
        total={total}
        onOpenDates={() => setDateModalOpen(true)}
        onOpenGuests={() => setGuestModalOpen(true)}
        onMessageHost={messageHost}
        onContinue={continueToCheckout}
      />

      <DatePickerModal
        visible={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        today={today}
        checkin={checkin}
        checkout={checkout}
        isDateBooked={isDateBooked}
        onSelectDate={handleDateSelect}
        onClear={() => {
          setCheckin("");
          setCheckout("");
        }}
        onConfirm={confirmDates}
      />

      <GuestPickerModal
        visible={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        adults={adults}
        children={children}
        infants={infants}
        pets={pets}
        totalGuests={totalGuests}
        maxGuests={maxGuests}
        onChange={changeGuest}
      />

      <GalleryModal
        visible={galleryModalOpen}
        images={images}
        initialIndex={galleryIndex}
        onIndexChange={setGalleryIndex}
        onClose={() => setGalleryModalOpen(false)}
      />
    </View>
  );
}

function BookingModal({
  visible,
  onClose,
  property,
  price,
  checkin,
  checkout,
  totalGuests,
  infants,
  pets,
  nights,
  subtotal,
  taxes,
  total,
  onOpenDates,
  onOpenGuests,
  onMessageHost,
  onContinue,
}: {
  visible: boolean;
  onClose: () => void;
  property: Property;
  price: number;
  checkin: string;
  checkout: string;
  totalGuests: number;
  infants: number;
  pets: number;
  nights: number;
  subtotal: number;
  taxes: number;
  total: number;
  onOpenDates: () => void;
  onOpenGuests: () => void;
  onMessageHost: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.bookingSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Reserve your stay</Text>

              <Text style={styles.sheetSubtitle}>
                {property.title || "Dovail Stay"}
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color={TEXT} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.sheetPriceRow}>
              <Text style={styles.sheetPrice}>
                ₹{price.toLocaleString("en-IN")}
              </Text>

              <Text style={styles.sheetPriceSuffix}>/ night</Text>
            </View>

            <Pressable style={styles.selectorCard} onPress={onOpenDates}>
              <CalendarDays size={20} color={THEME} />

              <View style={styles.selectorContent}>
                <Text style={styles.selectorLabel}>Dates</Text>

                <Text style={styles.selectorValue}>
                  {checkin && checkout
                    ? `${formatFullDate(checkin)} – ${formatFullDate(checkout)}`
                    : "Select check-in and checkout"}
                </Text>
              </View>

              <ChevronRight size={18} color={MUTED} />
            </Pressable>

            <Pressable style={styles.selectorCard} onPress={onOpenGuests}>
              <Users size={20} color={THEME} />

              <View style={styles.selectorContent}>
                <Text style={styles.selectorLabel}>Guests</Text>

                <Text style={styles.selectorValue}>
                  {totalGuests} guest
                  {totalGuests === 1 ? "" : "s"}
                  {infants > 0
                    ? ` · ${infants} infant${infants === 1 ? "" : "s"}`
                    : ""}
                  {pets > 0 ? ` · ${pets} pet${pets === 1 ? "" : "s"}` : ""}
                </Text>
              </View>

              <ChevronRight size={18} color={MUTED} />
            </Pressable>

            {nights > 0 && (
              <View style={styles.priceBreakdown}>
                <PriceRow
                  label={`₹${price.toLocaleString("en-IN")} × ${nights} night${
                    nights === 1 ? "" : "s"
                  }`}
                  value={subtotal}
                />

                <PriceRow label="Taxes" value={taxes} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total before payment</Text>

                  <Text style={styles.totalValue}>
                    ₹{total.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            )}

            <Pressable style={styles.messageHostButton} onPress={onMessageHost}>
              <MessageCircle size={19} color={TEXT} />

              <Text style={styles.messageHostButtonText}>Message host</Text>
            </Pressable>
          </ScrollView>

          <Pressable style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DatePickerModal({
  visible,
  onClose,
  viewMonth,
  setViewMonth,
  today,
  checkin,
  checkout,
  isDateBooked,
  onSelectDate,
  onClear,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  viewMonth: Date;
  setViewMonth: (date: Date) => void;
  today: string;
  checkin: string;
  checkout: string;
  isDateBooked: (date: string) => boolean;
  onSelectDate: (date: string) => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={styles.fullModalPage}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.fullModalHeader}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <ChevronLeft size={23} color={TEXT} />
          </Pressable>

          <Text style={styles.fullModalTitle}>Select dates</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          contentContainerStyle={styles.calendarPage}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateSummary}>
            <View style={styles.dateSummaryItem}>
              <Text style={styles.dateSummaryLabel}>Check-in</Text>

              <Text style={styles.dateSummaryValue}>
                {checkin ? formatFullDate(checkin) : "Add date"}
              </Text>
            </View>

            <View style={styles.dateSummaryDivider} />

            <View style={styles.dateSummaryItem}>
              <Text style={styles.dateSummaryLabel}>Checkout</Text>

              <Text style={styles.dateSummaryValue}>
                {checkout ? formatFullDate(checkout) : "Add date"}
              </Text>
            </View>
          </View>

          <View style={styles.monthNavigation}>
            <Pressable
              style={styles.monthButton}
              onPress={() => setViewMonth(addMonths(viewMonth, -1))}
            >
              <ChevronLeft size={20} color={TEXT} />
            </Pressable>

            <Text style={styles.monthTitle}>{formatMonth(viewMonth)}</Text>

            <Pressable
              style={styles.monthButton}
              onPress={() => setViewMonth(addMonths(viewMonth, 1))}
            >
              <ChevronRight size={20} color={TEXT} />
            </Pressable>
          </View>

          <MonthCalendar
            month={viewMonth}
            today={today}
            checkin={checkin}
            checkout={checkout}
            isDateBooked={isDateBooked}
            onSelectDate={onSelectDate}
          />

          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={styles.unavailableLegend} />
              <Text style={styles.legendText}>Unavailable</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.selectedLegend} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.calendarFooter}>
          <Pressable onPress={onClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>

          <Pressable style={styles.calendarConfirmButton} onPress={onConfirm}>
            <Text style={styles.calendarConfirmText}>Confirm dates</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function MonthCalendar({
  month,
  today,
  checkin,
  checkout,
  isDateBooked,
  onSelectDate,
}: {
  month: Date;
  today: string;
  checkin: string;
  checkout: string;
  isDateBooked: (date: string) => boolean;
  onSelectDate: (date: string) => void;
}) {
  const days = useMemo(() => getMonthDays(month), [month]);

  return (
    <View>
      <View style={styles.weekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={`blank-${index}`} style={styles.dayCell} />;
          }

          const iso = toLocalISO(date);
          const unavailable = iso < today || isDateBooked(iso);

          const selected = iso === checkin || iso === checkout;

          const inRange =
            Boolean(checkin) &&
            Boolean(checkout) &&
            iso > checkin &&
            iso < checkout;

          const isToday = iso === today;

          return (
            <View
              key={iso}
              style={[styles.dayCell, inRange && styles.dayCellRange]}
            >
              <Pressable
                disabled={unavailable}
                style={[
                  styles.dayButton,
                  selected && styles.dayButtonSelected,
                  isToday && !selected && styles.dayButtonToday,
                ]}
                onPress={() => onSelectDate(iso)}
              >
                <Text
                  style={[
                    styles.dayText,
                    unavailable && styles.dayTextDisabled,
                    selected && styles.dayTextSelected,
                    isToday && !selected && styles.dayTextToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function GuestPickerModal({
  visible,
  onClose,
  adults,
  children,
  infants,
  pets,
  totalGuests,
  maxGuests,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  totalGuests: number;
  maxGuests: number;
  onChange: (type: GuestType, direction: 1 | -1) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.guestSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Who’s coming?</Text>

              <Text style={styles.sheetSubtitle}>
                Maximum {maxGuests} sleeping guests
              </Text>
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={20} color={TEXT} />
            </Pressable>
          </View>

          <GuestRow
            title="Adults"
            subtitle="Ages 13 or above"
            value={adults}
            minusDisabled={adults <= 1}
            plusDisabled={totalGuests >= maxGuests}
            onMinus={() => onChange("adults", -1)}
            onPlus={() => onChange("adults", 1)}
          />

          <GuestRow
            title="Children"
            subtitle="Ages 2–12"
            value={children}
            minusDisabled={children <= 0}
            plusDisabled={totalGuests >= maxGuests}
            onMinus={() => onChange("children", -1)}
            onPlus={() => onChange("children", 1)}
          />

          <GuestRow
            title="Infants"
            subtitle="Under 2"
            value={infants}
            minusDisabled={infants <= 0}
            onMinus={() => onChange("infants", -1)}
            onPlus={() => onChange("infants", 1)}
          />

          <GuestRow
            title="Pets"
            subtitle="Check the property rules"
            value={pets}
            minusDisabled={pets <= 0}
            onMinus={() => onChange("pets", -1)}
            onPlus={() => onChange("pets", 1)}
          />

          <Pressable style={styles.continueButton} onPress={onClose}>
            <Text style={styles.continueButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function GalleryModal({
  visible,
  images,
  initialIndex,
  onIndexChange,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const modalGalleryRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) return;

    setTimeout(() => {
      modalGalleryRef.current?.scrollTo({
        x: SCREEN_WIDTH * initialIndex,
        animated: false,
      });
    }, 80);
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView
        style={styles.galleryModal}
        edges={["top", "bottom", "left", "right"]}
      >
        <View style={styles.galleryModalHeader}>
          <Pressable style={styles.galleryCloseButton} onPress={onClose}>
            <X size={22} color={WHITE} />
          </Pressable>

          <Text style={styles.galleryModalCounter}>
            {initialIndex + 1}/{images.length}
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          ref={modalGalleryRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );

            onIndexChange(index);
          }}
        >
          {images.map((image, index) => (
            <View
              key={`gallery-${image}-${index}`}
              style={styles.galleryModalSlide}
            >
              <Image
                source={{ uri: image }}
                style={styles.galleryModalImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SectionTitle({
  children,
  noMargin = false,
}: {
  children: React.ReactNode;
  noMargin?: boolean;
}) {
  return (
    <Text
      style={[styles.sectionTitle, noMargin && styles.sectionTitleNoMargin]}
    >
      {children}
    </Text>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>

      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>

        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

function AmenityItem({ amenity }: { amenity: string }) {
  const normalized = amenity.toLowerCase();

  let icon: React.ReactNode = <ShieldCheck size={19} color={TEXT} />;

  if (normalized.includes("wifi")) {
    icon = <Wifi size={19} color={TEXT} />;
  } else if (normalized.includes("parking") || normalized.includes("car")) {
    icon = <Car size={19} color={TEXT} />;
  } else if (normalized.includes("air") || normalized.includes("ac")) {
    icon = <Snowflake size={19} color={TEXT} />;
  } else if (normalized.includes("kitchen") || normalized.includes("food")) {
    icon = <Utensils size={19} color={TEXT} />;
  } else if (normalized.includes("tv") || normalized.includes("television")) {
    icon = <Tv size={19} color={TEXT} />;
  } else if (normalized.includes("pool") || normalized.includes("swim")) {
    icon = <Waves size={19} color={TEXT} />;
  }

  return (
    <View style={styles.amenityItem}>
      {icon}

      <Text numberOfLines={2} style={styles.amenityText}>
        {amenity}
      </Text>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const name = review.guest_name || review.user_name || "Guest";

  const comment = review.review || review.comment || "No written review.";

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewAvatar}>
        <Text style={styles.reviewAvatarText}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.reviewContent}>
        <View style={styles.reviewTopRow}>
          <Text style={styles.reviewName}>{name}</Text>

          <View style={styles.reviewStars}>
            <Star size={13} color="#717171" fill="#717171" />

            <Text style={styles.reviewScore}>{review.rating || "5.0"}</Text>
          </View>
        </View>

        <Text style={styles.reviewText}>{comment}</Text>
      </View>
    </View>
  );
}

function GuestRow({
  title,
  subtitle,
  value,
  minusDisabled = false,
  plusDisabled = false,
  onMinus,
  onPlus,
}: {
  title: string;
  subtitle: string;
  value: number;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.guestRow}>
      <View>
        <Text style={styles.guestTitle}>{title}</Text>

        <Text style={styles.guestSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.stepper}>
        <Pressable
          disabled={minusDisabled}
          style={[
            styles.stepButton,
            minusDisabled && styles.stepButtonDisabled,
          ]}
          onPress={onMinus}
        >
          <Minus size={16} color={TEXT} />
        </Pressable>

        <Text style={styles.stepValue}>{value}</Text>

        <Pressable
          disabled={plusDisabled}
          style={[styles.stepButton, plusDisabled && styles.stepButtonDisabled]}
          onPress={onPlus}
        >
          <Plus size={16} color={TEXT} />
        </Pressable>
      </View>
    </View>
  );
}

function PriceRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceRowLabel}>{label}</Text>

      <Text style={styles.priceRowValue}>
        ₹{Number(value).toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

function BuildingIcon() {
  return (
    <View style={styles.buildingIcon}>
      <View style={styles.buildingRoof} />
      <View style={styles.buildingBody}>
        <View style={styles.buildingWindowRow}>
          <View style={styles.buildingWindow} />
          <View style={styles.buildingWindow} />
        </View>

        <View style={styles.buildingDoor} />
      </View>
    </View>
  );
}

function PropertySkeleton() {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <View style={styles.skeletonImage} />

      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonShortLine} />

        <View style={styles.skeletonDivider} />

        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonParagraph} />
        <View style={styles.skeletonParagraph} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  pageContent: {
    paddingBottom: 0,
  },

  gallery: {
    position: "relative",
    backgroundColor: "#f1f3f4",
  },

  heroImage: {
    width: SCREEN_WIDTH,
    height: Math.min(390, SCREEN_WIDTH * 0.9),
    backgroundColor: "#f1f3f4",
  },

  backButton: {
    position: "absolute",
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  topActions: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 10,
  },

  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  galleryCounter: {
    position: "absolute",
    right: 16,
    bottom: 14,
    borderRadius: 999,
    backgroundColor: "rgba(32,33,36,0.72)",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  galleryCounterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: WHITE,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 27,
    lineHeight: 35,
    letterSpacing: -0.7,
    color: TEXT,
  },

  metaRow: {
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  ratingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  metaDivider: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#9aa0a6",
  },

  location: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  capacity: {
    marginTop: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },

  sectionDivider: {
    height: 1,
    marginVertical: 26,
    backgroundColor: BORDER,
  },

  sectionTitle: {
    marginBottom: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.35,
    color: TEXT,
  },

  sectionTitleNoMargin: {
    marginBottom: 0,
  },

  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: MUTED,
  },

  featureList: {
    gap: 22,
  },

  featureRow: {
    flexDirection: "row",
    gap: 14,
  },

  featureIcon: {
    width: 30,
    paddingTop: 1,
    alignItems: "center",
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  featureDescription: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
  },

  amenityItem: {
    width: "50%",
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  amenityText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    color: TEXT,
  },

  photoStrip: {
    gap: 12,
    paddingRight: 20,
  },

  photoThumbnail: {
    width: 155,
    height: 112,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
  },

  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  hostAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  hostAvatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: THEME,
  },

  hostInfo: {
    flex: 1,
  },

  hostTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  hostSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  hostMessageButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  reviewRatingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  reviewRatingSummaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  emptyReviews: {
    borderRadius: 18,
    backgroundColor: SURFACE,
    padding: 18,
  },

  emptyReviewsTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  emptyReviewsText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  reviewCard: {
    marginBottom: 20,
    flexDirection: "row",
    gap: 12,
  },

  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewAvatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  reviewContent: {
    flex: 1,
  },

  reviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  reviewName: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reviewScore: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  reviewText: {
    marginTop: 7,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 84,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  bottomPriceArea: {
    flex: 1,
  },

  bottomPrice: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  bottomPriceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  bottomDates: {
    marginTop: 4,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: TEXT,
    textDecorationLine: "underline",
  },

  reserveButton: {
    minWidth: 132,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  reserveButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  reserveButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  bookingSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },

  guestSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginTop: 10,
    marginBottom: 16,
  },

  sheetHeader: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  sheetTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 23,
    color: TEXT,
  },

  sheetSubtitle: {
    marginTop: 5,
    maxWidth: 280,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetPriceRow: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "baseline",
  },

  sheetPrice: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: TEXT,
  },

  sheetPriceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
  },

  selectorCard: {
    minHeight: 72,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  selectorContent: {
    flex: 1,
  },

  selectorLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  selectorValue: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },

  priceBreakdown: {
    marginTop: 8,
    paddingVertical: 15,
    gap: 11,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  priceRowLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: MUTED,
  },

  priceRowValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: TEXT,
  },

  totalRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  totalLabel: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  totalValue: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  messageHostButton: {
    height: 50,
    marginTop: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  messageHostButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  continueButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: WHITE,
  },

  guestRow: {
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  guestTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  guestSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },

  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfd3d7",
    alignItems: "center",
    justifyContent: "center",
  },

  stepButtonDisabled: {
    opacity: 0.3,
  },

  stepValue: {
    width: 22,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  fullModalPage: {
    flex: 1,
    backgroundColor: WHITE,
  },

  fullModalHeader: {
    height: 64,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  fullModalTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    color: TEXT,
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  calendarPage: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 120,
  },

  dateSummary: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  dateSummaryItem: {
    flex: 1,
  },

  dateSummaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: BORDER,
    marginHorizontal: 14,
  },

  dateSummaryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    color: TEXT,
  },

  dateSummaryValue: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },

  monthNavigation: {
    marginTop: 28,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    color: TEXT,
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#80868b",
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: `${100 / 7}%`,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCellRange: {
    backgroundColor: THEME_LIGHT,
  },

  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  dayButtonSelected: {
    backgroundColor: THEME,
  },

  dayButtonToday: {
    borderWidth: 1,
    borderColor: THEME,
  },

  dayText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: TEXT,
  },

  dayTextDisabled: {
    color: "#c2c6ca",
    textDecorationLine: "line-through",
  },

  dayTextSelected: {
    fontFamily: "Inter_600SemiBold",
    color: WHITE,
  },

  dayTextToday: {
    color: THEME,
  },

  calendarLegend: {
    marginTop: 24,
    flexDirection: "row",
    gap: 22,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  unavailableLegend: {
    width: 15,
    height: 15,
    borderRadius: 5,
    backgroundColor: "#eceff1",
  },

  selectedLegend: {
    width: 15,
    height: 15,
    borderRadius: 5,
    backgroundColor: THEME,
  },

  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  calendarFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  clearButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
  },

  calendarConfirmButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarConfirmText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  galleryModal: {
    flex: 1,
    backgroundColor: "#000000",
  },

  galleryModalHeader: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  galleryCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  galleryModalCounter: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  galleryModalSlide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  galleryModalImage: {
    width: SCREEN_WIDTH,
    height: "88%",
  },

  errorPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  errorIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 22,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 23,
    color: TEXT,
    textAlign: "center",
  },

  errorText: {
    marginTop: 9,
    maxWidth: 320,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
  },

  errorButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  errorButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  buildingIcon: {
    alignItems: "center",
  },

  buildingRoof: {
    width: 30,
    height: 16,
    backgroundColor: THEME,
    transform: [{ rotate: "45deg" }],
    marginBottom: -9,
    borderRadius: 3,
  },

  buildingBody: {
    width: 34,
    height: 32,
    borderRadius: 5,
    backgroundColor: THEME,
    paddingTop: 8,
    alignItems: "center",
  },

  buildingWindowRow: {
    flexDirection: "row",
    gap: 5,
  },

  buildingWindow: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: WHITE,
  },

  buildingDoor: {
    width: 8,
    height: 12,
    marginTop: 5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: WHITE,
  },

  skeletonImage: {
    width: "100%",
    height: Math.min(390, SCREEN_WIDTH * 0.9),
    backgroundColor: "#eceff1",
  },

  skeletonContent: {
    padding: 20,
  },

  skeletonTitle: {
    width: "82%",
    height: 28,
    borderRadius: 10,
    backgroundColor: "#eceff1",
  },

  skeletonLine: {
    width: "65%",
    height: 14,
    marginTop: 14,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonShortLine: {
    width: "48%",
    height: 14,
    marginTop: 9,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },

  skeletonDivider: {
    height: 1,
    marginVertical: 28,
    backgroundColor: "#eceff1",
  },

  skeletonSectionTitle: {
    width: "46%",
    height: 21,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonParagraph: {
    width: "100%",
    height: 14,
    marginTop: 13,
    borderRadius: 7,
    backgroundColor: "#f1f3f4",
  },
});