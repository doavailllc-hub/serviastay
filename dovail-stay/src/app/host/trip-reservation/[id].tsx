import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, ChevronLeft, CircleDollarSign, Mail, MapPin, Phone, User, Users } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import api from "../../../api/api";

const THEME = "#2DB281", BG = "#f7f8fa", BORDER = "#e5e7eb", TEXT = "#172033", MUTED = "#687386", DANGER = "#bd3434";

type TripBooking = {
  id: number | string; booking_id?: number | string; title?: string; experience_title?: string;
  location?: string; city?: string; guest_name?: string; guest_email?: string; guest_phone?: string;
  departure_date?: string; travel_date?: string; booking_date?: string; guests?: number | string;
  travelers?: number | string; total?: number | string; total_amount?: number | string; amount?: number | string;
  status?: string; booking_status?: string; payment_status?: string; payment_method?: string;
  pickup_location?: string; pickup_note?: string; special_request?: string;
};

const first = (value?: string | string[]) => Array.isArray(value) ? value[0] || "" : value || "";
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: unknown) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number(value));
const date = (value?: string) => { if (!value) return "Not available"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(parsed); };
const items = (payload: unknown): TripBooking[] => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  for (const key of ["data", "items", "results", "bookings"]) if (Array.isArray(record[key])) return record[key] as TripBooking[];
  return [];
};

export default function HostTripReservationDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const bookingId = first(id);
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true); setError("");
      const response = await api.get("/host/package-bookings");
      const match = items(response.data).find((entry) => String(entry.id) === bookingId || String(entry.booking_id) === bookingId);
      setBooking(match || null);
      if (!match) setError("This trip reservation was not found or is no longer available.");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "We could not load this trip reservation.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [bookingId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const status = String(booking?.status || booking?.booking_status || "Pending");
  const actions = useMemo(() => status.toLowerCase() === "pending" ? ["Confirmed", "Declined", "Cancelled"] : status.toLowerCase() === "confirmed" ? ["Completed", "Cancelled"] : [], [status]);

  const updateStatus = (next: string) => {
    if (!booking) return;
    Alert.alert(`${next} reservation?`, `Booking #${booking.booking_id || booking.id} will be marked ${next}.`, [
      { text: "Keep current", style: "cancel" },
      { text: next, style: ["Cancelled", "Declined"].includes(next) ? "destructive" : "default", onPress: async () => {
        try { setUpdating(true); await api.put(`/host/package-bookings/${booking.id}/status`, { status: next }); setBooking((current) => current ? { ...current, status: next } : current); }
        catch (requestError: any) { Alert.alert("Status not updated", requestError?.response?.data?.message || "Please try again."); }
        finally { setUpdating(false); }
      } },
    ]);
  };
  const open = async (url: string) => { if (await Linking.canOpenURL(url)) await Linking.openURL(url); };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={THEME} /></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable accessibilityLabel="Go back" style={styles.headerButton} onPress={() => router.back()}><ChevronLeft size={24} color={TEXT} /></Pressable><Text style={styles.headerTitle}>Trip reservation</Text><View style={styles.headerButton} /></View>
    {!booking ? <View style={styles.center}><Text style={styles.errorTitle}>Reservation unavailable</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.primary} onPress={() => load()}><Text style={styles.primaryText}>Try again</Text></Pressable></View> :
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={THEME} />} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      <View style={styles.hero}><View style={styles.heroRow}><View style={styles.heroIcon}><MapPin size={23} color={THEME} /></View><View style={styles.grow}><Text style={styles.tripTitle}>{booking.experience_title || booking.title || "Trip package"}</Text><Text style={styles.reference}>Booking #{booking.booking_id || booking.id}</Text></View><Status value={status} /></View><Text style={styles.location}>{[booking.city, booking.location].filter(Boolean).join(", ") || "Location not available"}</Text></View>
      <Section title="Trip details"><Row icon={<CalendarDays size={19} color={THEME} />} label="Departure" value={date(booking.departure_date || booking.travel_date || booking.booking_date)} /><Row icon={<Users size={19} color={THEME} />} label="Travelers" value={String(number(booking.guests ?? booking.travelers) || 1)} /><Row icon={<CircleDollarSign size={19} color={THEME} />} label="Booking total" value={money(booking.total ?? booking.total_amount ?? booking.amount)} last /></Section>
      <Section title="Payment"><Row icon={<CircleDollarSign size={19} color={THEME} />} label="Status" value={booking.payment_status || "Pending"} /><Row icon={<CircleDollarSign size={19} color={THEME} />} label="Method" value={booking.payment_method || "Not provided"} last /></Section>
      <Section title="Guest"><Row icon={<User size={19} color={THEME} />} label="Name" value={booking.guest_name || "Traveler"} /><Row icon={<Mail size={19} color={THEME} />} label="Email" value={booking.guest_email || "Not provided"} onPress={booking.guest_email ? () => open(`mailto:${booking.guest_email}`) : undefined} /><Row icon={<Phone size={19} color={THEME} />} label="Phone" value={booking.guest_phone || "Not provided"} onPress={booking.guest_phone ? () => open(`tel:${booking.guest_phone}`) : undefined} last /></Section>
      {booking.pickup_location || booking.pickup_note || booking.special_request ? <Section title="Pickup and requests"><Text style={styles.note}>{[booking.pickup_location, booking.pickup_note, booking.special_request].filter(Boolean).join("\n\n")}</Text></Section> : null}
      {actions.length ? <View style={styles.actions}><Text style={styles.sectionTitle}>Update reservation</Text>{actions.map((action) => <Pressable key={action} disabled={updating} style={[styles.action, ["Cancelled", "Declined"].includes(action) && styles.dangerAction, updating && styles.disabled]} onPress={() => updateStatus(action)}>{updating ? <ActivityIndicator color={THEME} /> : <Text style={[styles.actionText, ["Cancelled", "Declined"].includes(action) && styles.dangerText]}>{action}</Text>}</Pressable>)}</View> : null}
    </ScrollView>}
  </SafeAreaView>;
}

