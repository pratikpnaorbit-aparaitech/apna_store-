import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme";

export default function Field({ label, error, icon, secureTextEntry, ...props }) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, error && styles.fieldError]}>
        {icon ? <Ionicons name={icon} size={19} color={colors.muted} /> : null}
        <TextInput placeholderTextColor="#A19AA9" style={styles.input} secureTextEntry={hidden} autoCapitalize="none" {...props} />
        {secureTextEntry ? <Pressable hitSlop={12} onPress={() => setHidden(!hidden)}><Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.muted} /></Pressable> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 15 }, label: { color: colors.ink, fontSize: 13, fontWeight: "700", marginBottom: 7 },
  field: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FBFAFC", flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  fieldError: { borderColor: colors.danger, backgroundColor: "#FFF7F7" }, input: { flex: 1, color: colors.ink, fontSize: 15 }, error: { color: colors.danger, fontSize: 12, marginTop: 5 },
});
