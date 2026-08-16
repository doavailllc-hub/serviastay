import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
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

type PaymentFilter = "All" | "Paid" | "Pending" | "Failed";

type PaymentItem = {
  id: number | string;
  property_id?: number | string;
  title?: string;
  property_title?: string;
  location?: string;
  total?: number | string;
  payment_status?: string;
  payment_method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  status?: string;
  checkin?: string;
  checkout?: string;
  created_at?: string;
};

const filters: PaymentFilter[] = [
  "All",
  "Paid",
  "Pending",
  "Failed",
];

function normalizeStatus(value?: string) {
  return String(value || "pending").trim().toLowerCase();
}

function getPaymentCategory(item: PaymentItem): PaymentFilter {
  const status = normalizeStatus(item.payment_status);

  if (
    status === "paid" ||
    status === "success" ||
    status === "successful" ||
    status === "completed"
  ) {
    return "Paid";
  }

  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "refunded"
  ) {
    return "Failed";
  }

  return "Pending";
}

function formatCurrency(value?: number | string) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value?: string) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPropertyTitle(item: PaymentItem) {
  return (
    item.property_title ||
    item.title ||
    "Dovail Stay reservation"
  );
}

export default function PaymentsScreen() {
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<PaymentFilter>("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadPayments = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadFailed(false);

      const storedUser = await getStoredUser();

      if (!storedUser) {
        setUser(null);
        setPayments([]);
        return;
      }

      setUser(storedUser);

      const response = await api.get(
        `/bookings/${storedUser.id}`
      );

      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.bookings)
          ? response.data.bookings
          : [];

      setPayments(data);
    } catch (error: any) {
      console.log(
        "Payments load error:",
        error?.response?.data || error?.message || error
      );

      setPayments([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments])
  );

  const filteredPayments = useMemo(() => {
    if (activeFilter === "All") {
      return payments;
    }

    return payments.filter(
      (item) => getPaymentCategory(item) === activeFilter
    );
  }, [payments, activeFilter]);

  const totals = useMemo(() => {
    return payments.reduce(
      (result, item) => {
        const category = getPaymentCategory(item);
        const amount = Number(item.total || 0);

        if (category === "Paid") {
          result.paid += amount;
        }

        if (category === "Pending") {
          result.pending += amount;
        }

        return result;
      },
      {
        paid: 0,
        pending: 0,
      }
    );
  }, [payments]);

  const filterCounts = useMemo(() => {
    return {
      All: payments.length,
      Paid: payments.filter(
        (item) => getPaymentCategory(item) === "Paid"
      ).length,
      Pending: payments.filter(
        (item) => getPaymentCategory(item) === "Pending"
      ).length,
      Failed: payments.filter(
        (item) => getPaymentCategory(item) === "Failed"
      ).length,
    };
  }, [payments]);

  const openPayment = (item: PaymentItem) => {
    router.push(`/trip/${item.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <PaymentsSkeleton />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centeredPage}>
          <View style={styles.emptyIcon}>
            <CreditCard size={30} color={THEME} />
          </View>

          <Text style={styles.emptyTitle}>
            View your payments
          </Text>

          <Text style={styles.emptyText}>
            Log in to review booking payments, transaction status and
            reservation totals.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryButtonText}>Log in</Text>
          </Pressable>
        </View>
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
          <Text style={styles.headerTitle}>Payments</Text>

          <Text style={styles.headerSubtitle}>
            Transactions and booking totals
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={filteredPayments}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          filteredPayments.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPayments(true)}
            tintColor={THEME}
            colors={[THEME]}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Paid</Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(totals.paid)}
                </Text>

                <View style={styles.summaryStatusRow}>
                  <CheckCircle2 size={14} color="#16803d" />

                  <Text style={styles.summaryStatusPaid}>
                    Completed payments
                  </Text>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Pending</Text>

                <Text style={styles.summaryValue}>
                  {formatCurrency(totals.pending)}
                </Text>

                <View style={styles.summaryStatusRow}>
                  <Clock3 size={14} color="#b45309" />

                  <Text style={styles.summaryStatusPending}>
                    Awaiting payment
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.secureBox}>
              <View style={styles.secureIcon}>
                <ShieldCheck size={21} color={THEME} />
              </View>

              <View style={styles.secureContent}>
                <Text style={styles.secureTitle}>
                  Secure payments
                </Text>

                <Text style={styles.secureText}>
                  Online payments are processed securely through Razorpay.
                  Card and UPI credentials are not stored by Dovail Stay.
                </Text>
              </View>
            </View>

            <View style={styles.filterContainer}>
              {filters.map((filter) => {
                const active = activeFilter === filter;

                return (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterButton,
                      active && styles.filterButtonActive,
                    ]}
                    onPress={() => setActiveFilter(filter)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        active && styles.filterTextActive,
                      ]}
                    >
                      {filter}
                    </Text>

                    <View
                      style={[
                        styles.countBadge,
                        active && styles.countBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countText,
                          active && styles.countTextActive,
                        ]}
                      >
                        {filterCounts[filter]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {filteredPayments.length > 0 && (
              <Text style={styles.sectionLabel}>
                Transaction history
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            loadFailed={loadFailed}
            activeFilter={activeFilter}
            onRetry={() => loadPayments()}
            onClear={() => setActiveFilter("All")}
          />
        }
        renderItem={({ item }) => (
          <PaymentRow
            item={item}
            onPress={() => openPayment(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function PaymentRow({
  item,
  onPress,
}: {
  item: PaymentItem;
  onPress: () => void;
}) {
  const category = getPaymentCategory(item);

  const Icon =
    category === "Paid"
      ? CheckCircle2
      : category === "Failed"
        ? XCircle
        : Clock3;

  const statusColor =
    category === "Paid"
      ? "#16803d"
      : category === "Failed"
        ? "#c62828"
        : "#b45309";

  const statusBackground =
    category === "Paid"
      ? "#ecf8ef"
      : category === "Failed"
        ? "#fff0f0"
        : "#fff7e6";

  const method =
    normalizeStatus(item.payment_method) === "razorpay"
      ? "Razorpay"
      : "Pay at property";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.paymentRow,
        pressed && styles.paymentRowPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.paymentIcon,
          { backgroundColor: statusBackground },
        ]}
      >
        <Icon size={21} color={statusColor} />
      </View>

      <View style={styles.paymentContent}>
        <Text numberOfLines={1} style={styles.paymentTitle}>
          {getPropertyTitle(item)}
        </Text>

        <Text style={styles.paymentMeta}>
          Booking #{item.id} · {method}
        </Text>

        <Text style={styles.paymentDate}>
          {formatDate(item.created_at)}
        </Text>
      </View>

      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(item.total)}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBackground },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: statusColor },
            ]}
          >
            {category}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  loadFailed,
  activeFilter,
  onRetry,
  onClear,
}: {
  loadFailed: boolean;
  activeFilter: PaymentFilter;
  onRetry: () => void;
  onClear: () => void;
}) {
  const filtered = activeFilter !== "All";

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {loadFailed ? (
          <RefreshCw size={29} color={THEME} />
        ) : (
          <CreditCard size={29} color={THEME} />
        )}
      </View>

      <Text style={styles.emptyTitle}>
        {loadFailed
          ? "Could not load payments"
          : filtered
            ? `No ${activeFilter.toLowerCase()} payments`
            : "No payment history yet"}
      </Text>

      <Text style={styles.emptyText}>
        {loadFailed
          ? "Check your connection and try loading transactions again."
          : filtered
            ? "Try another payment status to see more transactions."
            : "Your booking payments and transaction status will appear here."}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={
          loadFailed
            ? onRetry
            : filtered
              ? onClear
              : () => router.push("/")
        }
      >
        <Text style={styles.primaryButtonText}>
          {loadFailed
            ? "Try again"
            : filtered
              ? "Show all"
              : "Explore stays"}
        </Text>
      </Pressable>
    </View>
  );
}

function PaymentsSkeleton() {
  return (
    <View style={styles.skeletonPage}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonBack} />

        <View style={styles.skeletonHeaderContent}>
          <View style={styles.skeletonHeaderTitle} />
          <View style={styles.skeletonHeaderLine} />
        </View>
      </View>

      <View style={styles.skeletonSummary}>
        <View style={styles.skeletonSummaryCard} />
        <View style={styles.skeletonSummaryCard} />
      </View>

      <View style={styles.skeletonSecure} />
      <View style={styles.skeletonFilters} />

      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonPaymentRow}>
          <View style={styles.skeletonPaymentIcon} />

          <View style={styles.skeletonPaymentContent}>
            <View style={styles.skeletonPaymentTitle} />
            <View style={styles.skeletonPaymentLine} />
            <View style={styles.skeletonPaymentShort} />
          </View>
        </View>
      ))}
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
    fontSize: 19,
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

  list: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 112,
  },

  emptyList: {
    flexGrow: 1,
  },

  summaryGrid: {
    flexDirection: "row",
    gap: 12,
  },

  summaryCard: {
    flex: 1,
    minHeight: 128,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    padding: 16,
  },

  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  summaryValue: {
    marginTop: 8,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: TEXT,
  },

  summaryStatusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  summaryStatusPaid: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#16803d",
  },

  summaryStatusPending: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: "#b45309",
  },

  secureBox: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: THEME_LIGHT,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  secureIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },

  secureContent: {
    flex: 1,
  },

  secureTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  secureText: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: MUTED,
  },

  filterContainer: {
    marginTop: 22,
    marginBottom: 20,
    borderRadius: 18,
    backgroundColor: "#f1f3f4",
    padding: 4,
    flexDirection: "row",
    gap: 3,
  },

  filterButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  filterButtonActive: {
    backgroundColor: WHITE,
    elevation: 1,
  },

  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: MUTED,
  },

  filterTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: THEME,
  },

  countBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#e1e5e9",
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeActive: {
    backgroundColor: THEME_LIGHT,
  },

  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: MUTED,
  },

  countTextActive: {
    color: THEME,
  },

  sectionLabel: {
    marginBottom: 7,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  paymentRow: {
    minHeight: 104,
    paddingVertical: 15,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  paymentRowPressed: {
    opacity: 0.72,
  },

  paymentIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentContent: {
    flex: 1,
  },

  paymentTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: TEXT,
  },

  paymentMeta: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },

  paymentDate: {
    marginTop: 5,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#9aa0a6",
  },

  paymentRight: {
    alignItems: "flex-end",
  },

  paymentAmount: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: TEXT,
  },

  statusBadge: {
    marginTop: 8,
    minHeight: 25,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },

  centeredPage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    flex: 1,
    minHeight: 380,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: THEME_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 21,
    lineHeight: 28,
    color: TEXT,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 9,
    maxWidth: 310,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 24,
    minWidth: 148,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME,
    paddingHorizontal: 23,
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

  skeletonPage: {
    flex: 1,
    paddingHorizontal: 18,
  },

  skeletonHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  skeletonBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eceff1",
  },

  skeletonHeaderContent: {
    flex: 1,
  },

  skeletonHeaderTitle: {
    width: "38%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#eceff1",
  },

  skeletonHeaderLine: {
    marginTop: 7,
    width: "48%",
    height: 11,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
  },

  skeletonSummary: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },

  skeletonSummaryCard: {
    flex: 1,
    height: 128,
    borderRadius: 20,
    backgroundColor: "#eceff1",
  },

  skeletonSecure: {
    marginTop: 16,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#f1f3f4",
  },

  skeletonFilters: {
    marginTop: 22,
    marginBottom: 20,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#eceff1",
  },

  skeletonPaymentRow: {
    minHeight: 104,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  skeletonPaymentIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#eceff1",
  },

  skeletonPaymentContent: {
    flex: 1,
  },

  skeletonPaymentTitle: {
    width: "56%",
    height: 15,
    borderRadius: 7,
    backgroundColor: "#eceff1",
  },

  skeletonPaymentLine: {
    marginTop: 9,
    width: "76%",
    height: 11,
    borderRadius: 6,
    backgroundColor: "#f1f3f4",
  },

  skeletonPaymentShort: {
    marginTop: 8,
    width: "34%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f1f3f4",
  },
});