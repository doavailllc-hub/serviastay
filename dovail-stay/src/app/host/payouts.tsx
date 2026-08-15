import { router, useFocusEffect } from "expo-router";
import {
    Building2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    Download,
    Landmark,
    RefreshCw,
    ShieldCheck,
    WalletCards
} from "lucide-react-native";
import {
    useCallback,
    useMemo,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#3b71e6";
const THEME_DARK = "#2f5fc2";
const THEME_LIGHT = "#edf3ff";
const BACKGROUND = "#f7f8fa";
const BORDER = "#e5e7eb";
const TEXT = "#172033";
const MUTED = "#687386";
const WHITE = "#ffffff";
const SUCCESS = "#177a45";
const WARNING = "#a96300";
const DANGER = "#bd3434";

type ScheduleType = "daily" | "weekly" | "monthly";
type PayoutFilter = "all" | "completed" | "processing" | "failed";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type BankAccount = {
  bank_name?: string;
  account_holder_name?: string;
  account_number?: string;
  account_last4?: string;
  ifsc?: string;
  status?: string;
};

type TaxInfo = {
  pan?: string;
  gst?: string;
  status?: string;
};

type PayoutSummary = {
  available_balance?: number | string;
  next_payout_amount?: number | string;
  next_payout_date?: string;
  lifetime_earnings?: number | string;
  pending_amount?: number | string;
  payout_schedule?: ScheduleType | string;
  bank_account?: BankAccount;
  tax_info?: TaxInfo;
};

type PayoutItem = {
  id: number | string;
  payout_id?: number | string;
  amount?: number | string;
  fees?: number | string;
  tax?: number | string;
  net_amount?: number | string;
  status?: string;
  reference?: string;
  created_at?: string;
  paid_at?: string;
  scheduled_at?: string;
  bank_name?: string;
  account_last4?: string;
};

const FILTERS: PayoutFilter[] = [
  "all",
  "completed",
  "processing",
  "failed",
];

const SCHEDULES: ScheduleType[] = [
  "daily",
  "weekly",
  "monthly",
];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (value?: string) =>
  String(value || "").trim().toLowerCase();

const getArrayFromResponse = <T,>(
  payload: unknown,
  keys: string[] = []
): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  for (const key of [
    ...keys,
    "data",
    "items",
    "results",
    "payouts",
    "history",
  ]) {
    const value = record[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
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
    "summary",
    "payout",
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

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

const getPayoutStatusTheme = (status?: string) => {
  const normalized = normalizeStatus(status);

  if (
    ["completed", "paid", "success"].includes(
      normalized
    )
  ) {
    return {
      label: status || "Completed",
      backgroundColor: "#e9f7ef",
      textColor: SUCCESS,
    };
  }

  if (
    ["failed", "rejected", "cancelled"].includes(
      normalized
    )
  ) {
    return {
      label: status || "Failed",
      backgroundColor: "#fdecec",
      textColor: DANGER,
    };
  }

  return {
    label: status || "Processing",
    backgroundColor: "#fff4dc",
    textColor: WARNING,
  };
};

const getPayoutNet = (item: PayoutItem) => {
  const explicit = toNumber(item.net_amount);

  if (explicit > 0) return explicit;

  return Math.max(
    0,
    toNumber(item.amount) -
      toNumber(item.fees) -
      toNumber(item.tax)
  );
};

export default function HostPayoutsScreen() {
  const [summary, setSummary] =
    useState<PayoutSummary>({});

  const [payouts, setPayouts] =
    useState<PayoutItem[]>([]);

  const [schedule, setSchedule] =
    useState<ScheduleType>("weekly");

  const [filter, setFilter] =
    useState<PayoutFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingSchedule, setUpdatingSchedule] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadPayouts = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        setError("");

        const user =
          (await getStoredUser()) as StoredUser | null;

        const hostId =
          user?.id ?? user?.user_id;

        if (!hostId) {
          router.replace("/login");
          return;
        }

        const [summaryResult, historyResult] =
          await Promise.allSettled([
            api.get("/host/payouts", {
              params: { hostId },
            }),
            api
              .get("/host/payouts/history", {
                params: { hostId },
              })
              .catch(async (requestError: any) => {
                if (
                  requestError?.response?.status !== 404
                ) {
                  throw requestError;
                }

                return api.get(
                  `/host/payouts/${hostId}`
                );
              }),
          ]);

        if (
          summaryResult.status === "fulfilled"
        ) {
          const loadedSummary =
            getObjectFromResponse<PayoutSummary>(
              summaryResult.value.data
            ) || {};

          setSummary(loadedSummary);

          const loadedSchedule =
            normalizeStatus(
              loadedSummary.payout_schedule
            ) as ScheduleType;

          if (
            SCHEDULES.includes(
              loadedSchedule
            )
          ) {
            setSchedule(loadedSchedule);
          }
        } else {
          setSummary({});
        }

        if (
          historyResult.status === "fulfilled"
        ) {
          const loadedPayouts =
            getArrayFromResponse<PayoutItem>(
              historyResult.value.data
            ).sort((first, second) => {
              const firstDate = new Date(
                first.paid_at ||
                  first.scheduled_at ||
                  first.created_at ||
                  0
              ).getTime();

              const secondDate = new Date(
                second.paid_at ||
                  second.scheduled_at ||
                  second.created_at ||
                  0
              ).getTime();

              return secondDate - firstDate;
            });

          setPayouts(loadedPayouts);
        } else {
          setPayouts([]);
        }

        if (
          summaryResult.status === "rejected" &&
          historyResult.status === "rejected"
        ) {
          setError(
            "We could not load your payout information."
          );
        }
      } catch (requestError: any) {
        console.log(
          "Host payouts load error:",
          requestError?.response?.data ||
            requestError?.message ||
            requestError
        );

        setSummary({});
        setPayouts([]);
        setError(
          requestError?.response?.data?.message ||
            "We could not load your payout information."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadPayouts(true);
    }, [loadPayouts])
  );

  const counts = useMemo(
    () => ({
      all: payouts.length,
      completed: payouts.filter((item) =>
        ["completed", "paid", "success"].includes(
          normalizeStatus(item.status)
        )
      ).length,
      processing: payouts.filter((item) =>
        [
          "processing",
          "pending",
          "scheduled",
        ].includes(
          normalizeStatus(item.status)
        )
      ).length,
      failed: payouts.filter((item) =>
        [
          "failed",
          "rejected",
          "cancelled",
        ].includes(
          normalizeStatus(item.status)
        )
      ).length,
    }),
    [payouts]
  );

  const filteredPayouts = useMemo(() => {
    if (filter === "completed") {
      return payouts.filter((item) =>
        ["completed", "paid", "success"].includes(
          normalizeStatus(item.status)
        )
      );
    }

    if (filter === "processing") {
      return payouts.filter((item) =>
        [
          "processing",
          "pending",
          "scheduled",
        ].includes(
          normalizeStatus(item.status)
        )
      );
    }

    if (filter === "failed") {
      return payouts.filter((item) =>
        [
          "failed",
          "rejected",
          "cancelled",
        ].includes(
          normalizeStatus(item.status)
        )
      );
    }

    return payouts;
  }, [filter, payouts]);

  const updateSchedule = async (
    nextSchedule: ScheduleType
  ) => {
    if (
      updatingSchedule ||
      nextSchedule === schedule
    ) {
      return;
    }

    const previous = schedule;

    try {
      setSchedule(nextSchedule);
      setUpdatingSchedule(true);

      const user =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        user?.id ?? user?.user_id;

      if (!hostId) {
        throw new Error(
          "Please sign in again."
        );
      }

      await api.put(
        "/host/payouts/schedule",
        {
          host_id: Number(hostId),
          schedule: nextSchedule,
        }
      );
    } catch (requestError: any) {
      setSchedule(previous);

      Alert.alert(
        "Schedule update failed",
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Please try again."
      );
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const downloadStatement = async () => {
    if (downloading) return;

    try {
      setDownloading(true);

      const user =
        (await getStoredUser()) as StoredUser | null;

      const hostId =
        user?.id ?? user?.user_id;

      if (!hostId) {
        throw new Error(
          "Please sign in again."
        );
      }

      const response = await api.get(
        "/host/payouts/statement",
        {
          params: {
            hostId,
            format: "pdf",
          },
        }
      );

      const url =
        response.data?.url ||
        response.data?.downloadUrl ||
        response.data?.statement_url;

      if (!url) {
        throw new Error(
          "Statement is not available yet."
        );
      }

      await Linking.openURL(url);
    } catch (requestError: any) {
      Alert.alert(
        "Statement unavailable",
        requestError?.response?.data?.message ||
          requestError?.message ||
          "The statement could not be opened."
      );
    } finally {
      setDownloading(false);
    }
  };

  const bank = summary.bank_account || {};
  const taxInfo = summary.tax_info || {};

  const renderPayout = ({
    item,
  }: {
    item: PayoutItem;
  }) => {
    const status =
      getPayoutStatusTheme(item.status);

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/host/payout/[id]",
            params: {
              id: String(
                item.payout_id || item.id
              ),
            },
          })
        }
        style={({ pressed }) => [
          styles.payoutItem,
          pressed && styles.payoutItemPressed,
        ]}
      >
        <View style={styles.payoutItemIcon}>
          <CircleDollarSign
            size={21}
            color={THEME}
          />
        </View>

        <View style={styles.payoutItemContent}>
          <Text style={styles.payoutItemAmount}>
            {formatCurrency(
              getPayoutNet(item)
            )}
          </Text>

          <Text style={styles.payoutItemDate}>
            {formatDate(
              item.paid_at ||
                item.scheduled_at ||
                item.created_at
            )}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.payoutItemReference}
          >
            {item.reference ||
              "Payout reference unavailable"}
          </Text>
        </View>

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
              styles.statusBadgeText,
              {
                color: status.textColor,
              },
            ]}
          >
            {status.label}
          </Text>
        </View>

        <ChevronRight
          size={18}
          color="#9aa0a6"
        />
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
            Loading payouts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <View style={styles.page}>
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
              Payouts
            </Text>

            <Text style={styles.headerSubtitle}>
              Balance, bank details and history
            </Text>
          </View>

          <Pressable
            onPress={downloadStatement}
            disabled={downloading}
            style={({ pressed }) => [
              styles.headerAction,
              pressed &&
                styles.headerActionPressed,
            ]}
          >
            {downloading ? (
              <ActivityIndicator
                size="small"
                color={THEME}
              />
            ) : (
              <Download
                size={20}
                color={THEME}
              />
            )}
          </Pressable>
        </View>

        <FlatList
          data={filteredPayouts}
          keyExtractor={(item) =>
            String(item.payout_id || item.id)
          }
          renderItem={renderPayout}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredPayouts.length === 0 &&
              styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPayouts(false);
              }}
              colors={[THEME]}
              tintColor={THEME}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>
                  AVAILABLE FOR PAYOUT
                </Text>

                <Text style={styles.balanceValue}>
                  {formatCurrency(
                    toNumber(
                      summary.available_balance
                    )
                  )}
                </Text>

                <View style={styles.balanceFooter}>
                  <View>
                    <Text
                      style={styles.balanceSmallLabel}
                    >
                      Lifetime earnings
                    </Text>

                    <Text
                      style={styles.balanceSmallValue}
                    >
                      {formatCurrency(
                        toNumber(
                          summary.lifetime_earnings
                        )
                      )}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      router.push(
                        "/host/earnings"
                      )
                    }
                    style={styles.earningsButton}
                  >
                    <Text
                      style={styles.earningsButtonText}
                    >
                      Earnings
                    </Text>

                    <ChevronRight
                      size={16}
                      color={WHITE}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.nextPayoutCard}>
                <View style={styles.nextPayoutIcon}>
                  <WalletCards
                    size={22}
                    color={THEME}
                  />
                </View>

                <View style={styles.nextPayoutContent}>
                  <Text style={styles.nextPayoutLabel}>
                    Next payout
                  </Text>

                  <Text style={styles.nextPayoutValue}>
                    {formatCurrency(
                      toNumber(
                        summary.next_payout_amount
                      )
                    )}
                  </Text>

                  <Text style={styles.nextPayoutDate}>
                    {formatDate(
                      summary.next_payout_date
                    )}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                Bank account
              </Text>

              <View style={styles.bankCard}>
                <View style={styles.bankIcon}>
                  <Landmark
                    size={23}
                    color={THEME}
                  />
                </View>

                <View style={styles.bankContent}>
                  <Text style={styles.bankName}>
                    {bank.bank_name ||
                      "Bank account not added"}
                  </Text>

                  <Text style={styles.bankNumber}>
                    {maskAccount(
                      bank.account_number,
                      bank.account_last4
                    )}
                  </Text>

                  <View style={styles.bankStatusRow}>
                    <CheckCircle2
                      size={14}
                      color={
                        normalizeStatus(
                          bank.status
                        ) === "verified"
                          ? SUCCESS
                          : WARNING
                      }
                    />

                    <Text
                      style={[
                        styles.bankStatusText,
                        {
                          color:
                            normalizeStatus(
                              bank.status
                            ) === "verified"
                              ? SUCCESS
                              : WARNING,
                        },
                      ]}
                    >
                      {bank.status || "Not verified"}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    router.push(
                      "/host/payouts/bank"
                    )
                  }
                  style={styles.changeBankButton}
                >
                  <Text
                    style={styles.changeBankText}
                  >
                    Change
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>
                Payout schedule
              </Text>

              <View style={styles.scheduleCard}>
                {SCHEDULES.map((item) => {
                  const active =
                    schedule === item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() =>
                        updateSchedule(item)
                      }
                      disabled={updatingSchedule}
                      style={[
                        styles.scheduleOption,
                        active &&
                          styles.scheduleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.scheduleText,
                          active &&
                            styles.scheduleTextActive,
                        ]}
                      >
                        {item
                          .charAt(0)
                          .toUpperCase() +
                          item.slice(1)}
                      </Text>

                      <View
                        style={[
                          styles.radio,
                          active &&
                            styles.radioActive,
                        ]}
                      >
                        {active ? (
                          <View
                            style={styles.radioInner}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>
                Tax information
              </Text>

              <View style={styles.taxCard}>
                <InfoRow
                  label="PAN"
                  value={taxInfo.pan || "Not added"}
                />

                <InfoRow
                  label="GST"
                  value={taxInfo.gst || "Not added"}
                />

                <InfoRow
                  label="Tax status"
                  value={
                    taxInfo.status || "Incomplete"
                  }
                  last
                />
              </View>

              <Pressable
                onPress={() =>
                  router.push("/host/settings/tax")
                }
                style={({ pressed }) => [
                  styles.taxButton,
                  pressed &&
                    styles.taxButtonPressed,
                ]}
              >
                <ShieldCheck
                  size={18}
                  color={THEME}
                />

                <Text style={styles.taxButtonText}>
                  Update tax information
                </Text>
              </Pressable>

              <View style={styles.filterHeader}>
                <Text style={styles.sectionTitle}>
                  Payout history
                </Text>

                <Text style={styles.historyCount}>
                  {filteredPayouts.length}
                </Text>
              </View>

              <View style={styles.filterRow}>
                {FILTERS.map((item) => {
                  const active =
                    filter === item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() =>
                        setFilter(item)
                      }
                      style={[
                        styles.filterButton,
                        active &&
                          styles.filterButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          active &&
                            styles.filterTextActive,
                        ]}
                      >
                        {item === "all"
                          ? "All"
                          : item
                              .charAt(0)
                              .toUpperCase() +
                            item.slice(1)}
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
                })}
              </View>

              {error ? (
                <View style={styles.errorCard}>
                  <RefreshCw
                    size={19}
                    color={DANGER}
                  />

                  <View style={styles.errorContent}>
                    <Text style={styles.errorTitle}>
                      Payouts could not load
                    </Text>

                    <Text style={styles.errorText}>
                      {error}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      loadPayouts(true)
                    }
                    style={styles.retryButton}
                  >
                    <Text
                      style={styles.retryButtonText}
                    >
                      Retry
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <WalletCards
                    size={31}
                    color={THEME}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No payouts found
                </Text>

                <Text style={styles.emptyText}>
                  Your payout history will appear here after completed earnings are released.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <Pressable
              onPress={() =>
                router.push("/support")
              }
              style={({ pressed }) => [
                styles.supportCard,
                pressed &&
                  styles.supportCardPressed,
              ]}
            >
              <View style={styles.supportIcon}>
                <Building2
                  size={21}
                  color={THEME}
                />
              </View>

              <View style={styles.supportContent}>
                <Text style={styles.supportTitle}>
                  Payments support
                </Text>

                <Text style={styles.supportText}>
                  Get help with payout delays, bank verification or tax documents.
                </Text>
              </View>

              <ChevronRight
                size={18}
                color="#9aa0a6"
              />
            </Pressable>
          }
        />
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
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
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
  },

  headerSubtitle: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },

  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  headerActionPressed: {
    opacity: 0.72,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
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
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  balanceCard: {
    backgroundColor: THEME,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },

  balanceLabel: {
    color: "#dbe6ff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.8,
  },

  balanceValue: {
    color: WHITE,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    marginTop: 8,
  },

  balanceFooter: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  balanceSmallLabel: {
    color: "#dbe6ff",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },

  balanceSmallValue: {
    color: WHITE,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    marginTop: 4,
  },

  earningsButton: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  earningsButtonText: {
    color: WHITE,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  nextPayoutCard: {
    minHeight: 98,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  nextPayoutIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  nextPayoutContent: {
    flex: 1,
    marginLeft: 12,
  },

  nextPayoutLabel: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },

  nextPayoutValue: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    marginTop: 3,
  },

  nextPayoutDate: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 3,
  },

  sectionTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    marginTop: 24,
    marginBottom: 11,
  },

  bankCard: {
    minHeight: 104,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  bankContent: {
    flex: 1,
    marginLeft: 12,
  },

  bankName: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
  },

  bankNumber: {
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 4,
  },

  bankStatusRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  bankStatusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "capitalize",
  },

  changeBankButton: {
    minHeight: 38,
    borderRadius: 11,
    backgroundColor: THEME_LIGHT,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  changeBankText: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  scheduleCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    overflow: "hidden",
  },

  scheduleOption: {
    minHeight: 58,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  scheduleOptionActive: {
    backgroundColor: THEME_LIGHT,
  },

  scheduleText: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  scheduleTextActive: {
    color: THEME,
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

  radioActive: {
    borderColor: THEME,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME,
  },

  taxCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 15,
  },

  infoRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },

  infoValue: {
    color: TEXT,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  taxButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  taxButtonPressed: {
    opacity: 0.72,
  },

  taxButtonText: {
    color: THEME,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  historyCount: {
    marginTop: 24,
    marginBottom: 11,
    color: MUTED,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },

  filterRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 14,
  },

  filterButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    borderColor: THEME,
    backgroundColor: THEME_LIGHT,
  },

  filterText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
  },

  filterTextActive: {
    color: THEME,
  },

  filterCount: {
    position: "absolute",
    right: 5,
    top: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountActive: {
    backgroundColor: WHITE,
  },

  filterCountText: {
    color: MUTED,
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
  },

  filterCountTextActive: {
    color: THEME,
  },

  errorCard: {
    backgroundColor: "#fff6f6",
    borderWidth: 1,
    borderColor: "#efcccc",
    borderRadius: 15,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    color: DANGER,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  errorText: {
    color: "#a93737",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 3,
  },

  retryButton: {
    borderRadius: 9,
    backgroundColor: THEME,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  retryButtonText: {
    color: WHITE,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },

  payoutItem: {
    minHeight: 92,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  payoutItemPressed: {
    backgroundColor: "#f8f9fb",
  },

  payoutItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  payoutItemContent: {
    flex: 1,
    marginLeft: 11,
  },

  payoutItemAmount: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
  },

  payoutItemDate: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 3,
  },

  payoutItemReference: {
    color: "#9aa0a6",
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    marginTop: 3,
  },

  statusBadge: {
    maxWidth: 86,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 7,
  },

  statusBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textTransform: "capitalize",
  },

  emptyState: {
    flex: 1,
    minHeight: 300,
    paddingHorizontal: 28,
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
    color: TEXT,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    marginTop: 18,
  },

  emptyText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  supportCard: {
    minHeight: 92,
    marginTop: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  supportCardPressed: {
    backgroundColor: "#f8f9fb",
  },

  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  supportContent: {
    flex: 1,
    marginLeft: 11,
  },

  supportTitle: {
    color: TEXT,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
  },

  supportText: {
    color: MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
});