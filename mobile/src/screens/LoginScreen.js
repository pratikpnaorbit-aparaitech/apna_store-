import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { messageFromError } from "../api/client";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function LoginScreen({ navigation }) {
  const { login, loginDelivery } = useAuth();
  const [mode, setMode] = useState("customer");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const cleanDeliveryPhone = useMemo(() => phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""), [phone]);

  const clearFieldError = useCallback((field) => {
    setFieldErrors((old) => (old[field] ? { ...old, [field]: "" } : old));
  }, []);

  const updateEmail = useCallback((value) => {
    setEmail(value);
    clearFieldError("email");
  }, [clearFieldError]);

  const updatePhone = useCallback((value) => {
    setPhone(value);
    clearFieldError("phone");
  }, [clearFieldError]);

  const updatePassword = useCallback((value) => {
    setPassword(value);
    clearFieldError("password");
  }, [clearFieldError]);

  const selectMode = useCallback((nextMode) => {
    setMode(nextMode);
    setError("");
    setFieldErrors({});
  }, []);

  const submit = useCallback(async () => {
    if (loading) return;
    const nextErrors = {};
    if (mode === "customer" && !emailPattern.test(email.trim())) nextErrors.email = "Invalid email address.";
    if (mode === "delivery" && cleanDeliveryPhone.length !== 10) nextErrors.phone = "Enter a valid 10-digit phone number.";
    if (!password) nextErrors.password = "Password is required.";
    else if (password.length < 4) nextErrors.password = "Password is too short.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      if (mode === "delivery") await loginDelivery(cleanDeliveryPhone, password);
      else await login(email, password);
    } catch (e) {
      setError(e.response ? messageFromError(e, mode === "delivery" ? "Wrong phone or password." : "Wrong email or password.") : e.message);
    } finally {
      setLoading(false);
    }
  }, [cleanDeliveryPhone, email, loading, login, loginDelivery, mode, password]);

  return <Screen style={styles.screen}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} enabled={Platform.OS === "ios"}>
      <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
        <View style={styles.brand}><View style={styles.logo}><Text style={{ fontSize: 29 }}>{mode === "delivery" ? "🏍️" : "⚡"}</Text></View><Text style={styles.brandName}>Smart Store</Text></View>
        <Text style={styles.title}>{mode === "delivery" ? "Delivery login" : "Welcome back"}</Text>
        <Text style={styles.subtitle}>{mode === "delivery" ? "Login to manage assigned deliveries, GPS tracking and delivery OTP." : "Login to get your essentials delivered fast."}</Text>

        <View style={styles.switcher}>
          <Pressable onPress={() => selectMode("customer")} style={[styles.switchItem, mode === "customer" && styles.switchActive]}><Text style={[styles.switchText, mode === "customer" && styles.switchTextActive]}>Customer</Text></Pressable>
          <Pressable onPress={() => selectMode("delivery")} style={[styles.switchItem, mode === "delivery" && styles.switchActive]}><Text style={[styles.switchText, mode === "delivery" && styles.switchTextActive]}>Delivery Boy</Text></Pressable>
        </View>

        {error ? <View style={styles.alert}><Ionicons name="alert-circle" size={18} color={colors.danger} /><Text style={styles.alertText}>{error}</Text></View> : null}
        {mode === "delivery" ? (
          <Field label="Phone number" error={fieldErrors.phone} icon="call-outline" value={phone} onChangeText={updatePhone} keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" placeholder="+91 98765 43210" maxLength={14} />
        ) : (
          <Field label="Email address" error={fieldErrors.email} icon="mail-outline" value={email} onChangeText={updateEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} placeholder="you@example.com" />
        )}
        <Field label="Password" error={fieldErrors.password} icon="lock-closed-outline" value={password} onChangeText={updatePassword} secureTextEntry autoComplete="current-password" textContentType="password" placeholder="Enter your password" returnKeyType="go" onSubmitEditing={submit} />
        {mode === "customer" ? <Pressable onPress={() => navigation.navigate("ForgotPassword")}><Text style={styles.forgot}>Forgot password?</Text></Pressable> : null}
        <PrimaryButton title={mode === "delivery" ? "Login as Delivery Boy" : "Login"} loading={loading} disabled={loading} onPress={submit} style={{ marginTop: 23 }} />
        {mode === "customer" ? <><View style={styles.or}><View style={styles.line} /><Text style={styles.orText}>New to Smart Store?</Text><View style={styles.line} /></View><Pressable onPress={() => navigation.navigate("Register")} style={styles.create}><Text style={styles.createText}>Create an account</Text></Pressable></> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({ screen: { backgroundColor: "white" }, content: { flexGrow: 1, padding: 24, justifyContent: "center" }, brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 34 }, logo: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple }, brandName: { fontSize: 22, fontWeight: "900", color: colors.ink }, title: { fontSize: 30, fontWeight: "900", color: colors.ink, letterSpacing: -.6 }, subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, marginBottom: 20 }, switcher: { flexDirection: "row", backgroundColor: colors.purpleSoft, padding: 5, borderRadius: 16, marginBottom: 18 }, switchItem: { flex: 1, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" }, switchActive: { backgroundColor: colors.white }, switchText: { color: colors.muted, fontWeight: "900", fontSize: 13 }, switchTextActive: { color: colors.purpleDark }, alert: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "#FFF1F2", marginBottom: 16 }, alertText: { color: colors.danger, fontSize: 12, flex: 1 }, forgot: { alignSelf: "flex-end", color: colors.purple, fontWeight: "800", fontSize: 13 }, or: { flexDirection: "row", alignItems: "center", gap: 11, marginVertical: 24 }, line: { flex: 1, height: 1, backgroundColor: colors.border }, orText: { color: colors.muted, fontSize: 12 }, create: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple, alignItems: "center", justifyContent: "center" }, createText: { color: colors.purple, fontWeight: "900" } });
