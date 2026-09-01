import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
    Building2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    FileText,
    Heart,
    MapPin,
    MessageCircle,
    Minus,
    Plus,
    Star,
    User,
    Users,
    X,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../api/api";
import { formatCurrency } from "../../utils/currency";
import { getStoredUser } from "../../services/authService";
import {
  formatDisplayDate,
  isTodayOrFuture,
  parseCalendarDate,
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

const SCREEN_WIDTH = Dimensions.get("window").width;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";

type ExperienceImage = {
  id?: number | string;
  image_url?: string;
  imageUrl?: string;
  url?: string;
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

type ExperienceReview = {
  id: number | string;
  guest_name?: string;
  user_name?: string;
  rating?: number | string;
  review?: string;
  comment?: string;
  created_at?: string;
};

type Experience = {
  id: number | string;
  title?: string;
  description?: string;
  location?: string;
  city?: string;
  category?: string;
  package_type?: string;
  price?: number | string;
  package_days?: number | string;
  package_nights?: number | string;
  max_people?: number | string;
  max_travelers?: number | string;
  max_guests?: number | string;
  group_size?: string;
  host_name?: string;
  host?: string;
  host_id?: number | string;
  image?: string;
  image_url?: string;
  images?: ExperienceImage[] | string | null;
  rating?: number | string;
  reviews?: number | string;
  includes?: string;
  itinerary?: string;
  exclusions?: string;
  cancellation_policy?: string;
  hotel_name?: string;
  transport?: string;
  meals?: string;
  pickup_location?: string;
  language?: string;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeImageUrl = (value?: string) => {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return value.startsWith("/")
    ? `https://stay.dovail.com${value}`
    : `https://stay.dovail.com/${value}`;
};

const getArrayFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;

  for (const key of [...keys, "data", "items", "results"]) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") {
      const nested = getArrayFromResponse<T>(value, keys);
      if (nested.length) return nested;
    }
  }

  return [];
};

const getObjectFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;

  for (const key of [...keys, "data", "item"]) {
    const value = record[key];

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as T;
    }
  }

  return payload as T;
};

