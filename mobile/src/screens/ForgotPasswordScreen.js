import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import Screen from "../components/Screen";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { api, messageFromError } from "../api/client";
import { colors } from "../theme";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", otp: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef(null);

  useEffect(() => {
    console.log("[AuthInput] ForgotPasswordScreen mounted");
    return () => console.log("[AuthInput] ForgotPasswordScreen unmounted");
  }, []);

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }, []);
  const updateEmail = useCallback((value) => updateField("email", value), [updateField]);
  const updateOtp = useCallback((value) => updateField("otp", value.replace(/\D/g, "").slice(0, 6)), [updateField]);
  const updatePassword = useCallback((value) => updateField("password", value), [updateField]);

  const send = useCallback(async () => {
    if (loading) return;
    const email = form.email.trim().toLowerCase();
    if (!emailPattern.test(email)) return setError("Enter a valid email address.");

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password-otp", { email });
      setForm((current) => ({ ...current, email }));
      setStep(2);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [form.email, loading]);

  const reset = useCallback(async () => {
    if (loading) return;
    if (!/^\d{6}$/.test(form.otp) || form.password.length < 6) {
      return setError("Enter the 6-digit code and a password of at least 6 characters.");
    }

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { email: form.email, otp: form.otp, newPassword: form.password });
      Alert.alert("Password updated", "You can now login with your new password.", [{ text: "Login", onPress: () => navigation.popToTop() }]);
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
    }
  }, [form, loading, navigation]);

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} enabled={Platform.OS === "ios"}>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
          <Text style={styles.title}>{step === 1 ? "Forgot password?" : "Check your email"}</Text>
          <Text style={styles.subtitle}>{step === 1 ? "We’ll send a secure reset code to your registered email." : `Enter the code sent to ${form.email}.`}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {step === 1 ? (
            <Field label="Email address" icon="mail-outline" value={form.email} onChangeText={updateEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} returnKeyType="send" onSubmitEditing={send} />
          ) : (
            <>
              <Field label="6-digit code" icon="key-outline" value={form.otp} onChangeText={updateOtp} keyboardType="number-pad" inputMode="numeric" maxLength={6} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} />
              <Field ref={passwordRef} label="New password" icon="lock-closed-outline" value={form.password} onChangeText={updatePassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={reset} />
            </>
          )}
          <PrimaryButton title={step === 1 ? "Send reset code" : "Reset password"} onPress={step === 1 ? send : reset} loading={loading} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "white" },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingTop: 80 },
  title: { fontSize: 29, color: colors.ink, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21, marginTop: 8, marginBottom: 25 },
  error: { backgroundColor: "#FFF1F2", color: colors.danger, borderRadius: 12, padding: 12, marginBottom: 14 },
});
