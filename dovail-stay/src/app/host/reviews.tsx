import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, ChevronLeft, MessageSquare, Send, Star } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

const THEME = "#2DB281", BG = "#f7f8fa", BORDER = "#e5e7eb", TEXT = "#172033", MUTED = "#687386";
const FALLBACK = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";

type Review = { id:number|string; rating?:number|string; review?:string; comment?:string; created_at?:string; host_reply?:string; guest_name?:string; fullname?:string; property_id?:number|string; property_title?:string; title?:string; property_image?:string; image?:string };
type User = { id?: number|string; user_id?: number|string };
const list = (data: unknown): Review[] => Array.isArray(data) ? data : [];
const image = (value?: string) => !value ? FALLBACK : /^https?:\/\//.test(value) ? value : `https://stay.dovail.com${value.startsWith("/") ? "" : "/"}${value}`;

export default function HostReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]), [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(""), [replyingId, setReplyingId] = useState<string|null>(null);
  const [replies, setReplies] = useState<Record<string,string>>({});

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true); setError("");
      const user = await getStoredUser() as User | null, hostId = user?.id ?? user?.user_id;
      if (!hostId) { router.replace("/login"); return; }
      const response = await api.get(`/host/reviews/${hostId}`);
      setReviews(list(response.data));
    } catch (requestError:any) { setError(requestError?.response?.data?.message || "We could not load guest reviews."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const summary = useMemo(() => ({
    average: reviews.length ? (reviews.reduce((sum,item) => sum + Number(item.rating || 0), 0) / reviews.length).toFixed(1) : "0.0",
    fiveStar: reviews.filter((item) => Number(item.rating) === 5).length,
    properties: new Set(reviews.map((item) => item.property_id).filter(Boolean)).size,
  }), [reviews]);

  const submitReply = async (review: Review) => {
    const key = String(review.id), reply = (replies[key] || "").trim();
    if (!reply) { Alert.alert("Reply required", "Write a public reply first."); return; }
    try {
      setReplyingId(key); await api.put(`/reviews/${review.id}/reply`, { host_reply: reply });
      setReviews((current) => current.map((item) => String(item.id) === key ? { ...item, host_reply: reply } : item));
      setReplies((current) => ({ ...current, [key]: "" }));
    } catch (requestError:any) { Alert.alert("Reply not posted", requestError?.response?.data?.message || "Please try again."); }
    finally { setReplyingId(null); }
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable style={styles.headerButton} onPress={() => router.back()}><ChevronLeft size={24} color={TEXT}/></Pressable><Text style={styles.headerTitle}>Guest reviews</Text><View style={styles.headerButton}/></View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {loading ? <View style={styles.center}><ActivityIndicator size="large" color={THEME}/></View> : <FlatList
      data={reviews} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={THEME}/>} contentContainerStyle={reviews.length ? styles.list : styles.emptyList}
      ListHeaderComponent={<View style={styles.stats}><Stat label="Average" value={summary.average}/><Stat label="Reviews" value={String(reviews.length)}/><Stat label="5 star" value={String(summary.fiveStar)}/><Stat label="Properties" value={String(summary.properties)}/></View>}
      ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><MessageSquare size={28} color={THEME}/></View><Text style={styles.emptyTitle}>No reviews yet</Text><Text style={styles.emptyText}>Guest feedback and ratings for your listings will appear here.</Text></View>}
      renderItem={({item}) => { const key=String(item.id), rating=Math.max(0,Math.min(5,Number(item.rating||0))); return <View style={styles.card}>
        <View style={styles.cardTop}><Image source={{uri:image(item.property_image||item.image)}} style={styles.photo}/><View style={styles.cardCopy}><Text style={styles.property} numberOfLines={2}>{item.property_title||item.title||"Property"}</Text><Text style={styles.guest}>By {item.guest_name||item.fullname||"Guest"}</Text><View style={styles.stars}>{[1,2,3,4,5].map((star)=><Star key={star} size={15} color="#f59e0b" fill={star<=rating?"#f59e0b":"transparent"}/>)}</View></View><View style={styles.rating}><Text style={styles.ratingText}>{rating.toFixed(1)}</Text></View></View>
        <Text style={styles.review}>{item.review||item.comment||"No written review."}</Text><Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</Text>
        {item.host_reply ? <View style={styles.reply}><View style={styles.replyTitle}><CheckCircle2 size={16} color={THEME}/><Text style={styles.replyTitleText}>Your public reply</Text></View><Text style={styles.replyText}>{item.host_reply}</Text></View> : <View style={styles.composer}><TextInput value={replies[key]||""} onChangeText={(value)=>setReplies((current)=>({...current,[key]:value}))} placeholder="Write a helpful public reply…" placeholderTextColor="#9299a6" multiline maxLength={1000} style={styles.input}/><Pressable disabled={replyingId===key} style={styles.send} onPress={()=>submitReply(item)}>{replyingId===key?<ActivityIndicator color="#fff"/>:<><Send size={16} color="#fff"/><Text style={styles.sendText}>Post reply</Text></>}</Pressable></View>}
      </View>; }}
    />}
  </SafeAreaView>;
}
function Stat({label,value}:{label:string;value:string}) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:BG},header:{minHeight:70,paddingHorizontal:14,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:BORDER,backgroundColor:"#fff"},headerButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},headerTitle:{flex:1,textAlign:"center",fontSize:18,fontWeight:"700",color:TEXT},error:{margin:14,padding:12,borderRadius:12,color:"#9f2d2d",backgroundColor:"#fff0f0"},center:{flex:1,alignItems:"center",justifyContent:"center"},list:{padding:16,paddingBottom:34,gap:13},emptyList:{flexGrow:1,padding:16},stats:{flexDirection:"row",gap:8,marginBottom:5},stat:{flex:1,paddingVertical:13,borderWidth:1,borderColor:BORDER,borderRadius:15,alignItems:"center",backgroundColor:"#fff"},statValue:{fontSize:18,fontWeight:"800",color:TEXT},statLabel:{marginTop:3,fontSize:10,color:MUTED},card:{padding:15,borderWidth:1,borderColor:BORDER,borderRadius:20,backgroundColor:"#fff"},cardTop:{flexDirection:"row",alignItems:"flex-start",gap:12},photo:{width:76,height:76,borderRadius:14,backgroundColor:"#eef0f3"},cardCopy:{flex:1},property:{fontSize:15,lineHeight:20,fontWeight:"700",color:TEXT},guest:{marginTop:4,fontSize:12,color:MUTED},stars:{marginTop:9,flexDirection:"row",gap:2},rating:{paddingHorizontal:10,paddingVertical:6,borderRadius:12,backgroundColor:"#edf3ff"},ratingText:{fontSize:12,fontWeight:"700",color:THEME},review:{marginTop:14,fontSize:14,lineHeight:21,color:TEXT},date:{marginTop:8,fontSize:11,color:"#9299a6"},reply:{marginTop:14,padding:13,borderRadius:15,backgroundColor:"#edf3ff"},replyTitle:{flexDirection:"row",alignItems:"center",gap:6},replyTitleText:{fontSize:12,fontWeight:"700",color:THEME},replyText:{marginTop:7,fontSize:13,lineHeight:20,color:TEXT},composer:{marginTop:14,padding:12,borderWidth:1,borderColor:BORDER,borderRadius:15},input:{minHeight:70,fontSize:14,lineHeight:20,color:TEXT,textAlignVertical:"top"},send:{alignSelf:"flex-end",minHeight:40,paddingHorizontal:15,borderRadius:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,backgroundColor:THEME},sendText:{fontSize:13,fontWeight:"700",color:"#fff"},empty:{flex:1,padding:35,alignItems:"center",justifyContent:"center"},emptyIcon:{width:62,height:62,borderRadius:21,alignItems:"center",justifyContent:"center",backgroundColor:"#edf3ff"},emptyTitle:{marginTop:16,fontSize:20,fontWeight:"700",color:TEXT},emptyText:{marginTop:7,textAlign:"center",fontSize:14,lineHeight:21,color:MUTED}
});
