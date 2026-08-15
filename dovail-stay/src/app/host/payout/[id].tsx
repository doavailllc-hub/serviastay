import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CircleDollarSign } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import api from "../../../api/api";

export default function PayoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState<any>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { try { const response = await api.get(`/host/payouts/${id}`); if (active) setPayout(response.data); }
      catch (error: any) { Alert.alert("Unable to load payout", error?.response?.data?.message || "Please try again."); }
      finally { if (active) setLoading(false); } })();
    return () => { active = false; };
  }, [id]));
  return <SafeAreaView style={styles.safe}><View style={styles.header}><Pressable onPress={() => router.back()} accessibilityLabel="Go back"><ChevronLeft size={26} color="#172033" /></Pressable><Text style={styles.headerTitle}>Payout details</Text><View style={{width:26}} /></View>{loading ? <ActivityIndicator style={{flex:1}} size="large" color="#3b71e6" /> : <View style={styles.content}><View style={styles.hero}><CircleDollarSign size={44} color="#3b71e6"/><Text style={styles.amount}>₹{Number(payout?.amount || 0).toLocaleString("en-IN")}</Text><Text style={styles.status}>{payout?.status || "Pending"}</Text></View><View style={styles.card}><Row label="Reference" value={`#${payout?.id || id}`} /><Row label="Method" value={payout?.payout_method || "Bank"} /><Row label="Bank" value={payout?.bank_name || payout?.upi_id || "—"} /><Row label="Account" value={payout?.account_number_masked || "—"} /><Row label="Requested" value={payout?.created_at ? new Date(payout.created_at).toLocaleDateString("en-IN") : "—"} />{payout?.admin_note ? <Row label="Note" value={payout.admin_note} /> : null}</View></View>}</SafeAreaView>;
}
function Row({label,value}:{label:string;value:string}){return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:"#f7f8fa"},header:{height:64,paddingHorizontal:18,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#e5e7eb"},headerTitle:{fontFamily:"PlusJakartaSans_700Bold",fontSize:18,color:"#172033"},content:{padding:20,gap:16},hero:{backgroundColor:"#fff",borderRadius:24,padding:24,alignItems:"center",gap:9},amount:{fontFamily:"PlusJakartaSans_700Bold",fontSize:30,color:"#172033"},status:{fontFamily:"Inter_600SemiBold",fontSize:13,color:"#2f5fc2",backgroundColor:"#eef4ff",paddingHorizontal:12,paddingVertical:6,borderRadius:99},card:{backgroundColor:"#fff",borderRadius:20,padding:18,gap:16},row:{flexDirection:"row",justifyContent:"space-between",gap:16},label:{fontFamily:"Inter_400Regular",fontSize:13,color:"#687386"},value:{flex:1,fontFamily:"Inter_600SemiBold",fontSize:13,color:"#172033",textAlign:"right"}});
