import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { colors, shadow } from "../theme";

export default function AboutScreen({ navigation }) {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>About Smart Store</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoCard}>
          <View style={styles.logo}><Ionicons name="storefront" size={38} color="white" /></View>
          <Text style={styles.app}>Smart Store</Text>
          <Text style={styles.tagline}>Fresh groceries, fast delivery and secure checkout.</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.card}>
          <Info icon="flash-outline" title="Quick delivery" text="Nearby stores prepare your orders quickly for everyday convenience." />
          <Info icon="shield-checkmark-outline" title="Safe payments" text="COD and Razorpay payments are supported. Online payments are verified by backend before confirmation." />
          <Info icon="headset-outline" title="Support" text="Need help with an order, payment or refund? Contact support anytime." last />
        </View>

        <Pressable style={styles.support} onPress={() => Linking.openURL("https://wa.me/919158852129?text=Hello%2C%20I%20need%20help%20with%20Smart%20Store.")}> 
          <Ionicons name="logo-whatsapp" size={22} color="white" />
          <Text style={styles.supportText}>Contact support</Text>
        </Pressable>

        <Text style={styles.legal}>Privacy Policy • Terms of Service</Text>
      </ScrollView>
    </Screen>
  );
}

function Info({ icon, title, text, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.border]}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={22} color={colors.purple} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 62, backgroundColor: "white", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  content: { padding: 16, paddingBottom: 34 },
  logoCard: { backgroundColor: colors.purple, borderRadius: 26, padding: 24, alignItems: "center", ...shadow },
  logo: { width: 82, height: 82, borderRadius: 28, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  app: { color: "white", fontSize: 27, fontWeight: "900", marginTop: 15 },
  tagline: { color: "rgba(255,255,255,.82)", textAlign: "center", lineHeight: 20, marginTop: 7 },
  version: { color: "rgba(255,255,255,.65)", fontSize: 11, marginTop: 14, fontWeight: "800" },
  card: { backgroundColor: "white", borderRadius: 20, paddingHorizontal: 14, marginTop: 16, borderWidth: 1, borderColor: colors.border, ...shadow },
  infoRow: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  infoTitle: { color: colors.ink, fontWeight: "900", fontSize: 13.5 },
  infoText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  support: { height: 54, borderRadius: 17, backgroundColor: colors.purple, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  supportText: { color: "white", fontWeight: "900" },
  legal: { color: colors.muted, textAlign: "center", fontSize: 11, marginTop: 18 },
});
