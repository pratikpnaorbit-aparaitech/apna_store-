import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import Field from "../components/Field";
import PrimaryButton from "../components/PrimaryButton";
import { colors } from "../theme";
import { useAuth } from "../context/AuthContext";
import { messageFromError } from "../api/client";

const emailPattern = /^\S+@\S+\.\S+$/;

export default function RegisterScreen({ navigation }) {
  const { sendRegistrationOtp, verifyRegistrationOtp } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const updateField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }, []);
  const updateName = useCallback((value) => updateField("name", value), [updateField]);
  const updateEmail = useCallback((value) => updateField("email", value), [updateField]);
  const updatePhone = useCallback((value) => updateField("phone", value.replace(/\D/g, "").slice(0, 10)), [updateField]);
  const updatePassword = useCallback((value) => updateField("password", value), [updateField]);
  const updateConfirm = useCallback((value) => updateField("confirm", value), [updateField]);

  useEffect(() => {
    if (!otpVisible || resendSeconds <= 0) return undefined;
    const timer = setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [otpVisible, resendSeconds]);

  const submit = useCallback(async () => {
    if (loading) return;
    if (form.name.trim().length < 2) return setError("Please enter your full name.");
    if (!emailPattern.test(form.email.trim())) return setError("Please enter a valid email address.");
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError("Please enter a valid 10-digit phone number.");
    if (form.password.length < 6) return setError("Password must contain at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");

    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      await sendRegistrationOtp({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setOtp("");
      setOtpError("");
      setResendSeconds(60);
      setOtpVisible(true);
    } catch (e) {
      setError(messageFromError(e, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  }, [form, loading, sendRegistrationOtp]);

  const verifyOtp = useCallback(async () => {
    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) return setOtpError("Enter the 6-digit OTP sent to your email.");
    if (otpLoading) return;
    setOtpLoading(true);
    setOtpError("");
    try {
      await verifyRegistrationOtp({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      }, cleanOtp);
    } catch (e) {
      setOtpError(messageFromError(e, "OTP verification failed."));
    } finally {
      setOtpLoading(false);
    }
  }, [form, otp, otpLoading, verifyRegistrationOtp]);

  const resendOtp = useCallback(async () => {
    if (resendSeconds > 0 || resending) return;
    setResending(true);
    setOtpError("");
    try {
      await sendRegistrationOtp({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setOtp("");
      setResendSeconds(60);
    } catch (e) {
      setOtpError(messageFromError(e, "Could not resend OTP."));
    } finally {
      setResending(false);
    }
  }, [form, resendSeconds, resending, sendRegistrationOtp]);

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} enabled={Platform.OS === "ios"}>
        <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="none" contentContainerStyle={styles.content}>
          <Pressable onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Fresh products and faster deliveries are one step away.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Field label="Full name" icon="person-outline" value={form.name} onChangeText={updateName} autoCapitalize="words" autoComplete="name" textContentType="name" placeholder="Your name" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => emailRef.current?.focus()} />
          <Field ref={emailRef} label="Email address" icon="mail-outline" value={form.email} onChangeText={updateEmail} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" autoCorrect={false} placeholder="you@example.com" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => phoneRef.current?.focus()} />
          <Field ref={phoneRef} label="Phone number" icon="call-outline" value={form.phone} onChangeText={updatePhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="10-digit phone number" maxLength={10} returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => passwordRef.current?.focus()} />
          <Field ref={passwordRef} label="Password" icon="lock-closed-outline" value={form.password} onChangeText={updatePassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Minimum 6 characters" returnKeyType="next" blurOnSubmit={false} onSubmitEditing={() => confirmRef.current?.focus()} />
          <Field ref={confirmRef} label="Confirm password" icon="shield-checkmark-outline" value={form.confirm} onChangeText={updateConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Enter password again" returnKeyType="done" onSubmitEditing={submit} />
          <PrimaryButton title="Create account" onPress={submit} loading={loading} disabled={loading} />
          <Text style={styles.terms}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={otpVisible} transparent animationType="fade" onRequestClose={() => !otpLoading && setOtpVisible(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => !otpLoading && setOtpVisible(false)} />
          <View style={styles.otpSheet}>
            <Text style={styles.otpTitle}>Verify your email</Text>
            <Text style={styles.otpSubtitle}>Enter the 6-digit OTP sent to {form.email.trim().toLowerCase()}.</Text>
            <Field
              label="Email OTP"
              icon="keypad-outline"
              value={otp}
              onChangeText={(value) => { setOtp(value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              returnKeyType="done"
              onSubmitEditing={verifyOtp}
              editable={!otpLoading}
              error={otpError}
            />
            <PrimaryButton title="Verify & create account" onPress={verifyOtp} loading={otpLoading} disabled={otpLoading} />
            <Pressable disabled={resendSeconds > 0 || resending} onPress={resendOtp} style={styles.resendButton}>
              <Text style={[styles.resendText, (resendSeconds > 0 || resending) && styles.resendDisabled]}>
                {resending ? "Sending OTP…" : resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.45)" },
  otpSheet: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 30 },
  otpTitle: { color: colors.ink, fontSize: 22, fontWeight: "900" },
  otpSubtitle: { color: colors.muted, lineHeight: 20, marginTop: 7, marginBottom: 20 },
  resendButton: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  resendText: { color: colors.purple, fontWeight: "900" },
  resendDisabled: { color: colors.muted },
});
