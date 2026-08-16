import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
    Building2,
    ChevronRight,
    FileText,
    Home,
    MapPin,
    MoreVertical,
    Plus,
    RefreshCw,
    Search,
    Star,
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
    Modal,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

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

const FALLBACK_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80";

const FALLBACK_TRIP_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

type ListingTab = "Stays" | "Trip packages";
type ListingFilter = "All" | "Active" | "Pending" | "Suspended";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type StayListing = {
  id: number | string;
  title?: string;
  name?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;

  status?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  property_image?: string;
  images?: unknown;

  price?: number | string;
  weekday_price?: number | string;
  weekend_price?: number | string;

  rating?: number | string;
  average_rating?: number | string;
  reviews?: number | string;
  review_count?: number | string;
  bookings?: number | string;
  booking_count?: number | string;
};

type TripListing = {
  id: number | string;
  title?: string;
  name?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;

  status?: string;

  image?: string;
  image_url?: string;
  cover_image?: string;
  images?: unknown;

  price?: number | string;
  rating?: number | string;
  average_rating?: number | string;
  reviews?: number | string;
  review_count?: number | string;
  bookings?: number | string;
  booking_count?: number | string;

  package_days?: number | string;
  package_nights?: number | string;
};

type ListingItem =
  | {
      kind: "stay";
      data: StayListing;
    }
  | {
      kind: "trip";
      data: TripListing;
    };

const FILTERS: ListingFilter[] = [
  "All",
  "Active",
  "Pending",
  "Suspended",
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
    "listings",
    "properties",
    "experiences",
  ]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const getTitle = (item: StayListing | TripListing) =>
  item.title || item.name || "Untitled listing";

const getLocation = (item: StayListing | TripListing) => {
  const parts = [
    item.city,
    item.state,
    item.country,
  ].filter(Boolean);

  return (
    parts.join(", ") ||
    item.location ||
    "Location not specified"
  );
};

const getStatusCategory = (
  status?: string
): ListingFilter => {
  const normalized = normalizeStatus(status);

  if (
    ["active", "published", "approved"].includes(
      normalized
    )
  ) {
    return "Active";
  }

  if (
    [
      "suspended",
      "paused",
      "inactive",
      "rejected",
    ].includes(normalized)
  ) {
    return "Suspended";
  }

  return "Pending";
};

