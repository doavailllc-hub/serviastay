import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Building2,
    ChevronLeft,
    FileText,
    Home,
    User,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import api from "../../../../api/api";
import { getStoredUser } from "../../../../services/authService";

const THEME = "#2DB281";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";
const DANGER = "#c43f3f";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type TripItem = {
  id: number | string;
  host_id?: number | string;
  user_id?: number | string;

  title?: string;
  name?: string;
  trip_name?: string;
  package_name?: string;
  description?: string;

  destination?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;

  package_days?: number | string;
  package_nights?: number | string;
  days?: number | string;
  nights?: number | string;

  price?: number | string;
  package_price?: number | string;
  adult_price?: number | string;
  child_price?: number | string;

  max_guests?: number | string;
  travelers?: number | string;
  min_guests?: number | string;

  pickup_location?: string;
  pickup_point?: string;
  pickup_details?: string;
  meeting_point?: string;

  itinerary?: unknown;
  inclusions?: unknown;
  includes?: unknown;
  exclusions?: unknown;
  excludes?: unknown;

  instant_book?: boolean | number | string;
  status?: string;
};

type TripForm = {
  title: string;
  description: string;

  destination: string;
  city: string;
  state: string;
  country: string;

  days: string;
  nights: string;

  adultPrice: string;
  childPrice: string;

  minimumGuests: string;
  maximumGuests: string;

  pickupLocation: string;
  pickupDetails: string;

  itinerary: string;
  inclusions: string;
  exclusions: string;

  instantBook: boolean;
};

const INITIAL_FORM: TripForm = {
  title: "",
  description: "",

  destination: "",
  city: "",
  state: "",
  country: "",

  days: "1",
  nights: "0",

  adultPrice: "",
  childPrice: "",

  minimumGuests: "1",
  maximumGuests: "10",

  pickupLocation: "",
  pickupDetails: "",

  itinerary: "",
  inclusions: "",
  exclusions: "",

  instantBook: false,
};

const getArrayFromResponse = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;

  const possibleKeys = [
    "data",
    "items",
    "results",
    "experiences",
    "trips",
    "packages",
  ];

  for (const key of possibleKeys) {
    const value = objectPayload[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const toText = (value: unknown, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "enabled"
  );
};

const getTripTitle = (trip: TripItem) =>
  trip.title ||
  trip.trip_name ||
  trip.package_name ||
  trip.name ||
  `Trip package #${trip.id}`;

const unknownValueToLines = (value: unknown): string => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    try {
      const parsed = JSON.parse(trimmed);
      return unknownValueToLines(parsed);
    } catch {
      return trimmed;
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item).trim();
        }

        if (item && typeof item === "object") {
          const objectItem = item as Record<string, unknown>;

          const possibleFields = [
            "title",
            "name",
            "description",
            "activity",
            "text",
            "value",
          ];

          for (const field of possibleFields) {
            const fieldValue = objectItem[field];

            if (
              typeof fieldValue === "string" ||
              typeof fieldValue === "number"
            ) {
              return String(fieldValue).trim();
            }
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => unknownValueToLines(item))
      .filter(Boolean)
      .join("\n");
  }

  return String(value);
};

const linesToArray = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

const mapTripToForm = (trip: TripItem): TripForm => {
  const days = toText(trip.package_days ?? trip.days, "1");

  const calculatedNights = Math.max(Number(days || 1) - 1, 0);

  return {
    title: toText(
      trip.title || trip.trip_name || trip.package_name || trip.name
    ),

    description: toText(trip.description),

    destination: toText(trip.destination || trip.location),
    city: toText(trip.city),
    state: toText(trip.state),
    country: toText(trip.country),

    days,
    nights: toText(
      trip.package_nights ?? trip.nights,
      String(calculatedNights)
    ),

    adultPrice: toText(
      trip.adult_price ?? trip.package_price ?? trip.price
    ),

    childPrice: toText(trip.child_price),

    minimumGuests: toText(trip.min_guests, "1"),

    maximumGuests: toText(
      trip.max_guests ?? trip.travelers,
      "10"
    ),

    pickupLocation: toText(
      trip.pickup_location ||
        trip.pickup_point ||
        trip.meeting_point
    ),

    pickupDetails: toText(trip.pickup_details),

    itinerary: unknownValueToLines(trip.itinerary),

    inclusions: unknownValueToLines(
      trip.inclusions ?? trip.includes
    ),

    exclusions: unknownValueToLines(
      trip.exclusions ?? trip.excludes
    ),

    instantBook: toBoolean(trip.instant_book),
  };
};

