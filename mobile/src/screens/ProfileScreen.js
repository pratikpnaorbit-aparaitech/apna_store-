import { Ionicons } from "@expo/vector-icons";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useAddress } from "../context/AddressContext";
import { colors, shadow } from "../theme";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { addresses } = useAddress();

  const confirmLogout = () => Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        await logout();
      },
    },
  ]);

  const rows = [
    { icon: "receipt-outline", title: "My orders", sub: "Track, cancel and review orders", onPress: () => navigation.navigate("Orders") },
    { icon: "location-outline", title: "Saved addresses", sub: `${addresses.length} saved location${addresses.length === 1 ? "" : "s"}`, onPress: () => navigation.navigate("Location") },
    { icon: "card-outline", title: "Payments", sub: "COD, Razorpay and refunds", onPress: () => navigation.navigate("Payments") },
    { icon: "headset-outline", title: "Help & support", sub: "Chat with our support team", onPress: () => Linking.openURL("https://wa.me/919158852129?text=Hello%2C%20I%20need%20help%20with%20Smart%20Store.") },
    { icon: "information-circle-outline", title: "About Smart Store", sub: "Privacy, terms and app information", onPress: () => navigation.navigate("About") },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>SMART STORE</Text>
          <Text style={styles.pageTitle}>My account</Text>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.initial}>{(user?.name || "U")[0].toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || "Smart Store User"}</Text>
            <Text style={styles.email}>{user?.email || user?.mobile || "Customer account"}</Text>
          </View>
          <View style={styles.edit}><Ionicons name="shield-checkmark" size={17} color={colors.purple} /></View>
        </View>

        <View style={styles.member}>
          <View style={styles.memberIcon}><Ionicons name="flash" size={23} color="white" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberTitle}>Smart Store Member</Text>
            <Text style={styles.memberSub}>Fast delivery, secure payments and better savings.</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {rows.map((row, index) => (
            <Pressable key={row.title} onPress={row.onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, index < rows.length - 1 && styles.rowBorder]} accessibilityRole="button">
              <View style={styles.rowIcon}><Ionicons name={row.icon} size={21} color={colors.purple} /></View>
              <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSub}>{row.sub}</Text></View>
              <Ionicons name="chevron-forward" size={18} color="#A6B0AA" />
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmLogout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Logout">
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
        <Text style={styles.version}>Smart Store v1.0.0</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 35 },
  headerBlock: { marginBottom: 14 },
  kicker: { color: colors.purple, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },
  pageTitle: { color: colors.ink, fontSize: 27, fontWeight: "900", marginTop: 4 },
  profile: { backgroundColor: "white", borderRadius: 23, padding: 16, flexDirection: "row", alignItems: "center", gap: 13, borderWidth: 1, borderColor: colors.border, ...shadow },
  avatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" },
  initial: { color: "white", fontSize: 25, fontWeight: "900" },
  name: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  email: { color: colors.muted, fontSize: 11.5, marginTop: 4 },
  edit: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  member: { borderRadius: 20, backgroundColor: colors.purpleDark, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 13, ...shadow },
  memberIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  memberTitle: { color: "white", fontWeight: "900" },
  memberSub: { color: "rgba(255,255,255,.72)", fontSize: 11, marginTop: 3, lineHeight: 16 },
  menu: { marginTop: 18, backgroundColor: "white", borderRadius: 22, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12 },
  pressed: { opacity: 0.72 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: colors.ink, fontWeight: "900", fontSize: 13.5 },
  rowSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  logout: { height: 54, borderRadius: 17, marginTop: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFF7F7" },
  logoutText: { color: colors.danger, fontWeight: "900" },
  version: { color: "#A6B0AA", textAlign: "center", fontSize: 10.5, marginTop: 19 },
});
