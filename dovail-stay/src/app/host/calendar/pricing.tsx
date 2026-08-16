import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDays, Check, ChevronLeft, CircleDollarSign, Clock3, Home, Info } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import api from "../../../api/api";
import { getStoredUser } from "../../../services/authService";

const THEME="#2DB281", BG="#f7f8fa", BORDER="#e5e7eb", TEXT="#172033", MUTED="#687386";
type Property={id:number|string;title?:string;name?:string;location?:string;weekday_price?:number|string;price?:number|string};
type CalendarRule={calendar_date?:string;status?:string;custom_price?:number|string;note?:string;minimum_stay?:number|string;maximum_stay?:number|string};
type User={id?:number|string;user_id?:number|string};
const first=(value?:string|string[])=>Array.isArray(value)?value[0]||"":value||"";
const array=(payload:unknown):any[]=>Array.isArray(payload)?payload:[];
const isoToday=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};

export default function CalendarPricingScreen(){
  const router=useRouter();
  const params=useLocalSearchParams<{date?:string|string[];section?:string|string[]}>();
  const selectedDate=first(params.date)||isoToday();
  const focusRules=first(params.section)==="stay-rules";
  const [properties,setProperties]=useState<Property[]>([]),[propertyId,setPropertyId]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [status,setStatus]=useState<"Available"|"Blocked">("Available"),[price,setPrice]=useState(""),[minimum,setMinimum]=useState(""),[maximum,setMaximum]=useState(""),[note,setNote]=useState(""),[error,setError]=useState("");

  const loadProperties=useCallback(async()=>{
    try{setLoading(true);setError("");const user=await getStoredUser() as User|null;const id=user?.id??user?.user_id;if(!id){router.replace("/login");return;}const response=await api.get(`/my-properties/${id}`);const loaded=array(response.data) as Property[];setProperties(loaded);if(loaded[0])setPropertyId((current)=>current||String(loaded[0].id));}
    catch(requestError:any){setError(requestError?.response?.data?.message||"We could not load your properties.");}finally{setLoading(false);}
  },[router]);
  useEffect(()=>{void loadProperties();},[loadProperties]);

  const loadRule=useCallback(async()=>{
    if(!propertyId)return;
    try{const response=await api.get(`/host/calendar/${propertyId}`);const rule=(array(response.data) as CalendarRule[]).find((item)=>String(item.calendar_date||"").slice(0,10)===selectedDate);setStatus(rule?.status==="Blocked"?"Blocked":"Available");setPrice(rule?.custom_price==null?"":String(rule.custom_price));setMinimum(rule?.minimum_stay==null?"":String(rule.minimum_stay));setMaximum(rule?.maximum_stay==null?"":String(rule.maximum_stay));setNote(rule?.note||"");}
    catch(requestError:any){setError(requestError?.response?.data?.message||"We could not load pricing for this date.");}
  },[propertyId,selectedDate]);
  useEffect(()=>{void loadRule();},[loadRule]);

  const selectedProperty=useMemo(()=>properties.find((item)=>String(item.id)===propertyId),[properties,propertyId]);
  const save=async()=>{
    const customPrice=price.trim()?Number(price):null,min=minimum.trim()?Number(minimum):null,max=maximum.trim()?Number(maximum):null;
    if(!propertyId){Alert.alert("Select a property","Choose the listing this rule applies to.");return;}
    if(customPrice!==null&&(!Number.isFinite(customPrice)||customPrice<=0)){Alert.alert("Invalid price","Enter a positive nightly rate.");return;}
    if(min!==null&&(!Number.isInteger(min)||min<1||min>365)){Alert.alert("Invalid minimum stay","Use a whole number from 1 to 365.");return;}
    if(max!==null&&(!Number.isInteger(max)||max<1||max>365)){Alert.alert("Invalid maximum stay","Use a whole number from 1 to 365.");return;}
    if(min!==null&&max!==null&&min>max){Alert.alert("Check stay rules","Maximum stay cannot be shorter than minimum stay.");return;}
    try{setSaving(true);await api.post("/host/calendar",{property_id:propertyId,calendar_date:selectedDate,status,custom_price:customPrice,minimum_stay:min,maximum_stay:max,note:note.trim()});Alert.alert("Calendar updated","Pricing and stay rules were saved.",[{text:"Done",onPress:()=>router.back()}]);}
    catch(requestError:any){Alert.alert("Could not save",requestError?.response?.data?.message||"Please try again.");}finally{setSaving(false);}
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS==="ios"?"padding":undefined}>
    <View style={styles.header}><Pressable style={styles.headerButton} onPress={()=>router.back()}><ChevronLeft size={24} color={TEXT}/></Pressable><Text style={styles.headerTitle}>{focusRules?"Stay rules":"Custom pricing"}</Text><View style={styles.headerButton}/></View>
    {loading?<View style={styles.center}><ActivityIndicator size="large" color={THEME}/></View>:<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error?<View style={styles.error}><Info size={18} color="#a33"/><Text style={styles.errorText}>{error}</Text></View>:null}
      <View style={styles.dateCard}><View style={styles.icon}><CalendarDays size={22} color={THEME}/></View><View><Text style={styles.miniLabel}>Rule date</Text><Text style={styles.date}>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</Text></View></View>
      <Text style={styles.sectionTitle}>Property</Text>
      {properties.length?<FlatList horizontal data={properties} keyExtractor={(item)=>String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyList} renderItem={({item})=>{const active=String(item.id)===propertyId;return <Pressable style={[styles.propertyCard,active&&styles.propertyActive]} onPress={()=>setPropertyId(String(item.id))}><View style={[styles.smallIcon,active&&styles.smallIconActive]}><Home size={18} color={active?"#fff":THEME}/></View><Text numberOfLines={1} style={[styles.propertyTitle,active&&styles.activeText]}>{item.title||item.name||`Property ${item.id}`}</Text><Text numberOfLines={1} style={[styles.propertyLocation,active&&styles.activeSub]}>{item.location||"Dovail Stay"}</Text>{active?<Check size={17} color="#fff" style={styles.check}/>:null}</Pressable>;}}/>:<View style={styles.empty}><Text style={styles.emptyTitle}>No properties available</Text><Text style={styles.emptyText}>Create and approve a listing before adding calendar pricing.</Text></View>}
      <Text style={styles.sectionTitle}>Availability</Text><View style={styles.segment}><Pressable style={[styles.segmentButton,status==="Available"&&styles.segmentActive]} onPress={()=>setStatus("Available")}><Text style={[styles.segmentText,status==="Available"&&styles.segmentTextActive]}>Available</Text></Pressable><Pressable style={[styles.segmentButton,status==="Blocked"&&styles.segmentDanger]} onPress={()=>setStatus("Blocked")}><Text style={[styles.segmentText,status==="Blocked"&&styles.segmentDangerText]}>Blocked</Text></Pressable></View>
      <Text style={styles.sectionTitle}>Nightly rate</Text><Field icon={<CircleDollarSign size={19} color={THEME}/>} label="Custom price" value={price} onChangeText={setPrice} placeholder={String(selectedProperty?.weekday_price??selectedProperty?.price??"Use standard price")} keyboardType="numeric" prefix="₹"/><Text style={styles.hint}>Leave blank to use the listing’s standard nightly rate.</Text>
      <Text style={styles.sectionTitle}>Stay rules</Text><View style={styles.twoColumns}><View style={styles.column}><Field icon={<Clock3 size={18} color={THEME}/>} label="Minimum nights" value={minimum} onChangeText={setMinimum} placeholder="1" keyboardType="number-pad"/></View><View style={styles.column}><Field icon={<Clock3 size={18} color={THEME}/>} label="Maximum nights" value={maximum} onChangeText={setMaximum} placeholder="No limit" keyboardType="number-pad"/></View></View>
      <Text style={styles.sectionTitle}>Private note</Text><TextInput value={note} onChangeText={setNote} placeholder="Optional note for your hosting team" placeholderTextColor="#9299a6" multiline maxLength={500} style={styles.note}/>
      <Pressable disabled={saving||!properties.length} style={[styles.save,saving&&styles.disabled]} onPress={save}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.saveText}>Save calendar rule</Text>}</Pressable>
    </ScrollView>}
  </KeyboardAvoidingView></SafeAreaView>;
}
function Field({icon,label,prefix,...props}:any){return <View style={styles.field}><View style={styles.fieldLabel}>{icon}<Text style={styles.fieldLabelText}>{label}</Text></View><View style={styles.inputWrap}>{prefix?<Text style={styles.prefix}>{prefix}</Text>:null}<TextInput {...props} style={styles.input} placeholderTextColor="#9299a6"/></View></View>;}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:BG},header:{minHeight:70,paddingHorizontal:14,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:BORDER,backgroundColor:"#fff"},headerButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},headerTitle:{flex:1,textAlign:"center",fontSize:18,fontWeight:"700",color:TEXT},center:{flex:1,alignItems:"center",justifyContent:"center"},content:{padding:16,paddingBottom:40},error:{padding:13,borderRadius:14,flexDirection:"row",gap:9,backgroundColor:"#fff0f0"},errorText:{flex:1,color:"#9f2d2d"},dateCard:{padding:16,borderWidth:1,borderColor:BORDER,borderRadius:18,flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#fff"},icon:{width:44,height:44,borderRadius:14,alignItems:"center",justifyContent:"center",backgroundColor:"#edf3ff"},miniLabel:{fontSize:11,color:MUTED},date:{marginTop:3,fontSize:15,fontWeight:"700",color:TEXT},sectionTitle:{marginTop:24,marginBottom:10,fontSize:17,fontWeight:"700",color:TEXT},propertyList:{gap:10},propertyCard:{width:190,padding:14,borderWidth:1,borderColor:BORDER,borderRadius:17,backgroundColor:"#fff"},propertyActive:{borderColor:THEME,backgroundColor:THEME},smallIcon:{width:35,height:35,borderRadius:11,alignItems:"center",justifyContent:"center",backgroundColor:"#edf3ff"},smallIconActive:{backgroundColor:"rgba(255,255,255,.2)"},propertyTitle:{marginTop:10,fontSize:14,fontWeight:"700",color:TEXT},propertyLocation:{marginTop:3,fontSize:11,color:MUTED},activeText:{color:"#fff"},activeSub:{color:"#dfe8ff"},check:{position:"absolute",top:14,right:14},segment:{padding:4,borderRadius:15,flexDirection:"row",backgroundColor:"#e9edf2"},segmentButton:{flex:1,minHeight:43,borderRadius:12,alignItems:"center",justifyContent:"center"},segmentActive:{backgroundColor:"#fff"},segmentDanger:{backgroundColor:"#fff0f0"},segmentText:{fontSize:13,fontWeight:"700",color:MUTED},segmentTextActive:{color:THEME},segmentDangerText:{color:"#bd3434"},field:{padding:14,borderWidth:1,borderColor:BORDER,borderRadius:16,backgroundColor:"#fff"},fieldLabel:{flexDirection:"row",alignItems:"center",gap:7},fieldLabelText:{fontSize:12,fontWeight:"600",color:MUTED},inputWrap:{marginTop:8,flexDirection:"row",alignItems:"center"},prefix:{fontSize:18,fontWeight:"700",color:TEXT},input:{flex:1,minHeight:34,fontSize:17,fontWeight:"700",color:TEXT},hint:{marginTop:7,fontSize:11,color:MUTED},twoColumns:{flexDirection:"row",gap:10},column:{flex:1},note:{minHeight:100,padding:14,borderWidth:1,borderColor:BORDER,borderRadius:16,fontSize:14,lineHeight:21,color:TEXT,textAlignVertical:"top",backgroundColor:"#fff"},save:{marginTop:26,minHeight:54,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:THEME},saveText:{fontSize:15,fontWeight:"700",color:"#fff"},disabled:{opacity:.55},empty:{padding:18,borderWidth:1,borderColor:BORDER,borderRadius:16,backgroundColor:"#fff"},emptyTitle:{fontWeight:"700",color:TEXT},emptyText:{marginTop:5,lineHeight:20,color:MUTED}});
