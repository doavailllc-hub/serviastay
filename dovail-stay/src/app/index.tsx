import { router } from "expo-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  PlaneTakeoff,
  Search,
  Star
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
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import api from "../api/api";
import { getStoredUser } from "../services/authService";

const THEME = "#3b71e6";
const THEME_LIGHT = "#eef4ff";
const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const BACKGROUND = "#f7f8fa";
const SURFACE = "#f8fafc";
const SUCCESS = "#177a45";

const FALLBACK_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

type HomeTab = "Stay" | "Trip";

type SearchStep =
  | "destination"
  | "dates"
  | "guests"
  | "filters";

type ListingItem = {
  id: number | string;

  title?: string;
  name?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  thumbnail?: string;
  images?: unknown;

  category?: string;
  package_type?: string;
  property_type?: string;

  location?: string;
  destination?: string;
  city?: string;
  state?: string;
  country?: string;

  guests?: number | string;
  max_guests?: number | string;

  bedrooms?: number | string;
  bathrooms?: number | string;

  package_days?: number | string;
  package_nights?: number | string;
  days?: number | string;
  nights?: number | string;

  price?: number | string;
  weekday_price?: number | string;
  weekend_price?: number | string;
  package_price?: number | string;
  adult_price?: number | string;
  total?: number | string;

  rating?: number | string;
  average_rating?: number | string;
  reviews_count?: number | string;

  status?: string;
};

type CalendarDay = {
  key: string;
  date: Date;
  dayNumber: number;
  currentMonth: boolean;
};

type AppliedSearch = {
  destination: string;
  checkin: Date | null;
  checkout: Date | null;
  guests: number;
  minimumPrice: string;
  maximumPrice: string;
};

const EMPTY_SEARCH: AppliedSearch = {
  destination: "",
  checkin: null,
  checkout: null,
  guests: 1,
  minimumPrice: "",
  maximumPrice: "",
};

const tabs: Array<{
  name: HomeTab;
  icon: typeof Building2;
}> = [
  {
    name: "Stay",
    icon: Building2,
  },
  {
    name: "Trip",
    icon: PlaneTakeoff,
  },
];

const padNumber = (value: number) =>
  String(value).padStart(2, "0");

const dateToKey = (date: Date) =>
  `${date.getFullYear()}-${padNumber(
    date.getMonth() + 1
  )}-${padNumber(date.getDate())}`;

const normalizeDate = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

const formatShortDate = (date: Date | null) => {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
};

