import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import {
  Check,
  ChevronLeft,
  Globe2,
  IndianRupee,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#eef4ff";

const TEXT = "#202124";
const MUTED = "#5f6368";
const BORDER = "#e5e7eb";
const WHITE = "#ffffff";
const SURFACE = "#f8fafc";

const LANGUAGE_STORAGE_KEY = "dovail_language";
const CURRENCY_STORAGE_KEY = "dovail_currency";

type LanguageCode = "en" | "ar" | "hi" | "ml";
type CurrencyCode = "INR" | "SAR" | "USD" | "AED";

type LanguageOption = {
  code: LanguageCode;
  name: string;
  nativeName: string;
};

type CurrencyOption = {
  code: CurrencyCode;
  symbol: string;
  name: string;
};

const languages: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
  },
];

const currencies: CurrencyOption[] = [
  {
    code: "INR",
    symbol: "₹",
    name: "Indian rupee",
  },
  {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi riyal",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US dollar",
  },
  {
    code: "AED",
    symbol: "د.إ",
    name: "UAE dirham",
  },
];

export default function PreferencesScreen() {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);

      const [savedLanguage, savedCurrency] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
        AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
      ]);

      if (
        savedLanguage &&
        languages.some((item) => item.code === savedLanguage)
      ) {
        setLanguage(savedLanguage as LanguageCode);
      }

      if (
        savedCurrency &&
        currencies.some((item) => item.code === savedCurrency)
      ) {
        setCurrency(savedCurrency as CurrencyCode);
      }
    } catch (error) {
      console.log("Preferences load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const selectedLanguage = useMemo(() => {
    return (
      languages.find((item) => item.code === language) ||
      languages[0]
    );
  }, [language]);

  const selectedCurrency = useMemo(() => {
    return (
      currencies.find((item) => item.code === currency) ||
      currencies[0]
    );
  }, [currency]);

  const saveLanguage = async (nextLanguage: LanguageCode) => {
    try {
      setSaving(true);

      await AsyncStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        nextLanguage
      );

      setLanguage(nextLanguage);
      setLanguageModalOpen(false);
    } catch (error) {
      Alert.alert(
        "Could not save language",
        "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCurrency = async (nextCurrency: CurrencyCode) => {
    try {
      setSaving(true);

      await AsyncStorage.setItem(
        CURRENCY_STORAGE_KEY,
        nextCurrency
      );

      setCurrency(nextCurrency);
      setCurrencyModalOpen(false);
    } catch (error) {
      Alert.alert(
        "Could not save currency",
        "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <PreferencesSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={TEXT} />
        </Pressable>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            Language and currency
          </Text>

          <Text style={styles.headerSubtitle}>
            Personalise your Dovail Stay experience
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Globe2 size={25} color={THEME} />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              Regional preferences
            </Text>

            <Text style={styles.introText}>
              Choose the language and currency used throughout the
              mobile app.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Language</Text>

        <Pressable
          style={({ pressed }) => [
            styles.preferenceCard,
            pressed && styles.preferenceCardPressed,
          ]}
          onPress={() => setLanguageModalOpen(true)}
        >
          <View style={styles.preferenceIcon}>
            <Globe2 size={21} color={THEME} />
          </View>

          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceLabel}>
              App language
            </Text>

            <Text style={styles.preferenceValue}>
              {selectedLanguage.name}
            </Text>

            <Text style={styles.preferenceDescription}>
              {selectedLanguage.nativeName}
            </Text>
          </View>

          <ChevronLeft
            size={19}
            color="#9aa0a6"
            style={styles.chevronRight}
          />
        </Pressable>

        <Text style={styles.sectionTitle}>Currency</Text>

        <Pressable
          style={({ pressed }) => [
            styles.preferenceCard,
            pressed && styles.preferenceCardPressed,
          ]}
          onPress={() => setCurrencyModalOpen(true)}
        >
          <View style={styles.preferenceIcon}>
            <IndianRupee size={21} color={THEME} />
          </View>

          <View style={styles.preferenceContent}>
            <Text style={styles.preferenceLabel}>
              Display currency
            </Text>

            <Text style={styles.preferenceValue}>
              {selectedCurrency.code} · {selectedCurrency.symbol}
            </Text>

            <Text style={styles.preferenceDescription}>
              {selectedCurrency.name}
            </Text>
          </View>

          <ChevronLeft
            size={19}
            color="#9aa0a6"
            style={styles.chevronRight}
          />
        </Pressable>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Price preview</Text>

          <Text style={styles.previewAmount}>
            {selectedCurrency.symbol}
            {selectedCurrency.code === "INR"
              ? "4,500"
              : selectedCurrency.code === "SAR"
                ? "199"
                : selectedCurrency.code === "AED"
                  ? "195"
                  : "53"}
          </Text>

          <Text style={styles.previewSuffix}>per night</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            Important
          </Text>

          <Text style={styles.infoText}>
            Currency selection changes how prices are displayed.
            Final charges may still be processed in the property or
            payment provider’s supported currency.
          </Text>
        </View>

        <Text style={styles.footerText}>
          More languages and currencies can be added as the Dovail
          Stay mobile app expands.
        </Text>
      </ScrollView>

      <OptionModal
        visible={languageModalOpen}
        title="Choose language"
        onClose={() => setLanguageModalOpen(false)}
      >
        {languages.map((item) => {
          const selected = item.code === language;

          return (
            <Pressable
              key={item.code}
              style={({ pressed }) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                pressed && styles.optionRowPressed,
              ]}
              onPress={() => saveLanguage(item.code)}
              disabled={saving}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{item.name}</Text>

                <Text style={styles.optionSubtitle}>
                  {item.nativeName}
                </Text>
              </View>

              <SelectionCircle selected={selected} />
            </Pressable>
          );
        })}
      </OptionModal>

      <OptionModal
        visible={currencyModalOpen}
        title="Choose currency"
        onClose={() => setCurrencyModalOpen(false)}
      >
        {currencies.map((item) => {
          const selected = item.code === currency;

          return (
            <Pressable
              key={item.code}
              style={({ pressed }) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                pressed && styles.optionRowPressed,
              ]}
              onPress={() => saveCurrency(item.code)}
              disabled={saving}
            >
              <View style={styles.currencySymbol}>
                <Text style={styles.currencySymbolText}>
                  {item.symbol}
                </Text>
              </View>

              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  {item.code}
                </Text>

                <Text style={styles.optionSubtitle}>
                  {item.name}
                </Text>
              </View>

              <SelectionCircle selected={selected} />
            </Pressable>
          );
        })}
      </OptionModal>
    </SafeAreaView>
  );
}

function OptionModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={styles.modalDismissArea}
          onPress={onClose}
        />

        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>

            <Pressable
              style={styles.modalDoneButton}
              onPress={onClose}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsList}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
      {selected && (
        <Check size={14} color={WHITE} strokeWidth={3} />
      )}
    </View>
  );
}

function PreferencesSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader} />

      <View style={styles.skeletonIntro} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonPreference} />

      <View style={styles.skeletonSectionTitle} />
      <View style={styles.skeletonPreference} />

      <View style={styles.skeletonPreview} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  header: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  },

  headerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  headerSubtitle: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 42,
  },

  introCard: {
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  introText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: MUTED,
  },

  sectionTitle: {
    marginTop: 28,
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 19,
    color: TEXT,
  },

  preferenceCard: {
    minHeight: 94,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  preferenceCardPressed: {
    backgroundColor: SURFACE,
  },

  preferenceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  preferenceContent: {
    flex: 1,
  },

  preferenceLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
    textTransform: "uppercase",
  },

  preferenceValue: {
    marginTop: 5,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  preferenceDescription: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  chevronRight: {
    transform: [{ rotate: "180deg" }],
  },

  previewCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: SURFACE,
    padding: 20,
    alignItems: "center",
  },

  previewTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  previewAmount: {
    marginTop: 9,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 31,
    color: TEXT,
  },

  previewSuffix: {
    marginTop: 3,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: MUTED,
  },

  infoBox: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: THEME_LIGHT,
    padding: 16,
  },

  infoTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  infoText: {
    marginTop: 6,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  footerText: {
    marginTop: 24,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: "#9aa0a6",
    textAlign: "center",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  modalDismissArea: {
    flex: 1,
  },

  modalSheet: {
    maxHeight: "76%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: WHITE,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginTop: 10,
  },

  modalHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  modalDoneButton: {
    minHeight: 42,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalDoneText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: THEME,
  },

  optionsList: {
    paddingBottom: 8,
  },

  optionRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  optionRowSelected: {
    backgroundColor: "#fbfdff",
  },

  optionRowPressed: {
    opacity: 0.72,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: TEXT,
  },

  optionSubtitle: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  currencySymbol: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  currencySymbolText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: THEME,
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

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
  },

  skeletonHeader: {
    width: "62%",
    height: 22,
    borderRadius: 8,
    backgroundColor: "#eceff1",
    alignSelf: "center",
  },

  skeletonIntro: {
    height: 130,
    marginTop: 28,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },

  skeletonSectionTitle: {
    width: "34%",
    height: 20,
    marginTop: 30,
    marginBottom: 13,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonPreference: {
    width: "100%",
    height: 94,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },

  skeletonPreview: {
    width: "100%",
    height: 140,
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
  },
});