const parsePositiveNumber = (
  value: string,
  fieldName: string,
  allowZero = false
) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (allowZero ? parsed < 0 : parsed <= 0) {
    throw new Error(
      `${fieldName} must be ${
        allowZero ? "zero or greater" : "greater than zero"
      }.`
    );
  }

  return parsed;
};

export default function EditHostTripScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const tripId = useMemo(() => {
    const rawId = Array.isArray(params.id)
      ? params.id[0]
      : params.id;

    return rawId ? String(rawId) : "";
  }, [params.id]);

  const [originalTrip, setOriginalTrip] =
    useState<TripItem | null>(null);

  const [form, setForm] = useState<TripForm>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateForm = useCallback(
    <K extends keyof TripForm>(
      field: K,
      value: TripForm[K]
    ) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  const loadTrip = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!tripId) {
        setError("The trip package ID is missing.");
        return;
      }

      const storedUser =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setError(
          "Please sign in again to edit this trip package."
        );
        return;
      }

      const response = await api.get("/experiences");

      const allTrips = getArrayFromResponse<TripItem>(
        response.data
      );

      const selectedTrip = allTrips.find((trip) => {
        const tripOwnerId =
          trip.host_id ?? trip.user_id;

        return (
          String(trip.id) === tripId &&
          String(tripOwnerId) === String(hostId)
        );
      });

      if (!selectedTrip) {
        setError(
          "This trip package could not be found, or it does not belong to your host account."
        );
        return;
      }

      setOriginalTrip(selectedTrip);
      setForm(mapTripToForm(selectedTrip));
    } catch (requestError) {
      console.error(
        "Load trip for editing error:",
        requestError
      );

      setError(
        "We could not load this trip package. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  const updateDays = (value: string) => {
    updateForm("days", value);

    const parsedDays = Number(value);

    if (
      Number.isFinite(parsedDays) &&
      parsedDays >= 1
    ) {
      updateForm(
        "nights",
        String(Math.max(parsedDays - 1, 0))
      );
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      throw new Error(
        "Please enter a trip package title."
      );
    }

    if (form.title.trim().length < 5) {
      throw new Error(
        "The trip title must contain at least 5 characters."
      );
    }

    if (!form.description.trim()) {
      throw new Error(
        "Please enter a trip description."
      );
    }

    if (form.description.trim().length < 20) {
      throw new Error(
        "The description must contain at least 20 characters."
      );
    }

    if (!form.destination.trim()) {
      throw new Error(
        "Please enter the trip destination."
      );
    }

    if (!form.country.trim()) {
      throw new Error(
        "Please enter the destination country."
      );
    }

    const days = parsePositiveNumber(
      form.days,
      "Package days"
    );

    const nights = parsePositiveNumber(
      form.nights,
      "Package nights",
      true
    );

    const adultPrice = parsePositiveNumber(
      form.adultPrice,
      "Adult price"
    );

    const childPrice = form.childPrice.trim()
      ? parsePositiveNumber(
          form.childPrice,
          "Child price",
          true
        )
      : 0;

    const minimumGuests = parsePositiveNumber(
      form.minimumGuests,
      "Minimum guests"
    );

    const maximumGuests = parsePositiveNumber(
      form.maximumGuests,
      "Maximum guests"
    );

    if (maximumGuests < minimumGuests) {
      throw new Error(
        "Maximum guests cannot be less than minimum guests."
      );
    }

    const itinerary = linesToArray(form.itinerary);
    const inclusions = linesToArray(form.inclusions);
    const exclusions = linesToArray(form.exclusions);

    if (itinerary.length === 0) {
      throw new Error(
        "Please add at least one itinerary item."
      );
    }

    return {
      days,
      nights,
      adultPrice,
      childPrice,
      minimumGuests,
      maximumGuests,
      itinerary,
      inclusions,
      exclusions,
    };
  };

  const saveTrip = async () => {
    try {
      if (!tripId || !originalTrip) {
        Alert.alert(
          "Unable to save",
          "The trip package information is unavailable."
        );
        return;
      }

      const validated = validateForm();

      setSaving(true);

      const payload = {
        title: form.title.trim(),
        trip_name: form.title.trim(),
        package_name: form.title.trim(),

        description: form.description.trim(),

        destination: form.destination.trim(),
        location: form.destination.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),

        package_days: validated.days,
        package_nights: validated.nights,
        days: validated.days,
        nights: validated.nights,

        price: validated.adultPrice,
        package_price: validated.adultPrice,
        adult_price: validated.adultPrice,
        child_price: validated.childPrice,

        min_guests: validated.minimumGuests,
        max_guests: validated.maximumGuests,
        travelers: validated.maximumGuests,

        pickup_location: form.pickupLocation.trim(),
        pickup_point: form.pickupLocation.trim(),
        meeting_point: form.pickupLocation.trim(),
        pickup_details: form.pickupDetails.trim(),

        itinerary: validated.itinerary,
        inclusions: validated.inclusions,
        includes: validated.inclusions,
        exclusions: validated.exclusions,
        excludes: validated.exclusions,

        instant_book: form.instantBook,

        /*
         * Status is intentionally not included.
         * Pending, Active, Rejected and Suspended remain
         * controlled by your existing admin approval flow.
         */
      };

      await api.put(`/experiences/${tripId}`, payload);

      Alert.alert(
        "Trip updated",
        "Your trip package has been updated successfully.",
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (requestError: any) {
      if (
        requestError instanceof Error &&
        !("response" in requestError)
      ) {
        Alert.alert(
          "Check your information",
          requestError.message
        );
        return;
      }

      console.error(
        "Update trip package error:",
        requestError
      );

      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        "We could not update this trip package. Please try again.";

      Alert.alert(
        "Unable to update trip",
        message
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    Alert.alert(
      "Save trip changes?",
      "The updated information will be saved to this trip package.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save",
          onPress: saveTrip,
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={THEME}
          />

          <Text style={styles.loadingText}>
            Loading trip details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !originalTrip) {
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
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
              strokeWidth={2}
            />
          </Pressable>

          <Text style={styles.errorHeaderTitle}>
            Edit trip
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FileText
              size={30}
              color={DANGER}
              strokeWidth={1.8}
            />
          </View>

          <Text style={styles.errorTitle}>
            Unable to open trip
          </Text>

          <Text style={styles.errorMessage}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={loadTrip}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>
              Try again
            </Text>
          </Pressable>
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

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
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
              Edit trip
            </Text>

            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
            >
              {getTripTitle(originalTrip)}
            </Text>
          </View>

          <View style={styles.headerStatus}>
            <Text style={styles.headerStatusText}>
              {originalTrip.status || "Pending"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <FileText
                size={20}
                color={THEME}
                strokeWidth={1.9}
              />
            </View>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                Admin approval
              </Text>

              <Text style={styles.noticeText}>
                The trip status remains controlled by
                your existing admin approval process.
              </Text>
            </View>
          </View>

          <FormSection
            title="Trip information"
            description="Update the package title and description."
            icon={
              <Building2
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Trip title"
              value={form.title}
              placeholder="Example: Kerala backwater experience"
              onChangeText={(value) =>
                updateForm("title", value)
              }
              maxLength={120}
            />

            <FormInput
              label="Description"
              value={form.description}
              placeholder="Describe the complete trip experience"
              onChangeText={(value) =>
                updateForm("description", value)
              }
              multiline
              minHeight={130}
              maxLength={2500}
              isLast
            />
          </FormSection>

          <FormSection
            title="Destination"
            description="Set the primary trip destination."
            icon={
              <Home
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Destination"
              value={form.destination}
              placeholder="Destination or attraction"
              onChangeText={(value) =>
                updateForm("destination", value)
              }
            />

            <FormInput
              label="City"
              value={form.city}
              placeholder="City"
              onChangeText={(value) =>
                updateForm("city", value)
              }
            />

            <FormInput
              label="State or region"
              value={form.state}
              placeholder="State or region"
              onChangeText={(value) =>
                updateForm("state", value)
              }
            />

            <FormInput
              label="Country"
              value={form.country}
              placeholder="Country"
              onChangeText={(value) =>
                updateForm("country", value)
              }
              isLast
            />
          </FormSection>

          <FormSection
            title="Package duration"
            description="Set the number of days and nights."
            icon={
              <FileText
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Days"
                  value={form.days}
                  placeholder="3"
                  onChangeText={updateDays}
                  keyboardType="number-pad"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Nights"
                  value={form.nights}
                  placeholder="2"
                  onChangeText={(value) =>
                    updateForm("nights", value)
                  }
                  keyboardType="number-pad"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title="Pricing"
            description="Set per-person package prices."
            icon={
              <Building2
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Adult price"
                  value={form.adultPrice}
                  placeholder="5000"
                  onChangeText={(value) =>
                    updateForm("adultPrice", value)
                  }
                  keyboardType="decimal-pad"
                  prefix="₹"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Child price"
                  value={form.childPrice}
                  placeholder="2500"
                  onChangeText={(value) =>
                    updateForm("childPrice", value)
                  }
                  keyboardType="decimal-pad"
                  prefix="₹"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title="Guest capacity"
            description="Control the permitted group size."
            icon={
              <User
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Minimum guests"
                  value={form.minimumGuests}
                  placeholder="1"
                  onChangeText={(value) =>
                    updateForm(
                      "minimumGuests",
                      value
                    )
                  }
                  keyboardType="number-pad"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Maximum guests"
                  value={form.maximumGuests}
                  placeholder="10"
                  onChangeText={(value) =>
                    updateForm(
                      "maximumGuests",
                      value
                    )
                  }
                  keyboardType="number-pad"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title="Pickup information"
            description="Tell guests where and how pickup works."
            icon={
              <Home
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Pickup location"
              value={form.pickupLocation}
              placeholder="Hotel lobby, airport or meeting point"
              onChangeText={(value) =>
                updateForm(
                  "pickupLocation",
                  value
                )
              }
            />

            <FormInput
              label="Pickup details"
              value={form.pickupDetails}
              placeholder="Add pickup time, instructions and contact details"
              onChangeText={(value) =>
                updateForm(
                  "pickupDetails",
                  value
                )
              }
              multiline
              minHeight={105}
              maxLength={1000}
              isLast
            />
          </FormSection>

          <FormSection
            title="Itinerary"
            description="Enter one itinerary item per line."
            icon={
              <FileText
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Daily activities"
              value={form.itinerary}
              placeholder={
                "Arrival and hotel check-in\nCity sightseeing\nDeparture"
              }
              onChangeText={(value) =>
                updateForm("itinerary", value)
              }
              multiline
              minHeight={155}
              maxLength={3000}
              isLast
            />
          </FormSection>

          <FormSection
            title="Package inclusions"
            description="Enter one included service per line."
            icon={
              <FileText
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Included"
              value={form.inclusions}
              placeholder={
                "Hotel accommodation\nBreakfast\nLocal transport"
              }
              onChangeText={(value) =>
                updateForm("inclusions", value)
              }
              multiline
              minHeight={130}
              maxLength={2000}
              isLast
            />
          </FormSection>

          <FormSection
            title="Package exclusions"
            description="Enter one excluded item per line."
            icon={
              <FileText
                size={21}
                color={THEME}
                strokeWidth={1.9}
              />
            }
          >
            <FormInput
              label="Not included"
              value={form.exclusions}
              placeholder={
                "Flights\nPersonal expenses\nTravel insurance"
              }
              onChangeText={(value) =>
                updateForm("exclusions", value)
              }
              multiline
              minHeight={130}
              maxLength={2000}
              isLast
            />
          </FormSection>

          <View style={styles.switchCard}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>
                Instant booking
              </Text>

              <Text style={styles.switchDescription}>
                Allow guests to book this package
                without manual host approval.
              </Text>
            </View>

            <Switch
              value={form.instantBook}
              onValueChange={(value) =>
                updateForm("instantBook", value)
              }
              trackColor={{
                false: "#d5d9df",
                true: "#b9cdfa",
              }}
              thumbColor={
                form.instantBook
                  ? THEME
                  : "#ffffff"
              }
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={confirmSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
              saving && styles.disabledButton,
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#ffffff"
                />

                <Text style={styles.saveButtonText}>
                  Saving changes...
                </Text>
              </>
            ) : (
              <Text style={styles.saveButtonText}>
                Save changes
              </Text>
            )}
          </Pressable>

          <Text style={styles.footerNote}>
            Existing trip photos, departures and
            approval status remain unchanged.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormSectionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

function FormSection({
  title,
  description,
  icon,
  children,
}: FormSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          {icon}
        </View>

        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitle}>
            {title}
          </Text>

          <Text style={styles.sectionDescription}>
            {description}
          </Text>
        </View>
      </View>

      {children}
    </View>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?:
    | "default"
    | "number-pad"
    | "decimal-pad";
  multiline?: boolean;
  minHeight?: number;
  maxLength?: number;
  prefix?: string;
  isLast?: boolean;
};

function FormInput({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = "default",
  multiline = false,
  minHeight,
  maxLength,
  prefix,
  isLast = false,
}: FormInputProps) {
  return (
    <View
      style={[
        styles.field,
        isLast && styles.lastField,
      ]}
    >
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          multiline &&
            styles.multilineInputContainer,
          minHeight ? { minHeight } : null,
        ]}
      >
        {prefix ? (
          <Text style={styles.inputPrefix}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9aa3b1"
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={
            multiline ? "top" : "center"
          }
          maxLength={maxLength}
          style={[
            styles.input,
            multiline && styles.multilineInput,
            prefix && styles.inputWithPrefix,
          ]}
        />
      </View>

      {maxLength ? (
        <Text style={styles.characterCount}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardContainer: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 120,
  },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
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
    paddingRight: 10,
  },
  headerTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
  },
  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },
  headerStatus: {
    maxWidth: 88,
    borderRadius: 999,
    backgroundColor: "#eef3ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerStatusText: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },
  headerPlaceholder: {
    width: 42,
  },
  errorHeaderTitle: {
    flex: 1,
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    textAlign: "center",
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
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#E8F7F1",
    borderWidth: 1,
    borderColor: "#cfddfb",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  noticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },
  noticeTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  noticeText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#edf3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
  },
  sectionDescription: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  field: {
    marginBottom: 16,
  },
  lastField: {
    marginBottom: 0,
  },
  fieldLabel: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    marginBottom: 7,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
  },
  multilineInputContainer: {
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: TEXT,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    paddingVertical: 0,
  },
  multilineInput: {
    minHeight: 104,
    paddingTop: 0,
    paddingBottom: 0,
  },
  inputWithPrefix: {
    marginLeft: 6,
  },
  inputPrefix: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  characterCount: {
    alignSelf: "flex-end",
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 5,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 16,
    marginBottom: 18,
  },
  switchContent: {
    flex: 1,
    paddingRight: 14,
  },
  switchTitle: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  switchDescription: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  footerNote: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BACKGROUND,
    paddingHorizontal: 28,
    paddingBottom: 80,
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff0f0",
  },
  errorTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    marginTop: 18,
  },
  errorMessage: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