const formatFullDate = (date: Date | null) => {
  if (!date) {
    return "Add dates";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);

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

const getArrayFromResponse = <T,>(
  payload: unknown
): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload =
    payload as Record<string, unknown>;

  const keys = [
    "data",
    "items",
    "results",
    "properties",
    "stays",
    "experiences",
    "trips",
  ];

  for (const key of keys) {
    const value = objectPayload[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const normalizeImageUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return `https://stay.dovail.com${value}`;
  }

  return `https://stay.dovail.com/${value}`;
};

const getImageFromUnknownValue = (
  value: unknown
): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    try {
      return getImageFromUnknownValue(
        JSON.parse(value)
      );
    } catch {
      return normalizeImageUrl(value);
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const image =
        getImageFromUnknownValue(item);

      if (image) {
        return image;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const imageObject =
      value as Record<string, unknown>;

    const fields = [
      "url",
      "image_url",
      "imageUrl",
      "image",
      "path",
      "file_url",
    ];

    for (const field of fields) {
      const imageValue =
        imageObject[field];

      if (
        typeof imageValue === "string" &&
        imageValue.trim()
      ) {
        return normalizeImageUrl(imageValue);
      }
    }
  }

  return "";
};

const getItemImage = (
  item: ListingItem,
  activeTab: HomeTab
) => {
  const directImage =
    item.image ||
    item.cover_image ||
    item.thumbnail ||
    item.image_url;

  if (directImage) {
    return normalizeImageUrl(directImage);
  }

  const nestedImage =
    getImageFromUnknownValue(item.images);

  if (nestedImage) {
    return nestedImage;
  }

  return activeTab === "Stay"
    ? FALLBACK_STAY_IMAGE
    : FALLBACK_TRIP_IMAGE;
};

const getItemTitle = (
  item: ListingItem,
  activeTab: HomeTab
) =>
  item.title ||
  item.name ||
  (activeTab === "Stay"
    ? "Beautiful stay"
    : "Curated trip");

const getItemLocation = (
  item: ListingItem
) => {
  const locationParts = [
    item.city,
    item.state,
    item.country,
  ].filter(Boolean);

  if (locationParts.length > 0) {
    return locationParts.join(", ");
  }

  return (
    item.location ||
    item.destination ||
    "Location not specified"
  );
};

const getItemPrice = (
  item: ListingItem,
  activeTab: HomeTab
) => {
  if (activeTab === "Trip") {
    return toNumber(
      item.package_price ??
        item.adult_price ??
        item.price ??
        item.total
    );
  }

  return toNumber(
    item.weekday_price ??
      item.price ??
      item.weekend_price ??
      item.total
  );
};

const getItemGuestCapacity = (
  item: ListingItem
) =>
  toNumber(
    item.max_guests ?? item.guests ?? 1
  );

const generateCalendarDays = (
  monthDate: Date
): CalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(
    year,
    month,
    1
  );

  const firstCalendarDate = new Date(
    year,
    month,
    1
  );

  firstCalendarDate.setDate(
    firstCalendarDate.getDate() -
      firstOfMonth.getDay()
  );

  return Array.from(
    {
      length: 42,
    },
    (_, index) => {
      const date = new Date(
        firstCalendarDate
      );

      date.setDate(
        firstCalendarDate.getDate() +
          index
      );

      return {
        key: dateToKey(date),
        date,
        dayNumber: date.getDate(),
        currentMonth:
          date.getMonth() === month,
      };
    }
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<
    ListingItem[]
  >([]);

  const [activeTab, setActiveTab] =
    useState<HomeTab>("Stay");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savedIds, setSavedIds] =
    useState<Set<string>>(new Set());

  const [savingId, setSavingId] =
    useState<string | null>(null);

  const [searchModalVisible, setSearchModalVisible] =
    useState(false);

  const [searchStep, setSearchStep] =
    useState<SearchStep>("destination");

  const [draftSearch, setDraftSearch] =
    useState<AppliedSearch>(EMPTY_SEARCH);

  const [appliedSearch, setAppliedSearch] =
    useState<AppliedSearch>(EMPTY_SEARCH);

  const [visibleMonth, setVisibleMonth] =
    useState(
      () =>
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        )
    );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const endpoint =
          activeTab === "Stay"
            ? "/properties"
            : "/experiences";

        const response =
          await api.get(endpoint);

        const loadedItems =
          getArrayFromResponse<ListingItem>(
            response.data
          );

        setItems(loadedItems);
      } catch (error: any) {
        console.log(
          "Home load error:",
          error?.message || error
        );

        setItems([]);

        if (isRefresh) {
          Alert.alert(
            "Refresh failed",
            "We could not refresh the listings. Please try again."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const normalizedDestination =
      appliedSearch.destination
        .trim()
        .toLowerCase();

    const minimumPrice = toNumber(
      appliedSearch.minimumPrice
    );

    const maximumPrice = toNumber(
      appliedSearch.maximumPrice
    );

    return items.filter((item) => {
      if (normalizedDestination) {
        const searchableText = [
          item.title,
          item.name,
          item.location,
          item.destination,
          item.city,
          item.state,
          item.country,
          item.category,
          item.package_type,
          item.property_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(
            normalizedDestination
          )
        ) {
          return false;
        }
      }

      const itemPrice = getItemPrice(
        item,
        activeTab
      );

      if (
        minimumPrice > 0 &&
        itemPrice < minimumPrice
      ) {
        return false;
      }

      if (
        maximumPrice > 0 &&
        itemPrice > maximumPrice
      ) {
        return false;
      }

      if (activeTab === "Stay") {
        const guestCapacity =
          getItemGuestCapacity(item);

        if (
          appliedSearch.guests > 1 &&
          guestCapacity <
            appliedSearch.guests
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeTab,
    appliedSearch,
    items,
  ]);

  const calendarDays = useMemo(
    () =>
      generateCalendarDays(
        visibleMonth
      ),
    [visibleMonth]
  );

  const hasActiveSearch = useMemo(
    () =>
      Boolean(
        appliedSearch.destination.trim() ||
          appliedSearch.checkin ||
          appliedSearch.checkout ||
          appliedSearch.guests > 1 ||
          appliedSearch.minimumPrice ||
          appliedSearch.maximumPrice
      ),
    [appliedSearch]
  );

  const searchSummary = useMemo(() => {
    const destination =
      appliedSearch.destination.trim() ||
      "Anywhere";

    const dateText =
      appliedSearch.checkin &&
      appliedSearch.checkout
        ? `${formatShortDate(
            appliedSearch.checkin
          )} – ${formatShortDate(
            appliedSearch.checkout
          )}`
        : "Any week";

    const guestText =
      appliedSearch.guests > 1
        ? `${appliedSearch.guests} guests`
        : "Add guests";

    return {
      destination,
      dateText,
      guestText,
    };
  }, [appliedSearch]);

  const openSearch = (
    step: SearchStep = "destination"
  ) => {
    setDraftSearch({
      ...appliedSearch,
    });

    setSearchStep(step);

    const baseDate =
      appliedSearch.checkin ||
      new Date();

    setVisibleMonth(
      new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        1
      )
    );

    setSearchModalVisible(true);
  };

  const closeSearch = () => {
    setSearchModalVisible(false);
  };

  const clearDraftSearch = () => {
    setDraftSearch({
      ...EMPTY_SEARCH,
    });

    setVisibleMonth(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );
  };

  const clearAppliedSearch = () => {
    setAppliedSearch({
      ...EMPTY_SEARCH,
    });

    setDraftSearch({
      ...EMPTY_SEARCH,
    });
  };

  const applySearch = () => {
    if (
      draftSearch.checkin &&
      !draftSearch.checkout
    ) {
      Alert.alert(
        "Select checkout",
        "Please select a checkout date to complete your date range."
      );

      setSearchStep("dates");
      return;
    }

    if (
      draftSearch.minimumPrice &&
      draftSearch.maximumPrice &&
      toNumber(
        draftSearch.minimumPrice
      ) >
        toNumber(
          draftSearch.maximumPrice
        )
    ) {
      Alert.alert(
        "Check price range",
        "Minimum price cannot be greater than maximum price."
      );

      setSearchStep("filters");
      return;
    }

setAppliedSearch({
  ...draftSearch,
});

setSearchModalVisible(false);

router.push({
  pathname: "/explore",
  params: {
    type: activeTab,
    destination: draftSearch.destination.trim(),
    checkin: draftSearch.checkin
      ? draftSearch.checkin.toISOString()
      : "",
    checkout: draftSearch.checkout
      ? draftSearch.checkout.toISOString()
      : "",
    guests: String(draftSearch.guests),
    minimumPrice: draftSearch.minimumPrice,
    maximumPrice: draftSearch.maximumPrice,
  },
});
  };

  const selectDate = (date: Date) => {
    const today = normalizeDate(
      new Date()
    );

    const selectedDate =
      normalizeDate(date);

    if (
      selectedDate.getTime() <
      today.getTime()
    ) {
      return;
    }

    if (
      !draftSearch.checkin ||
      draftSearch.checkout
    ) {
      setDraftSearch((current) => ({
        ...current,
        checkin: selectedDate,
        checkout: null,
      }));

      return;
    }

    if (
      selectedDate.getTime() <=
      draftSearch.checkin.getTime()
    ) {
      setDraftSearch((current) => ({
        ...current,
        checkin: selectedDate,
        checkout: null,
      }));

      return;
    }

    setDraftSearch((current) => ({
      ...current,
      checkout: selectedDate,
    }));
  };

  const isDateSelected = (
    date: Date
  ) => {
    const key = dateToKey(date);

    return (
      key ===
        (draftSearch.checkin
          ? dateToKey(
              draftSearch.checkin
            )
          : "") ||
      key ===
        (draftSearch.checkout
          ? dateToKey(
              draftSearch.checkout
            )
          : "")
    );
  };

  const isDateInRange = (
    date: Date
  ) => {
    if (
      !draftSearch.checkin ||
      !draftSearch.checkout
    ) {
      return false;
    }

    const timestamp =
      normalizeDate(date).getTime();

    return (
      timestamp >
        draftSearch.checkin.getTime() &&
      timestamp <
        draftSearch.checkout.getTime()
    );
  };

  const moveMonth = (
    amount: number
  ) => {
    setVisibleMonth((current) => {
      const nextMonth = new Date(
        current.getFullYear(),
        current.getMonth() + amount,
        1
      );

      const currentMonthStart =
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );

      if (
        nextMonth.getTime() <
        currentMonthStart.getTime()
      ) {
        return current;
      }

      return nextMonth;
    });
  };

  const changeTab = (tab: HomeTab) => {
    if (tab === activeTab) {
      return;
    }

    setActiveTab(tab);
    setItems([]);

    setAppliedSearch({
      ...EMPTY_SEARCH,
    });

    setDraftSearch({
      ...EMPTY_SEARCH,
    });
  };

  const openDetails = (
    item: ListingItem
  ) => {
    if (activeTab === "Stay") {
      router.push({
        pathname: "/property/[id]",
        params: {
          id: String(item.id),
        },
      });

      return;
    }

    router.push({
      pathname: "/experience/[id]",
      params: {
        id: String(item.id),
      },
    });
  };

  const toggleWishlist = async (
    item: ListingItem
  ) => {
    if (activeTab !== "Stay") {
      Alert.alert(
        "Trip wishlist",
        "Trip wishlist support is not yet connected."
      );

      return;
    }

    const itemId = String(item.id);

    if (savedIds.has(itemId)) {
      Alert.alert(
        "Already saved",
        "This stay is already in your wishlist."
      );

      return;
    }

    try {
      const user =
        await getStoredUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setSavingId(itemId);

      await api.post("/wishlist", {
        user_id:
          user.id ?? user.user_id,
        property_id: item.id,
      });

      setSavedIds((current) => {
        const updated = new Set(
          current
        );

        updated.add(itemId);

        return updated;
      });
    } catch (error: any) {
      const message =
        error?.response?.data
          ?.message ||
        "Could not save this stay.";

      if (
        String(message)
          .toLowerCase()
          .includes("already")
      ) {
        setSavedIds((current) => {
          const updated = new Set(
            current
          );

          updated.add(itemId);

          return updated;
        });

        return;
      }

      Alert.alert(
        "Wishlist",
        message
      );
    } finally {
      setSavingId(null);
    }
  };

  const renderListing = ({
    item,
  }: {
    item: ListingItem;
  }) => {
    const itemId = String(item.id);
    const saved =
      savedIds.has(itemId);

    const image = getItemImage(
      item,
      activeTab
    );

    const title = getItemTitle(
      item,
      activeTab
    );

    const location =
      getItemLocation(item);

    const ratingValue = toNumber(
      item.rating ??
        item.average_rating
    );

    const rating =
      ratingValue > 0
        ? ratingValue.toFixed(1)
        : "New";

    const price = getItemPrice(
      item,
      activeTab
    );

    const reviewCount = toNumber(
      item.reviews_count
    );

    return (
   <Pressable
  style={({ pressed }) => [
    styles.card,
    pressed && styles.cardPressed,
  ]}
  onPress={() => openDetails(item)}
>
      
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri: image,
            }}
            style={styles.image}
            resizeMode="cover"
          />

          <View
            style={styles.imageOverlay}
          />

          <View style={styles.badge}>
            <Text
              style={styles.badgeText}
              numberOfLines={1}
            >
              {activeTab === "Stay"
                ? item.category ||
                  item.property_type ||
                  "Guest favourite"
                : item.package_type ||
                  item.category ||
                  "Curated trip"}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              saved
                ? "Saved to wishlist"
                : "Add to wishlist"
            }
            style={({ pressed }) => [
              styles.heartButton,
              pressed &&
                styles.heartButtonPressed,
            ]}
            onPress={(event) => {
              event.stopPropagation();

              toggleWishlist(item);
            }}
          >
            {savingId === itemId ? (
              <ActivityIndicator
                size="small"
                color={THEME}
              />
            ) : (
              <Heart
                size={20}
                color={
                  saved
                    ? THEME
                    : TEXT
                }
                fill={
                  saved
                    ? THEME
                    : "transparent"
                }
                strokeWidth={2.2}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={1}
              style={styles.cardTitle}
            >
              {title}
            </Text>

            <View
              style={styles.ratingWrap}
            >
              <Star
                size={13}
                color="#717171"
                fill={
                  rating === "New"
                    ? "transparent"
                    : "#717171"
                }
                strokeWidth={1.8}
              />

              <Text
                style={
                  styles.ratingText
                }
              >
                {rating}
              </Text>

              {reviewCount > 0 ? (
                <Text
                  style={
                    styles.reviewCount
                  }
                >
                  ({reviewCount})
                </Text>
              ) : null}
            </View>
          </View>

          <View
            style={styles.locationRow}
          >
            <MapPin
              size={14}
              color="#717171"
            />

            <Text
              numberOfLines={1}
              style={styles.location}
            >
              {location}
            </Text>
          </View>

          <Text
            numberOfLines={1}
            style={styles.details}
          >
            {activeTab === "Stay"
              ? `${getItemGuestCapacity(
                  item
                )} guests · ${toNumber(
                  item.bedrooms || 1
                )} bedroom${
                  toNumber(
                    item.bedrooms || 1
                  ) > 1
                    ? "s"
                    : ""
                } · ${toNumber(
                  item.bathrooms || 1
                )} bath${
                  toNumber(
                    item.bathrooms || 1
                  ) > 1
                    ? "s"
                    : ""
                }`
              : `${toNumber(
                  item.package_days ??
                    item.days ??
                    1
                )} days · ${toNumber(
                  item.package_nights ??
                    item.nights ??
                    0
                )} nights`}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {formatCurrency(price)}
            </Text>

            <Text
              style={
                styles.priceSuffix
              }
            >
              {activeTab === "Stay"
                ? " / night"
                : " / person"}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={THEME}
            colors={[THEME]}
          />
        }
      >
        <View
          style={[
            styles.topSpacer,
            {
              height: Math.max(
                8,
                insets.top > 0 ? 8 : 16
              ),
            },
          ]}
        />

        <View style={styles.searchContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open search"
            onPress={() => openSearch("destination")}
            style={({ pressed }) => [
              styles.airbnbSearchBar,
              pressed && styles.searchBarPressed,
            ]}
          >
            <Search
              size={22}
              color="#717171"
              strokeWidth={2}
            />

            <Text
              numberOfLines={1}
              style={styles.searchOnlyText}
            >
              Search and go
            </Text>
          </Pressable>
        </View>

        {hasActiveSearch ? (
          <View style={styles.activeSearchRow}>
            <Text style={styles.activeSearchText}>
              {filteredItems.length}{" "}
              {filteredItems.length === 1 ? "result" : "results"} found
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={clearAppliedSearch}
              hitSlop={8}
            >
              <Text style={styles.clearSearchText}>
                Clear search
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.segmentWrap}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.name;

            return (
              <Pressable
                key={tab.name}
                onPress={() => changeTab(tab.name)}
                style={({ pressed }) => [
                  styles.segmentButton,
                  active && styles.segmentButtonActive,
                  pressed && styles.segmentButtonPressed,
                ]}
              >
                <Icon
                  size={19}
                  color={active ? THEME : MUTED}
                  strokeWidth={active ? 2.4 : 2}
                />

                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                >
                  {tab.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleContent}>
              <Text style={styles.sectionTitle}>
                {hasActiveSearch
                  ? "Search results"
                  : activeTab === "Stay"
                    ? "Popular stays"
                    : "Popular trips"}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {hasActiveSearch
                  ? `Showing ${filteredItems.length} matching ${
                      activeTab === "Stay" ? "stays" : "trips"
                    }`
                  : activeTab === "Stay"
                    ? "Handpicked places for a comfortable stay"
                    : "Curated journeys for memorable experiences"}
              </Text>
            </View>

            {!loading && filteredItems.length > 0 ? (
              <Text style={styles.resultCount}>
                {filteredItems.length}
              </Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <HorizontalListingSkeleton />
        ) : filteredItems.length > 0 ? (
          <FlatList
            horizontal
            data={filteredItems}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderListing}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={() => (
              <View style={styles.horizontalSeparator} />
            )}
            snapToInterval={254}
            decelerationRate="fast"
            snapToAlignment="start"
            removeClippedSubviews
            initialNumToRender={4}
            maxToRenderPerBatch={5}
            windowSize={5}
          />
        ) : (
          <EmptyState
            activeTab={activeTab}
            hasSearch={hasActiveSearch}
            onClear={clearAppliedSearch}
            onRetry={() => loadData()}
          />
        )}

        {!loading && filteredItems.length > 0 ? (
          <View style={styles.browseHint}>
            <Text style={styles.browseHintText}>
              Swipe to explore more
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={searchModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSearch}
      >
        <SafeAreaView
          style={styles.modalSafe}
          edges={["top", "bottom", "left", "right"]}
        >
          <StatusBar
            barStyle="dark-content"
            backgroundColor="#ffffff"
          />

          <View
            style={styles.modalHeader}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close search"
              onPress={closeSearch}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed &&
                  styles.modalCloseButtonPressed,
              ]}
            >
              <ChevronLeft
                size={24}
                color={TEXT}
                strokeWidth={2}
              />
            </Pressable>

            <Text
              style={
                styles.modalHeaderTitle
              }
            >
              Search
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={clearDraftSearch}
              hitSlop={8}
            >
              <Text
                style={
                  styles.modalClearText
                }
              >
                Clear
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScreen}
            contentContainerStyle={
              styles.modalContent
            }
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
          >
            <SearchSectionCard
              title="Where"
              summary={
                draftSearch.destination ||
                "Search destination"
              }
              active={
                searchStep ===
                "destination"
              }
              onPress={() =>
                setSearchStep(
                  "destination"
                )
              }
            >
              {searchStep ===
              "destination" ? (
                <View
                  style={
                    styles.destinationInputContainer
                  }
                >
                  <Search
                    size={20}
                    color={MUTED}
                    strokeWidth={1.9}
                  />

                  <TextInput
                    value={
                      draftSearch.destination
                    }
                    onChangeText={(
                      value
                    ) =>
                      setDraftSearch(
                        (current) => ({
                          ...current,
                          destination:
                            value,
                        })
                      )
                    }
                    placeholder={
                      activeTab === "Stay"
                        ? "Search cities, resorts or stays"
                        : "Search destinations or trips"
                    }
                    placeholderTextColor="#9aa3b1"
                    autoFocus
                    returnKeyType="next"
                    style={
                      styles.destinationInput
                    }
                    onSubmitEditing={() =>
                      setSearchStep(
                        "dates"
                      )
                    }
                  />
                </View>
              ) : null}
            </SearchSectionCard>

            <SearchSectionCard
              title="When"
              summary={
                draftSearch.checkin &&
                draftSearch.checkout
                  ? `${formatShortDate(
                      draftSearch.checkin
                    )} – ${formatShortDate(
                      draftSearch.checkout
                    )}`
                  : "Add dates"
              }
              active={
                searchStep === "dates"
              }
              onPress={() =>
                setSearchStep("dates")
              }
            >
              {searchStep === "dates" ? (
                <View>
                  <View
                    style={
                      styles.dateSelectionSummary
                    }
                  >
                    <View
                      style={
                        styles.dateSelectionItem
                      }
                    >
                      <Text
                        style={
                          styles.dateSelectionLabel
                        }
                      >
                        CHECK-IN
                      </Text>

                      <Text
                        style={
                          styles.dateSelectionValue
                        }
                      >
                        {formatFullDate(
                          draftSearch.checkin
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.dateSelectionDivider
                      }
                    />

                    <View
                      style={
                        styles.dateSelectionItem
                      }
                    >
                      <Text
                        style={
                          styles.dateSelectionLabel
                        }
                      >
                        CHECKOUT
                      </Text>

                      <Text
                        style={
                          styles.dateSelectionValue
                        }
                      >
                        {formatFullDate(
                          draftSearch.checkout
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.calendarHeader
                    }
                  >
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        moveMonth(-1)
                      }
                      style={({ pressed }) => [
                        styles.calendarArrow,
                        pressed &&
                          styles.calendarArrowPressed,
                      ]}
                    >
                      <ChevronLeft
                        size={20}
                        color={TEXT}
                      />
                    </Pressable>

                    <Text
                      style={
                        styles.calendarMonth
                      }
                    >
                      {formatMonth(
                        visibleMonth
                      )}
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        moveMonth(1)
                      }
                      style={({ pressed }) => [
                        styles.calendarArrow,
                        pressed &&
                          styles.calendarArrowPressed,
                      ]}
                    >
                      <ChevronRight
                        size={20}
                        color={TEXT}
                      />
                    </Pressable>
                  </View>

                  <View
                    style={
                      styles.weekHeader
                    }
                  >
                    {WEEK_DAYS.map(
                      (day, index) => (
                        <View
                          key={`${day}-${index}`}
                          style={
                            styles.weekDayCell
                          }
                        >
                          <Text
                            style={
                              styles.weekDayText
                            }
                          >
                            {day}
                          </Text>
                        </View>
                      )
                    )}
                  </View>

                  <View
                    style={
                      styles.calendarGrid
                    }
                  >
                    {calendarDays.map(
                      (calendarDay) => {
                        const today =
                          normalizeDate(
                            new Date()
                          );

                        const disabled =
                          normalizeDate(
                            calendarDay.date
                          ).getTime() <
                          today.getTime();

                        const selected =
                          isDateSelected(
                            calendarDay.date
                          );

                        const inRange =
                          isDateInRange(
                            calendarDay.date
                          );

                        return (
                          <Pressable
                            key={
                              calendarDay.key
                            }
                            disabled={
                              disabled
                            }
                            onPress={() =>
                              selectDate(
                                calendarDay.date
                              )
                            }
                            style={({ pressed }) => [
                              styles.calendarDay,
                              inRange &&
                                styles.calendarDayInRange,
                              selected &&
                                styles.calendarDaySelected,
                              pressed &&
                                !disabled &&
                                styles.calendarDayPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                !calendarDay.currentMonth &&
                                  styles.calendarDayOtherMonth,
                                disabled &&
                                  styles.calendarDayDisabled,
                                selected &&
                                  styles.calendarDaySelectedText,
                              ]}
                            >
                              {
                                calendarDay.dayNumber
                              }
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </View>
                </View>
              ) : null}
            </SearchSectionCard>

            <SearchSectionCard
              title="Who"
              summary={`${
                draftSearch.guests
              } ${
                draftSearch.guests ===
                1
                  ? "guest"
                  : "guests"
              }`}
              active={
                searchStep === "guests"
              }
              onPress={() =>
                setSearchStep("guests")
              }
            >
              {searchStep === "guests" ? (
                <View
                  style={styles.guestRow}
                >
                  <View
                    style={
                      styles.guestInfo
                    }
                  >
                    <Text
                      style={
                        styles.guestTitle
                      }
                    >
                      Guests
                    </Text>

                    <Text
                      style={
                        styles.guestSubtitle
                      }
                    >
                      {activeTab === "Stay"
                        ? "Adults and children"
                        : "Number of travelers"}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.stepper
                    }
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        draftSearch.guests <=
                        1
                      }
                      onPress={() =>
                        setDraftSearch(
                          (current) => ({
                            ...current,
                            guests:
                              Math.max(
                                1,
                                current.guests -
                                  1
                              ),
                          })
                        )
                      }
                      style={({ pressed }) => [
                        styles.stepperButton,
                        draftSearch.guests <=
                          1 &&
                          styles.stepperButtonDisabled,
                        pressed &&
                          styles.stepperButtonPressed,
                      ]}
                    >
                      <Text
                        style={
                          styles.stepperSymbol
                        }
                      >
                        −
                      </Text>
                    </Pressable>

                    <Text
                      style={
                        styles.stepperValue
                      }
                    >
                      {
                        draftSearch.guests
                      }
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        setDraftSearch(
                          (current) => ({
                            ...current,
                            guests:
                              current.guests +
                              1,
                          })
                        )
                      }
                      style={({ pressed }) => [
                        styles.stepperButton,
                        pressed &&
                          styles.stepperButtonPressed,
                      ]}
                    >
                      <Text
                        style={
                          styles.stepperSymbol
                        }
                      >
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </SearchSectionCard>

            <SearchSectionCard
              title="Price"
              summary={
                draftSearch.minimumPrice ||
                draftSearch.maximumPrice
                  ? `${draftSearch.minimumPrice ? `₹${draftSearch.minimumPrice}` : "Any"} – ${draftSearch.maximumPrice ? `₹${draftSearch.maximumPrice}` : "Any"}`
                  : "Any price"
              }
              active={
                searchStep === "filters"
              }
              onPress={() =>
                setSearchStep("filters")
              }
            >
              {searchStep ===
              "filters" ? (
                <View>
                  <Text
                    style={
                      styles.priceFilterTitle
                    }
                  >
                    Price range
                  </Text>

                  <Text
                    style={
                      styles.priceFilterSubtitle
                    }
                  >
                    {activeTab === "Stay"
                      ? "Price per night"
                      : "Price per person"}
                  </Text>

                  <View
                    style={
                      styles.priceInputsRow
                    }
                  >
                    <View
                      style={
                        styles.priceInputWrapper
                      }
                    >
                      <Text
                        style={
                          styles.priceInputLabel
                        }
                      >
                        MINIMUM
                      </Text>

                      <View
                        style={
                          styles.priceInputContainer
                        }
                      >
                        <Text
                          style={
                            styles.currencyPrefix
                          }
                        >
                          ₹
                        </Text>

                        <TextInput
                          value={
                            draftSearch.minimumPrice
                          }
                          onChangeText={(
                            value
                          ) =>
                            setDraftSearch(
                              (
                                current
                              ) => ({
                                ...current,
                                minimumPrice:
                                  value.replace(
                                    /[^0-9]/g,
                                    ""
                                  ),
                              })
                            )
                          }
                          placeholder="0"
                          placeholderTextColor="#9aa3b1"
                          keyboardType="number-pad"
                          style={
                            styles.priceInput
                          }
                        />
                      </View>
                    </View>

                    <View
                      style={
                        styles.priceRangeDash
                      }
                    />

                    <View
                      style={
                        styles.priceInputWrapper
                      }
                    >
                      <Text
                        style={
                          styles.priceInputLabel
                        }
                      >
                        MAXIMUM
                      </Text>

                      <View
                        style={
                          styles.priceInputContainer
                        }
                      >
                        <Text
                          style={
                            styles.currencyPrefix
                          }
                        >
                          ₹
                        </Text>

                        <TextInput
                          value={
                            draftSearch.maximumPrice
                          }
                          onChangeText={(
                            value
                          ) =>
                            setDraftSearch(
                              (
                                current
                              ) => ({
                                ...current,
                                maximumPrice:
                                  value.replace(
                                    /[^0-9]/g,
                                    ""
                                  ),
                              })
                            )
                          }
                          placeholder="Any"
                          placeholderTextColor="#9aa3b1"
                          keyboardType="number-pad"
                          style={
                            styles.priceInput
                          }
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}
            </SearchSectionCard>
          </ScrollView>

          <View
            style={styles.modalFooter}
          >
            <Pressable
              accessibilityRole="button"
              onPress={clearDraftSearch}
            >
              <Text
                style={
                  styles.footerClearText
                }
              >
                Clear all
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={applySearch}
              style={({ pressed }) => [
                styles.applyButton,
                pressed &&
                  styles.applyButtonPressed,
              ]}
            >
              <Search
                size={18}
                color="#ffffff"
                strokeWidth={2.2}
              />

              <Text
                style={
                  styles.applyButtonText
                }
              >
                Search
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

type SearchSectionCardProps = {
  title: string;
  summary: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

function SearchSectionCard({
  title,
  summary,
  active,
  onPress,
  children,
}: SearchSectionCardProps) {
  return (
    <View
      style={[
        styles.searchSectionCard,
        active &&
          styles.searchSectionCardActive,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.searchSectionHeader}
      >
        <Text
          style={styles.searchSectionTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.searchSectionSummary
          }
          numberOfLines={1}
        >
          {summary}
        </Text>
      </Pressable>

      {active ? (
        <View
          style={styles.searchSectionBody}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

function HorizontalListingSkeleton() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalList}
    >
      {[1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.horizontalSkeletonCard,
            item < 3 && styles.horizontalSkeletonSpacing,
          ]}
        >
          <View style={styles.horizontalSkeletonImage} />
          <View style={styles.horizontalSkeletonTitle} />
          <View style={styles.horizontalSkeletonText} />
          <View style={styles.horizontalSkeletonPrice} />
        </View>
      ))}
    </ScrollView>
  );
}

function EmptyState({
  activeTab,
  hasSearch,
  onClear,
  onRetry,
}: {
  activeTab: HomeTab;
  hasSearch: boolean;
  onClear: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {activeTab === "Stay" ? (
          <Building2
            size={28}
            color={THEME}
          />
        ) : (
          <PlaneTakeoff
            size={28}
            color={THEME}
          />
        )}
      </View>

      <Text style={styles.emptyTitle}>
        {hasSearch
          ? "No matching results"
          : `No ${
              activeTab === "Stay"
                ? "stays"
                : "trips"
            } available`}
      </Text>

      <Text style={styles.emptyText}>
        {hasSearch
          ? "Try another destination, change your dates, guests or price range."
          : "New listings will appear here when they are published."}
      </Text>

      <Pressable
        style={styles.emptyButton}
        onPress={
          hasSearch
            ? onClear
            : onRetry
        }
      >
        <Text
          style={
            styles.emptyButtonText
          }
        >
          {hasSearch
            ? "Clear search"
            : "Try again"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  list: {
    paddingTop: 0,
    paddingBottom: 118,
  },

  topSpacer: {
    height: 12,
  },

  searchContainer: {
    marginHorizontal: 18,
    marginBottom: 18,
  },

  airbnbSearchBar: {
    height: 56,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#e7e7e7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 3,
  },

  searchBarPressed: {
    opacity: 0.86,
  },

  searchOnlyText: {
    flex: 1,
    marginLeft: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  activeSearchRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 22,
    marginBottom: 6,
  },

  activeSearchText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  clearSearchText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
    textDecorationLine: "underline",
  },

  segmentWrap: {
    marginHorizontal: 18,
    borderRadius: 17,
    backgroundColor: "#f1f3f4",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },

  segmentButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  segmentButtonActive: {
    backgroundColor: "#ffffff",
    elevation: 1,
  },

  segmentButtonPressed: {
    opacity: 0.8,
  },

  segmentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: MUTED,
  },

  segmentTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: THEME,
  },

  sectionHeader: {
    marginTop: 26,
    marginBottom: 14,
    paddingHorizontal: 18,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  sectionTitleContent: {
    flex: 1,
    paddingRight: 12,
  },

  sectionTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    color: TEXT,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  resultCount: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    paddingBottom: 2,
  },

  horizontalList: {
    paddingLeft: 18,
    paddingRight: 18,
  },

  horizontalSeparator: {
    width: 12,
  },

  card: {
    width: 242,
    backgroundColor: "#ffffff",
    borderRadius: 17,
  },

  cardPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  imageWrap: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    height: 176,
    borderRadius: 17,
    backgroundColor: "#f1f3f4",
  },

  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f3f4",
  },

  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 42,
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  badge: {
    position: "absolute",
    left: 9,
    top: 9,
    maxWidth: "58%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: TEXT,
  },

  heartButton: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  heartButtonPressed: {
    transform: [
      {
        scale: 0.9,
      },
    ],
  },

  cardContent: {
    paddingTop: 10,
    paddingHorizontal: 1,
    paddingBottom: 5,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },

  cardTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 19,
    color: TEXT,
  },

  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingTop: 1,
  },

  ratingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#717171",
  },

  reviewCount: {
    display: "none",
  },

  locationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  location: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  details: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#80868b",
  },

  priceRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
  },

  price: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: TEXT,
  },

  priceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  browseHint: {
    paddingHorizontal: 18,
    marginTop: 13,
  },

  browseHintText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },

  modalSafe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  modalHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  modalCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseButtonPressed: {
    backgroundColor: SURFACE,
  },

  modalHeaderTitle: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  modalClearText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: THEME,
    textDecorationLine: "underline",
  },

  modalScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    paddingBottom: 40,
  },

  searchSectionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
  },

  searchSectionCardActive: {
    borderColor: THEME,
    elevation: 2,
  },

  searchSectionHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  searchSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: MUTED,
  },

  searchSectionSummary: {
    flex: 1,
    marginLeft: 20,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
    textAlign: "right",
  },

  searchSectionBody: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 16,
  },

  destinationInputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  destinationInput: {
    flex: 1,
    minHeight: 52,
    marginLeft: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },

  dateSelectionSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },

  dateSelectionItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },

  dateSelectionDivider: {
    width: 1,
    height: 35,
    backgroundColor: BORDER,
  },

  dateSelectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
    color: MUTED,
  },

  dateSelectionValue: {
    marginTop: 5,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  calendarHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  calendarArrowPressed: {
    backgroundColor: SURFACE,
  },

  calendarMonth: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  weekHeader: {
    flexDirection: "row",
    marginTop: 7,
  },

  weekDayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 8,
  },

  weekDayText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: MUTED,
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },

  calendarDayInRange: {
    backgroundColor: THEME_LIGHT,
    borderRadius: 0,
  },

  calendarDaySelected: {
    backgroundColor: THEME,
    borderRadius: 999,
  },

  calendarDayPressed: {
    opacity: 0.72,
  },

  calendarDayText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  calendarDayOtherMonth: {
    color: "#b7bdc6",
  },

  calendarDayDisabled: {
    color: "#d4d8de",
  },

  calendarDaySelectedText: {
    color: "#ffffff",
  },

  guestRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  guestInfo: {
    flex: 1,
  },

  guestTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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
    gap: 14,
  },

  stepperButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: MUTED,
    alignItems: "center",
    justifyContent: "center",
  },

  stepperButtonDisabled: {
    borderColor: "#d6d9de",
  },

  stepperButtonPressed: {
    backgroundColor: SURFACE,
  },

  stepperSymbol: {
    fontFamily: "Inter_500Medium",
    fontSize: 21,
    color: TEXT,
    lineHeight: 22,
  },

  stepperValue: {
    minWidth: 20,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
    textAlign: "center",
  },

  priceFilterTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  priceFilterSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  priceInputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
  },

  priceInputWrapper: {
    flex: 1,
  },

  priceInputLabel: {
    marginBottom: 7,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    color: MUTED,
  },

  priceInputContainer: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 13,
    paddingHorizontal: 13,
  },

  currencyPrefix: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  priceInput: {
    flex: 1,
    minHeight: 50,
    marginLeft: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },

  priceRangeDash: {
    width: 18,
    height: 1,
    backgroundColor: MUTED,
    marginHorizontal: 8,
    marginBottom: 25,
  },

  modalFooter: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  footerClearText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
    textDecorationLine: "underline",
  },

  applyButton: {
    minWidth: 132,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },

  applyButtonPressed: {
    opacity: 0.8,
  },

  applyButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#ffffff",
  },

  horizontalSkeletonCard: {
    width: 242,
  },

  horizontalSkeletonSpacing: {
    marginRight: 12,
  },

  horizontalSkeletonImage: {
    width: 242,
    height: 176,
    borderRadius: 17,
    backgroundColor: "#eceff1",
  },

  horizontalSkeletonTitle: {
    width: "70%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#eceff1",
    marginTop: 11,
  },

  horizontalSkeletonText: {
    width: "52%",
    height: 11,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
    marginTop: 8,
  },

  horizontalSkeletonPrice: {
    width: "36%",
    height: 13,
    borderRadius: 7,
    backgroundColor: "#eceff1",
    marginTop: 8,
  },

  emptyState: {
    flex: 1,
    minHeight: 330,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },

  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
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
    maxWidth: 290,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 20,
    minWidth: 130,
    height: 48,
    borderRadius: 15,
    backgroundColor: THEME,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#ffffff",
  },
});