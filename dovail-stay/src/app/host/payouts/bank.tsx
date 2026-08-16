import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
    CheckCircle2,
    ChevronLeft,
    Landmark,
    Save,
    ShieldCheck,
} from "lucide-react-native";
import {
    useCallback,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

const THEME = "#2DB281";
const THEME_DARK = "#21845F";
const THEME_LIGHT = "#edf3ff";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";
const WHITE = "#ffffff";
const SUCCESS = "#177a45";
const WARNING = "#a96300";
const DANGER = "#bd3434";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type BankAccount = {
  id?: number | string;
  account_holder_name?: string;
  bank_name?: string;
  account_number?: string;
  account_last4?: string;
  ifsc?: string;
  status?: string;
};

type BankForm = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
};

const EMPTY_FORM: BankForm = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
};

const normalizeStatus = (value?: string) =>
  String(value || "").trim().toLowerCase();

const maskAccount = (
  accountNumber?: string,
  last4?: string
) => {
  const digits =
    last4 ||
    accountNumber?.replace(/\D/g, "").slice(-4) ||
    "";

  return digits ? `•••• ${digits}` : "Not added";
};

const getObjectFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  for (const key of [
    ...keys,
    "data",
    "bank",
    "account",
  ]) {
    const value = record[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value as T;
    }
  }

  return payload as T;
};

const sanitizeAccountNumber = (value: string) =>
  value.replace(/\D/g, "").slice(0, 18);

const sanitizeIfsc = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 11);

const isValidIfsc = (value: string) =>
  /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);

