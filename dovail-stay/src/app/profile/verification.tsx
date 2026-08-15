import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { CheckCircle2, ChevronLeft, FileImage, ShieldCheck, Upload } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import api from "../../api/api";
import { getStoredUser } from "../../services/authService";

type PickedDocument = { uri: string; name: string; mimeType: string };
const normalizeStatus = (value: unknown) => String(value || "Not Submitted").trim();

export default function VerificationScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [idProof, setIdProof] = useState<PickedDocument | null>(null);
  const [addressProof, setAddressProof] = useState<PickedDocument | null>(null);

  const loadVerification = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await getStoredUser();
      if (!stored) { router.replace("/login"); return; }
      const response = await api.get("/kyc/me");
      setProfile({ ...stored, ...(response.data || {}) });
    } catch (error: any) {
      Alert.alert("Unable to load verification", error?.response?.data?.message || "Please try again.");
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadVerification(); }, [loadVerification]));
  const status = normalizeStatus(profile?.kyc_status);
  const approved = status.toLowerCase() === "approved";
  const pending = status.toLowerCase() === "pending";
  const canSubmit = useMemo(() => Boolean(idProof && addressProof && !submitting), [addressProof, idProof, submitting]);

  const pickDocument = async (setter: (document: PickedDocument) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access required", "Allow photo access to select your verification document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setter({ uri: asset.uri, name: asset.fileName || `document-${Date.now()}.jpg`, mimeType: asset.mimeType || "image/jpeg" });
  };

  const submit = async () => {
    if (!idProof || !addressProof || submitting) return;
    try {
      setSubmitting(true);
      const body = new FormData();
      body.append("id_proof", idProof as any);
      body.append("address_proof", addressProof as any);
      await api.post("/kyc/upload", body, { headers: { "Content-Type": "multipart/form-data" } });
      setIdProof(null); setAddressProof(null);
      await loadVerification();
      Alert.alert("Submitted", "Your documents were submitted securely for review.");
    } catch (error: any) {
      Alert.alert("Submission failed", error?.response?.data?.message || "Please check the documents and try again.");
    } finally { setSubmitting(false); }
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back"><ChevronLeft size={26} color="#172033" /></Pressable><Text style={styles.headerTitle}>Identity verification</Text><View style={{ width: 26 }} /></View>
    {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#3b71e6" /> : <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>{approved ? <CheckCircle2 size={44} color="#177a45" /> : <ShieldCheck size={44} color="#3b71e6" />}<Text style={styles.title}>{approved ? "Identity verified" : pending ? "Verification under review" : "Complete verification"}</Text><Text style={styles.body}>{approved ? "Your identity verification is approved." : pending ? "We are reviewing your documents. You can resubmit if support requested updated files." : "Upload a government ID and proof of address to enable hosting and payouts."}</Text><View style={styles.badge}><Text style={styles.badgeText}>{status}</Text></View>{profile?.kyc_note ? <Text style={styles.rejection}>{profile.kyc_note}</Text> : null}</View>
      {!approved && <><DocumentPicker title="Government ID" document={idProof} onPress={() => pickDocument(setIdProof)} /><DocumentPicker title="Proof of address" document={addressProof} onPress={() => pickDocument(setAddressProof)} /><Pressable style={[styles.button, !canSubmit && styles.disabled]} disabled={!canSubmit} onPress={submit}>{submitting ? <ActivityIndicator color="#fff" /> : <><Upload size={18} color="#fff" /><Text style={styles.buttonText}>Submit for verification</Text></>}</Pressable><Text style={styles.note}>Use clear, uncropped images. Documents are transmitted only to Dovail Stay’s secure verification service.</Text></>}
    </ScrollView>}
  </SafeAreaView>;
}

function DocumentPicker({ title, document, onPress }: { title: string; document: PickedDocument | null; onPress: () => void }) {
  return <Pressable style={styles.card} onPress={onPress}>{document ? <Image source={{ uri: document.uri }} style={styles.preview} /> : <View style={styles.fileIcon}><FileImage size={24} color="#3b71e6" /></View>}<View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text numberOfLines={1} style={styles.cardText}>{document?.name || "Tap to select an image"}</Text></View></Pressable>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#f7f8fa"},header:{height:64,paddingHorizontal:18,backgroundColor:"#fff",flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#e5e7eb"},headerTitle:{fontFamily:"PlusJakartaSans_700Bold",fontSize:18,color:"#172033"},content:{padding:20,gap:16},hero:{backgroundColor:"#fff",borderRadius:24,padding:24,alignItems:"center",gap:11},title:{fontFamily:"PlusJakartaSans_700Bold",fontSize:22,color:"#172033",textAlign:"center"},body:{fontFamily:"Inter_400Regular",fontSize:14,lineHeight:21,color:"#687386",textAlign:"center"},badge:{backgroundColor:"#eef4ff",paddingHorizontal:12,paddingVertical:6,borderRadius:99},badgeText:{fontFamily:"Inter_600SemiBold",fontSize:12,color:"#2f5fc2"},rejection:{fontFamily:"Inter_500Medium",fontSize:13,color:"#b42318",textAlign:"center"},card:{backgroundColor:"#fff",borderRadius:18,padding:14,flexDirection:"row",alignItems:"center",gap:13},fileIcon:{width:54,height:54,borderRadius:14,backgroundColor:"#eef4ff",alignItems:"center",justifyContent:"center"},preview:{width:54,height:54,borderRadius:14},cardTitle:{fontFamily:"Inter_600SemiBold",fontSize:15,color:"#172033"},cardText:{fontFamily:"Inter_400Regular",fontSize:12,color:"#687386",marginTop:4},button:{height:54,borderRadius:16,backgroundColor:"#3b71e6",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9},disabled:{opacity:.45},buttonText:{fontFamily:"Inter_600SemiBold",fontSize:14,color:"#fff"},note:{fontFamily:"Inter_400Regular",fontSize:12,lineHeight:18,color:"#687386",textAlign:"center"}
});
