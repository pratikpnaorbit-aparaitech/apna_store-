import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export default function StateView({ loading, icon = "bag-outline", title, message, action, onAction }) {
  if (loading) return <View style={styles.wrap}><ActivityIndicator size="large" color={colors.purple} /><Text style={styles.message}>Loading fresh picks…</Text></View>;
  return <View style={styles.wrap}><View style={styles.icon}><Ionicons name={icon} size={32} color={colors.purple} /></View><Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text>{action ? <Pressable onPress={onAction} style={styles.button}><Text style={styles.buttonText}>{action}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ wrap: { flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", padding: 28 }, icon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 }, title: { fontSize: 18, color: colors.ink, fontWeight: "800", textAlign: "center" }, message: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 }, button: { marginTop: 18, borderRadius: 14, backgroundColor: colors.purple, paddingHorizontal: 20, paddingVertical: 12 }, buttonText: { color: "white", fontWeight: "800" } });
