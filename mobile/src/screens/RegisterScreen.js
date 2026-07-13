import { useCallback, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Screen from "../components/Screen";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { messageFromError } from "../api/client";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }, []);
  const updateName = useCallback((value) => updateField("name", value), [updateField]);
  const updateEmail = useCallback((value) => updateField("email", value), [updateField]);
  const updatePassword = useCallback((value) => updateField("password", value), [updateField]);
  const updateConfirm = useCallback((value) => updateField("confirm", value), [updateField]);

  const submit = useCallback(async () => {
    if (loading) return;
    if (form.name.trim().length < 2) return setError("Please enter your full name.");
    if (!emailPattern.test(form.email.trim())) return setError("Please enter a valid email address.");
    if (form.password.length < 6) return setError("Password must contain at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
    } catch (e) {
      setError(messageFromError(e, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }, [form, loading, register]);

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} enabled={Platform.OS === "ios"}>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Fresh products and faster deliveries are one step away.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Field label="Full name" icon="person-outline" value={form.name} onChangeText={updateName} autoCapitalize="words" autoComplete="name" textContentType="name" placeholder="Your name" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => emailRef.current?.focus()} />
          <Field ref={emailRef} label="Email address" icon="mail-outline" value={form.email} onChangeText={updateEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} placeholder="you@example.com" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} />
          <Field ref={passwordRef} label="Password" icon="lock-closed-outline" value={form.password} onChangeText={updatePassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Minimum 6 characters" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => confirmRef.current?.focus()} />
          <Field ref={confirmRef} label="Confirm password" icon="shield-checkmark-outline" value={form.confirm} onChangeText={updateConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Enter password again" returnKeyType="done" onSubmitEditing={submit} />
          <PrimaryButton title="Create account" onPress={submit} loading={loading} disabled={loading} />
          <Text style={styles.terms}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "white" },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingTop: 20 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  backText: { fontSize: 32, color: colors.ink, marginTop: -4 },
  title: { fontSize: 29, color: colors.ink, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  error: { backgroundColor: "#FFF1F2", color: colors.danger, borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 12 },
  terms: { textAlign: "center", color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 18 },
});
