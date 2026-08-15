import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Star,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import api from "../../api/api";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

type ReviewCategory =
  | "cleanliness"
  | "accuracy"
  | "communication"
  | "location"
  | "checkin"
  | "value";

type ReviewParams = {
  id?: string | string[];
  bookingId?: string | string[];
};

type CategoryRatings = Record<ReviewCategory, number>;

const categories: Array<{
  key: ReviewCategory;
  title: string;
  subtitle: string;
}> = [
  {
    key: "cleanliness",
    title: "Cleanliness",
    subtitle: "How clean and well maintained was the stay?",
  },
  {
    key: "accuracy",
    title: "Accuracy",
    subtitle: "Did the listing match the photos and description?",
  },
  {
    key: "communication",
    title: "Communication",
    subtitle: "How responsive and helpful was the host?",
  },
  {
    key: "location",
    title: "Location",
    subtitle: "How convenient and suitable was the location?",
  },
  {
    key: "checkin",
    title: "Check-in",
    subtitle: "How smooth was the arrival and check-in process?",
  },
  {
    key: "value",
    title: "Value",
    subtitle: "Was the stay worth the price paid?",
  },
];

function getParam(
  value: string | string[] | undefined,
  fallback = ""
): string {
  if (Array.isArray(value)) return value[0] || fallback;
  return value || fallback;
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<ReviewParams>();

  const propertyId = getParam(params.id);
  const bookingId = getParam(params.bookingId);

  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");

  const [categoryRatings, setCategoryRatings] =
    useState<CategoryRatings>({
      cleanliness: 5,
      accuracy: 5,
      communication: 5,
      location: 5,
      checkin: 5,
      value: 5,
    });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const charactersRemaining = useMemo(
    () => Math.max(0, 1000 - review.length),
    [review.length]
  );

  const updateCategoryRating = (
    key: ReviewCategory,
    value: number
  ) => {
    setCategoryRatings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateReview = () => {
    if (!propertyId || !bookingId) {
      Alert.alert(
        "Booking information missing",
        "Please open the review screen from your completed trip."
      );
      return false;
    }

    if (rating < 1 || rating > 5) {
      Alert.alert("Rating required", "Choose an overall rating.");
      return false;
    }

    if (review.trim().length < 10) {
      Alert.alert(
        "Tell us more",
        "Please write at least 10 characters about your stay."
      );
      return false;
    }

    return true;
  };

  const submitReview = async () => {
    if (submitting || !validateReview()) return;

    try {
      setSubmitting(true);

      await api.post("/reviews", {
        property_id: Number(propertyId),
        booking_id: Number(bookingId),

        rating,
        review: review.trim(),

        cleanliness_rating: categoryRatings.cleanliness,
        accuracy_rating: categoryRatings.accuracy,
        communication_rating: categoryRatings.communication,
        location_rating: categoryRatings.location,
        checkin_rating: categoryRatings.checkin,
        value_rating: categoryRatings.value,
      });

      setSubmitted(true);
    } catch (error: any) {
      console.log(
        "Review submit error:",
        error?.response?.data || error?.message || error
      );

      if (error?.response?.status === 409) {
        Alert.alert(
          "Review already submitted",
          error?.response?.data?.message ||
            "You already reviewed this booking."
        );
        return;
      }

      if (error?.response?.status === 403) {
        Alert.alert(
          "Review unavailable",
          error?.response?.data?.message ||
            "Reviews can be submitted after the stay is completed."
        );
        return;
      }

      Alert.alert(
        "Could not submit review",
        error?.response?.data?.message ||
          "Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successPage}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={38} color={THEME} />
          </View>

          <Text style={styles.successTitle}>
            Thank you for your review
          </Text>

          <Text style={styles.successText}>
            Your feedback helps hosts improve and helps other guests
            make informed decisions.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() =>
              router.replace(`/trip/${bookingId}`)
            }
          >
            <Text style={styles.primaryButtonText}>
              Back to trip
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.secondaryButtonText}>
              Explore more stays
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={TEXT} />
          </Pressable>

          <Text style={styles.headerTitle}>Write a review</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Share your experience</Text>

            <Text style={styles.title}>
              How was your stay?
            </Text>

            <Text style={styles.subtitle}>
              Your honest feedback helps future guests and supports
              better hosting standards.
            </Text>
          </View>

          <View style={styles.overallCard}>
            <Text style={styles.overallTitle}>
              Overall rating
            </Text>

            <Text style={styles.overallSubtitle}>
              Tap a star to rate your experience.
            </Text>

            <StarRating
              value={rating}
              onChange={setRating}
              size={36}
            />

            <Text style={styles.ratingLabel}>
              {rating === 5
                ? "Excellent"
                : rating === 4
                  ? "Very good"
                  : rating === 3
                    ? "Good"
                    : rating === 2
                      ? "Needs improvement"
                      : "Poor"}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Rate specific areas
          </Text>

          <View style={styles.categoryCard}>
            {categories.map((category, index) => (
              <View key={category.key}>
                <CategoryRatingRow
                  title={category.title}
                  subtitle={category.subtitle}
                  value={categoryRatings[category.key]}
                  onChange={(value) =>
                    updateCategoryRating(category.key, value)
                  }
                />

                {index < categories.length - 1 && (
                  <View style={styles.rowDivider} />
                )}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            Tell us about your stay
          </Text>

          <View style={styles.reviewBox}>
            <TextInput
              value={review}
              onChangeText={(value) =>
                setReview(value.slice(0, 1000))
              }
              placeholder="What did you enjoy? Was the listing accurate? How was the host?"
              placeholderTextColor="#80868b"
              multiline
              textAlignVertical="top"
              maxLength={1000}
              style={styles.reviewInput}
            />

            <View style={styles.characterRow}>
              <Text style={styles.characterHint}>
                Minimum 10 characters
              </Text>

              <Text style={styles.characterCount}>
                {charactersRemaining} remaining
              </Text>
            </View>
          </View>

          <View style={styles.guidelineBox}>
            <Text style={styles.guidelineTitle}>
              Review guidelines
            </Text>

            <Text style={styles.guidelineText}>
              Keep your feedback honest, respectful and focused on
              your personal experience. Avoid sharing private contact
              information.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed &&
                !submitting &&
                styles.submitButtonPressed,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={submitReview}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={WHITE} />
            ) : (
              <>
                <Send size={18} color={WHITE} />
                <Text style={styles.submitButtonText}>
                  Submit review
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StarRating({
  value,
  onChange,
  size = 26,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= value;

        return (
          <Pressable
            key={star}
            accessibilityRole="button"
            accessibilityLabel={`${star} star rating`}
            hitSlop={8}
            onPress={() => onChange(star)}
            style={({ pressed }) => [
              styles.starButton,
              pressed && styles.starButtonPressed,
            ]}
          >
            <Star
              size={size}
              color={selected ? THEME : "#c8cdd2"}
              fill={selected ? THEME : "transparent"}
              strokeWidth={1.8}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryRatingRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryText}>
        <Text style={styles.categoryTitle}>{title}</Text>

        <Text style={styles.categorySubtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.smallStars}>
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = star <= value;

          return (
            <Pressable
              key={star}
              hitSlop={5}
              onPress={() => onChange(star)}
            >
              <Star
                size={20}
                color={selected ? THEME : "#d2d6db"}
                fill={selected ? THEME : "transparent"}
                strokeWidth={1.8}
              />
            </Pressable>
          );
        })}
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
    height: 64,
    paddingHorizontal: 14,
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
    paddingTop: 22,
    paddingBottom: 126,
  },

  intro: {
    paddingBottom: 24,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: THEME,
  },

  title: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.9,
    color: TEXT,
  },

  subtitle: {
    marginTop: 9,
    maxWidth: 340,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
  },

  overallCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    padding: 20,
    alignItems: "center",
  },

  overallTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  overallSubtitle: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
  },

  starRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  starButton: {
    padding: 2,
  },

  starButtonPressed: {
    transform: [{ scale: 0.9 }],
  },

  ratingLabel: {
    marginTop: 15,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
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

  categoryCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    paddingHorizontal: 17,
  },

  categoryRow: {
    minHeight: 104,
    paddingVertical: 17,
  },

  categoryText: {
    flex: 1,
  },

  categoryTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  categorySubtitle: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: MUTED,
  },

  smallStars: {
    marginTop: 13,
    flexDirection: "row",
    gap: 8,
  },

  rowDivider: {
    height: 1,
    backgroundColor: "#f1f3f4",
  },

  reviewBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  reviewInput: {
    minHeight: 160,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: TEXT,
  },

  characterRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  characterHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  characterCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  guidelineBox: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    padding: 16,
  },

  guidelineTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  guidelineText: {
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
    minHeight: 84,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: WHITE,
  },

  submitButton: {
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  submitButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.99 }],
  },

  submitButtonDisabled: {
    opacity: 0.7,
  },

  submitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  successPage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  successIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  successTitle: {
    marginTop: 24,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 24,
    lineHeight: 32,
    color: TEXT,
    textAlign: "center",
  },

  successText: {
    marginTop: 10,
    maxWidth: 320,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 26,
    minWidth: 170,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  primaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: WHITE,
  },

  secondaryButton: {
    marginTop: 12,
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
  },
});