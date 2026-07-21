import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, ErrorBlock, LoadingBlock, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";
import { useToast } from "../../context/ToastContext";

export default function BulkInventoryUploadScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const superAdmin = user?.role === ROLES.SUPER_ADMIN;
  const [asset, setAsset] = useState(null);
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [loadingStores, setLoadingStores] = useState(superAdmin);
  const [storeError, setStoreError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [result, setResult] = useState(null);

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
    if (!result.canceled) {
      const selected = result.assets[0];
      if (!String(selected.name || "").toLowerCase().endsWith(".csv")) {
        setUploadError("Only CSV files are supported.");
        return;
      }
      if (selected.size && selected.size > 5 * 1024 * 1024) {
        setUploadError("CSV file must be 5 MB or smaller.");
        return;
      }
      setAsset(selected);
      setUploadError("");
      setResult(null);
    }
  };

  const upload = async () => {
    if (uploading) return;
    if (!asset) return setUploadError("Choose a CSV file first.");
    if (superAdmin && !storeId) return setUploadError("Choose the store that will own these products.");
    const data = new FormData();
    data.append("file", Platform.OS === "web" && asset.file ? asset.file : {
      uri: asset.uri,
      name: asset.name || "inventory.csv",
      type: asset.mimeType || "text/csv",
    });
    if (superAdmin) data.append("storeId", storeId);
    setUploading(true);
    setUploadError("");
    setResult(null);
    try {
      const response = await api.post("/bulk-upload/inventory", data, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(response.data);
      showToast({ title: "Bulk upload completed", message: `${response.data.inserted} inserted • ${response.data.failed} failed` });
      setAsset(null);
    } catch (error) {
      setUploadError(messageFromError(error, "The inventory CSV could not be imported."));
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
          <View style={{ flex: 1 }}><Text style={styles.instructionsTitle}>Required CSV columns</Text><Text style={styles.instructionsText}>name, sku, category, price, stock, expiry</Text><Text style={styles.instructionsText}>Optional: discount_price, unit, reorder_level, description, image_url, is_featured.</Text><Text style={styles.instructionsText}>Maximum 1,000 rows / 5 MB. Invalid rows are reported without hiding successful rows.</Text></View>
        </View>

        {uploadError ? <View accessibilityRole="alert" style={styles.errorCard}><Text style={styles.errorText}>{uploadError}</Text></View> : null}
        {result ? <View style={styles.resultCard}><Text style={styles.resultTitle}>Bulk upload completed</Text><Text style={styles.resultText}>{result.inserted} inserted • {result.failed} failed • {result.total} total</Text>{result.errors?.slice(0, 8).map((item) => <Text key={`${item.row}-${item.sku}`} style={styles.resultError}>Row {item.row}{item.sku ? ` (${item.sku})` : ""}: {item.message}</Text>)}<Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="View inventory" style={styles.viewInventory}><Text style={styles.viewInventoryText}>View inventory</Text></Pressable></View> : null}

        {superAdmin ? loadingStores ? <LoadingBlock label="Loading stores…" /> : storeError ? <ErrorBlock message={storeError} /> : (
          <View style={styles.card}>
            <Text style={adminStyles.label}>Owning store *</Text>
            <View style={styles.choices}>{stores.map((store) => <Pressable key={store._id} onPress={() => { setStoreId(store._id); setUploadError(""); }} accessibilityRole="button" accessibilityLabel={store.name} accessibilityState={{ selected: storeId === store._id }} style={[styles.choice, storeId === store._id && styles.choiceOn]}><Text style={[styles.choiceText, storeId === store._id && styles.choiceTextOn]}>{store.name}</Text></Pressable>)}</View>
          </View>
        ) : null}

        <Pressable onPress={chooseCsv} style={styles.dropzone} accessibilityRole="button" accessibilityLabel="Choose inventory CSV">
          <View style={styles.fileIcon}><Ionicons name={asset ? "checkmark-circle" : "cloud-upload-outline"} size={31} color={asset ? colors.success : colors.purple} /></View>
          <Text style={styles.fileTitle}>{asset?.name || "Choose inventory CSV"}</Text>
          <Text style={styles.fileMeta}>{asset?.size ? `${(asset.size / 1024).toFixed(1)} KB` : "Tap to browse files"}</Text>
        </Pressable>

        <Pressable disabled={uploading || !asset || (superAdmin && !storeId)} onPress={upload} accessibilityRole="button" accessibilityLabel="Upload products" style={[styles.upload, (uploading || !asset || (superAdmin && !storeId)) && styles.disabled]}>
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
  errorCard: { marginTop: 13, borderRadius: 15, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FFF1F2", padding: 12 },
  errorText: { color: colors.danger, fontSize: 11.5, fontWeight: "700" },
  resultCard: { marginTop: 13, borderRadius: 18, borderWidth: 1, borderColor: "#BBF7D0", backgroundColor: "#F0FDF4", padding: 14 },
  resultTitle: { color: "#166534", fontSize: 14, fontWeight: "900" },
  resultText: { color: "#15803D", fontSize: 11.5, marginTop: 5 },
  resultError: { color: "#9A3412", fontSize: 10.5, marginTop: 5 },
  viewInventory: { alignSelf: "flex-start", borderRadius: 12, backgroundColor: "#15803D", paddingHorizontal: 14, paddingVertical: 10, marginTop: 12 },
  viewInventoryText: { color: "white", fontSize: 11, fontWeight: "900" },
});
