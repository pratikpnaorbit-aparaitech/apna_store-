import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { colors, shadow } from "../theme";

const offers = [
  { code: "TRY50", title: "50% off your first order", sub: "Up to ₹150 • Min order ₹99", colors: ["#08783A", "#20BF63"], icon: "sparkles" },
  { code: "FREEDEL", title: "Free delivery unlocked", sub: "On orders above ₹499", colors: ["#059669", "#10B981"], icon: "bicycle" },
  { code: "PAYDAY", title: "Extra ₹75 cashback", sub: "On prepaid orders above ₹799", colors: ["#168B4A", "#65C98B"], icon: "wallet" },
];

export default function OffersScreen() {
  const [copiedCode, setCopiedCode] = useState("");
  const timerRef = useRef(null);

  const copyCode = async (code) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedCode(code);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopiedCode(""), 1600);
      Alert.alert("Coupon copied", `${code} copied. Paste it in cart to save.`);
    } catch {
      Alert.alert("Copy failed", "Could not copy the coupon code. Please try again.");
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>SMART SAVINGS</Text>
        <Text style={styles.title}>Offers</Text>
        <Text style={styles.subtitle}>Copy a coupon and apply it at cart.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.purpleDark, colors.purple]} style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroSmall}>TODAY'S DEALS</Text>
            <Text style={styles.heroTitle}>Fresh savings for your grocery basket</Text>
            <Text style={styles.heroSub}>Coupons work on eligible products and stores.</Text>
          </View>
          <View style={styles.heroBadge}><Text style={styles.emoji}>🏷️</Text></View>
        </LinearGradient>

        <Text style={styles.section}>Available coupons</Text>
        {offers.map((offer) => {
          const copied = copiedCode === offer.code;
          return (
            <LinearGradient key={offer.code} colors={offer.colors} style={styles.offer}>
              <View style={styles.offerIcon}><Ionicons name={offer.icon} size={26} color="white" /></View>
              <View style={{ flex: 1 }}>
                <Text selectable style={styles.code}>{offer.code}</Text>
                <Text style={styles.offerTitle}>{offer.title}</Text>
                <Text style={styles.offerSub}>{offer.sub}</Text>
              </View>
              <Pressable onPress={() => copyCode(offer.code)} style={({ pressed }) => [styles.copy, pressed && { opacity: 0.75 }]} accessibilityRole="button" accessibilityLabel={`Copy ${offer.code} coupon`}>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={17} color={colors.purple} />
                <Text style={styles.copyText}>{copied ? "COPIED" : "COPY"}</Text>
              </Pressable>
            </LinearGradient>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.purple, padding: 18, paddingTop: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  kicker: { color: "rgba(255,255,255,.72)", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "white", fontSize: 29, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "rgba(255,255,255,.8)", marginTop: 5 },
  content: { padding: 15, paddingBottom: 30 },
  hero: { minHeight: 170, borderRadius: 24, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadow },
  heroSmall: { color: "rgba(255,255,255,.72)", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  heroTitle: { color: "white", fontSize: 24, fontWeight: "900", lineHeight: 30, marginTop: 8, maxWidth: 240 },
  heroSub: { color: "rgba(255,255,255,.75)", fontSize: 11, marginTop: 9 },
  heroBadge: { width: 70, height: 70, borderRadius: 24, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 38 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 24, marginBottom: 12 },
  offer: { minHeight: 142, borderRadius: 22, padding: 17, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 13, ...shadow },
  offerIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  code: { color: "white", fontSize: 22, fontWeight: "900", letterSpacing: 1.2 },
  offerTitle: { color: "white", fontSize: 16, fontWeight: "900", marginTop: 8 },
  offerSub: { color: "rgba(255,255,255,.8)", fontSize: 11, marginTop: 5 },
  copy: { backgroundColor: "white", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 10, alignItems: "center", gap: 3, minWidth: 64 },
  copyText: { color: colors.purple, fontSize: 8.5, fontWeight: "900" },
});