function Status({ value }: { value: string }) { const lower = value.toLowerCase(), danger = ["cancelled", "declined"].includes(lower), good = ["confirmed", "completed"].includes(lower); return <View style={[styles.badge, danger ? styles.dangerBadge : good ? styles.goodBadge : styles.pendingBadge]}><Text style={[styles.badgeText, danger ? styles.dangerText : good ? styles.goodText : styles.pendingText]}>{value}</Text></View>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.sectionWrap}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.section}>{children}</View></View>; }
function Row({ icon, label, value, last, onPress }: { icon: React.ReactNode; label: string; value: string; last?: boolean; onPress?: () => void }) { return <Pressable disabled={!onPress} onPress={onPress} style={[styles.row, last && styles.last]}><View style={styles.rowIcon}>{icon}</View><View style={styles.grow}><Text style={styles.label}>{label}</Text><Text style={[styles.value, onPress && styles.link]}>{value}</Text></View></Pressable>; }

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:BG},header:{minHeight:70,paddingHorizontal:14,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:BORDER,backgroundColor:"#fff"},headerButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},headerTitle:{flex:1,textAlign:"center",fontSize:18,fontWeight:"700",color:TEXT},center:{flex:1,padding:30,alignItems:"center",justifyContent:"center"},content:{padding:16,paddingBottom:36},grow:{flex:1},inlineError:{marginBottom:12,padding:12,borderRadius:12,color:DANGER,backgroundColor:"#fdecec"},
  hero:{padding:17,borderWidth:1,borderColor:BORDER,borderRadius:20,backgroundColor:"#fff"},heroRow:{flexDirection:"row",alignItems:"flex-start",gap:12},heroIcon:{width:46,height:46,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:"#edf3ff"},tripTitle:{fontSize:17,lineHeight:23,fontWeight:"700",color:TEXT},reference:{marginTop:4,fontSize:12,color:MUTED},location:{marginTop:14,fontSize:13,color:MUTED},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:11},badgeText:{fontSize:11,fontWeight:"700"},goodBadge:{backgroundColor:"#e9f7ef"},goodText:{color:"#177a45"},dangerBadge:{backgroundColor:"#fdecec"},dangerText:{color:DANGER},pendingBadge:{backgroundColor:"#fff4dc"},pendingText:{color:"#a96300"},
  sectionWrap:{marginTop:22},sectionTitle:{marginBottom:10,fontSize:17,fontWeight:"700",color:TEXT},section:{paddingHorizontal:15,borderWidth:1,borderColor:BORDER,borderRadius:18,backgroundColor:"#fff"},row:{minHeight:72,paddingVertical:13,flexDirection:"row",alignItems:"center",gap:12,borderBottomWidth:1,borderBottomColor:"#eef0f3"},last:{borderBottomWidth:0},rowIcon:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center",backgroundColor:"#edf3ff"},label:{fontSize:12,color:MUTED},value:{marginTop:4,fontSize:14,lineHeight:20,fontWeight:"600",color:TEXT},link:{color:THEME},note:{paddingVertical:15,fontSize:14,lineHeight:21,color:MUTED},
  actions:{marginTop:22,gap:10},action:{minHeight:52,borderRadius:15,alignItems:"center",justifyContent:"center",backgroundColor:THEME},dangerAction:{borderWidth:1,borderColor:"#efb8b8",backgroundColor:"#fff"},actionText:{fontSize:14,fontWeight:"700",color:"#fff"},disabled:{opacity:.6},errorTitle:{fontSize:20,fontWeight:"700",color:TEXT},errorText:{marginTop:8,textAlign:"center",lineHeight:21,color:MUTED},primary:{marginTop:20,paddingHorizontal:22,paddingVertical:13,borderRadius:14,backgroundColor:THEME},primaryText:{fontWeight:"700",color:"#fff"},
});
