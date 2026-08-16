import { SafeAreaView } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Mail, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import api from "../api/api";
import { loginWithGoogle } from "../services/authService";
import { saveSession } from "../services/sessionStorage";

const THEME = "#2DB281";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = Platform.select({
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const otpCode = otp.join("");
  const redirectParam = Array.isArray(params.redirect)
    ? params.redirect[0]
    : params.redirect;

  const finishAuthentication = () => {
    const destination =
      redirectParam?.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/profile";
    router.replace(destination as never);
  };

  useEffect(() => {
    if (step !== "otp") return;

    setTimer(45);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const sendOtp = async () => {
    if (!cleanEmail) {
      Alert.alert("Email required", "Please enter your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/send-otp", { email: cleanEmail });
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      Alert.alert(
        "OTP failed",
        err?.response?.data?.message || "Failed to send OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code = otpCode) => {
    if (code.length !== 6) {
      Alert.alert("Code required", "Please enter the 6-digit code.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/verify-otp", {
        email: cleanEmail,
        otp: code,
      });

      if (!res.data?.token || !res.data?.user) {
        Alert.alert("Verification failed", "Please try again.");
        return;
      }

      await saveSession(res.data.token, res.data.user);

      finishAuthentication();
    } catch (err: any) {
      Alert.alert(
        "Invalid code",
        err?.response?.data?.message || "Invalid or expired code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];

    next[index] = digit;
    setOtp(next);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const finalCode = next.join("");
    if (finalCode.length === 6) {
      verifyOtp(finalCode);
    }
  };

  const resendOtp = async () => {
    if (timer > 0 || loading) return;
    await sendOtp();
  };

  const backToEmail = () => {
    setStep("email");
    setOtp(["", "", "", "", "", ""]);
  };

  const continueWithGoogle = async () => {
    if (loading || googleLoading) return;

    if (!GOOGLE_CLIENT_ID) {
      Alert.alert(
        "Google sign-in needs configuration",
        "Add the Google OAuth client ID for this platform to your environment configuration."
      );
      return;
    }

    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "dovailstay",
      path: "oauthredirect",
    });

    try {
      setGoogleLoading(true);

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        scopes: ["openid", "profile", "email"],
        extraParams: { prompt: "select_account" },
      });

      const result = await request.promptAsync(Google.discovery);

      if (result.type === "cancel" || result.type === "dismiss") return;
      if (result.type !== "success" || !result.params.code) {
        throw new Error("Google sign-in was not completed.");
      }

      if (!request.codeVerifier) {
        throw new Error("Google sign-in security verification could not be completed.");
      }

      await loginWithGoogle({
        code: result.params.code,
        codeVerifier: request.codeVerifier,
        redirectUri,
      });

      finishAuthentication();
    } catch (error: any) {
      Alert.alert(
        "Google sign-in failed",
        error?.response?.data?.message ||
          error?.message ||
          "Please try again or continue with email."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          {step === "otp" ? (
            <Pressable style={styles.iconBtn} onPress={backToEmail}>
              <ArrowLeft size={21} color="#202124" />
            </Pressable>
          ) : (
            <View style={styles.iconSpace} />
          )}

          <Pressable style={styles.iconBtn} onPress={() => router.replace("/")}>
            <X size={21} color="#202124" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Image
            source={require("../../assets/images/brand-wordmark.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Dovail Stay"
          />

          {step === "email" ? (
            <>
              <Text style={styles.title}>Log in or sign up</Text>
              <Text style={styles.subtitle}>
                Enter your email to continue. New users will be signed up after
                verification.
              </Text>

              <View style={styles.inputBox}>
                <Mail size={19} color="#5f6368" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  placeholderTextColor="#80868b"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={continueWithGoogle}
                disabled={loading || googleLoading}
                style={({ pressed }) => [
                  styles.googleButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#202124" />
                ) : (
                  <>
                    <View style={styles.googleMark}>
                      <Text style={styles.googleMarkText}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH EMAIL</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter verification code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{" "}
                <Text style={styles.emailText}>{cleanEmail}</Text>
              </Text>

              <View style={styles.otpRow}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(index, value)}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={1}
                    style={styles.otpInput}
                  />
                ))}
              </View>

              <View style={styles.resendRow}>
                <Text style={styles.resendMuted}>Didn’t get it? </Text>
                <Pressable disabled={timer > 0 || loading} onPress={resendOtp}>
                  <Text
                    style={[
                      styles.resendText,
                      timer > 0 && styles.resendDisabled,
                    ]}
                  >
                    {timer > 0 ? `Send again in ${timer}s` : "Send again"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
              step === "otp" &&
                otpCode.length !== 6 &&
                styles.primaryButtonDisabled,
            ]}
            onPress={step === "email" ? sendOtp : () => verifyOtp()}
            disabled={loading || (step === "otp" && otpCode.length !== 6)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step === "email" ? "Continue" : "Verify and continue"}
              </Text>
            )}
          </Pressable>

          {step === "email" && (
            <Text style={styles.terms}>
              By continuing, you agree to Dovail Stay Terms and Privacy Policy.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  page: {
    flex: 1,
    backgroundColor: "#fff",
  },

  topBar: {
    height: 62,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  iconSpace: {
    width: 42,
    height: 42,
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 34,
  },

  logo: {
    width: 154,
    height: 44,
    alignSelf: "center",
  },

  title: {
    marginTop: 34,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 27,
    lineHeight: 34,
    color: "#202124",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "#5f6368",
    textAlign: "center",
  },

  emailText: {
    color: "#202124",
    fontFamily: "Inter_700Bold",
  },

  inputBox: {
    marginTop: 20,
    height: 56,
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ffffff",
  },

  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#202124",
  },

  googleButton: {
    height: 56,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#d9dde5",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
  },

  googleMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  googleMarkText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#4285f4",
  },

  googleButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#202124",
  },

  dividerRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e8eaed",
  },

  dividerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.6,
    color: "#80868b",
  },

  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  otpRow: {
    marginTop: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },

  otpInput: {
    width: 43,
    height: 54,
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    color: "#202124",
    backgroundColor: "#fff",
  },

  resendRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  resendMuted: {
    fontSize: 14,
    color: "#5f6368",
  },

  resendText: {
    fontSize: 14,
    color: THEME,
    fontFamily: "Inter_700Bold",
  },

  resendDisabled: {
    color: "#9aa0a6",
  },

  footer: {
    paddingHorizontal: 26,
    paddingBottom: 26,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f3f4",
    backgroundColor: "#fff",
  },

  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  terms: {
    marginTop: 14,
    paddingHorizontal: 8,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
    color: "#6b7280",
  },
});
