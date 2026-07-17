import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { messageFromError } from "../api/client";
import { ROLE_LABELS } from "../navigation/roleConfig";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function LoginScreen({ navigation }) {
  const { clearPendingIntent, login, pendingIntent } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const identityRef = useRef(null);
  const passwordRef = useRef(null);

  const normalizedPhone = useMemo(
    () => identifier.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
    [identifier],
  );

  const clearFieldError = useCallback((field) => {
    setFieldErrors((old) => (old[field] ? { ...old, [field]: "" } : old));
  }, []);

  const updateIdentifier = useCallback((value) => {
    setIdentifier(value);
    setError("");
    clearFieldError("identifier");
  }, [clearFieldError]);

  const updatePassword = useCallback((value) => {
    setPassword(value);
    setError("");
    clearFieldError("password");
  }, [clearFieldError]);

  const close = useCallback(() => {
    clearPendingIntent();
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Main");
  }, [clearPendingIntent, navigation]);

  const submit = useCallback(async () => {
    if (loading) return;
    const value = identifier.trim();
    const isEmail = value.includes("@");
    const nextErrors = {};
    if (isEmail && !emailPattern.test(value)) nextErrors.identifier = "Enter a valid email address.";
    if (!isEmail && normalizedPhone.length !== 10) nextErrors.identifier = "Enter your email or a valid 10-digit delivery phone.";
    if (!password) nextErrors.password = "Password is required.";
    else if (password.length < 4) nextErrors.password = "Password is too short.";
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    setFieldErrors({});
    try {
      await login(value, password);
    } catch (loginError) {
      setError(loginError.response
        ? messageFromError(loginError, "The email/phone or password is incorrect.")
        : loginError.message);
    } finally {
      setLoading(false);
    }
  }, [identifier, loading, login, normalizedPhone.length, password]);

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
          <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close login">
            <Ionicons name="close" size={23} color={colors.ink} />
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.logo}><Text style={styles.logoText}>⚡</Text></View>
            <View>
              <Text style={styles.brandName}>Smart Store</Text>
              <Text style={styles.brandSub}>One secure login for every role</Text>
            </View>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Use your existing Customer, Store Admin, Super Admin, Staff, or Delivery Partner credentials.
          </Text>

          {pendingIntent ? (
            <View style={styles.resumeBox}>
              <Ionicons name="return-down-forward" size={18} color={colors.purple} />
              <Text style={styles.resumeText}>After login, we’ll continue where you left off.</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.alert}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.alertText}>{error}</Text>
            </View>
          ) : null}

          <Field
            ref={identityRef}
            label="Email or delivery phone"
            error={fieldErrors.identifier}
            icon="person-outline"
            value={identifier}
            onChangeText={updateIdentifier}
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            placeholder="you@example.com or 9876543210"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <Field
            ref={passwordRef}
            label="Password"
            error={fieldErrors.password}
            icon="lock-closed-outline"
            value={password}
            onChangeText={updatePassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="Enter your password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
          <PrimaryButton title="Secure login" loading={loading} disabled={loading} onPress={submit} style={styles.loginButton} />

          <View style={styles.roleWrap}>
            {Object.values(ROLE_LABELS).map((label) => (
              <View key={label} style={styles.rolePill}><Text style={styles.roleText}>{label}</Text></View>
            ))}
          </View>

          <View style={styles.or}><View style={styles.line} /><Text style={styles.orText}>New customer?</Text><View style={styles.line} /></View>
          <Pressable onPress={() => navigation.navigate("Register")} style={styles.create}>
            <Text style={styles.createText}>Create customer account</Text>
          </Pressable>
          <Text style={styles.registrationNote}>Admin, staff and delivery accounts are created only by authorized administrators.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { backgroundColor: "white" },
  content: { flexGrow: 1, padding: 24, justifyContent: "center" },
  close: { position: "absolute", top: 16, right: 18, width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F1FA", zIndex: 2 },
  brand: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 29 },
  logo: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.purple },
  logoText: { fontSize: 29 },
  brandName: { fontSize: 21, fontWeight: "900", color: colors.ink },
  brandSub: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  title: { fontSize: 30, fontWeight: "900", color: colors.ink, letterSpacing: -0.6 },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  resumeBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 13, backgroundColor: colors.purpleSoft, marginBottom: 16 },
  resumeText: { color: colors.purpleDark, fontSize: 12, fontWeight: "700", flex: 1 },
  alert: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: "#FFF1F2", marginBottom: 16 },
  alertText: { color: colors.danger, fontSize: 12, flex: 1 },
  forgot: { alignSelf: "flex-end", color: colors.purple, fontWeight: "800", fontSize: 13 },
  loginButton: { marginTop: 22 },
  roleWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  rolePill: { backgroundColor: "#F6F3F9", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  roleText: { color: colors.muted, fontSize: 9.5, fontWeight: "800" },
  or: { flexDirection: "row", alignItems: "center", gap: 11, marginVertical: 21 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.muted, fontSize: 12 },
  create: { height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.purple, alignItems: "center", justifyContent: "center" },
  createText: { color: colors.purple, fontWeight: "900" },
  registrationNote: { color: colors.muted, fontSize: 10.5, lineHeight: 16, textAlign: "center", marginTop: 10 },
});
