import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, ErrorBlock, LoadingBlock, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";

export default function BulkInventoryUploadScreen({ navigation }) {
  const { user } = useAuth();
  const superAdmin = user?.role === ROLES.SUPER_ADMIN;
  const [asset, setAsset] = useState(null);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(superAdmin);
  const [storeError, setStoreError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!superAdmin) return;
    api.get("/stores").then(({ data }) => {
      const activeStores = (data.data || []).filter((store) => store.isActive);
      setStores(activeStores);
      if (activeStores.length === 1) setStoreId(activeStores[0]._id);
      setStoreError("");
    }).catch((error) => setStoreError(messageFromError(error, "Stores could not be loaded."))).finally(() => setLoadingStores(false));
  }, [superAdmin]);

  const chooseCsv = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled) setAsset(result.assets[0]);
  };

  const upload = async () => {
    if (uploading) return;
    if (!asset) return Alert.alert("CSV required", "Choose a CSV file first.");
    if (superAdmin && !storeId) return Alert.alert("Store required", "Choose the store that will own these products.");
    const data = new FormData();
    data.append("file", Platform.OS === "web" && asset.file ? asset.file : {
      uri: asset.uri,
      name: asset.name || "inventory.csv",
      type: asset.mimeType || "text/csv",
    });
    if (superAdmin) data.append("storeId", storeId);
    setUploading(true);
    try {
      const response = await api.post("/bulk-upload/inventory", data, { headers: { "Content-Type": "multipart/form-data" } });
      Alert.alert("Bulk upload completed", `${response.data.inserted} products inserted\n${response.data.failed} rows failed`, [
        { text: "View inventory", onPress: () => navigation.goBack() },
      ]);
      setAsset(null);
    } catch (error) {
      Alert.alert("Upload failed", messageFromError(error, "The inventory CSV could not be imported."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen>
      <AdminHeader title="Bulk inventory" subtitle="Import multiple products from CSV" roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.instructions}>
          <Ionicons name="document-text-outline" size={24} color={colors.purple} />
          <View style={{ flex: 1 }}><Text style={styles.instructionsTitle}>Required CSV columns</Text><Text style={styles.instructionsText}>name, sku, category, price, stock, expiry</Text><Text style={styles.instructionsText}>Expiry format: YYYY-MM-DD. Duplicate or invalid rows are counted as failed.</Text></View>
        </View>

        {superAdmin ? loadingStores ? <LoadingBlock label="Loading stores…" /> : storeError ? <ErrorBlock message={storeError} /> : (
          <View style={styles.card}>
            <Text style={adminStyles.label}>Owning store *</Text>
            <View style={styles.choices}>{stores.map((store) => <Pressable key={store._id} onPress={() => setStoreId(store._id)} style={[styles.choice, storeId === store._id && styles.choiceOn]}><Text style={[styles.choiceText, storeId === store._id && styles.choiceTextOn]}>{store.name}</Text></Pressable>)}</View>
          </View>
        ) : null}

        <Pressable onPress={chooseCsv} style={styles.dropzone}>
          <View style={styles.fileIcon}><Ionicons name={asset ? "checkmark-circle" : "cloud-upload-outline"} size={31} color={asset ? colors.success : colors.purple} /></View>
          <Text style={styles.fileTitle}>{asset?.name || "Choose inventory CSV"}</Text>
          <Text style={styles.fileMeta}>{asset?.size ? `${(asset.size / 1024).toFixed(1)} KB` : "Tap to browse files"}</Text>
        </Pressable>

        <Pressable disabled={uploading || !asset || (superAdmin && !storeId)} onPress={upload} style={[styles.upload, (uploading || !asset || (superAdmin && !storeId)) && styles.disabled]}>
          {uploading ? <ActivityIndicator color="white" /> : <><Ionicons name="cloud-upload" size={19} color="white" /><Text style={styles.uploadText}>Upload products</Text></>}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 38 },
  instructions: { borderRadius: 19, padding: 15, backgroundColor: colors.purpleSoft, flexDirection: "row", alignItems: "flex-start", gap: 11 },
  instructionsTitle: { color: colors.purpleDark, fontSize: 13, fontWeight: "900" },
  instructionsText: { color: colors.purpleDark, fontSize: 10.5, lineHeight: 17, marginTop: 4 },
  card: { backgroundColor: "white", borderRadius: 19, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 13, ...shadow },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { borderRadius: 18, backgroundColor: "#F3F6F4", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9 },
  choiceOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  choiceText: { color: colors.muted, fontSize: 10.5, fontWeight: "800" },
  choiceTextOn: { color: "white" },
  dropzone: { minHeight: 190, borderRadius: 23, borderWidth: 2, borderStyle: "dashed", borderColor: colors.purple, backgroundColor: "white", marginTop: 14, alignItems: "center", justifyContent: "center", padding: 20, ...shadow },
  fileIcon: { width: 63, height: 63, borderRadius: 21, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  fileTitle: { color: colors.ink, fontSize: 14, fontWeight: "900", textAlign: "center", marginTop: 13 },
  fileMeta: { color: colors.muted, fontSize: 10.5, marginTop: 5 },
  upload: { height: 55, borderRadius: 17, backgroundColor: colors.purple, marginTop: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  uploadText: { color: "white", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.45 },
});