export default function HostBankAccountScreen() {
  const [account, setAccount] =
    useState<BankAccount | null>(null);

  const [form, setForm] =
    useState<BankForm>(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadBankAccount = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const user =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        user?.id ?? user?.user_id;

      if (!hostId) {
        router.replace("/login");
        return;
      }

      const response = await api.get(
        "/host/payouts/bank",
        {
          params: { hostId },
        }
      );

      const loaded =
        getObjectFromResponse<BankAccount>(
          response.data
        );

      if (!loaded) {
        setAccount(null);
        setForm(EMPTY_FORM);
        return;
      }

      setAccount(loaded);

      setForm({
        accountHolderName:
          loaded.account_holder_name || "",
        bankName: loaded.bank_name || "",
        accountNumber: "",
        confirmAccountNumber: "",
        ifsc: loaded.ifsc || "",
      });
    } catch (requestError: any) {
      if (
        requestError?.response?.status === 404
      ) {
        setAccount(null);
        setForm(EMPTY_FORM);
      } else {
        setError(
          requestError?.response?.data?.message ||
            "We could not load your bank account."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBankAccount();
    }, [loadBankAccount])
  );

  const updateForm = (
    key: keyof BankForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (!form.accountHolderName.trim()) {
      return "Enter the account holder name.";
    }

    if (!form.bankName.trim()) {
      return "Enter the bank name.";
    }

    if (!form.accountNumber) {
      return "Enter the account number.";
    }

    if (
      form.accountNumber.length < 8
    ) {
      return "Enter a valid account number.";
    }

    if (
      form.accountNumber !==
      form.confirmAccountNumber
    ) {
      return "Account numbers do not match.";
    }

    if (!isValidIfsc(form.ifsc)) {
      return "Enter a valid IFSC code.";
    }

    return "";
  };

  const saveAccount = async () => {
    if (saving) return;

    const validationError =
      validateForm();

    if (validationError) {
      Alert.alert(
        "Check bank details",
        validationError
      );
      return;
    }

    try {
      setSaving(true);

      const user =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        user?.id ?? user?.user_id;

      if (!hostId) {
        throw new Error(
          "Please sign in again."
        );
      }

      const payload = {
        host_id: Number(hostId),
        account_holder_name:
          form.accountHolderName.trim(),
        bank_name: form.bankName.trim(),
        account_number:
          form.accountNumber,
        ifsc: form.ifsc.trim(),
      };

      let response;

      if (account?.id) {
        response = await api.put(
          "/host/payouts/bank",
          payload
        );
      } else {
        response = await api.post(
          "/host/payouts/bank",
          payload
        );
      }

      const saved =
        getObjectFromResponse<BankAccount>(
          response.data
        ) || {
          ...payload,
          id: account?.id,
          status: "Pending verification",
        };

      setAccount(saved);

      setForm((current) => ({
        ...current,
        accountNumber: "",
        confirmAccountNumber: "",
      }));

      Alert.alert(
        "Bank account saved",
        "Your payout account was updated successfully.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                "/host/payouts"
              ),
          },
        ]
      );
    } catch (requestError: any) {
      Alert.alert(
        "Save failed",
        requestError?.response?.data?.message ||
          requestError?.message ||
          "We could not save your bank account."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmSave = () => {
    Alert.alert(
      "Save payout account?",
      "Make sure the account holder name, account number and IFSC are correct.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Save",
          onPress: saveAccount,
        },
      ]
    );
  };

  const verifyAccount = async () => {
    if (!account || verifying) return;

    try {
      setVerifying(true);

      const response = await api.post(
        "/host/payouts/bank/verify",
        {
          bank_account_id: account.id,
        }
      );

      const updated =
        getObjectFromResponse<BankAccount>(
          response.data
        );

      setAccount((current) => ({
        ...current,
        ...updated,
        status:
          updated?.status || "Verified",
      }));

      Alert.alert(
        "Verification requested",
        "Your bank account verification has started."
      );
    } catch (requestError: any) {
      Alert.alert(
        "Verification failed",
        requestError?.response?.data?.message ||
          "We could not verify the account."
      );
    } finally {
      setVerifying(false);
    }
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
            Loading bank account...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const verified =
    normalizeStatus(account?.status) ===
    "verified";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <KeyboardAvoidingView
        style={styles.page}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.backButtonPressed,
            ]}
          >
            <ChevronLeft
              size={24}
              color={TEXT}
            />
          </Pressable>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Bank account
            </Text>

            <Text style={styles.headerSubtitle}>
              Manage your payout destination
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          {account ? (
            <View style={styles.currentCard}>
              <View style={styles.currentIcon}>
                <Landmark
                  size={25}
                  color={THEME}
                />
              </View>

              <View style={styles.currentContent}>
                <Text style={styles.currentLabel}>
                  CURRENT PAYOUT ACCOUNT
                </Text>

                <Text style={styles.currentBank}>
                  {account.bank_name ||
                    "Bank account"}
                </Text>

                <Text
                  style={styles.currentNumber}
                >
                  {maskAccount(
                    account.account_number,
                    account.account_last4
                  )}
                </Text>

                <View style={styles.statusRow}>
                  <CheckCircle2
                    size={15}
                    color={
                      verified
                        ? SUCCESS
                        : WARNING
                    }
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: verified
                          ? SUCCESS
                          : WARNING,
                      },
                    ]}
                  >
                    {account.status ||
                      "Pending verification"}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {account && !verified ? (
            <Pressable
              onPress={verifyAccount}
              disabled={verifying}
              style={({ pressed }) => [
                styles.verifyButton,
                pressed &&
                  !verifying &&
                  styles.verifyButtonPressed,
              ]}
            >
              {verifying ? (
                <ActivityIndicator
                  size="small"
                  color={THEME}
                />
              ) : (
                <>
                  <ShieldCheck
                    size={18}
                    color={THEME}
                  />

                  <Text
                    style={
                      styles.verifyButtonText
                    }
                  >
                    Verify bank account
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>
            {account
              ? "Change bank account"
              : "Add bank account"}
          </Text>

          <View style={styles.formCard}>
            <FormField
              label="Account holder name"
              value={
                form.accountHolderName
              }
              onChangeText={(value) =>
                updateForm(
                  "accountHolderName",
                  value
                )
              }
              placeholder="Enter full name"
              autoCapitalize="words"
            />

            <FormField
              label="Bank name"
              value={form.bankName}
              onChangeText={(value) =>
                updateForm(
                  "bankName",
                  value
                )
              }
              placeholder="Enter bank name"
              autoCapitalize="words"
            />

            <FormField
              label="Account number"
              value={form.accountNumber}
              onChangeText={(value) =>
                updateForm(
                  "accountNumber",
                  sanitizeAccountNumber(value)
                )
              }
              placeholder="Enter account number"
              keyboardType="number-pad"
              secureTextEntry
            />

            <FormField
              label="Confirm account number"
              value={
                form.confirmAccountNumber
              }
              onChangeText={(value) =>
                updateForm(
                  "confirmAccountNumber",
                  sanitizeAccountNumber(value)
                )
              }
              placeholder="Re-enter account number"
              keyboardType="number-pad"
              secureTextEntry
            />

            <FormField
              label="IFSC code"
              value={form.ifsc}
              onChangeText={(value) =>
                updateForm(
                  "ifsc",
                  sanitizeIfsc(value)
                )
              }
              placeholder="ABCD0123456"
              autoCapitalize="characters"
              last
            />
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.securityCard}>
            <ShieldCheck
              size={21}
              color={THEME}
            />

            <Text style={styles.securityText}>
              Your bank details are encrypted and used only for host payouts.
            </Text>
          </View>

          <Pressable
            onPress={confirmSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed &&
                !saving &&
                styles.saveButtonPressed,
              saving &&
                styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color={WHITE}
              />
            ) : (
              <>
                <Save
                  size={19}
                  color={WHITE}
                />

                <Text
                  style={styles.saveButtonText}
                >
                  Save bank account
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  secureTextEntry = false,
  last = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?:
    | "default"
    | "number-pad";
  autoCapitalize?:
    | "none"
    | "words"
    | "characters";
  secureTextEntry?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.field,
        last && styles.fieldLast,
      ]}
    >
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa0a6"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
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
    backgroundColor: BACKGROUND,
  },

  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    paddingHorizontal: 16,
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
  },

  headerTitle: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 20,
  },

  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 42,
  },

  loadingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  currentCard: {
    minHeight: 124,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  currentIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  currentContent: {
    flex: 1,
    marginLeft: 13,
  },

  currentLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
  },

  currentBank: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
    marginTop: 6,
  },

  currentNumber: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 4,
  },

  statusRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },

  verifyButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  verifyButtonPressed: {
    opacity: 0.72,
  },

  verifyButtonText: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  sectionTitle: {
    color: TEXT,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
    marginTop: 24,
    marginBottom: 11,
  },

  formCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 15,
  },

  field: {
    minHeight: 86,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    justifyContent: "center",
  },

  fieldLast: {
    borderBottomWidth: 0,
  },

  fieldLabel: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    marginBottom: 7,
  },

  input: {
    minHeight: 40,
    paddingVertical: 0,
    color: TEXT,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  errorCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#efcccc",
    borderRadius: 14,
    backgroundColor: "#fff6f6",
    padding: 13,
  },

  errorText: {
    color: DANGER,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },

  securityCard: {
    marginTop: 14,
    borderRadius: 15,
    backgroundColor: THEME_LIGHT,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },

  securityText: {
    flex: 1,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  saveButton: {
    minHeight: 52,
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: THEME,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonPressed: {
    backgroundColor: THEME_DARK,
    transform: [{ scale: 0.98 }],
  },

  saveButtonDisabled: {
    opacity: 0.68,
  },

  saveButtonText: {
    color: WHITE,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});