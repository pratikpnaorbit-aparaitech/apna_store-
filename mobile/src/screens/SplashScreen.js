import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function SplashScreen() {
  return <LinearGradient colors={["#086B32", "#18A957", "#52D382"]} style={styles.root}><View style={styles.logo}><Text style={styles.bolt}>⚡</Text></View><Text style={styles.brand}>Smart Store</Text><Text style={styles.tagline}>Fresh, safe and delivered fast.</Text><ActivityIndicator style={styles.loader} color="white" /></LinearGradient>;
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: "center", justifyContent: "center" }, logo: { width: 104, height: 104, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.17)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)" }, bolt: { fontSize: 50 }, brand: { color: "white", fontSize: 34, fontWeight: "900", letterSpacing: -.8, marginTop: 22 }, tagline: { color: "rgba(255,255,255,.8)", fontSize: 14, marginTop: 8 }, loader: { position: "absolute", bottom: 70 } });
