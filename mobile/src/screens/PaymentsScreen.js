import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { colors, shadow } from "../theme";

const methods = [
  {
    icon: "cash-outline",
    title: "Cash on Delivery",
    subtitle: "Pay safely when your groceries arrive at your door.",
    status: "Available",
  },
  {
    icon: "card-outline",
    title: "Razorpay Online Payment",
    subtitle: "UPI, cards, wallets and netbanking are verified securely through Razorpay.",
    status: "Secure",
  },
];

export default function PaymentsScreen({ navigation }) {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Payments</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={26} color="white" /></View>
          <Text style={styles.heroTitle}>Simple and secure payments</Text>
          <Text style={styles.heroSub}>Choose COD or pay online during checkout. Smart Store never stores your card or UPI PIN.</Text>
        </View>

        <Text style={styles.section}>Payment methods</Text>
        {methods.map((method) => (
          <View key={method.title} style={styles.card}>
            <View style={styles.icon}><Ionicons name={method.icon} size={24} color={colors.purple} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowTop}>
                <Text style={styles.cardTitle}>{method.title}</Text>
                <Text style={styles.badge}>{method.status}</Text>
              </View>
              <Text style={styles.cardSub}>{method.subtitle}</Text>
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="refresh-circle-outline" size={23} color={colors.purple} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Refunds and cancellations</Text>
            <Text style={styles.infoText}>COD orders do not need refunds. For successful online payments, contact support if a cancellation requires refund assistance.</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { height: 62, backgroundColor: "white", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  content: { padding: 16, paddingBottom: 34 },
  hero: { backgroundColor: colors.purple, borderRadius: 24, padding: 20, ...shadow },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { color: "white", fontSize: 22, fontWeight: "900" },
  heroSub: { color: "rgba(255,255,255,.82)", lineHeight: 20, marginTop: 8, fontSize: 12 },
  section: { color: colors.ink, fontSize: 17, fontWeight: "900", marginTop: 24, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: colors.border, flexDirection: "row", gap: 12, marginBottom: 11, ...shadow },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", flex: 1 },
  badge: { color: colors.success, backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 9, fontWeight: "900" },
  cardSub: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  infoBox: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", gap: 11, marginTop: 10 },
  infoTitle: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  infoText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
});
