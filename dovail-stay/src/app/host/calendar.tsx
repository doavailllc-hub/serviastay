import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Lock,
  MapPin,
  RefreshCw,
  Unlock
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
  Modal,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
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
const BLOCKED = "#9aa0a6";

type CalendarMode = "Stays" | "Trip packages";
type CalendarStatus =
  | "available"
  | "booked"
  | "blocked"
  | "departure";

type StoredUser = {
  id?: number | string;
  user_id?: number | string;
};

type CalendarEntry = {
  id: string;
  date: string;
  type: "stay" | "trip" | "block";
  status: CalendarStatus;

  reservation_id?: number | string;
  booking_id?: number | string;
  listing_id?: number | string;
  property_id?: number | string;
  experience_id?: number | string;

  title?: string;
  guest_name?: string;
  location?: string;

  checkin?: string;
  checkout?: string;
  departure_date?: string;

  guests?: number | string;
  travelers?: number | string;
  total?: number | string;
  amount?: number | string;

  price?: number | string;
  minimum_stay?: number | string;
  maximum_stay?: number | string;
};

type DayCell = {
  key: string;
  date: Date;
  iso: string;
  day: number;
  outsideMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstArray = <T,>(
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
    "calendar",
    "entries",
    "bookings",
    "reservations",
    "blockedDates",
    "departures",
  ]) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value?: string) => {
  if (!value) return null;

  const date = new Date(
    value.includes("T")
      ? value
      : `${value.slice(0, 10)}T00:00:00`
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const formatDisplayDate = (value?: string) => {
  const date = parseDate(value);

  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(date);

const sameDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const dateRange = (
  start?: string,
  end?: string
) => {
  const from = parseDate(start);
  const to = parseDate(end);

  if (!from) return [];

  const finalDate = to || from;
  const result: string[] = [];

  const cursor = startOfDay(from);
  const last = startOfDay(finalDate);

  while (cursor <= last) {
    result.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

const createCalendarDays = (
  month: Date,
  entriesByDate: Map<string, CalendarEntry[]>
): DayCell[] => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const mondayBasedStart =
    (firstDay.getDay() + 6) % 7;

  const gridStart = new Date(firstDay);
  gridStart.setDate(
    firstDay.getDate() - mondayBasedStart
  );

  const totalCells =
    Math.ceil(
      (mondayBasedStart + lastDay.getDate()) / 7
    ) * 7;

  const today = startOfDay(new Date());

  return Array.from(
    { length: Math.max(totalCells, 42) },
    (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);

      const iso = toIsoDate(date);

      return {
        key: iso,
        date,
        iso,
        day: date.getDate(),
        outsideMonth:
          date.getMonth() !== monthIndex,
        isToday: sameDate(date, today),
        entries:
          entriesByDate.get(iso) || [],
      };
    }
  );
};

const getDayStatus = (
  entries: CalendarEntry[]
): CalendarStatus => {
  if (
    entries.some(
      (entry) => entry.status === "booked"
    )
  ) {
    return "booked";
  }

  if (
    entries.some(
      (entry) => entry.status === "departure"
    )
  ) {
    return "departure";
  }

  if (
    entries.some(
      (entry) => entry.status === "blocked"
    )
  ) {
    return "blocked";
  }

  return "available";
};

export default function HostCalendarScreen() {
  const [user, setUser] =
    useState<StoredUser | null>(null);

  const [mode, setMode] =
    useState<CalendarMode>("Stays");

  const [currentMonth, setCurrentMonth] =
    useState(
      new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
    );

  const [entries, setEntries] =
    useState<CalendarEntry[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<string>(
      toIsoDate(new Date())
    );

  const [selectedEntry, setSelectedEntry] =
    useState<CalendarEntry | null>(null);

  const [sheetVisible, setSheetVisible] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [working, setWorking] =
    useState(false);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const loadCalendar = useCallback(
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

        const monthStart = toIsoDate(
          new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            1
          )
        );

        const monthEnd = toIsoDate(
          new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            0
          )
        );

        const response = await api.get(
          "/host/calendar",
          {
            params: {
              hostId,
              type:
                mode === "Stays"
                  ? "stay"
                  : "trip",
              from: monthStart,
              to: monthEnd,
            },
          }
        );

        const rawEntries =
          firstArray<any>(
            response.data,
            ["calendarEntries"]
          );

        const normalized: CalendarEntry[] =
          [];

        rawEntries.forEach(
          (item, index) => {
            const type =
              item.type === "trip" ||
              item.experience_id
                ? "trip"
                : item.type === "block"
                ? "block"
                : "stay";

            if (
              mode === "Stays" &&
              type === "trip"
            ) {
              return;
            }

            if (
              mode === "Trip packages" &&
              type === "stay"
            ) {
              return;
            }

            const status: CalendarStatus =
              type === "block"
                ? "blocked"
                : type === "trip"
                ? "departure"
                : "booked";

            const dates =
              type === "stay"
                ? dateRange(
                    item.checkin,
                    item.checkout
                  )
                : dateRange(
                    item.departure_date ||
                      item.date,
                    item.departure_date ||
                      item.date
                  );

            dates.forEach(
              (dateValue, rangeIndex) => {
                normalized.push({
                  id: String(
                    item.id ||
                      item.booking_id ||
                      item.reservation_id ||
                      `${index}-${rangeIndex}`
                  ),
                  date: dateValue,
                  type,
                  status,
                  reservation_id:
                    item.reservation_id,
                  booking_id:
                    item.booking_id ||
                    item.id,
                  listing_id:
                    item.listing_id,
                  property_id:
                    item.property_id,
                  experience_id:
                    item.experience_id,
                  title:
                    item.title ||
                    item.property_title ||
                    item.experience_title ||
                    item.trip_title,
                  guest_name:
                    item.guest_name ||
                    item.user_name,
                  location:
                    item.location ||
                    item.city,
                  checkin: item.checkin,
                  checkout: item.checkout,
                  departure_date:
                    item.departure_date,
                  guests:
                    item.guests,
                  travelers:
                    item.travelers,
                  total:
                    item.total,
                  amount:
                    item.amount,
                  price:
                    item.price,
                  minimum_stay:
                    item.minimum_stay,
                  maximum_stay:
                    item.maximum_stay,
                });
              }
            );
          }
        );

        setEntries(normalized);
      } catch (error: any) {
        console.log(
          "Host calendar load error:",
          error?.response?.data ||
            error?.message ||
            error
        );

        setEntries([]);
        setLoadFailed(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentMonth, mode]
  );

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar])
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<
      string,
      CalendarEntry[]
    >();

    entries.forEach((entry) => {
      const current =
        map.get(entry.date) || [];

      current.push(entry);
      map.set(entry.date, current);
    });

    return map;
  }, [entries]);

  const days = useMemo(
    () =>
      createCalendarDays(
        currentMonth,
        entriesByDate
      ),
    [currentMonth, entriesByDate]
  );

  const selectedEntries =
    entriesByDate.get(selectedDate) || [];

  const moveMonth = (offset: number) => {
    setCurrentMonth((current) => {
      const next = new Date(current);
      next.setMonth(
        current.getMonth() + offset
      );
      return next;
    });
  };

  const selectDay = (day: DayCell) => {
    setSelectedDate(day.iso);

    const firstEntry = day.entries[0] || null;
    setSelectedEntry(firstEntry);

    if (
      day.outsideMonth
    ) {
      setCurrentMonth(
        new Date(
          day.date.getFullYear(),
          day.date.getMonth(),
          1
        )
      );
    }
  };

  const blockSelectedDate = async () => {
    if (working) return;

    try {
      setWorking(true);

      await api.post(
        "/host/calendar/block",
        {
          date: selectedDate,
          type:
            mode === "Stays"
              ? "stay"
              : "trip",
        }
      );

      setEntries((current) => [
        ...current,
        {
          id: `block-${selectedDate}`,
          date: selectedDate,
          type: "block",
          status: "blocked",
          title: "Blocked by host",
        },
      ]);

      setSheetVisible(false);
    } catch (error: any) {
      Alert.alert(
        "Could not block date",
        error?.response?.data?.message ||
          "Please try again."
      );
    } finally {
      setWorking(false);
    }
  };

  const unblockSelectedDate = async () => {
    if (working) return;

    try {
      setWorking(true);

      await api.delete(
        "/host/calendar/block",
        {
          data: {
            date: selectedDate,
            type:
              mode === "Stays"
                ? "stay"
                : "trip",
          },
        }
      );

      setEntries((current) =>
        current.filter(
          (entry) =>
            !(
              entry.date ===
                selectedDate &&
              entry.status === "blocked"
            )
        )
      );

      setSheetVisible(false);
    } catch (error: any) {
      Alert.alert(
        "Could not unblock date",
        error?.response?.data?.message ||
          "Please try again."
      );
    } finally {
      setWorking(false);
    }
  };

  const selectedHasBlock =
    selectedEntries.some(
      (entry) => entry.status === "blocked"
    );

  const openReservation = (
    entry: CalendarEntry
  ) => {
    if (
      entry.type === "trip"
    ) {
      router.push({
        pathname:
          "/host/trip-reservation/[id]",
        params: {
          id: String(
            entry.booking_id ||
              entry.reservation_id ||
              entry.id
          ),
        },
      });
      return;
    }

    router.push({
      pathname: "/host/reservation/[id]",
      params: {
        id: String(
          entry.booking_id ||
            entry.reservation_id ||
            entry.id
        ),
      },
    });
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
            Loading calendar...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={WHITE}
      />

      <FlatList
        data={selectedEntries}
        keyExtractor={(item) =>
          `${item.id}-${item.date}`
        }
        renderItem={({ item }) => (
          <ReservationCard
            item={item}
            onPress={() =>
              openReservation(item)
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          selectedEntries.length === 0 &&
            styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadCalendar(true)
            }
            colors={[THEME]}
            tintColor={THEME}
          />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ChevronLeft
                  size={24}
                  color={TEXT}
                />
              </Pressable>

              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>
                  Hosting
                </Text>

                <Text style={styles.title}>
                  Calendar
                </Text>
              </View>
            </View>

            {loadFailed ? (
              <View style={styles.errorCard}>
                <RefreshCw
                  size={19}
                  color={DANGER}
                />

                <View style={styles.errorContent}>
                  <Text
                    style={styles.errorTitle}
                  >
                    Calendar could not load
                  </Text>

                  <Text style={styles.errorText}>
                    Pull down or retry.
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    loadCalendar()
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

            <View style={styles.modeTabs}>
              <ModeButton
                label="Stays"
                active={mode === "Stays"}
                onPress={() => {
                  setMode("Stays");
                  setSelectedEntry(null);
                }}
              />

              <ModeButton
                label="Trip packages"
                active={
                  mode === "Trip packages"
                }
                onPress={() => {
                  setMode(
                    "Trip packages"
                  );
                  setSelectedEntry(null);
                }}
              />
            </View>

            <View style={styles.calendarCard}>
              <View style={styles.monthHeader}>
                <Pressable
                  onPress={() => moveMonth(-1)}
                  style={styles.monthButton}
                >
                  <ChevronLeft
                    size={21}
                    color={TEXT}
                  />
                </Pressable>

                <Text style={styles.monthTitle}>
                  {formatMonth(currentMonth)}
                </Text>

                <Pressable
                  onPress={() => moveMonth(1)}
                  style={styles.monthButton}
                >
                  <ChevronRight
                    size={21}
                    color={TEXT}
                  />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {[
                  "Mo",
                  "Tu",
                  "We",
                  "Th",
                  "Fr",
                  "Sa",
                  "Su",
                ].map((day) => (
                  <Text
                    key={day}
                    style={styles.weekText}
                  >
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((day) => {
                  const status = getDayStatus(
                    day.entries
                  );

                  const selected =
                    selectedDate === day.iso;

                  return (
                    <Pressable
                      key={day.key}
                      onPress={() =>
                        selectDay(day)
                      }
                      style={[
                        styles.dayCell,
                        selected &&
                          styles.dayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          day.outsideMonth &&
                            styles.dayTextMuted,
                          day.isToday &&
                            styles.dayTextToday,
                          selected &&
                            styles.dayTextSelected,
                        ]}
                      >
                        {day.day}
                      </Text>

                      <View
                        style={[
                          styles.statusDot,
                          status === "booked" &&
                            styles.statusBooked,
                          status ===
                            "departure" &&
                            styles.statusDeparture,
                          status === "blocked" &&
                            styles.statusBlocked,
                          status ===
                            "available" &&
                            styles.statusAvailable,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.legendRow}>
                <Legend
                  label="Booked"
                  color={SUCCESS}
                />
                <Legend
                  label="Departure"
                  color={WARNING}
                />
                <Legend
                  label="Blocked"
                  color={BLOCKED}
                />
                <Legend
                  label="Available"
                  color="#d7dce1"
                />
              </View>
            </View>

            <View style={styles.selectedHeader}>
              <View>
                <Text
                  style={styles.selectedLabel}
                >
                  SELECTED DATE
                </Text>

                <Text
                  style={styles.selectedDate}
                >
                  {formatDisplayDate(
                    selectedDate
                  )}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSheetVisible(true)
                }
                style={styles.manageButton}
              >
                <Text
                  style={
                    styles.manageButtonText
                  }
                >
                  Manage
                </Text>
              </Pressable>
            </View>

            <Text style={styles.resultText}>
              {selectedEntries.length}{" "}
              {selectedEntries.length === 1
                ? "calendar item"
                : "calendar items"}
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CalendarDays
                size={30}
                color={THEME}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No activity on this date
            </Text>

            <Text style={styles.emptyText}>
              This date is currently available.
              You can block it or adjust pricing.
            </Text>

            <Pressable
              onPress={() =>
                setSheetVisible(true)
              }
              style={styles.primaryButton}
            >
              <Lock
                size={17}
                color={WHITE}
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Manage date
              </Text>
            </Pressable>
          </View>
        }
      />

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSheetVisible(false)
        }
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() =>
            setSheetVisible(false)
          }
        >
          <Pressable
            style={styles.sheet}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              Manage {formatDisplayDate(
                selectedDate
              )}
            </Text>

            <Text style={styles.sheetSubtitle}>
              Update availability and pricing.
            </Text>

            <SheetAction
              icon={
                selectedHasBlock ? (
                  <Unlock
                    size={20}
                    color={TEXT}
                  />
                ) : (
                  <Lock
                    size={20}
                    color={TEXT}
                  />
                )
              }
              title={
                selectedHasBlock
                  ? "Unblock date"
                  : "Block date"
              }
              description={
                selectedHasBlock
                  ? "Make this date available again."
                  : "Prevent new bookings on this date."
              }
              disabled={working}
              onPress={
                selectedHasBlock
                  ? unblockSelectedDate
                  : blockSelectedDate
              }
            />

            <SheetAction
              icon={
                <CircleDollarSign
                  size={20}
                  color={TEXT}
                />
              }
              title="Set custom price"
              description="Add a special price for this date."
              onPress={() => {
                setSheetVisible(false);
                router.push({
                  pathname:
                    "/host/calendar/pricing",
                  params: {
                    date: selectedDate,
                    type:
                      mode === "Stays"
                        ? "stay"
                        : "trip",
                  },
                });
              }}
            />

            <SheetAction
              icon={
                <Clock3
                  size={20}
                  color={TEXT}
                />
              }
              title="Minimum stay"
              description="Set minimum and maximum stay rules."
              last
              onPress={() => {
                setSheetVisible(false);
                router.push({
                  pathname:
                    "/host/calendar/pricing",
                  params: {
                    date: selectedDate,
                    section: "stay-rules",
                    type:
                      mode === "Stays"
                        ? "stay"
                        : "trip",
                  },
                });
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.modeButton,
        active && styles.modeButtonActive,
      ]}
    >
      <Text
        style={[
          styles.modeText,
          active && styles.modeTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Legend({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendDot,
          { backgroundColor: color },
        ]}
      />

      <Text style={styles.legendText}>
        {label}
      </Text>
    </View>
  );
}

function ReservationCard({
  item,
  onPress,
}: {
  item: CalendarEntry;
  onPress: () => void;
}) {
  const isTrip = item.type === "trip";
  const isBlocked =
    item.status === "blocked";

  return (
    <Pressable
      onPress={
        isBlocked ? undefined : onPress
      }
      style={({ pressed }) => [
        styles.reservationCard,
        pressed &&
          !isBlocked &&
          styles.reservationCardPressed,
      ]}
    >
      <View
        style={[
          styles.reservationIcon,
          {
            backgroundColor: isBlocked
              ? "#f1f3f4"
              : isTrip
              ? "#fff4dc"
              : THEME_LIGHT,
          },
        ]}
      >
        {isBlocked ? (
          <Lock
            size={20}
            color={BLOCKED}
          />
        ) : isTrip ? (
          <MapPin
            size={20}
            color={WARNING}
          />
        ) : (
          <CalendarDays
            size={20}
            color={THEME}
          />
        )}
      </View>

      <View style={styles.reservationContent}>
        <Text style={styles.reservationType}>
          {isBlocked
            ? "BLOCKED"
            : isTrip
            ? "TRIP DEPARTURE"
            : "STAY BOOKING"}
        </Text>

        <Text
          numberOfLines={1}
          style={styles.reservationTitle}
        >
          {item.title ||
            (isBlocked
              ? "Blocked by host"
              : isTrip
              ? "Trip package"
              : "Stay reservation")}
        </Text>

        {!isBlocked ? (
          <>
            <Text style={styles.guestName}>
              {item.guest_name || "Guest"}
            </Text>

            <Text style={styles.reservationMeta}>
              {isTrip
                ? formatDisplayDate(
                    item.departure_date ||
                      item.date
                  )
                : `${formatDisplayDate(
                    item.checkin
                  )} – ${formatDisplayDate(
                    item.checkout
                  )}`}
            </Text>

            <Text style={styles.reservationBottom}>
              {Math.max(
                1,
                toNumber(
                  item.guests ??
                    item.travelers
                )
              )}{" "}
              {isTrip
                ? "travelers"
                : "guests"}{" "}
              ·{" "}
              {formatCurrency(
                toNumber(
                  item.total ??
                    item.amount
                )
              )}
            </Text>
          </>
        ) : null}
      </View>

      {!isBlocked ? (
        <ChevronRight
          size={18}
          color="#9aa0a6"
        />
      ) : null}
    </Pressable>
  );
}

function SheetAction({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  last = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.sheetAction,
        last && styles.sheetActionLast,
        disabled && styles.sheetActionDisabled,
        pressed && styles.sheetActionPressed,
      ]}
    >
      <View style={styles.sheetActionIcon}>
        {icon}
      </View>

      <View style={styles.sheetActionContent}>
        <Text style={styles.sheetActionTitle}>
          {title}
        </Text>

        <Text
          style={
            styles.sheetActionDescription
          }
        >
          {description}
        </Text>
      </View>

      {disabled ? (
        <ActivityIndicator
          size="small"
          color={THEME}
        />
      ) : (
        <ChevronRight
          size={18}
          color="#9aa0a6"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WHITE,
  },

  listContent: {
    paddingHorizontal: 18,
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
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: MUTED,
  },

  header: {
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    marginLeft: 5,
  },

  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: MUTED,
  },

  title: {
    marginTop: 2,
    fontFamily:
      "PlusJakartaSans_800ExtraBold",
    fontSize: 28,
    lineHeight: 35,
    color: TEXT,
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

  modeTabs: {
    minHeight: 48,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
  },

  modeButton: {
    flex: 1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  modeButtonActive: {
    borderBottomColor: THEME,
  },

  modeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: MUTED,
  },

  modeTextActive: {
    color: THEME,
  },

  calendarCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: WHITE,
    padding: 14,
  },

  monthHeader: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: TEXT,
  },

  weekRow: {
    marginTop: 8,
    flexDirection: "row",
  },

  weekText: {
    width: "14.2857%",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: MUTED,
    textAlign: "center",
  },

  daysGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    width: "14.2857%",
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCellSelected: {
    backgroundColor: THEME,
  },

  dayText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  dayTextMuted: {
    color: "#b7bcc2",
  },

  dayTextToday: {
    color: THEME,
  },

  dayTextSelected: {
    color: WHITE,
  },

  statusDot: {
    width: 6,
    height: 6,
    marginTop: 4,
    borderRadius: 3,
  },

  statusBooked: {
    backgroundColor: SUCCESS,
  },

  statusDeparture: {
    backgroundColor: WARNING,
  },

  statusBlocked: {
    backgroundColor: BLOCKED,
  },

  statusAvailable: {
    backgroundColor: "#d7dce1",
  },

  legendRow: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: MUTED,
  },

  selectedHeader: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.7,
    color: MUTED,
  },

  selectedDate: {
    marginTop: 4,
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: TEXT,
  },

  manageButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: THEME_LIGHT,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  manageButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: THEME,
  },

  resultText: {
    marginTop: 14,
    marginBottom: 11,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: MUTED,
  },

  reservationCard: {
    minHeight: 118,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    backgroundColor: WHITE,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  reservationCardPressed: {
    backgroundColor: SURFACE,
  },

  reservationIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  reservationContent: {
    flex: 1,
    marginLeft: 12,
  },

  reservationType: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 0.6,
    color: MUTED,
  },

  reservationTitle: {
    marginTop: 5,
    fontFamily:
      "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: TEXT,
  },

  guestName: {
    marginTop: 4,
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: TEXT,
  },

  reservationMeta: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 9,
    color: MUTED,
  },

  reservationBottom: {
    marginTop: 5,
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: TEXT,
  },

  emptyState: {
    flex: 1,
    minHeight: 340,
    paddingHorizontal: 26,
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
    textAlign: "center",
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
    paddingHorizontal: 17,
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

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      "rgba(32,33,36,0.38)",
    justifyContent: "flex-end",
  },

  sheet: {
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
    fontFamily:
      "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: TEXT,
  },

  sheetSubtitle: {
    marginTop: 5,
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: MUTED,
  },

  sheetAction: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
    flexDirection: "row",
    alignItems: "center",
  },

  sheetActionLast: {
    borderBottomWidth: 0,
  },

  sheetActionPressed: {
    backgroundColor: SURFACE,
  },

  sheetActionDisabled: {
    opacity: 0.6,
  },

  sheetActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
  },

  sheetActionContent: {
    flex: 1,
    marginLeft: 12,
  },

  sheetActionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: TEXT,
  },

  sheetActionDescription: {
    marginTop: 4,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: MUTED,
  },
});