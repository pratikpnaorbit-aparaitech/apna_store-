import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, StatusPill } from "../../components/admin/AdminUI";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";
import { api, messageFromError } from "../../api/client";
import { useToast } from "../../context/ToastContext";

export default function AdminAccountScreen() {
  const { logout, user } = useAuth();
  const { showToast } = useToast();
  const [store, setStore] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.role !== ROLES.ADMIN) return;
    api.get("/stores/my-store").then(({ data }) => setStore(data.data)).catch(() => setStore(null));
  }, [user?.role]);

  const uploadCover = async () => {
    if (uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Photo access required", "Allow photo access to choose a store cover.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [16, 9], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) return Alert.alert("Image too large", "Choose an image smaller than 5 MB.");
    const formData = new FormData();
    formData.append("cover", Platform.OS === "web" && asset.file ? asset.file : {
      uri: asset.uri,
      name: asset.fileName || "store-cover.jpg",
      type: asset.mimeType || "image/jpeg",
    });
    setUploading(true);
    try {
      const { data } = await api.post("/stores/my-store/cover", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setStore(data.data);
      showToast({ title: "Store cover updated", message: `${data.data?.name || "Store"} now has a new cover.` });
    } catch (uploadError) {
      Alert.alert("Upload failed", messageFromError(uploadError, "Could not update the store cover."));
    } finally {
      setUploading(false);
    }
  };
  const confirmLogout = () => Alert.alert("Logout", "Return to the customer home in guest mode?", [
    { text: "Keep working", style: "cancel" },
    { text: "Logout", style: "destructive", onPress: logout },
  ]);

  return (
    <Screen>
      <AdminHeader title="Account" subtitle="Secure role session" roleLabel={ROLE_LABELS[user?.role]} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.initial}>{(user?.name || "A")[0].toUpperCase()}</Text></View>
          <Text style={styles.name}>{user?.name || ROLE_LABELS[user?.role]}</Text>
          <Text style={styles.email}>{user?.email || user?.phone || "Authenticated account"}</Text>
          <StatusPill label={ROLE_LABELS[user?.role]} tone="success" />
        </View>

        <View style={styles.card}>
          <Info icon="key-outline" label="Role" value={user?.role} />
          <Info icon="storefront-outline" label="Store ID" value={user?.storeId?._id || user?.storeId || "Platform-wide"} />
          <Info icon="shield-checkmark-outline" label="Session" value="Token verified and securely stored" last />
        </View>

        {user?.role === ROLES.ADMIN ? (
          <View style={styles.storeCard}>
            <Text style={styles.storeKicker}>MY STORE</Text>
            {store?.cover_image_url || store?.image_url ? <Image source={{ uri: store.cover_image_url || store.image_url }} style={styles.cover} resizeMode="cover" /> : <View style={styles.coverFallback}><Ionicons name="storefront" size={34} color={colors.purple} /></View>}
            <Text style={styles.storeName}>{store?.name || "No store assigned"}</Text>
            <Text style={styles.storeMeta}>{store ? [store.storeType, ...(store.categories || [])].filter(Boolean).join(" • ") || "Store profile" : "Contact the Super Admin to assign a store."}</Text>
            {store ? <Pressable disabled={uploading} onPress={uploadCover} style={[styles.coverButton, uploading && { opacity: 0.55 }]}>{uploading ? <ActivityIndicator color="white" /> : <><Ionicons name="image-outline" size={18} color="white" /><Text style={styles.coverButtonText}>Change store cover</Text></>}</Pressable> : null}
          </View>
        ) : null}

        <Pressable onPress={confirmLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout to guest home</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Info({ icon, label, value, last }) {
  return <View style={[styles.info, !last && styles.border]}><View style={styles.infoIcon}><Ionicons name={icon} size={19} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={2}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 35 },
  profile: { alignItems: "center", backgroundColor: "white", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, ...shadow },
  avatar: { width: 72, height: 72, borderRadius: 25, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  initial: { color: "white", fontSize: 29, fontWeight: "900" },
  name: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  email: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginTop: 14, ...shadow },
  storeCard: { backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 14, ...shadow },
  storeKicker: { color: colors.purple, fontSize: 9.5, fontWeight: "900", letterSpacing: 1.1, marginBottom: 10 },
  cover: { width: "100%", height: 135, borderRadius: 16, backgroundColor: colors.purpleSoft },
  coverFallback: { width: "100%", height: 110, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  storeName: { color: colors.ink, fontSize: 16, fontWeight: "900", marginTop: 12 },
  storeMeta: { color: colors.muted, fontSize: 10.5, lineHeight: 16, marginTop: 3 },
  coverButton: { height: 48, borderRadius: 15, backgroundColor: colors.purple, marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  coverButtonText: { color: "white", fontWeight: "900", fontSize: 12 },
  info: { minHeight: 75, flexDirection: "row", alignItems: "center", gap: 11 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  infoLabel: { color: colors.muted, fontSize: 10.5, fontWeight: "800" },
  infoValue: { color: colors.ink, fontSize: 12.5, fontWeight: "800", marginTop: 3 },
  logout: { height: 55, borderRadius: 17, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFF7F7" },
  logoutText: { color: colors.danger, fontWeight: "900" },
});
