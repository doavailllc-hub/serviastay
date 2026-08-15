import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    Building2,
    Camera,
    ChevronLeft,
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
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";
const DANGER = "#d93025";

type Step = 1 | 2 | 3 | 4 | 5;

type ListingImage = {
  uri: string;
  name: string;
  type: string;
  uploadedUrl?: string;
  uploadedKey?: string;
};

type CounterField =
  | "guests"
  | "bedrooms"
  | "beds"
  | "bathrooms";

const AMENITIES = [
  "WiFi",
  "Air conditioning",
  "Kitchen",
  "Parking",
  "Television",
  "Swimming pool",
  "Washing machine",
  "Workspace",
  "Breakfast",
  "Power backup",
];

const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Hotel",
  "Resort",
  "Guest house",
  "Private room",
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

export default function CreateStayScreen() {
  const [step, setStep] = useState<Step>(1);

  const [propertyType, setPropertyType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [country, setCountry] = useState("India");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [guests, setGuests] = useState(1);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);

  const [weekdayPrice, setWeekdayPrice] = useState("");
  const [weekendPrice, setWeekendPrice] = useState("");

  const [amenities, setAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<ListingImage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const progress = `${(step / 5) * 100}%` as `${number}%`;

  const locationText = useMemo(() => {
    return [address, city, stateName, country]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
  }, [address, city, stateName, country]);

  const changeCounter = (
    field: CounterField,
    direction: 1 | -1
  ) => {
    const update = (
      setter: React.Dispatch<React.SetStateAction<number>>,
      minimum: number
    ) => {
      setter((current) => Math.max(minimum, current + direction));
    };

    if (field === "guests") update(setGuests, 1);
    if (field === "bedrooms") update(setBedrooms, 0);
    if (field === "beds") update(setBeds, 1);
    if (field === "bathrooms") update(setBathrooms, 1);
  };

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity)
        ? current.filter((item) => item !== amenity)
        : [...current, amenity]
    );
  };

  const pickImages = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photo permission required",
          "Allow photo access to upload property images."
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

      const selected: ListingImage[] = result.assets.map(
        (asset, index) => {
          const extension = getFileExtension(asset.uri);

          return {
            uri: asset.uri,
            name:
              asset.fileName ||
              `stay-${Date.now()}-${index}.${extension}`,
            type:
              asset.mimeType ||
              getMimeType(extension),
          };
        }
      );

      setImages((current) =>
        [...current, ...selected].slice(0, 10)
      );
    } catch (error) {
      console.log("Image picker error:", error);

      Alert.alert(
        "Could not select images",
        "Please try again."
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
      if (!propertyType) {
        Alert.alert(
          "Property type required",
          "Choose the type of stay you are listing."
        );
        return false;
      }

      if (title.trim().length < 5) {
        Alert.alert(
          "Title required",
          "Enter a clear title with at least 5 characters."
        );
        return false;
      }

      if (description.trim().length < 30) {
        Alert.alert(
          "Description required",
          "Describe the stay using at least 30 characters."
        );
        return false;
      }
    }

    if (step === 2) {
      if (!address.trim() || !city.trim() || !stateName.trim()) {
        Alert.alert(
          "Location incomplete",
          "Add the address, city and state."
        );
        return false;
      }

      if (!latitude.trim() || !longitude.trim()) {
        Alert.alert(
          "Map coordinates required",
          "Add the latitude and longitude for the property."
        );
        return false;
      }

      if (
        !Number.isFinite(Number(latitude)) ||
        !Number.isFinite(Number(longitude))
      ) {
        Alert.alert(
          "Invalid coordinates",
          "Latitude and longitude must be valid numbers."
        );
        return false;
      }
    }

    if (step === 3) {
      if (guests < 1 || beds < 1 || bathrooms < 1) {
        Alert.alert(
          "Property capacity incomplete",
          "Add valid guest, bed and bathroom counts."
        );
        return false;
      }
    }

    if (step === 4) {
      const weekday = Number(weekdayPrice);
      const weekend = Number(weekendPrice || weekdayPrice);

      if (!Number.isFinite(weekday) || weekday <= 0) {
        Alert.alert(
          "Price required",
          "Enter a valid weekday price."
        );
        return false;
      }

      if (!Number.isFinite(weekend) || weekend <= 0) {
        Alert.alert(
          "Weekend price invalid",
          "Enter a valid weekend price."
        );
        return false;
      }
    }

    if (step === 5 && images.length < 5) {
      Alert.alert(
        "More photos required",
        "Upload at least 5 property photos."
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
        response.data?.images ||
        response.data?.imageUrls ||
        [];

      if (!Array.isArray(uploaded) || uploaded.length === 0) {
        throw new Error(
          "The server did not return uploaded images."
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

  const submitListing = async () => {
    if (submitting || !validateStep()) return;

    try {
      const user = await getStoredUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setSubmitting(true);

      const uploadedImages = await uploadImages();

      const invalidUpload = uploadedImages.some(
        (image) => !image.uploadedUrl
      );

      if (invalidUpload) {
        throw new Error(
          "One or more property photos could not be uploaded."
        );
      }

      setImages(uploadedImages);

      const weekday = Number(weekdayPrice);
      const weekend = Number(weekendPrice || weekdayPrice);

      const imageValues = uploadedImages.map(
        (image, index) => ({
          url: image.uploadedUrl,
          image_url: image.uploadedUrl,
          key: image.uploadedKey || null,
          image_key: image.uploadedKey || null,
          is_cover: index === 0 ? 1 : 0,
          sort_order: index,
        })
      );

      const payload = {
        user_id: user.id,
        host_id: user.id,

        title: title.trim(),
        description: description.trim(),
        property_type: propertyType,
        category: propertyType,

        country: country.trim(),
        address: address.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postal_code: postalCode.trim() || null,
        location: locationText,

        latitude: Number(latitude),
        longitude: Number(longitude),
        lat: Number(latitude),
        lng: Number(longitude),

        guests,
        bedrooms,
        beds,
        bathrooms,

        price: weekday,
        weekday_price: weekday,
        weekend_price: weekend,

        amenities,
        status: "Pending",

        coverImage: uploadedImages[0].uploadedUrl,
        cover_image: uploadedImages[0].uploadedUrl,
        images: imageValues,
        imageValues,
      };

      const response = await api.post(
        "/properties/host-create",
        payload
      );

      Alert.alert(
        "Listing submitted",
        response.data?.message ||
          "Your stay has been submitted for review.",
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
        "Stay listing submit error:",
        error?.response?.data ||
          error?.message ||
          error
      );

      Alert.alert(
        "Could not submit listing",
        error?.response?.data?.message ||
          error?.message ||
          "Please check the listing details and try again."
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
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={previousStep}
          >
            <ChevronLeft size={24} color={TEXT} />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Create a stay
            </Text>

            <Text style={styles.headerSubtitle}>
              Step {step} of 5
            </Text>
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={21} color={TEXT} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: progress },
            ]}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {step === 1 && (
            <BasicDetailsStep
              propertyType={propertyType}
              setPropertyType={setPropertyType}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
            />
          )}

          {step === 2 && (
            <LocationStep
              country={country}
              setCountry={setCountry}
              address={address}
              setAddress={setAddress}
              city={city}
              setCity={setCity}
              stateName={stateName}
              setStateName={setStateName}
              postalCode={postalCode}
              setPostalCode={setPostalCode}
              latitude={latitude}
              setLatitude={setLatitude}
              longitude={longitude}
              setLongitude={setLongitude}
            />
          )}

          {step === 3 && (
            <CapacityStep
              guests={guests}
              bedrooms={bedrooms}
              beds={beds}
              bathrooms={bathrooms}
              onChange={changeCounter}
            />
          )}

          {step === 4 && (
            <PricingAmenitiesStep
              weekdayPrice={weekdayPrice}
              setWeekdayPrice={setWeekdayPrice}
              weekendPrice={weekendPrice}
              setWeekendPrice={setWeekendPrice}
              amenities={amenities}
              toggleAmenity={toggleAmenity}
            />
          )}

          {step === 5 && (
            <PhotoReviewStep
              images={images}
              pickImages={pickImages}
              removeImage={removeImage}
              title={title}
              location={locationText}
              weekdayPrice={weekdayPrice}
              guests={guests}
              bedrooms={bedrooms}
              bathrooms={bathrooms}
              uploadingImages={uploadingImages}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 1 && (
            <Pressable
              style={styles.previousButton}
              onPress={previousStep}
              disabled={submitting}
            >
              <Text style={styles.previousButtonText}>
                Back
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed &&
                !submitting &&
                styles.nextButtonPressed,
              submitting && styles.nextButtonDisabled,
            ]}
            onPress={step === 5 ? submitListing : nextStep}
            disabled={submitting}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator
                  size="small"
                  color={WHITE}
                />

                <Text style={styles.nextButtonText}>
                  {uploadingImages
                    ? "Uploading photos..."
                    : "Submitting..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 5
                  ? "Submit listing"
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

      <Text style={styles.stepDescription}>
        {description}
      </Text>
    </View>
  );
}

function BasicDetailsStep({
  propertyType,
  setPropertyType,
  title,
  setTitle,
  description,
  setDescription,
}: {
  propertyType: string;
  setPropertyType: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Property details"
        title="Tell guests about your stay"
        description="Choose the property type and provide a clear title and description."
      />

      <Text style={styles.fieldSectionLabel}>
        Property type
      </Text>

      <View style={styles.optionGrid}>
        {PROPERTY_TYPES.map((type) => {
          const selected = type === propertyType;

          return (
            <Pressable
              key={type}
              style={[
                styles.typeOption,
                selected && styles.typeOptionSelected,
              ]}
              onPress={() => setPropertyType(type)}
            >
              <Building2
                size={21}
                color={selected ? THEME : MUTED}
              />

              <Text
                style={[
                  styles.typeOptionText,
                  selected &&
                    styles.typeOptionTextSelected,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormField
        label="Listing title"
        value={title}
        onChangeText={(value) =>
          setTitle(value.slice(0, 80))
        }
        placeholder="Example: Modern villa near the beach"
        helper={`${title.length}/80 characters`}
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={(value) =>
          setDescription(value.slice(0, 1500))
        }
        placeholder="Describe the rooms, atmosphere, location and what makes your stay special."
        multiline
        helper={`${description.length}/1500 characters`}
      />
    </>
  );
}

function LocationStep({
  country,
  setCountry,
  address,
  setAddress,
  city,
  setCity,
  stateName,
  setStateName,
  postalCode,
  setPostalCode,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
}: {
  country: string;
  setCountry: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  stateName: string;
  setStateName: (value: string) => void;
  postalCode: string;
  setPostalCode: (value: string) => void;
  latitude: string;
  setLatitude: (value: string) => void;
  longitude: string;
  setLongitude: (value: string) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Location"
        title="Where is your property?"
        description="Enter the full address and map coordinates used to display the listing."
      />

      <View style={styles.locationNotice}>
        <MapPin size={21} color={THEME} />

        <Text style={styles.locationNoticeText}>
          The exact address can remain private until a
          reservation is confirmed.
        </Text>
      </View>

      <FormField
        label="Country"
        value={country}
        onChangeText={setCountry}
        placeholder="Country"
      />

      <FormField
        label="Street address"
        value={address}
        onChangeText={setAddress}
        placeholder="Building, street and area"
      />

      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <FormField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="City"
          />
        </View>

        <View style={styles.column}>
          <FormField
            label="State"
            value={stateName}
            onChangeText={setStateName}
            placeholder="State"
          />
        </View>
      </View>

      <FormField
        label="Postal code"
        value={postalCode}
        onChangeText={setPostalCode}
        placeholder="Postal code"
        keyboardType="number-pad"
      />

      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <FormField
            label="Latitude"
            value={latitude}
            onChangeText={setLatitude}
            placeholder="11.2588"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.column}>
          <FormField
            label="Longitude"
            value={longitude}
            onChangeText={setLongitude}
            placeholder="75.7804"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
    </>
  );
}

function CapacityStep({
  guests,
  bedrooms,
  beds,
  bathrooms,
  onChange,
}: {
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  onChange: (
    field: CounterField,
    direction: 1 | -1
  ) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Capacity"
        title="How many guests can stay?"
        description="Add accurate sleeping and bathroom details for guests."
      />

      <View style={styles.counterCard}>
        <CounterRow
          title="Guests"
          description="Maximum number of guests"
          value={guests}
          minimum={1}
          onMinus={() => onChange("guests", -1)}
          onPlus={() => onChange("guests", 1)}
        />

        <View style={styles.counterDivider} />

        <CounterRow
          title="Bedrooms"
          description="Private sleeping rooms"
          value={bedrooms}
          minimum={0}
          onMinus={() => onChange("bedrooms", -1)}
          onPlus={() => onChange("bedrooms", 1)}
        />

        <View style={styles.counterDivider} />

        <CounterRow
          title="Beds"
          description="Total beds available"
          value={beds}
          minimum={1}
          onMinus={() => onChange("beds", -1)}
          onPlus={() => onChange("beds", 1)}
        />

        <View style={styles.counterDivider} />

        <CounterRow
          title="Bathrooms"
          description="Guest-accessible bathrooms"
          value={bathrooms}
          minimum={1}
          onMinus={() => onChange("bathrooms", -1)}
          onPlus={() => onChange("bathrooms", 1)}
        />
      </View>
    </>
  );
}

function PricingAmenitiesStep({
  weekdayPrice,
  setWeekdayPrice,
  weekendPrice,
  setWeekendPrice,
  amenities,
  toggleAmenity,
}: {
  weekdayPrice: string;
  setWeekdayPrice: (value: string) => void;
  weekendPrice: string;
  setWeekendPrice: (value: string) => void;
  amenities: string[];
  toggleAmenity: (amenity: string) => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Pricing and amenities"
        title="Set your price and facilities"
        description="Guests will see the nightly price and available amenities."
      />

      <View style={styles.priceCard}>
        <Text style={styles.priceCardTitle}>
          Nightly pricing
        </Text>

        <FormField
          label="Weekday price"
          value={weekdayPrice}
          onChangeText={(value) =>
            setWeekdayPrice(
              value.replace(/[^0-9.]/g, "")
            )
          }
          placeholder="4500"
          keyboardType="decimal-pad"
          prefix="₹"
        />

        <FormField
          label="Weekend price"
          value={weekendPrice}
          onChangeText={(value) =>
            setWeekendPrice(
              value.replace(/[^0-9.]/g, "")
            )
          }
          placeholder={
            weekdayPrice || "Optional weekend price"
          }
          keyboardType="decimal-pad"
          prefix="₹"
          helper="Leave empty to use the weekday price."
        />
      </View>

      <Text style={styles.fieldSectionLabel}>
        Amenities
      </Text>

      <View style={styles.amenitiesGrid}>
        {AMENITIES.map((amenity) => {
          const selected = amenities.includes(amenity);

          return (
            <Pressable
              key={amenity}
              style={[
                styles.amenityOption,
                selected &&
                  styles.amenityOptionSelected,
              ]}
              onPress={() => toggleAmenity(amenity)}
            >
              <View
                style={[
                  styles.amenityCheck,
                  selected &&
                    styles.amenityCheckSelected,
                ]}
              >
                {selected && (
                  <Text
                    style={styles.amenityCheckText}
                  >
                    ✓
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.amenityText,
                  selected &&
                    styles.amenityTextSelected,
                ]}
              >
                {amenity}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function PhotoReviewStep({
  images,
  pickImages,
  removeImage,
  title,
  location,
  weekdayPrice,
  guests,
  bedrooms,
  bathrooms,
  uploadingImages,
}: {
  images: ListingImage[];
  pickImages: () => void;
  removeImage: (index: number) => void;
  title: string;
  location: string;
  weekdayPrice: string;
  guests: number;
  bedrooms: number;
  bathrooms: number;
  uploadingImages: boolean;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Photos and review"
        title="Show guests your property"
        description="Upload at least 5 clear photos. The first image becomes the cover."
      />

      <Pressable
        style={({ pressed }) => [
          styles.photoUpload,
          pressed && styles.photoUploadPressed,
        ]}
        onPress={pickImages}
        disabled={uploadingImages}
      >
        <View style={styles.photoUploadIcon}>
          <Camera size={27} color={THEME} />
        </View>

        <Text style={styles.photoUploadTitle}>
          Add property photos
        </Text>

        <Text style={styles.photoUploadText}>
          Upload 5–10 landscape or portrait photos
        </Text>

        <Text style={styles.photoCount}>
          {images.length}/10 selected
        </Text>
      </Pressable>

      {images.length > 0 && (
        <View style={styles.photoGrid}>
          {images.map((image, index) => (
            <View
              key={`${image.uri}-${index}`}
              style={styles.photoItem}
            >
              <Image
                source={{ uri: image.uri }}
                style={styles.photoImage}
              />

              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>
                    Cover
                  </Text>
                </View>
              )}

              <Pressable
                style={styles.removePhotoButton}
                onPress={() => removeImage(index)}
              >
                <X size={15} color={WHITE} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.fieldSectionLabel}>
        Listing preview
      </Text>

      <View style={styles.previewCard}>
        {images[0] ? (
          <Image
            source={{ uri: images[0].uri }}
            style={styles.previewImage}
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Camera size={25} color="#9aa0a6" />
          </View>
        )}

        <View style={styles.previewContent}>
          <Text
            numberOfLines={2}
            style={styles.previewTitle}
          >
            {title || "Your stay title"}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.previewLocation}
          >
            {location || "Property location"}
          </Text>

          <Text style={styles.previewDetails}>
            {guests} guests · {bedrooms} bedrooms ·{" "}
            {bathrooms} bathrooms
          </Text>

          <Text style={styles.previewPrice}>
            ₹
            {Number(
              weekdayPrice || 0
            ).toLocaleString("en-IN")}{" "}
            <Text style={styles.previewPriceSuffix}>
              / night
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.reviewNotice}>
        <ShieldCheck size={21} color={THEME} />

        <Text style={styles.reviewNoticeText}>
          Your listing will be submitted as Pending and
          becomes public only after admin approval.
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: any;
  multiline?: boolean;
  helper?: string;
  prefix?: string;
}) {
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
          <Text style={styles.inputPrefix}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9aa0a6"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={
            multiline ? "top" : "center"
          }
          style={[
            styles.input,
            multiline && styles.inputMultiline,
          ]}
        />
      </View>

      {helper ? (
        <Text style={styles.fieldHelper}>
          {helper}
        </Text>
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
}: {
  title: string;
  description: string;
  value: number;
  minimum: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterContent}>
        <Text style={styles.counterTitle}>
          {title}
        </Text>

        <Text style={styles.counterDescription}>
          {description}
        </Text>
      </View>

      <View style={styles.counterActions}>
        <Pressable
          style={[
            styles.counterButton,
            value <= minimum &&
              styles.counterButtonDisabled,
          ]}
          onPress={onMinus}
          disabled={value <= minimum}
        >
          <Minus size={17} color={TEXT} />
        </Pressable>

        <Text style={styles.counterValue}>
          {value}
        </Text>

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
    backgroundColor: WHITE,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 12,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
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

  fieldSectionLabel: {
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

  typeOptionText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  typeOptionTextSelected: {
    fontFamily: "Inter_600SemiBold",
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
    backgroundColor: WHITE,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  inputWrapMultiline: {
    minHeight: 150,
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
    minHeight: 145,
    paddingTop: 14,
  },

  fieldHelper: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
  },

  column: {
    flex: 1,
  },

  locationNotice: {
    marginBottom: 22,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  locationNoticeText: {
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
    backgroundColor: WHITE,
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

  counterButtonDisabled: {
    opacity: 0.3,
  },

  counterValue: {
    width: 24,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: TEXT,
    textAlign: "center",
  },

  counterDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
  },

  priceCard: {
    borderRadius: 22,
    backgroundColor: SURFACE,
    padding: 17,
    marginBottom: 26,
  },

  priceCardTitle: {
    marginBottom: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  amenityOption: {
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

  amenityOptionSelected: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  amenityCheck: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: "#c8cdd2",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  amenityCheckSelected: {
    borderColor: THEME,
    backgroundColor: THEME,
  },

  amenityCheckText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: WHITE,
  },

  amenityText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  amenityTextSelected: {
    color: THEME,
  },

  photoUpload: {
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

  photoUploadPressed: {
    backgroundColor: THEME_LIGHT,
  },

  photoUploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  photoUploadTitle: {
    marginTop: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: TEXT,
  },

  photoUploadText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  photoCount: {
    marginTop: 9,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: THEME,
  },

  photoGrid: {
    marginTop: 16,
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

  photoImage: {
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

  coverBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: THEME,
  },

  removePhotoButton: {
    position: "absolute",
    right: 8,
    top: 8,
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
    backgroundColor: WHITE,
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

  previewDetails: {
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

  previousButton: {
    minWidth: 90,
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  previousButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  nextButton: {
    flex: 1,
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  nextButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.99 }],
  },

  nextButtonDisabled: {
    opacity: 0.7,
  },

  nextButtonText: {
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
