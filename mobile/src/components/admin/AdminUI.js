import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, shadow } from "../../theme";

export function AdminHeader({ title, subtitle, roleLabel, onBack, right }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={21} color="white" />
          </Pressable>
        ) : <View style={styles.brandIcon}><Ionicons name="storefront" size={20} color="white" /></View>}
        <View style={styles.headerText}>
          <Text style={styles.role}>{roleLabel}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.headerSub} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function SearchBox({ value, onChangeText, placeholder = "Search" }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#96A19A"
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value ? <Pressable onPress={() => onChangeText("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
    </View>
  );
}

export function LoadingBlock({ label = "Loading…" }) {
  return <View style={styles.state}><ActivityIndicator size="large" color={colors.purple} /><Text style={styles.stateText}>{label}</Text></View>;
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={28} color={colors.danger} /></View>
      <Text style={styles.stateTitle}>Couldn’t load this module</Text>
      <Text style={styles.stateText}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable> : null}
    </View>
  );
}

export function EmptyBlock({ title = "Nothing here yet", message = "New records will appear here." }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}><Ionicons name="file-tray-outline" size={29} color={colors.purple} /></View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

export function StatCard({ icon, label, value, tint = colors.purple, onPress }) {
  const content = (
    <>
      <View style={[styles.statIcon, { backgroundColor: `${tint}18` }]}><Ionicons name={icon} size={20} color={tint} /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </>
  );
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [styles.stat, pressed && styles.pressed]}>{content}</Pressable>;
  return <View style={styles.stat}>{content}</View>;
}

export function StatusPill({ label, tone }) {
  const normalized = String(label || "unknown").toLowerCase();
  const success = tone === "success" || ["active", "success", "paid", "delivered", "resolved", "available"].some((value) => normalized.includes(value));
  const danger = tone === "danger" || ["inactive", "failed", "cancelled", "closed", "expired"].some((value) => normalized.includes(value));
  const palette = success
    ? { bg: "#DCFCE7", text: "#15803D" }
    : danger ? { bg: "#FEE2E2", text: "#B91C1C" } : { bg: "#FEF3C7", text: "#A16207" };
  return <Text style={[styles.pill, { backgroundColor: palette.bg, color: palette.text }]}>{label || "Unknown"}</Text>;
}

export function ActionButton({ icon, label, onPress, danger, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, danger && styles.actionDanger, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.purpleDark} />
      <Text style={[styles.actionText, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

export const adminStyles = StyleSheet.create({
  content: { padding: 15, paddingBottom: 38 },
  sectionTitle: { color: colors.ink, fontWeight: "900", fontSize: 18, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 12, ...shadow },
  cardTitle: { color: colors.ink, fontWeight: "900", fontSize: 15 },
  cardSub: { color: colors.muted, fontSize: 11.5, lineHeight: 18, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(9,25,15,.48)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "90%", backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 21, fontWeight: "900", color: colors.ink, marginBottom: 16 },
  input: { minHeight: 51, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, color: colors.ink, backgroundColor: "#FBFDFC", marginBottom: 11 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "800", marginBottom: 6 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, height: 51, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.muted, fontWeight: "900" },
  saveButton: { flex: 1.4, height: 51, borderRadius: 15, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" },
  saveText: { color: "white", fontWeight: "900" },
});

const styles = StyleSheet.create({
  header: { backgroundColor: "#0F5132", paddingHorizontal: 16, paddingVertical: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  headerText: { flex: 1 },
  brandIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" },
  back: { width: 43, height: 43, borderRadius: 15, backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" },
  role: { color: "#A7F3D0", fontSize: 9.5, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  headerTitle: { color: "white", fontWeight: "900", fontSize: 19, marginTop: 1 },
  headerSub: { color: "rgba(255,255,255,.67)", fontSize: 10.5, marginTop: 2 },
  search: { margin: 15, marginBottom: 4, height: 50, backgroundColor: "white", borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9, ...shadow },
  searchInput: { flex: 1, color: colors.ink },
  state: { minHeight: 270, alignItems: "center", justifyContent: "center", padding: 28 },
  stateIcon: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  stateTitle: { color: colors.ink, fontWeight: "900", fontSize: 16, textAlign: "center" },
  stateText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
  retry: { backgroundColor: colors.purple, borderRadius: 13, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  retryText: { color: "white", fontWeight: "900" },
  stat: { width: "48.3%", minHeight: 132, borderRadius: 20, backgroundColor: "white", padding: 14, borderWidth: 1, borderColor: colors.border, ...shadow },
  statIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: "900", marginTop: 12 },
  statLabel: { color: colors.muted, fontSize: 10.5, marginTop: 3, lineHeight: 14 },
  pill: { overflow: "hidden", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, fontSize: 9.5, fontWeight: "900", textTransform: "capitalize" },
  action: { minHeight: 39, borderRadius: 12, backgroundColor: colors.purpleSoft, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionDanger: { backgroundColor: "#FFF1F2" },
  actionText: { color: colors.purpleDark, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