const getStatusTheme = (status?: string) => {
  const category = getStatusCategory(status);

  if (category === "Active") {
    return {
      label: status || "Active",
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (category === "Suspended") {
    return {
      label: status || "Suspended",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: status || "Pending",
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

const getStayImage = (item: StayListing) =>
  normalizeImageUrl(
    item.cover_image ||
      item.image ||
      item.image_url ||
      item.property_image
  ) ||
  imageFromUnknown(item.images) ||
  FALLBACK_STAY_IMAGE;

const getTripImage = (item: TripListing) =>
  normalizeImageUrl(
    item.cover_image ||
      item.image ||
      item.image_url
  ) ||
  imageFromUnknown(item.images) ||
  FALLBACK_TRIP_IMAGE;

const getStayPrice = (item: StayListing) =>
  toNumber(
    item.weekday_price ??
      item.price ??
      item.weekend_price
  );

const getTripPrice = (item: TripListing) =>
  toNumber(item.price);

const getRating = (
  item: StayListing | TripListing
) =>
  toNumber(
    item.average_rating ??
      item.rating
  );

const getReviewCount = (
  item: StayListing | TripListing
) =>
  toNumber(
    item.review_count ??
      item.reviews
  );

const getBookingCount = (
  item: StayListing | TripListing
) =>
  toNumber(
    item.booking_count ??
      item.bookings
  );

export default function HostListingsScreen() {
  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [activeTab, setActiveTab] =
    useState<ListingTab>("Stays");

  const [activeFilter, setActiveFilter] =
    useState<ListingFilter>("All");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [stayListings, setStayListings] =
    useState<StayListing[]>([]);

  const [tripListings, setTripListings] =
    useState<TripListing[]>([]);

  const [selectedListing, setSelectedListing] =
    useState<ListingItem | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const loadListings = useCallback(
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
            api.get(`/my-properties/${hostId}`),

            api
              .get(`/my-experiences/${hostId}`)
              .catch(async (error: any) => {
                if (
                  error?.response?.status !== 404
                ) {
                  throw error;
                }

                return api.get(
                  `/trip-packages/host/${hostId}`
                );
              }),
          ]);

        if (
          stayResult.status === "fulfilled"
        ) {
          setStayListings(
            getArrayFromResponse<StayListing>(
              stayResult.value.data,
              ["stays"]
            )
          );
        } else {
          setStayListings([]);
        }

        if (
          tripResult.status === "fulfilled"
        ) {
          setTripListings(
            getArrayFromResponse<TripListing>(
              tripResult.value.data,
              ["trips", "packages"]
            )
          );
        } else {
          setTripListings([]);
        }

        if (
          stayResult.status === "rejected" &&
          tripResult.status === "rejected"
        ) {
          setLoadFailed(true);
        }
      } catch (error: any) {
        console.log(
          "Host listings load error:",
          error?.response?.data ||
            error?.message ||
            error
        );

        setStayListings([]);
        setTripListings([]);
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
      loadListings();
    }, [loadListings])
  );

  const currentListings = useMemo<ListingItem[]>(
    () =>
      activeTab === "Stays"
        ? stayListings.map((data) => ({
            kind: "stay" as const,
            data,
          }))
        : tripListings.map((data) => ({
            kind: "trip" as const,
            data,
          })),
    [activeTab, stayListings, tripListings]
  );

  const counts = useMemo(() => {
    const result: Record<ListingFilter, number> = {
      All: currentListings.length,
      Active: 0,
      Pending: 0,
      Suspended: 0,
    };

    currentListings.forEach((item) => {
      const category = getStatusCategory(
        item.data.status
      );

      result[category] += 1;
    });

    return result;
  }, [currentListings]);

  const filteredListings = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return currentListings.filter((item) => {
      if (
        activeFilter !== "All" &&
        getStatusCategory(item.data.status) !==
          activeFilter
      ) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        getTitle(item.data),
        getLocation(item.data),
        item.data.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    activeFilter,
    currentListings,
    searchQuery,
  ]);

  const openCreate = () => {
    router.push(
      activeTab === "Stays"
        ? "/host/stay/create"
        : "/host/trip/create"
    );
  };

  const openDetails = (item: ListingItem) => {
    if (item.kind === "stay") {
      router.push({
        pathname: "/property/[id]",
        params: {
          id: String(item.data.id),
        },
      });

      return;
    }

    router.push({
      pathname: "/experience/[id]",
      params: {
        id: String(item.data.id),
      },
    });
  };

  const openEdit = (item: ListingItem) => {
    setSelectedListing(null);

    if (item.kind === "stay") {
      router.push({
        pathname: "/host/stay/edit/[id]",
        params: {
          id: String(item.data.id),
        },
      });

      return;
    }

    router.push({
      pathname: "/host/trip/edit/[id]",
      params: {
        id: String(item.data.id),
      },
    });
  };

  const updateListingStatus = async (
    item: ListingItem
  ) => {
    const currentCategory =
      getStatusCategory(item.data.status);

    const nextStatus =
      currentCategory === "Active"
        ? "Suspended"
        : "Active";

    const itemId = String(item.data.id);

    try {
      setWorkingId(itemId);

      if (item.kind === "stay") {
        try {
          await api.put(
            `/properties/${item.data.id}/status`,
            {
              status: nextStatus,
            }
          );
        } catch (firstError: any) {
          if (
            firstError?.response?.status !== 404
          ) {
            throw firstError;
          }

          await api.put(
            `/property/${item.data.id}`,
            {
              status: nextStatus,
            }
          );
        }

        setStayListings((current) =>
          current.map((listing) =>
            String(listing.id) === itemId
              ? {
                  ...listing,
                  status: nextStatus,
                }
              : listing
          )
        );
      } else {
        try {
          await api.put(
            `/trip-packages/${item.data.id}/status`,
            {
              status: nextStatus,
            }
          );
        } catch (firstError: any) {
          if (
            firstError?.response?.status !== 404
          ) {
            throw firstError;
          }

          await api.put(
            `/trip-packages/${item.data.id}`,
            {
              status: nextStatus,
            }
          );
        }

        setTripListings((current) =>
          current.map((listing) =>
            String(listing.id) === itemId
              ? {
                  ...listing,
                  status: nextStatus,
                }
              : listing
          )
        );
      }

      setSelectedListing(null);
    } catch (error: any) {
      Alert.alert(
        "Update failed",
        error?.response?.data?.message ||
          "The listing status could not be updated."
      );
    } finally {
      setWorkingId(null);
    }
  };

  const deleteListing = async (
    item: ListingItem
  ) => {
    const itemId = String(item.data.id);

    try {
      setWorkingId(itemId);

      if (item.kind === "stay") {
        try {
          await api.delete(
            `/properties/${item.data.id}`
          );
        } catch (firstError: any) {
          if (
            firstError?.response?.status !== 404
          ) {
            throw firstError;
          }

          await api.delete(
            `/property/${item.data.id}`
          );
        }

        setStayListings((current) =>
          current.filter(
            (listing) =>
              String(listing.id) !== itemId
          )
        );
      } else {
        try {
          await api.delete(
            `/trip-packages/${item.data.id}`
          );
        } catch (firstError: any) {
          if (
            firstError?.response?.status !== 404
          ) {
            throw firstError;
          }

          await api.delete(
            `/experience/${item.data.id}`
          );
        }

        setTripListings((current) =>
          current.filter(
            (listing) =>
              String(listing.id) !== itemId
          )
        );
      }

      setSelectedListing(null);
    } catch (error: any) {
      Alert.alert(
        "Delete failed",
        error?.response?.data?.message ||
          "The listing could not be deleted."
      );
    } finally {
      setWorkingId(null);
    }
  };

  const confirmDelete = (item: ListingItem) => {
    Alert.alert(
      "Delete listing?",
      "This action cannot be undone. Existing bookings will not be removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteListing(item),
        },
      ]
    );
  };

  const renderListing = ({
    item,
  }: {
    item: ListingItem;
  }) => {
    const status = getStatusTheme(
      item.data.status
    );

    const isWorking =
      workingId === String(item.data.id);

    const rating = getRating(item.data);
    const reviewCount = getReviewCount(
      item.data
    );

    const bookingCount = getBookingCount(
      item.data
    );

    const price =
      item.kind === "stay"
        ? getStayPrice(item.data)
        : getTripPrice(item.data);

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openDetails(item)}
        style={({ pressed }) => [
          styles.listingCard,
          pressed &&
            styles.listingCardPressed,
        ]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{
              uri:
                item.kind === "stay"
                  ? getStayImage(item.data)
                  : getTripImage(item.data),
            }}
            style={styles.listingImage}
            resizeMode="cover"
          />

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: status.textColor,
                },
              ]}
            >
              {status.label}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Listing actions"
            onPress={(event) => {
              event.stopPropagation();
              setSelectedListing(item);
            }}
            style={({ pressed }) => [
              styles.moreButton,
              pressed &&
                styles.moreButtonPressed,
            ]}
          >
            {isWorking ? (
              <ActivityIndicator
                size="small"
                color={THEME}
              />
            ) : (
              <MoreVertical
                size={20}
                color={TEXT}
              />
            )}
          </Pressable>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text
                numberOfLines={1}
                style={styles.listingTitle}
              >
                {getTitle(item.data)}
              </Text>

              <View
                style={styles.locationRow}
              >
                <MapPin
                  size={13}
                  color={MUTED}
                />

                <Text
                  numberOfLines={1}
                  style={styles.locationText}
                >
                  {getLocation(item.data)}
                </Text>
              </View>
            </View>

            <ChevronRight
              size={19}
              color="#9aa0a6"
            />
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {formatCurrency(price)}
            </Text>

            <Text
              style={styles.priceSuffix}
            >
              {item.kind === "stay"
                ? " / night"
                : " / traveler"}
            </Text>
          </View>

          {item.kind === "trip" ? (
            <Text style={styles.durationText}>
              {Math.max(
                1,
                toNumber(
                  item.data.package_days
                ) || 1
              )}{" "}
              days ·{" "}
              {Math.max(
                0,
                toNumber(
                  item.data.package_nights
                ) ||
                  Math.max(
                    1,
                    toNumber(
                      item.data.package_days
                    ) || 1
                  ) -
                    1
              )}{" "}
              nights
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Star
                size={13}
                color="#717171"
                fill={
                  rating > 0
                    ? "#717171"
                    : "transparent"
                }
              />

              <Text style={styles.metaText}>
                {rating > 0
                  ? rating.toFixed(1)
                  : "New"}
              </Text>

              {reviewCount > 0 ? (
                <Text
                  style={styles.metaMuted}
                >
                  ({reviewCount})
                </Text>
              ) : null}
            </View>

            <View style={styles.metaDivider} />

            <Text style={styles.metaText}>
              {bookingCount}{" "}
              {bookingCount === 1
                ? "booking"
                : "bookings"}
            </Text>
          </View>
        </View>
      </Pressable>
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
            Loading your listings...
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

      <View style={styles.page}>
        <FlatList
          data={filteredListings}
          key={`${activeTab}-${activeFilter}`}
          keyExtractor={(item) =>
            `${item.kind}-${item.data.id}`
          }
          renderItem={renderListing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredListings.length === 0 &&
              styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() =>
                loadListings(true)
              }
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={styles.eyebrow}>
                    Hosting
                  </Text>

                  <Text style={styles.title}>
                    Listings
                  </Text>

                  <Text style={styles.subtitle}>
                    Manage your stays and trip
                    packages.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={openCreate}
                  style={({ pressed }) => [
                    styles.headerAddButton,
                    pressed &&
                      styles.headerAddButtonPressed,
                  ]}
                >
                  <Plus
                    size={21}
                    color={WHITE}
                  />
                </Pressable>
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
                      Listings could not load
                    </Text>

                    <Text
                      style={styles.errorText}
                    >
                      Check your connection and
                      try again.
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      loadListings()
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
                  title="Stays"
                  count={stayListings.length}
                  active={
                    activeTab === "Stays"
                  }
                  onPress={() => {
                    setActiveTab("Stays");
                    setActiveFilter("All");
                    setSearchQuery("");
                  }}
                />

                <TabButton
                  title="Trip packages"
                  count={tripListings.length}
                  active={
                    activeTab ===
                    "Trip packages"
                  }
                  onPress={() => {
                    setActiveTab(
                      "Trip packages"
                    );
                    setActiveFilter("All");
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
                  placeholder="Search listings"
                  placeholderTextColor="#9aa0a6"
                  style={styles.searchInput}
                />
              </View>

              <FlatList
                horizontal
                data={FILTERS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.filterRow
                }
                renderItem={({ item }) => {
                  const active =
                    activeFilter === item;

                  return (
                    <Pressable
                      onPress={() =>
                        setActiveFilter(item)
                      }
                      style={[
                        styles.filterChip,
                        active &&
                          styles.filterChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {item}
                      </Text>

                      <View
                        style={[
                          styles.filterCount,
                          active &&
                            styles.filterCountActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterCountText,
                            active &&
                              styles.filterCountTextActive,
                          ]}
                        >
                          {counts[item]}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />

              <Text style={styles.resultText}>
                {filteredListings.length}{" "}
                {filteredListings.length === 1
                  ? "listing"
                  : "listings"}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                {activeTab === "Stays" ? (
                  <Home
                    size={31}
                    color={THEME}
                  />
                ) : (
                  <Building2
                    size={31}
                    color={THEME}
                  />
                )}
              </View>

              <Text style={styles.emptyTitle}>
                No listings found
              </Text>

              <Text style={styles.emptyText}>
                {searchQuery ||
                activeFilter !== "All"
                  ? "Try another search or filter."
                  : `Create your first ${
                      activeTab === "Stays"
                        ? "stay"
                        : "trip package"
                    } listing.`}
              </Text>

              <Pressable
                onPress={openCreate}
                style={styles.primaryButton}
              >
                <Plus
                  size={18}
                  color={WHITE}
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Add listing
                </Text>
              </Pressable>
            </View>
          }
        />

        <Pressable
          accessibilityRole="button"
          onPress={openCreate}
          style={({ pressed }) => [
            styles.floatingButton,
            pressed &&
              styles.floatingButtonPressed,
          ]}
        >
          <Plus
            size={20}
            color={WHITE}
          />

          <Text
            style={styles.floatingButtonText}
          >
            Add listing
          </Text>
        </Pressable>

        <Modal
          visible={Boolean(selectedListing)}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setSelectedListing(null)
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setSelectedListing(null)
            }
          >
            <Pressable
              style={styles.actionSheet}
              onPress={(event) =>
                event.stopPropagation()
              }
            >
              <View
                style={styles.sheetHandle}
              />

              <Text style={styles.sheetTitle}>
                {selectedListing
                  ? getTitle(
                      selectedListing.data
                    )
                  : "Listing actions"}
              </Text>

              {selectedListing ? (
                <>
                  <ActionRow
                    icon={
                      <FileText
                        size={20}
                        color={TEXT}
                      />
                    }
                    title="Edit listing"
                    onPress={() =>
                      openEdit(
                        selectedListing
                      )
                    }
                  />

                  <ActionRow
                    icon={
                      getStatusCategory(
                        selectedListing.data
                          .status
                      ) === "Active" ? (
                        <RefreshCw
                          size={20}
                          color={TEXT}
                        />
                      ) : (
                        <CheckCircleIcon />
                      )
                    }
                    title={
                      getStatusCategory(
                        selectedListing.data
                          .status
                      ) === "Active"
                        ? "Pause listing"
                        : "Activate listing"
                    }
                    onPress={() =>
                      updateListingStatus(
                        selectedListing
                      )
                    }
                  />

                  <ActionRow
                    icon={
                      <Building2
                        size={20}
                        color={DANGER}
                      />
                    }
                    title="Delete listing"
                    danger
                    last
                    onPress={() =>
                      confirmDelete(
                        selectedListing
                      )
                    }
                  />
                </>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

function CheckCircleIcon() {
  return (
    <View style={styles.activateIcon}>
      <View style={styles.activateIconInner} />
    </View>
  );
}

function TabButton({
  title,
  count,
  active,
  onPress,
}: {
  title: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
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
        {title}
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

function ActionRow({
  icon,
  title,
  onPress,
  danger = false,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        last && styles.actionRowLast,
        pressed && styles.actionRowPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        {icon}
      </View>

      <Text
        style={[
          styles.actionText,
          danger && styles.actionTextDanger,
        ]}
      >
        {title}
      </Text>

      <ChevronRight
        size={18}
        color={danger ? DANGER : "#9aa0a6"}
      />
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
    backgroundColor: WHITE,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 126,
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
    flexDirection: "row",
    alignItems: "flex-start",
  },

  headerText: {
    flex: 1,
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
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  headerAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  headerAddButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.96 }],
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

  filterRow: {
    paddingTop: 13,
    paddingBottom: 3,
    gap: 8,
  },

  filterChip: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 19,
    backgroundColor: WHITE,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  filterChipActive: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  filterChipTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: THEME,
  },

  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountActive: {
    backgroundColor: WHITE,
  },

  filterCountText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: MUTED,
  },

  filterCountTextActive: {
    color: THEME,
  },

  resultText: {
    marginTop: 15,
    marginBottom: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  listingCard: {
    marginBottom: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: WHITE,
  },

  listingCardPressed: {
    opacity: 0.93,
  },

  imageWrap: {
    position: "relative",
  },

  listingImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#f1f3f4",
  },

  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },

  moreButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },

  moreButtonPressed: {
    transform: [{ scale: 0.94 }],
  },

  cardContent: {
    padding: 15,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  titleContent: {
    flex: 1,
  },

  listingTitle: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
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
    fontSize: 11,
    color: MUTED,
  },

  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "baseline",
  },

  priceText: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  priceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  durationText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  metaRow: {
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: TEXT,
  },

  metaMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: MUTED,
  },

  metaDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 12,
    backgroundColor: BORDER,
  },

  emptyState: {
    flex: 1,
    minHeight: 400,
    paddingHorizontal: 24,
    paddingBottom: 70,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 72,
    height: 72,
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
  },

  emptyText: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    minHeight: 48,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  floatingButton: {
    position: "absolute",
    right: 18,
    bottom: 24,
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    elevation: 5,
  },

  floatingButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.97 }],
  },

  floatingButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: WHITE,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      "rgba(32,33,36,0.38)",
    justifyContent: "flex-end",
  },

  actionSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: WHITE,
    paddingTop: 9,
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d5d9df",
    alignSelf: "center",
  },

  sheetTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  actionRow: {
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
  },

  actionRowLast: {
    borderBottomWidth: 0,
  },

  actionRowPressed: {
    backgroundColor: SURFACE,
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  actionTextDanger: {
    color: DANGER,
  },

  activateIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: SUCCESS,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  activateIconInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SUCCESS,
  },
});