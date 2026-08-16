import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  ChevronLeft,
  FileText,
  Home,
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

type StayItem = {
  id: number | string;
  title?: string;
  property_name?: string;
  name?: string;
  description?: string;

  address?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;

  property_type?: string;
  place_type?: string;

  guests?: number | string;
  max_guests?: number | string;
  bedrooms?: number | string;
  beds?: number | string;
  bathrooms?: number | string;

  price?: number | string;
  weekday_price?: number | string;
  weekend_price?: number | string;

  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;

  instant_book?: boolean | number | string;
  status?: string;
};

type StayForm = {
  title: string;
  description: string;

  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;

  propertyType: string;
  placeType: string;

  guests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;

  weekdayPrice: string;
  weekendPrice: string;

  latitude: string;
  longitude: string;

  instantBook: boolean;
};

const INITIAL_FORM: StayForm = {
  title: "",
  description: "",

  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",

  propertyType: "",
  placeType: "",

  guests: "1",
  bedrooms: "1",
  beds: "1",
  bathrooms: "1",

  weekdayPrice: "",
  weekendPrice: "",

  latitude: "",
  longitude: "",

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
    "properties",
    "stays",
    "listings",
  ];

  for (const key of possibleKeys) {
    const value = objectPayload[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
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

const toText = (value: unknown, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const getStayTitle = (stay: StayItem) =>
  stay.title ||
  stay.property_name ||
  stay.name ||
  `Stay listing #${stay.id}`;

const mapStayToForm = (stay: StayItem): StayForm => ({
  title: toText(stay.title || stay.property_name || stay.name),
  description: toText(stay.description),

  address: toText(stay.address || stay.location),
  city: toText(stay.city),
  state: toText(stay.state),
  country: toText(stay.country),
  postalCode: toText(stay.postal_code),

  propertyType: toText(stay.property_type),
  placeType: toText(stay.place_type),

  guests: toText(stay.max_guests ?? stay.guests, "1"),
  bedrooms: toText(stay.bedrooms, "1"),
  beds: toText(stay.beds, "1"),
  bathrooms: toText(stay.bathrooms, "1"),

  weekdayPrice: toText(stay.weekday_price ?? stay.price),
  weekendPrice: toText(stay.weekend_price ?? stay.weekday_price ?? stay.price),

  latitude: toText(stay.latitude ?? stay.lat),
  longitude: toText(stay.longitude ?? stay.lng),

  instantBook: toBoolean(stay.instant_book),
});

const parsePositiveNumber = (
  value: string,
  fieldName: string,
  allowZero = false
) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  if (allowZero ? numberValue < 0 : numberValue <= 0) {
    throw new Error(
      `${fieldName} must be ${allowZero ? "zero or greater" : "greater than zero"}.`
    );
  }

  return numberValue;
};

const parseCoordinate = (value: string, fieldName: string) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return numberValue;
};

export default function EditHostStayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const stayId = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    return rawId ? String(rawId) : "";
  }, [params.id]);

  const [originalStay, setOriginalStay] = useState<StayItem | null>(null);
  const [form, setForm] = useState<StayForm>(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateForm = useCallback(
    <K extends keyof StayForm>(field: K, value: StayForm[K]) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));
    },
    []
  );

  const loadStay = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!stayId) {
        setError("The stay listing ID is missing.");
        return;
      }

      const storedUser = (await getStoredUser()) as StoredUser | null;
      const hostId = storedUser?.id ?? storedUser?.user_id;

      if (!hostId) {
        setError("Please sign in again to edit this stay.");
        return;
      }

      /*
       * We intentionally load the stay from the host's own listings.
       * This also allows Pending listings to be edited.
       */
      const response = await api.get(`/my-properties/${hostId}`);
      const hostStays = getArrayFromResponse<StayItem>(response.data);

      const selectedStay = hostStays.find(
        (item) => String(item.id) === stayId
      );

      if (!selectedStay) {
        setError(
          "This stay listing could not be found, or it does not belong to your host account."
        );
        return;
      }

      setOriginalStay(selectedStay);
      setForm(mapStayToForm(selectedStay));
    } catch (requestError) {
      console.error("Load stay for editing error:", requestError);

      setError(
        "We could not load this stay listing. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [stayId]);

  useEffect(() => {
    loadStay();
  }, [loadStay]);

  const validateForm = () => {
    if (!form.title.trim()) {
      throw new Error("Please enter a listing title.");
    }

    if (form.title.trim().length < 5) {
      throw new Error("The listing title must contain at least 5 characters.");
    }

    if (!form.description.trim()) {
      throw new Error("Please enter a listing description.");
    }

    if (form.description.trim().length < 20) {
      throw new Error(
        "The listing description must contain at least 20 characters."
      );
    }

    if (!form.address.trim()) {
      throw new Error("Please enter the property address.");
    }

    if (!form.city.trim()) {
      throw new Error("Please enter the city.");
    }

    if (!form.country.trim()) {
      throw new Error("Please enter the country.");
    }

    if (!form.propertyType.trim()) {
      throw new Error("Please enter the property type.");
    }

    if (!form.placeType.trim()) {
      throw new Error("Please enter the place type.");
    }

    const guests = parsePositiveNumber(form.guests, "Maximum guests");
    const bedrooms = parsePositiveNumber(
      form.bedrooms,
      "Bedrooms",
      true
    );
    const beds = parsePositiveNumber(form.beds, "Beds");
    const bathrooms = parsePositiveNumber(form.bathrooms, "Bathrooms");

    const weekdayPrice = parsePositiveNumber(
      form.weekdayPrice,
      "Weekday price"
    );

    const weekendPrice = parsePositiveNumber(
      form.weekendPrice,
      "Weekend price"
    );

    let latitude: number | null = null;
    let longitude: number | null = null;

    if (form.latitude.trim() || form.longitude.trim()) {
      if (!form.latitude.trim() || !form.longitude.trim()) {
        throw new Error(
          "Please enter both latitude and longitude coordinates."
        );
      }

      latitude = parseCoordinate(form.latitude, "Latitude");
      longitude = parseCoordinate(form.longitude, "Longitude");

      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90.");
      }

      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180.");
      }
    }

    return {
      guests,
      bedrooms,
      beds,
      bathrooms,
      weekdayPrice,
      weekendPrice,
      latitude,
      longitude,
    };
  };

  const saveStay = async () => {
    try {
      if (!stayId || !originalStay) {
        Alert.alert(
          "Unable to save",
          "The stay listing information is unavailable."
        );
        return;
      }

      const validated = validateForm();

      setSaving(true);

      const payload = {
        title: form.title.trim(),
        property_name: form.title.trim(),
        description: form.description.trim(),

        address: form.address.trim(),
        location: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postal_code: form.postalCode.trim(),

        property_type: form.propertyType.trim(),
        place_type: form.placeType.trim(),

        guests: validated.guests,
        max_guests: validated.guests,
        bedrooms: validated.bedrooms,
        beds: validated.beds,
        bathrooms: validated.bathrooms,

        price: validated.weekdayPrice,
        weekday_price: validated.weekdayPrice,
        weekend_price: validated.weekendPrice,

        latitude: validated.latitude,
        longitude: validated.longitude,
        lat: validated.latitude,
        lng: validated.longitude,

        instant_book: form.instantBook,

        /*
         * Do not send status here.
         * The existing approval status remains controlled by the backend/admin.
         */
      };

      await api.put(`/properties/${stayId}`, payload);

      Alert.alert(
        "Stay updated",
        "Your stay listing has been updated successfully.",
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
        Alert.alert("Check your information", requestError.message);
        return;
      }

      console.error("Update stay error:", requestError);

      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        "We could not update this stay listing. Please try again.";

      Alert.alert("Unable to update stay", message);
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    Alert.alert(
      "Save listing changes?",
      "The updated information will be saved to this stay listing.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save",
          onPress: saveStay,
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME} />
          <Text style={styles.loadingText}>Loading stay details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !originalStay) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.errorScreenHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
          </Pressable>

          <Text style={styles.errorScreenTitle}>Edit stay</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FileText size={30} color={DANGER} strokeWidth={1.8} />
          </View>

          <Text style={styles.errorTitle}>Unable to open listing</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={loadStay}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <ChevronLeft size={24} color={TEXT} strokeWidth={2} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Edit stay</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {getStayTitle(originalStay)}
            </Text>
          </View>

          <View style={styles.headerStatus}>
            <Text style={styles.headerStatusText}>
              {originalStay.status || "Pending"}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <FileText size={20} color={THEME} strokeWidth={1.9} />
            </View>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>Listing approval</Text>
              <Text style={styles.noticeText}>
                Editing an approved listing may require another review,
                depending on your backend approval rules.
              </Text>
            </View>
          </View>

          <FormSection
            title="Basic information"
            description="Update the title and description guests will see."
            icon={<Home size={21} color={THEME} strokeWidth={1.9} />}
          >
            <FormInput
              label="Listing title"
              value={form.title}
              placeholder="Example: Modern apartment near city centre"
              onChangeText={(value) => updateForm("title", value)}
              maxLength={120}
            />

            <FormInput
              label="Description"
              value={form.description}
              placeholder="Describe the property, location and guest experience"
              onChangeText={(value) =>
                updateForm("description", value)
              }
              multiline
              minHeight={130}
              maxLength={2000}
            />

            <FormInput
              label="Property type"
              value={form.propertyType}
              placeholder="Apartment, house, villa..."
              onChangeText={(value) =>
                updateForm("propertyType", value)
              }
            />

            <FormInput
              label="Place type"
              value={form.placeType}
              placeholder="Entire place, private room..."
              onChangeText={(value) => updateForm("placeType", value)}
              isLast
            />
          </FormSection>

          <FormSection
            title="Location"
            description="Keep the address and map coordinates accurate."
            icon={
              <Building2 size={21} color={THEME} strokeWidth={1.9} />
            }
          >
            <FormInput
              label="Address"
              value={form.address}
              placeholder="Street address"
              onChangeText={(value) => updateForm("address", value)}
            />

            <FormInput
              label="City"
              value={form.city}
              placeholder="City"
              onChangeText={(value) => updateForm("city", value)}
            />

            <FormInput
              label="State or region"
              value={form.state}
              placeholder="State or region"
              onChangeText={(value) => updateForm("state", value)}
            />

            <FormInput
              label="Country"
              value={form.country}
              placeholder="Country"
              onChangeText={(value) => updateForm("country", value)}
            />

            <FormInput
              label="Postal code"
              value={form.postalCode}
              placeholder="Postal code"
              onChangeText={(value) => updateForm("postalCode", value)}
              keyboardType="default"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Latitude"
                  value={form.latitude}
                  placeholder="11.2588"
                  onChangeText={(value) =>
                    updateForm("latitude", value)
                  }
                  keyboardType="numbers-and-punctuation"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Longitude"
                  value={form.longitude}
                  placeholder="75.7804"
                  onChangeText={(value) =>
                    updateForm("longitude", value)
                  }
                  keyboardType="numbers-and-punctuation"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title="Capacity"
            description="Set the maximum number of guests and rooms."
            icon={<Home size={21} color={THEME} strokeWidth={1.9} />}
          >
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Guests"
                  value={form.guests}
                  placeholder="1"
                  onChangeText={(value) =>
                    updateForm("guests", value)
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Bedrooms"
                  value={form.bedrooms}
                  placeholder="1"
                  onChangeText={(value) =>
                    updateForm("bedrooms", value)
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Beds"
                  value={form.beds}
                  placeholder="1"
                  onChangeText={(value) => updateForm("beds", value)}
                  keyboardType="number-pad"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Bathrooms"
                  value={form.bathrooms}
                  placeholder="1"
                  onChangeText={(value) =>
                    updateForm("bathrooms", value)
                  }
                  keyboardType="decimal-pad"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <FormSection
            title="Pricing"
            description="Set separate weekday and weekend prices."
            icon={
              <Building2 size={21} color={THEME} strokeWidth={1.9} />
            }
          >
            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Weekday price"
                  value={form.weekdayPrice}
                  placeholder="2500"
                  onChangeText={(value) =>
                    updateForm("weekdayPrice", value)
                  }
                  keyboardType="decimal-pad"
                  prefix="₹"
                  isLast
                />
              </View>

              <View style={styles.halfField}>
                <FormInput
                  label="Weekend price"
                  value={form.weekendPrice}
                  placeholder="3000"
                  onChangeText={(value) =>
                    updateForm("weekendPrice", value)
                  }
                  keyboardType="decimal-pad"
                  prefix="₹"
                  isLast
                />
              </View>
            </View>
          </FormSection>

          <View style={styles.switchCard}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>Instant booking</Text>
              <Text style={styles.switchDescription}>
                Allow guests to reserve this stay without manual approval.
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
              thumbColor={form.instantBook ? THEME : "#ffffff"}
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
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.saveButtonText}>Saving changes...</Text>
              </>
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </Pressable>

          <Text style={styles.footerNote}>
            Existing listing photos and approval status will remain unchanged.
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
        <View style={styles.sectionIcon}>{icon}</View>

        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>

      <View style={styles.sectionBody}>{children}</View>
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
    | "decimal-pad"
    | "numbers-and-punctuation";
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
    <View style={[styles.field, isLast && styles.lastField]}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
          multiline && styles.multilineInputContainer,
          minHeight ? { minHeight } : null,
        ]}
      >
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}

        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#9aa3b1"
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
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
  sectionBody: {},
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
  errorScreenHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  errorScreenTitle: {
    flex: 1,
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 42,
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
