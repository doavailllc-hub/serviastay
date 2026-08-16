import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    CalendarDays,
    Camera,
    ChevronLeft,
    Globe2,
    MapPin,
    Minus,
    Plus,
    ShieldCheck,
    X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#E8F7F1";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

type Step = 1 | 2 | 3 | 4 | 5;

type TripImage = {
  uri: string;
  name: string;
  type: string;
  uploadedUrl?: string;
  uploadedKey?: string;
};

type ItineraryDay = {
  day: number;
  title: string;
  description: string;
};

const PACKAGE_TYPES = [
  "Holiday package",
  "City tour",
  "Adventure trip",
  "Nature experience",
  "Cultural experience",
  "Weekend getaway",
];

const INCLUDES = [
  "Accommodation",
  "Breakfast",
  "Lunch",
  "Dinner",
  "Airport pickup",
  "Local transport",
  "Tour guide",
  "Entry tickets",
  "Travel insurance",
];

function getFileExtension(uri: string) {
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase();

  if (!extension || extension.length > 5) {
    return "jpg";
  }

  return extension;
}

function getMimeType(extension: string) {
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";

  return "image/jpeg";
}

export default function CreateTripScreen() {
  const [step, setStep] = useState<Step>(1);

  const [packageType, setPackageType] = useState("");
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");

  const [destination, setDestination] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [country, setCountry] = useState("India");

  const [days, setDays] = useState(2);
  const [nights, setNights] = useState(1);
  const [maxTravelers, setMaxTravelers] = useState(10);

  const [price, setPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");

  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [excludedText, setExcludedText] = useState("");

  const [departureDate, setDepartureDate] = useState("");
  const [departureSeats, setDepartureSeats] = useState("10");

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([
    {
      day: 1,
      title: "",
      description: "",
    },
    {
      day: 2,
      title: "",
      description: "",
    },
  ]);

  const [images, setImages] = useState<TripImage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const progress = `${(step / 5) * 100}%` as `${number}%`;

  const durationText = useMemo(() => {
    return `${days} day${days === 1 ? "" : "s"} · ${nights} night${
      nights === 1 ? "" : "s"
    }`;
  }, [days, nights]);

  const updateDuration = (nextDays: number) => {
    const safeDays = Math.max(1, nextDays);
    const safeNights = Math.max(0, safeDays - 1);

    setDays(safeDays);
    setNights(safeNights);

    setItinerary((current) => {
      const next: ItineraryDay[] = [];

      for (let index = 0; index < safeDays; index += 1) {
        next.push(
          current[index] || {
            day: index + 1,
            title: "",
            description: "",
          }
        );
      }

      return next.map((item, index) => ({
        ...item,
        day: index + 1,
      }));
    });
  };

  const updateItinerary = (
    index: number,
    field: "title" | "description",
    value: string
  ) => {
    setItinerary((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const toggleIncludedItem = (item: string) => {
    setIncludedItems((current) =>
      current.includes(item)
        ? current.filter((entry) => entry !== item)
        : [...current, item]
    );
  };

  const pickImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo permission required",
          "Allow photo access to upload trip images."
        );
        return;
      }

      const remaining = Math.max(0, 10 - images.length);

      if (remaining === 0) {
        Alert.alert(
          "Photo limit reached",
          "You can upload a maximum of 10 photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85,
      });

      if (result.canceled) return;

      const selected: TripImage[] = result.assets.map((asset, index) => {
        const extension = getFileExtension(asset.uri);

        return {
          uri: asset.uri,
          name:
            asset.fileName ||
            `trip-${Date.now()}-${index}.${extension}`,
          type: asset.mimeType || getMimeType(extension),
        };
      });

      setImages((current) => [...current, ...selected].slice(0, 10));
    } catch (error) {
      console.log("Trip image picker error:", error);

      Alert.alert(
        "Could not select photos",
        "Please try selecting the trip images again."
      );
    }
  };

  const removeImage = (index: number) => {
    setImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    );
  };

  const validateStep = () => {
    if (step === 1) {
      if (!packageType) {
        Alert.alert(
          "Package type required",
          "Choose the type of trip you are creating."
        );
        return false;
      }

      if (title.trim().length < 5) {
        Alert.alert(
          "Trip title required",
          "Enter a clear title with at least 5 characters."
        );
        return false;
      }

      if (shortDescription.trim().length < 10) {
        Alert.alert(
          "Summary required",
          "Add a short summary of the trip."
        );
        return false;
      }

      if (description.trim().length < 30) {
        Alert.alert(
          "Description required",
          "Describe the trip using at least 30 characters."
        );
        return false;
      }
    }

    if (step === 2) {
      if (!destination.trim()) {
        Alert.alert(
          "Destination required",
          "Enter the primary destination."
        );
        return false;
      }

      if (days < 1 || maxTravelers < 1) {
        Alert.alert(
          "Invalid trip capacity",
          "Check the duration and maximum traveler count."
        );
        return false;
      }
    }

    if (step === 3) {
      const incompleteDay = itinerary.find(
        (item) =>
          item.title.trim().length < 3 ||
          item.description.trim().length < 10
      );

      if (incompleteDay) {
        Alert.alert(
          `Day ${incompleteDay.day} incomplete`,
          "Add a title and description for every itinerary day."
        );
        return false;
      }
    }

    if (step === 4) {
      const adultPrice = Number(price);
      const seats = Number(departureSeats);

      if (!Number.isFinite(adultPrice) || adultPrice <= 0) {
        Alert.alert(
          "Trip price required",
          "Enter a valid adult traveler price."
        );
        return false;
      }

      if (!departureDate.trim()) {
        Alert.alert(
          "Departure date required",
          "Enter at least one departure date."
        );
        return false;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate.trim())) {
        Alert.alert(
          "Invalid departure date",
          "Use the date format YYYY-MM-DD."
        );
        return false;
      }

      if (!Number.isFinite(seats) || seats < 1) {
        Alert.alert(
          "Invalid seats",
          "Enter the number of available seats."
        );
        return false;
      }
    }

    if (step === 5 && images.length < 5) {
      Alert.alert(
        "More photos required",
        "Upload at least 5 trip photos."
      );
      return false;
    }

    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;

    if (step < 5) {
      setStep((current) => (current + 1) as Step);
    }
  };

  const previousStep = () => {
    if (step === 1) {
      router.back();
      return;
    }

    setStep((current) => (current - 1) as Step);
  };

  const uploadImages = async () => {
    if (images.every((image) => image.uploadedUrl)) {
      return images;
    }

    try {
      setUploadingImages(true);

      const formData = new FormData();

      images.forEach((image) => {
        formData.append(
          "images",
          {
            uri: image.uri,
            name: image.name,
            type: image.type,
          } as any
        );
      });

      const response = await api.post(
        "/upload/multiple",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 120000,
        }
      );

      const uploaded =
        response.data?.images || response.data?.imageUrls || [];

      if (!Array.isArray(uploaded) || uploaded.length === 0) {
        throw new Error(
          "The server did not return uploaded trip images."
        );
      }

      return images.map((image, index) => {
        const result = uploaded[index];

        if (typeof result === "string") {
          return {
            ...image,
            uploadedUrl: result,
          };
        }

        return {
          ...image,
          uploadedUrl:
            result?.imageUrl ||
            result?.url ||
            result?.image_url,
          uploadedKey:
            result?.imageKey ||
            result?.key ||
            result?.image_key,
        };
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const submitTrip = async () => {
    if (submitting || !validateStep()) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setSubmitting(true);

      const uploadedImages = await uploadImages();

      if (uploadedImages.some((image) => !image.uploadedUrl)) {
        throw new Error(
          "One or more trip photos could not be uploaded."
        );
      }

      setImages(uploadedImages);

      const adultPrice = Number(price);
      const calculatedChildPrice =
        Number(childPrice) > 0
          ? Number(childPrice)
          : Math.round(adultPrice * 0.7);

      const imageValues = uploadedImages.map((image, index) => ({
        url: image.uploadedUrl,
        image_url: image.uploadedUrl,
        key: image.uploadedKey || null,
        image_key: image.uploadedKey || null,
        is_cover: index === 0 ? 1 : 0,
        sort_order: index,
      }));

      const payload = {
        host_id: user.id,
        user_id: user.id,

        title: title.trim(),
        package_type: packageType,
        category: packageType,

        short_description: shortDescription.trim(),
        description: description.trim(),

        destination: destination.trim(),
        location: destination.trim(),
        country: country.trim(),

        pickup_location: pickupLocation.trim() || null,
        pickup: pickupLocation.trim() || null,

        package_days: days,
        package_nights: nights,
        days,
        nights,

        max_travelers: maxTravelers,
        max_guests: maxTravelers,

        price: adultPrice,
        adult_price: adultPrice,
        child_price: calculatedChildPrice,

        includes: includedItems,
        included_items: includedItems,

        excludes: excludedText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),

        itinerary,

        departures: [
          {
            departure_date: departureDate.trim(),
            available_seats: Number(departureSeats),
            price: adultPrice,
            status: "active",
          },
        ],

        status: "Pending",

        coverImage: uploadedImages[0].uploadedUrl,
        cover_image: uploadedImages[0].uploadedUrl,

        images: imageValues,
        imageValues,
      };

      const response = await api.post(
        "/experiences/host-create",
        payload
      );

      Alert.alert(
        "Trip submitted",
        response.data?.message ||
          "Your trip package has been submitted for review.",
        [
          {
            text: "Host dashboard",
            onPress: () =>
              router.replace("/host/dashboard"),
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error: any) {
      console.log(
        "Trip submit error:",
        error?.response?.data ||
          error?.message ||
          error
      );

      Alert.alert(
        "Could not submit trip",
        error?.response?.data?.message ||
          error?.message ||
          "Check the trip details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.headerButtonPressed,
            ]}
            onPress={previousStep}
          >
            <ChevronLeft size={24} color={TEXT} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Create a trip</Text>

            <Text style={styles.headerSubtitle}>
              Step {step} of 5
            </Text>
          </View>

          <Pressable
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <X size={21} color={TEXT} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: progress,
              },
            ]}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {step === 1 && (
            <BasicTripStep
              packageType={packageType}
              setPackageType={setPackageType}
              title={title}
              setTitle={setTitle}
              shortDescription={shortDescription}
              setShortDescription={setShortDescription}
              description={description}
              setDescription={setDescription}
            />
          )}

          {step === 2 && (
            <DestinationStep
              destination={destination}
              setDestination={setDestination}
              pickupLocation={pickupLocation}
              setPickupLocation={setPickupLocation}
              country={country}
              setCountry={setCountry}
              days={days}
              maxTravelers={maxTravelers}
              setMaxTravelers={setMaxTravelers}
              updateDuration={updateDuration}
            />
          )}

          {step === 3 && (
            <ItineraryStep
              itinerary={itinerary}
              updateItinerary={updateItinerary}
            />
          )}

          {step === 4 && (
            <PricingStep
              price={price}
              setPrice={setPrice}
              childPrice={childPrice}
              setChildPrice={setChildPrice}
              includedItems={includedItems}
              toggleIncludedItem={toggleIncludedItem}
              excludedText={excludedText}
              setExcludedText={setExcludedText}
              departureDate={departureDate}
              setDepartureDate={setDepartureDate}
              departureSeats={departureSeats}
              setDepartureSeats={setDepartureSeats}
            />
          )}

          {step === 5 && (
            <TripPhotoStep
              images={images}
              pickImages={pickImages}
              removeImage={removeImage}
              title={title}
              destination={destination}
              durationText={durationText}
              price={price}
              maxTravelers={maxTravelers}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <Pressable
              style={styles.backFooterButton}
              onPress={previousStep}
              disabled={submitting}
            >
              <Text style={styles.backFooterText}>Back</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              pressed &&
                !submitting &&
                styles.continueButtonPressed,
              submitting && styles.continueButtonDisabled,
            ]}
            onPress={step === 5 ? submitTrip : nextStep}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={WHITE} />

                <Text style={styles.continueText}>
                  {uploadingImages
                    ? "Uploading photos..."
                    : "Submitting..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.continueText}>
                {step === 5
                  ? "Submit trip"
                  : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepHeader}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  );
}

function BasicTripStep({
  packageType,
  setPackageType,
  title,
  setTitle,
  shortDescription,
  setShortDescription,
  description,
  setDescription,
}: any) {
  return (
    <>
      <StepHeader
        eyebrow="Trip details"
        title="Tell travelers about your trip"
        description="Choose the package type and provide clear information about the travel experience."
      />

      <Text style={styles.sectionLabel}>Package type</Text>

      <View style={styles.optionGrid}>
        {PACKAGE_TYPES.map((type) => {
          const selected = packageType === type;

          return (
            <Pressable
              key={type}
              style={[
                styles.typeOption,
                selected && styles.typeOptionSelected,
              ]}
              onPress={() => setPackageType(type)}
            >
              <Globe2
                size={21}
                color={selected ? THEME : MUTED}
              />

              <Text
                style={[
                  styles.typeText,
                  selected && styles.typeTextSelected,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label="Trip title"
        value={title}
        onChangeText={(value: string) =>
          setTitle(value.slice(0, 90))
        }
        placeholder="Example: Explore the beauty of Kashmir"
        helper={`${title.length}/90 characters`}
      />

      <FormField
        label="Short summary"
        value={shortDescription}
        onChangeText={(value: string) =>
          setShortDescription(value.slice(0, 180))
        }
        placeholder="A short summary shown on the trip card"
        helper={`${shortDescription.length}/180 characters`}
      />

      <FormField
        label="Full description"
        value={description}
        onChangeText={(value: string) =>
          setDescription(value.slice(0, 2000))
        }
        placeholder="Describe the travel experience, highlights, activities and what makes the package special."
        multiline
        helper={`${description.length}/2000 characters`}
      />
    </>
  );
}

function DestinationStep({
  destination,
  setDestination,
  pickupLocation,
  setPickupLocation,
  country,
  setCountry,
  days,
  maxTravelers,
  setMaxTravelers,
  updateDuration,
}: any) {
  return (
    <>
      <StepHeader
        eyebrow="Destination and capacity"
        title="Where will travelers go?"
        description="Add the destination, duration, pickup point and maximum group size."
      />

      <View style={styles.notice}>
        <MapPin size={21} color={THEME} />

        <Text style={styles.noticeText}>
          Use a clear destination that travelers can easily
          recognise in search results.
        </Text>
      </View>

      <FormField
        label="Destination"
        value={destination}
        onChangeText={setDestination}
        placeholder="Example: Munnar, Kerala"
      />

      <FormField
        label="Country"
        value={country}
        onChangeText={setCountry}
        placeholder="Country"
      />

      <FormField
        label="Pickup location"
        value={pickupLocation}
        onChangeText={setPickupLocation}
        placeholder="Airport, station, hotel or meeting point"
        helper="Optional. Travelers can receive detailed instructions later."
      />

      <View style={styles.counterCard}>
        <CounterRow
          title="Package days"
          description="Total duration of this trip"
          value={days}
          minimum={1}
          onMinus={() => updateDuration(days - 1)}
          onPlus={() => updateDuration(days + 1)}
        />

        <View style={styles.divider} />

        <CounterRow
          title="Maximum travelers"
          description="Maximum group size per departure"
          value={maxTravelers}
          minimum={1}
          onMinus={() =>
            setMaxTravelers(
              Math.max(1, maxTravelers - 1)
            )
          }
          onPlus={() =>
            setMaxTravelers(maxTravelers + 1)
          }
        />
      </View>
    </>
  );
}

function ItineraryStep({
  itinerary,
  updateItinerary,
}: {
  itinerary: ItineraryDay[];
  updateItinerary: (
    index: number,
    field: "title" | "description",
    value: string
  ) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Itinerary"
        title="Plan each day of the trip"
        description="Explain the main activities, destinations and experiences included each day."
      />

      <View style={styles.itineraryList}>
        {itinerary.map((item, index) => (
          <View key={item.day} style={styles.itineraryCard}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>
                Day {item.day}
              </Text>
            </View>

            <FormField
              label="Day title"
              value={item.title}
              onChangeText={(value: string) =>
                updateItinerary(index, "title", value)
              }
              placeholder="Example: Arrival and local sightseeing"
            />

            <FormField
              label="Day plan"
              value={item.description}
              onChangeText={(value: string) =>
                updateItinerary(index, "description", value)
              }
              placeholder="Describe transport, meals, activities and overnight stay."
              multiline
            />
          </View>
        ))}
      </View>
    </>
  );
}

function PricingStep({
  price,
  setPrice,
  childPrice,
  setChildPrice,
  includedItems,
  toggleIncludedItem,
  excludedText,
  setExcludedText,
  departureDate,
  setDepartureDate,
  departureSeats,
  setDepartureSeats,
}: any) {
  return (
    <>
      <StepHeader
        eyebrow="Pricing and departures"
        title="Set price and availability"
        description="Add traveler pricing, included services and the first departure."
      />

      <View style={styles.priceCard}>
        <Text style={styles.cardTitle}>Traveler pricing</Text>

        <FormField
          label="Adult price"
          value={price}
          onChangeText={(value: string) =>
            setPrice(value.replace(/[^0-9.]/g, ""))
          }
          placeholder="25000"
          keyboardType="decimal-pad"
          prefix="₹"
        />

        <FormField
          label="Child price"
          value={childPrice}
          onChangeText={(value: string) =>
            setChildPrice(
              value.replace(/[^0-9.]/g, "")
            )
          }
          placeholder="Optional"
          keyboardType="decimal-pad"
          prefix="₹"
          helper="If empty, the app uses approximately 70% of the adult price."
        />
      </View>

      <Text style={styles.sectionLabel}>Package includes</Text>

      <View style={styles.includesGrid}>
        {INCLUDES.map((item) => {
          const selected = includedItems.includes(item);

          return (
            <Pressable
              key={item}
              style={[
                styles.includeOption,
                selected && styles.includeOptionSelected,
              ]}
              onPress={() => toggleIncludedItem(item)}
            >
              <View
                style={[
                  styles.checkBox,
                  selected && styles.checkBoxSelected,
                ]}
              >
                {selected && (
                  <Text style={styles.checkText}>✓</Text>
                )}
              </View>

              <Text
                style={[
                  styles.includeText,
                  selected && styles.includeTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label="Not included"
        value={excludedText}
        onChangeText={setExcludedText}
        placeholder={"Personal expenses\nFlights\nOptional activities"}
        multiline
        helper="Write one excluded item per line."
      />

      <View style={styles.departureCard}>
        <View style={styles.departureHeader}>
          <CalendarDays size={21} color={THEME} />

          <View style={styles.departureHeaderContent}>
            <Text style={styles.cardTitle}>
              First departure
            </Text>

            <Text style={styles.cardSubtitle}>
              Additional departures can be managed later.
            </Text>
          </View>
        </View>

        <FormField
          label="Departure date"
          value={departureDate}
          onChangeText={setDepartureDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
        />

        <FormField
          label="Available seats"
          value={departureSeats}
          onChangeText={(value: string) =>
            setDepartureSeats(value.replace(/[^0-9]/g, ""))
          }
          placeholder="10"
          keyboardType="number-pad"
        />
      </View>
    </>
  );
}

function TripPhotoStep({
  images,
  pickImages,
  removeImage,
  title,
  destination,
  durationText,
  price,
  maxTravelers,
}: any) {
  return (
    <>
      <StepHeader
        eyebrow="Photos and review"
        title="Show travelers the experience"
        description="Upload at least 5 high-quality photos. The first photo becomes the cover image."
      />

      <Pressable
        style={({ pressed }) => [
          styles.uploadCard,
          pressed && styles.uploadCardPressed,
        ]}
        onPress={pickImages}
      >
        <View style={styles.uploadIcon}>
          <Camera size={27} color={THEME} />
        </View>

        <Text style={styles.uploadTitle}>
          Add trip photos
        </Text>

        <Text style={styles.uploadDescription}>
          Upload destinations, activities and accommodation
        </Text>

        <Text style={styles.uploadCount}>
          {images.length}/10 selected
        </Text>
      </Pressable>

      {images.length > 0 && (
        <View style={styles.photoGrid}>
          {images.map((image: TripImage, index: number) => (
            <View
              key={`${image.uri}-${index}`}
              style={styles.photoItem}
            >
              <Image
                source={{ uri: image.uri }}
                style={styles.photo}
              />

              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              )}

              <Pressable
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <X size={15} color={WHITE} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>
        Trip preview
      </Text>

      <View style={styles.previewCard}>
        {images[0] ? (
          <Image
            source={{ uri: images[0].uri }}
            style={styles.previewImage}
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Camera size={26} color="#9aa0a6" />
          </View>
        )}

        <View style={styles.previewContent}>
          <Text numberOfLines={2} style={styles.previewTitle}>
            {title || "Your trip package"}
          </Text>

          <Text style={styles.previewLocation}>
            {destination || "Trip destination"}
          </Text>

          <Text style={styles.previewMeta}>
            {durationText} · Up to {maxTravelers} travelers
          </Text>

          <Text style={styles.previewPrice}>
            ₹{Number(price || 0).toLocaleString("en-IN")}{" "}
            <Text style={styles.previewPriceSuffix}>
              / traveler
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.reviewNotice}>
        <ShieldCheck size={21} color={THEME} />

        <Text style={styles.reviewNoticeText}>
          Your trip will be submitted as Pending and becomes
          public only after administrator approval.
        </Text>
      </View>
    </>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  helper,
  prefix,
}: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
        ]}
      >
        {prefix ? (
          <Text style={styles.inputPrefix}>{prefix}</Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9aa0a6"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
        />
      </View>

      {helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

function CounterRow({
  title,
  description,
  value,
  minimum,
  onMinus,
  onPlus,
}: any) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterContent}>
        <Text style={styles.counterTitle}>{title}</Text>
        <Text style={styles.counterDescription}>
          {description}
        </Text>
      </View>

      <View style={styles.counterActions}>
        <Pressable
          style={[
            styles.counterButton,
            value <= minimum && styles.counterDisabled,
          ]}
          onPress={onMinus}
          disabled={value <= minimum}
        >
          <Minus size={17} color={TEXT} />
        </Pressable>

        <Text style={styles.counterValue}>{value}</Text>

        <Pressable
          style={styles.counterButton}
          onPress={onPlus}
        >
          <Plus size={17} color={TEXT} />
        </Pressable>
      </View>
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
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  headerButtonPressed: {
    backgroundColor: SURFACE,
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 2,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  progressTrack: {
    height: 4,
    backgroundColor: "#edf0f3",
  },

  progressFill: {
    height: 4,
    backgroundColor: THEME,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 126,
  },

  stepHeader: {
    marginBottom: 26,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: THEME,
  },

  stepTitle: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: TEXT,
  },

  stepDescription: {
    marginTop: 9,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
  },

  sectionLabel: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  typeOption: {
    width: "48%",
    minHeight: 74,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  typeOptionSelected: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  typeText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  typeTextSelected: {
    color: THEME,
  },

  field: {
    marginBottom: 18,
  },

  fieldLabel: {
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  inputWrapMultiline: {
    minHeight: 140,
    alignItems: "flex-start",
  },

  inputPrefix: {
    marginRight: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  input: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: TEXT,
  },

  inputMultiline: {
    minHeight: 135,
    paddingTop: 14,
  },

  helper: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  notice: {
    marginBottom: 22,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noticeText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  counterCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    paddingHorizontal: 16,
  },

  counterRow: {
    minHeight: 88,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  counterContent: {
    flex: 1,
  },

  counterTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  counterDescription: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  counterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  counterButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: "#cfd3d7",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  counterDisabled: {
    opacity: 0.3,
  },

  counterValue: {
    width: 27,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
    textAlign: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f3f4",
  },

  itineraryList: {
    gap: 16,
  },

  itineraryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    padding: 17,
  },

  dayBadge: {
    alignSelf: "flex-start",
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: THEME_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  dayBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
  },

  priceCard: {
    borderRadius: 22,
    backgroundColor: SURFACE,
    padding: 17,
    marginBottom: 26,
  },

  cardTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  cardSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  includesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },

  includeOption: {
    width: "48%",
    minHeight: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  includeOptionSelected: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#c8cdd2",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  checkBoxSelected: {
    borderColor: THEME,
    backgroundColor: THEME,
  },

  checkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: WHITE,
  },

  includeText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  includeTextSelected: {
    color: THEME,
  },

  departureCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    padding: 17,
  },

  departureHeader: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  departureHeaderContent: {
    flex: 1,
  },

  uploadCard: {
    minHeight: 180,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#b9c6dc",
    borderRadius: 24,
    backgroundColor: "#fbfdff",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadCardPressed: {
    backgroundColor: THEME_LIGHT,
  },

  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadTitle: {
    marginTop: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  uploadDescription: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
    textAlign: "center",
  },

  uploadCount: {
    marginTop: 9,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
  },

  photoGrid: {
    marginTop: 16,
    marginBottom: 26,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  photoItem: {
    width: "48%",
    height: 130,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#f1f3f4",
  },

  photo: {
    width: "100%",
    height: "100%",
  },

  coverBadge: {
    position: "absolute",
    left: 9,
    bottom: 9,
    borderRadius: 999,
    backgroundColor: WHITE,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  coverText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: THEME,
  },

  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "rgba(32,33,36,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },

  previewCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: 205,
    backgroundColor: "#f1f3f4",
  },

  previewPlaceholder: {
    width: "100%",
    height: 205,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  previewContent: {
    padding: 16,
  },

  previewTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 17,
    lineHeight: 23,
    color: TEXT,
  },

  previewLocation: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  previewMeta: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  previewPrice: {
    marginTop: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  previewPriceSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  reviewNotice: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  reviewNoticeText: {
    flex: 1,
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
    minHeight: 88,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backFooterButton: {
    minWidth: 90,
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  backFooterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  continueButton: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.99 }],
  },

  continueButtonDisabled: {
    opacity: 0.7,
  },

  continueText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