const parseImageList = (images: Experience["images"]): string[] => {
  if (!images) return [];

  if (Array.isArray(images)) {
    return images
      .map((item) => item.image_url || item.imageUrl || item.url || "")
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

const formatDate = (value?: string) => {
  return formatDisplayDate(value);
};

const parseList = (value?: string, fallback: string[] = []) => {
  if (!value?.trim()) return fallback;

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

const getRemainingSeats = (departure: ExperienceDeparture) =>
  departure.available_seats != null
    ? toNumber(departure.available_seats)
    : toNumber(departure.total_seats) - toNumber(departure.booked_seats);

const isDepartureAvailable = (departure: ExperienceDeparture) => {
  const remaining = getRemainingSeats(departure);
  const status = String(departure.status || "active").toLowerCase();

  return (
    ["active", "available", "open", "bookable"].includes(status) &&
    isTodayOrFuture(departure.departure_date) &&
    remaining > 0
  );
};

const normalizeDeparture = (departure: ExperienceDeparture): ExperienceDeparture => ({
  ...departure,
  id: departure.id ?? departure.departure_id ?? "",
  departure_date: departure.departure_date || departure.date || departure.start_date,
  total_seats: departure.total_seats ?? departure.capacity ?? departure.available_seats ?? 0,
  booked_seats: departure.booked_seats ?? 0,
  price_override: departure.price_override ?? departure.price,
});

export default function ExperienceDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [experience, setExperience] = useState<Experience | null>(null);
  const [departures, setDepartures] = useState<ExperienceDeparture[]>([]);
  const [reviews, setReviews] = useState<ExperienceReview[]>([]);
  const [selectedDeparture, setSelectedDeparture] =
    useState<ExperienceDeparture | null>(null);

  const [travelers, setTravelers] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [departurePickerOpen, setDeparturePickerOpen] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);

  const loadPage = useCallback(
    async (refresh = false) => {
      if (!id) {
        setError("Trip package ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const detailResponse = await api.get(`/experiences/${id}`);

        const loadedExperience = getObjectFromResponse<Experience>(
          detailResponse.data,
          ["experience", "trip"]
        );

        if (!loadedExperience) {
          throw new Error("Trip package was not found.");
        }

        setExperience(loadedExperience);

        try {
          const departureResponse = await api.get(
            `/trip-packages/${id}/departures`
          );

          const loadedDepartures = getArrayFromResponse<ExperienceDeparture>(
            departureResponse.data,
            ["departures"]
          );

          const sortedDepartures = loadedDepartures.map(normalizeDeparture).sort((first, second) => {
            const firstTime =
              parseCalendarDate(first.departure_date)?.getTime() ?? Infinity;
            const secondTime =
              parseCalendarDate(second.departure_date)?.getTime() ?? Infinity;
            return firstTime - secondTime;
          });

          setDepartures(sortedDepartures);
          setSelectedDeparture(
            sortedDepartures.find(isDepartureAvailable) || null
          );
        } catch {
          setDepartures([]);
          setSelectedDeparture(null);
        }

        try {
          const reviewsResponse = await api.get(`/experience-reviews/${id}`);

          setReviews(
            getArrayFromResponse<ExperienceReview>(
              reviewsResponse.data,
              ["reviews"]
            )
          );
        } catch {
          setReviews([]);
        }
      } catch (requestError: any) {
        setExperience(null);
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load this trip package."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const images = useMemo(() => {
    if (!experience) return [FALLBACK_IMAGE];

    const list = parseImageList(experience.images);
    if (list.length) return list;

    const direct = experience.image || experience.image_url;
    return direct ? [normalizeImageUrl(direct)] : [FALLBACK_IMAGE];
  }, [experience]);

  const packagePrice = useMemo(() => {
    const override = toNumber(selectedDeparture?.price_override);
    return override > 0 ? override : toNumber(experience?.price);
  }, [experience?.price, selectedDeparture?.price_override]);

  const subtotal = packagePrice * travelers;
  const taxes = Math.round(subtotal * 0.12);
  const total = subtotal + taxes;

  const days = Math.max(1, toNumber(experience?.package_days) || 1);
  const nights = Math.max(
    0,
    toNumber(experience?.package_nights) || days - 1
  );

  const rating = toNumber(experience?.rating);
  const reviewCount = toNumber(experience?.reviews) || reviews.length;

  const maximumTravelers = useMemo(() => {
    if (selectedDeparture) {
      return Math.max(
        1,
        getRemainingSeats(selectedDeparture)
      );
    }

    return Math.max(
      1,
      toNumber(experience?.max_people ?? experience?.max_travelers ?? experience?.max_guests) || 10
    );
  }, [experience?.max_guests, experience?.max_people, experience?.max_travelers, selectedDeparture]);

  useEffect(() => {
    if (travelers > maximumTravelers) {
      setTravelers(maximumTravelers);
    }
  }, [maximumTravelers, travelers]);

  const includes = useMemo(
    () =>
      parseList(experience?.includes, [
        "Hotel stay",
        "Transport",
        "Local assistance",
        "Pickup and drop",
      ]),
    [experience?.includes]
  );

  const exclusions = useMemo(
    () => parseList(experience?.exclusions),
    [experience?.exclusions]
  );

  const itinerary = useMemo(
    () => parseItinerary(experience?.itinerary),
    [experience?.itinerary]
  );

  const openCheckout = () => {
    if (!experience || !id) return;

    if (departures.length === 0) {
      Alert.alert(
        "No departure dates",
        "This trip does not have a bookable departure yet. Please check again later."
      );
      return;
    }

    if (!selectedDeparture) {
      Alert.alert(
        "Select a departure",
        "Choose an available departure date before continuing."
      );
      return;
    }

    if (selectedDeparture && !isDepartureAvailable(selectedDeparture)) {
      Alert.alert(
        "Departure unavailable",
        "This departure is no longer available. Select another date."
      );
      return;
    }

    router.push({
      pathname: "/experience/checkout",
      params: {
        id: String(id),
        departureId: selectedDeparture ? String(selectedDeparture.id) : "",
        selectedDate: selectedDeparture?.departure_date || "",
        guests: String(travelers),
      },
    });
  };

  const messageHost = async () => {
    if (!experience || startingConversation) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        setBookingModalOpen(false);
        router.push("/login");
        return;
      }

      const hostId = Number(experience.host_id);
      const userId = Number(user.id ?? user.user_id);
      if (!hostId) {
        Alert.alert("Host unavailable", "Host information is missing for this trip.");
        return;
      }

      if (userId === hostId) {
        Alert.alert("Your trip", "You cannot message yourself.");
        return;
      }

      setStartingConversation(true);
      await api.post("/conversations/start", {
        sender_id: userId,
        receiver_id: hostId,
        experience_id: experience.id,
        message: `Hi, I’m interested in ${experience.title || "this trip"}. Is this departure available?`,
      });
      setBookingModalOpen(false);
      router.push("/messages");
    } catch (messageError: any) {
      Alert.alert(
        "Message failed",
        messageError?.response?.data?.message || "Could not start this conversation."
      );
    } finally {
      setStartingConversation(false);
    }
  };

  const openDeparturePicker = () => {
    setBookingModalOpen(false);
    setTimeout(() => setDeparturePickerOpen(true), 160);
  };

  const chooseDeparture = (departure: ExperienceDeparture) => {
    setSelectedDeparture(departure);
    setDeparturePickerOpen(false);
    setTimeout(() => setBookingModalOpen(true), 160);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
        <View style={styles.loadingPage}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>Loading trip package...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !experience) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

        <View style={styles.errorPage}>
          <View style={styles.errorIcon}>
            <Building2 size={30} color={THEME} />
          </View>

          <Text style={styles.errorTitle}>Trip package unavailable</Text>

          <Text style={styles.errorText}>
            {error || "This package could not be loaded."}
          </Text>

          <Pressable onPress={() => loadPage()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.page}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(true)}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
        >
          <View style={styles.galleryWrap}>
            <FlatList
              horizontal
              pagingEnabled
              data={images}
              keyExtractor={(item, index) => `${item}-${index}`}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
              )}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActiveImageIndex(nextIndex);
              }}
            />

            <Pressable
              onPress={() => router.back()}
              style={[styles.galleryButton, styles.backButton]}
            >
              <ChevronLeft size={23} color={TEXT} />
            </Pressable>

            <Pressable
              onPress={() => setLiked((current) => !current)}
              style={[styles.galleryButton, styles.heartButton]}
            >
              <Heart
                size={21}
                color={liked ? THEME : TEXT}
                fill={liked ? THEME : "transparent"}
              />
            </Pressable>

            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.packageType}>
              {experience.package_type ||
                experience.category ||
                "Trip package"}
            </Text>

            <Text style={styles.title}>
              {experience.title || "Dovail Stay Trip Package"}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Star
                  size={14}
                  color="#717171"
                  fill={rating > 0 ? "#717171" : "transparent"}
                />
                <Text style={styles.metaText}>
                  {rating > 0 ? rating.toFixed(1) : "New"}
                </Text>
              </View>

              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{reviewCount} reviews</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>
                {days} days · {nights} nights
              </Text>
            </View>

            <View style={styles.locationRow}>
              <MapPin size={16} color={MUTED} />
              <Text style={styles.locationText}>
                {experience.location || experience.city || "Destination"}
              </Text>
            </View>

            <Section>
              <View style={styles.hostRow}>
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostAvatarText}>
                    {String(
                      experience.host_name || experience.host || "D"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.hostContent}>
                  <Text style={styles.hostTitle}>
                    Hosted by{" "}
                    {experience.host_name ||
                      experience.host ||
                      "Dovail Travel"}
                  </Text>

                  <Text style={styles.hostSubtitle}>
                    {days} days · {nights} nights · Up to{" "}
                    {toNumber(experience.max_people) || 10} travelers
                  </Text>
                </View>
              </View>
            </Section>

            <Section title="Package overview">
              <Text style={styles.bodyText}>
                {experience.description ||
                  "Enjoy a carefully planned trip package with stay, transport and local support."}
              </Text>
            </Section>

            <Section title="What's included">
              <View style={styles.itemList}>
                {includes.map((item) => (
                  <InfoListItem key={item} text={item} positive />
                ))}
              </View>
            </Section>

            {exclusions.length > 0 ? (
              <Section title="Not included">
                <View style={styles.itemList}>
                  {exclusions.map((item) => (
                    <InfoListItem key={item} text={item} />
                  ))}
                </View>
              </Section>
            ) : null}

            <Section title="Trip details">
              <DetailRow label="Hotel" value={experience.hotel_name || "Included"} />
              <DetailRow
                label="Transport"
                value={experience.transport || "Shared or private transport"}
              />
              <DetailRow
                label="Meals"
                value={experience.meals || "Selected meals"}
              />
              <DetailRow
                label="Pickup"
                value={experience.pickup_location || "Shared after booking"}
              />
              <DetailRow
                label="Language"
                value={experience.language || "English"}
                last
              />
            </Section>

            {departures.length > 0 ? (
              <Section title="Choose a departure">
                <View style={styles.departureList}>
                  {departures.map((departure) => {
                    const remaining = getRemainingSeats(departure);

                    const available = isDepartureAvailable(departure);
                    const selected =
                      String(selectedDeparture?.id) === String(departure.id);

                    return (
                      <Pressable
                        key={String(departure.id)}
                        disabled={!available}
                        onPress={() => setSelectedDeparture(departure)}
                        style={[
                          styles.departureCard,
                          selected && styles.departureCardSelected,
                          !available && styles.departureCardDisabled,
                        ]}
                      >
                        <View>
                          <Text
                            style={[
                              styles.departureDate,
                              selected && styles.departureDateSelected,
                            ]}
                          >
                            {formatDate(departure.departure_date)}
                          </Text>

                          <Text style={styles.departureSeats}>
                            {available
                              ? `${remaining} seats left`
                              : departure.status || "Unavailable"}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.radio,
                            selected && styles.radioSelected,
                          ]}
                        >
                          {selected ? <View style={styles.radioInner} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Section>
            ) : null}

            <Section title="Travelers">
              <View style={styles.travelerCard}>
                <View>
                  <Text style={styles.travelerTitle}>Number of travelers</Text>
                  <Text style={styles.travelerSubtitle}>
                    Maximum {maximumTravelers}
                  </Text>
                </View>

                <View style={styles.counter}>
                  <Pressable
                    disabled={travelers <= 1}
                    onPress={() =>
                      setTravelers((current) => Math.max(1, current - 1))
                    }
                    style={[
                      styles.counterButton,
                      travelers <= 1 && styles.counterButtonDisabled,
                    ]}
                  >
                    <Minus size={17} color={TEXT} />
                  </Pressable>

                  <Text style={styles.counterValue}>{travelers}</Text>

                  <Pressable
                    disabled={travelers >= maximumTravelers}
                    onPress={() =>
                      setTravelers((current) =>
                        Math.min(maximumTravelers, current + 1)
                      )
                    }
                    style={[
                      styles.counterButton,
                      travelers >= maximumTravelers &&
                        styles.counterButtonDisabled,
                    ]}
                  >
                    <Plus size={17} color={TEXT} />
                  </Pressable>
                </View>
              </View>
            </Section>

            {itinerary.length > 0 ? (
              <Section title="Itinerary">
                <View style={styles.timeline}>
                  {itinerary.map((item, index) => (
                    <View key={`${item.title}-${index}`} style={styles.timelineRow}>
                      <View style={styles.timelineMarker}>
                        <View style={styles.timelineDot} />

                        {index < itinerary.length - 1 ? (
                          <View style={styles.timelineLine} />
                        ) : null}
                      </View>

                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>{item.title}</Text>
                        <Text style={styles.timelineText}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Section>
            ) : null}

            <Section title="Cancellation policy">
              <View style={styles.policyCard}>
                <FileText size={20} color={THEME} />
                <Text style={styles.policyText}>
                  {experience.cancellation_policy ||
                    "Cancellation is subject to the package rules. Contact support for changes."}
                </Text>
              </View>
            </Section>

            <Section title="Guest reviews">
              {reviews.length > 0 ? (
                reviews.slice(0, 5).map((review) => (
                  <View key={String(review.id)} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <User size={17} color={THEME} />
                      </View>

                      <View style={styles.reviewInfo}>
                        <Text style={styles.reviewName}>
                          {review.guest_name || review.user_name || "Guest"}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {formatDate(review.created_at)}
                        </Text>
                      </View>

                      <View style={styles.reviewRating}>
                        <Star size={12} color="#717171" fill="#717171" />
                        <Text style={styles.reviewRatingText}>
                          {toNumber(review.rating).toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.reviewText}>
                      {review.review ||
                        review.comment ||
                        "Great trip package."}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyReviewText}>
                  No reviews yet for this package.
                </Text>
              )}
            </Section>

            <View style={styles.priceSummary}>
              <Text style={styles.priceSummaryTitle}>Price details</Text>

              <PriceRow
                label={`${formatCurrency(packagePrice)} × ${travelers}`}
                value={formatCurrency(subtotal)}
              />

              <PriceRow label="Taxes" value={formatCurrency(taxes)} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerPrice}>{formatCurrency(total)}</Text>
            <Text style={styles.footerPriceText}>
              {selectedDeparture?.departure_date
                ? `${formatDate(selectedDeparture.departure_date)} · ${travelers} ${
                    travelers === 1 ? "traveler" : "travelers"
                  }`
                : "Select a departure date"}
            </Text>
          </View>

          <Pressable
            onPress={() => setBookingModalOpen(true)}
            style={({ pressed }) => [
              styles.bookButton,
              pressed && styles.bookButtonPressed,
            ]}
          >
            <Text style={styles.bookButtonText}>Reserve</Text>
          </Pressable>
        </View>

        <Modal
          visible={bookingModalOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setBookingModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <SafeAreaView edges={["bottom"]} style={styles.bookingSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderCopy}>
                  <Text style={styles.sheetTitle}>Reserve your trip</Text>
                  <Text numberOfLines={1} style={styles.sheetSubtitle}>
                    {experience.title || "Dovail trip"}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close reservation"
                  onPress={() => setBookingModalOpen(false)}
                  style={styles.sheetCloseButton}
                >
                  <X size={20} color={TEXT} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetPriceRow}>
                  <Text style={styles.sheetPrice}>{formatCurrency(packagePrice)}</Text>
                  <Text style={styles.sheetPriceSuffix}> / traveler</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose departure date"
                  onPress={openDeparturePicker}
                  style={({ pressed }) => [
                    styles.sheetSelectorCard,
                    pressed && styles.sheetSelectorCardPressed,
                  ]}
                >
                  <CalendarDays size={20} color={THEME} />
                  <View style={styles.sheetSelectorContent}>
                    <Text style={styles.sheetSelectorLabel}>Departure date</Text>
                    <Text style={styles.sheetSelectorValue}>
                      {selectedDeparture?.departure_date
                        ? formatDate(selectedDeparture.departure_date)
                        : "Select an available departure"}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={MUTED} />
                </Pressable>

                <View style={styles.sheetDepartureList}>
                  {departures.map((departure) => {
                    const available = isDepartureAvailable(departure);
                    const selected = String(selectedDeparture?.id) === String(departure.id);
                    return (
                      <Pressable
                        key={String(departure.id)}
                        disabled={!available}
                        onPress={() => setSelectedDeparture(departure)}
                        style={[
                          styles.sheetDepartureChip,
                          selected && styles.sheetDepartureChipSelected,
                          !available && styles.sheetDepartureChipDisabled,
                        ]}
                      >
                        <Text style={[styles.sheetDepartureChipText, selected && styles.sheetDepartureChipTextSelected]}>
                          {formatDate(departure.departure_date)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sheetSelectorCard}>
                  <Users size={20} color={THEME} />
                  <View style={styles.sheetSelectorContent}>
                    <Text style={styles.sheetSelectorLabel}>Travelers</Text>
                    <Text style={styles.sheetSelectorValue}>
                      {travelers} {travelers === 1 ? "traveler" : "travelers"}
                    </Text>
                  </View>
                  <View style={styles.sheetCounter}>
                    <Pressable
                      disabled={travelers <= 1}
                      onPress={() => setTravelers((current) => Math.max(1, current - 1))}
                      style={[styles.sheetCounterButton, travelers <= 1 && styles.counterButtonDisabled]}
                    >
                      <Minus size={17} color={TEXT} />
                    </Pressable>
                    <Text style={styles.sheetCounterValue}>{travelers}</Text>
                    <Pressable
                      disabled={travelers >= maximumTravelers}
                      onPress={() => setTravelers((current) => Math.min(maximumTravelers, current + 1))}
                      style={[styles.sheetCounterButton, travelers >= maximumTravelers && styles.counterButtonDisabled]}
                    >
                      <Plus size={17} color={TEXT} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.sheetPriceBreakdown}>
                  <PriceRow label={`${formatCurrency(packagePrice)} × ${travelers}`} value={formatCurrency(subtotal)} />
                  <PriceRow label="Taxes" value={formatCurrency(taxes)} />
                  <View style={styles.sheetTotalRow}>
                    <Text style={styles.sheetTotalLabel}>Total before payment</Text>
                    <Text style={styles.sheetTotalValue}>{formatCurrency(total)}</Text>
                  </View>
                </View>

                <Pressable
                  disabled={startingConversation}
                  onPress={messageHost}
                  style={styles.messageHostButton}
                >
                  {startingConversation ? (
                    <ActivityIndicator size="small" color={TEXT} />
                  ) : (
                    <MessageCircle size={19} color={TEXT} />
                  )}
                  <Text style={styles.messageHostButtonText}>Message host</Text>
                </Pressable>
              </ScrollView>

              <Pressable
                onPress={() => {
                  setBookingModalOpen(false);
                  openCheckout();
                }}
                style={({ pressed }) => [styles.sheetContinueButton, pressed && styles.bookButtonPressed]}
              >
                <Text style={styles.bookButtonText}>Continue</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </Modal>

        <Modal
          visible={departurePickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setDeparturePickerOpen(false)}
        >
          <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.departurePickerPage}>
            <View style={styles.departurePickerHeader}>
              <Pressable
                accessibilityLabel="Back to reservation"
                onPress={() => {
                  setDeparturePickerOpen(false);
                  setTimeout(() => setBookingModalOpen(true), 160);
                }}
                style={styles.sheetCloseButton}
              >
                <ChevronLeft size={24} color={TEXT} />
              </Pressable>
              <Text style={styles.departurePickerTitle}>Choose a departure</Text>
              <View style={styles.sheetCloseButton} />
            </View>

            <ScrollView contentContainerStyle={styles.departurePickerContent}>
              <Text style={styles.departurePickerSubtitle}>
                Select an available date for {experience.title || "this trip"}.
              </Text>

              {departures.length ? departures.map((departure) => {
                const available = isDepartureAvailable(departure);
                const selected = String(selectedDeparture?.id) === String(departure.id);
                const remaining = getRemainingSeats(departure);
                return (
                  <Pressable
                    key={String(departure.id)}
                    disabled={!available}
                    onPress={() => chooseDeparture(departure)}
                    style={({ pressed }) => [
                      styles.departurePickerRow,
                      selected && styles.departurePickerRowSelected,
                      !available && styles.departureCardDisabled,
                      pressed && styles.sheetSelectorCardPressed,
                    ]}
                  >
                    <CalendarDays size={21} color={selected ? THEME : TEXT} />
                    <View style={styles.sheetSelectorContent}>
                      <Text style={styles.departurePickerDate}>{formatDate(departure.departure_date)}</Text>
                      <Text style={styles.departurePickerSeats}>
                        {available ? `${remaining} seats available` : departure.status || "Unavailable"}
                      </Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              }) : (
                <View style={styles.departurePickerEmpty}>
                  <Text style={styles.departurePickerDate}>No departure dates available</Text>
                  <Text style={styles.departurePickerSeats}>Please check again later.</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

function InfoListItem({
  text,
  positive = false,
}: {
  text: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.infoListItem}>
      <View
        style={[
          styles.infoBullet,
          positive && styles.infoBulletPositive,
        ]}
      />
      <Text style={styles.infoListText}>{text}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
      <Text style={styles.priceRowLabel}>{label}</Text>
      <Text style={styles.priceRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },
  page: { flex: 1, backgroundColor: WHITE },
  scrollContent: { paddingBottom: 120 },

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

  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  errorTitle: {
    marginTop: 20,
    fontFamily: "PlusJakartaSans_700Bold",
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

  galleryWrap: {
    height: 310,
    backgroundColor: "#f1f3f4",
  },

  galleryImage: {
    width: SCREEN_WIDTH,
    height: 310,
    backgroundColor: "#f1f3f4",
  },

  galleryButton: {
    position: "absolute",
    top: 14,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  backButton: { left: 16 },
  heartButton: { right: 16 },

  imageCounter: {
    position: "absolute",
    right: 16,
    bottom: 14,
    minHeight: 30,
    borderRadius: 15,
    backgroundColor: "rgba(32,33,36,0.72)",
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  imageCounterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: WHITE,
  },

  content: { paddingHorizontal: 18 },

  packageType: {
    marginTop: 22,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: THEME,
  },

  title: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: TEXT,
  },

  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  metaDot: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#9aa0a6",
  },

  locationRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  locationText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  section: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  sectionTitle: {
    marginBottom: 15,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  hostRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  hostAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  hostAvatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: THEME,
  },

  hostContent: { flex: 1, marginLeft: 13 },

  hostTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  hostSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 21,
    color: MUTED,
  },

  itemList: { gap: 12 },

  infoListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  infoBullet: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: "#9aa0a6",
  },

  infoBulletPositive: { backgroundColor: SUCCESS },

  infoListText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: TEXT,
  },

  detailRow: {
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  detailRowLast: { borderBottomWidth: 0 },

  detailLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  detailValue: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: TEXT,
    textAlign: "right",
  },

  departureList: { gap: 10 },

  departureCard: {
    minHeight: 68,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  departureCardSelected: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  departureCardDisabled: { opacity: 0.45 },

  departureDate: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  departureDateSelected: { color: THEME },

  departureSeats: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
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

  radioSelected: { borderColor: THEME },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME,
  },

  travelerCard: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  travelerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  travelerSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#cfd3d7",
    alignItems: "center",
    justifyContent: "center",
  },

  counterButtonDisabled: { opacity: 0.3 },

  counterValue: {
    width: 22,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
    textAlign: "center",
  },

  timeline: { gap: 0 },

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

  policyCard: {
    borderRadius: 15,
    backgroundColor: SURFACE,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  policyText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    paddingBottom: 17,
    marginBottom: 17,
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  reviewInfo: { flex: 1, marginLeft: 10 },

  reviewName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  reviewDate: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  reviewRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reviewRatingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#717171",
  },

  reviewText: {
    marginTop: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  emptyReviewText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  priceSummary: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
  },

  priceSummaryTitle: {
    marginBottom: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  priceRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  priceRowLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  priceRowValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: TEXT,
  },

  totalRow: {
    marginTop: 7,
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

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 86,
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

  footerPrice: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  footerPriceText: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  bookButton: {
    minWidth: 150,
    height: 52,
    borderRadius: 14,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  bookButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  bookButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: WHITE,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  bookingSheet: {
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: WHITE,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: 16,
    borderRadius: 2,
    backgroundColor: "#d7d7d2",
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  sheetHeaderCopy: { flex: 1, minWidth: 0 },
  sheetTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 21, color: TEXT },
  sheetSubtitle: { marginTop: 3, fontFamily: "Inter_400Regular", fontSize: 12, color: MUTED },
  sheetCloseButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },

  sheetPriceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  sheetPrice: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 22, color: TEXT },
  sheetPriceSuffix: { fontFamily: "Inter_400Regular", fontSize: 13, color: MUTED },

  sheetSelectorCard: {
    minHeight: 72,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetSelectorContent: { flex: 1 },
  sheetSelectorLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: TEXT },
  sheetSelectorValue: { marginTop: 4, fontFamily: "Inter_400Regular", fontSize: 13, color: MUTED },
  sheetSelectorCardPressed: { opacity: 0.72 },

  sheetDepartureList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  sheetDepartureChip: { minHeight: 40, paddingHorizontal: 13, borderWidth: 1, borderColor: BORDER, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sheetDepartureChipSelected: { borderColor: THEME, backgroundColor: THEME_LIGHT },
  sheetDepartureChipDisabled: { opacity: 0.35 },
  sheetDepartureChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: TEXT },
  sheetDepartureChipTextSelected: { fontFamily: "Inter_600SemiBold", color: THEME_DARK },

  sheetCounter: { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetCounterButton: { width: 36, height: 36, borderWidth: 1, borderColor: BORDER, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheetCounterValue: { minWidth: 20, textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 14, color: TEXT },

  sheetPriceBreakdown: { paddingVertical: 8, gap: 11 },
  sheetTotalRow: { paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  sheetTotalLabel: { flex: 1, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: TEXT },
  sheetTotalValue: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 16, color: TEXT },

  messageHostButton: { height: 50, marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  messageHostButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: TEXT },
  sheetContinueButton: { height: 54, borderRadius: 17, backgroundColor: THEME, alignItems: "center", justifyContent: "center" },

  departurePickerPage: { flex: 1, backgroundColor: WHITE },
  departurePickerHeader: { minHeight: 64, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  departurePickerTitle: { flex: 1, textAlign: "center", fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: TEXT },
  departurePickerContent: { padding: 20, paddingBottom: 36 },
  departurePickerSubtitle: { marginBottom: 18, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, color: MUTED },
  departurePickerRow: { minHeight: 76, marginBottom: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: WHITE },
  departurePickerRowSelected: { borderColor: THEME, backgroundColor: THEME_LIGHT },
  departurePickerDate: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: TEXT },
  departurePickerSeats: { marginTop: 4, fontFamily: "Inter_400Regular", fontSize: 12, color: MUTED },
  departurePickerEmpty: { minHeight: 180, alignItems: "center", justifyContent: "center", padding: 24, borderWidth: 1, borderColor: BORDER, borderRadius: 18 },
});
