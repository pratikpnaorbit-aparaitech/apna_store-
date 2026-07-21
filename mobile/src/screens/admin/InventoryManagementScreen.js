import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { ActionButton, AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, SearchBox, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors } from "../../theme";
import { useToast } from "../../context/ToastContext";
import { confirmAction } from "../../utils/confirmAction";

const EMPTY = {
  name: "", sku: "", category: "", price: "", discount_price: "", stock: "",
  unit: "piece", reorder_level: "5", expiryDate: "", image_url: "", is_featured: false, storeId: "",
};
const UNITS = ["piece", "kg", "gram", "litre", "ml", "pack"];

export default function InventoryManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageAsset, setImageAsset] = useState(null);

  const canMutate = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  const superAdmin = user?.role === ROLES.SUPER_ADMIN;

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const requests = [api.get("/inventory")];
      if (superAdmin) requests.push(api.get("/stores"));
      const [inventoryResult, storesResult] = await Promise.all(requests);
      setProducts(Array.isArray(inventoryResult.data) ? inventoryResult.data : []);
      setStores(storesResult?.data?.data || []);
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, "Inventory is unavailable."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [superAdmin]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((item) => [item.name, item.sku, item.category, item.storeId?.name].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [products, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, storeId: stores.length === 1 ? stores[0]._id : "" });
    setImageAsset(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "",
      price: String(item.price ?? ""),
      discount_price: String(item.discount_price ?? ""),
      stock: String(item.stock ?? ""),
      unit: item.unit || "piece",
      reorder_level: String(item.reorder_level ?? 5),
      expiryDate: item.expiryDate ? String(item.expiryDate).slice(0, 10) : "",
      image_url: item.image_url || "",
      is_featured: Boolean(item.is_featured),
      storeId: item.storeId?._id || item.storeId || "",
    });
    setImageAsset(null);
    setFormError("");
    setModalOpen(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Photo access required", "Allow photo access to choose a product image.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) return Alert.alert("Image too large", "Choose an image smaller than 5 MB.");
    setImageAsset(asset);
  };

  const save = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.sku.trim() || !form.category.trim() || form.price === "" || form.stock === "") {
      setFormError("Name, SKU, category, price and stock are required.");
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    const reorderLevel = Number(form.reorder_level || 5);
    const discountPrice = form.discount_price === "" ? null : Number(form.discount_price);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || !Number.isInteger(reorderLevel) || reorderLevel < 0 || (discountPrice != null && (!Number.isFinite(discountPrice) || discountPrice < 0))) {
      setFormError("Use valid non-negative amounts and whole numbers for stock and reorder level.");
      return;
    }
    if (discountPrice != null && discountPrice > price) {
      setFormError("Discount price cannot be greater than the regular price.");
      return;
    }
    if (superAdmin && !editing && !form.storeId) {
      setFormError("Choose the store that owns this product.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      let imageUrl = form.image_url.trim() || undefined;
      if (imageAsset) {
        const imageData = new FormData();
        imageData.append("image", Platform.OS === "web" && imageAsset.file ? imageAsset.file : {
          uri: imageAsset.uri,
          name: imageAsset.fileName || "product-image.jpg",
          type: imageAsset.mimeType || "image/jpeg",
        });
        const upload = await api.post("/inventory/upload-image", imageData, { headers: { "Content-Type": "multipart/form-data" } });
        imageUrl = upload.data.imageUrl;
      }
      const payload = {
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        price,
        discount_price: discountPrice,
        stock,
        reorder_level: reorderLevel,
        image_url: imageUrl,
      };
      if (editing) await api.put(`/inventory/${editing.id || editing._id}`, payload);
      else await api.post("/inventory", payload);
      setModalOpen(false);
      showToast({ title: editing ? "Product updated" : "Product created", message: `${payload.name} was saved successfully.` });
      await load(true);
    } catch (saveError) {
      setFormError(messageFromError(saveError, "Could not save this product."));
    } finally {
      setSaving(false);
    }
  };

  const archive = (item) => confirmAction({
    title: "Archive product?",
    message: `${item.name} will no longer be available for sale.`,
    cancelText: "Keep",
    confirmText: "Archive",
    destructive: true,
    onConfirm: async () => {
      try {
        await api.delete(`/inventory/${item.id || item._id}`);
        setProducts((current) => current.filter((product) => (product.id || product._id) !== (item.id || item._id)));
        showToast({ title: "Product archived", message: item.name });
      } catch (archiveError) {
        Alert.alert("Archive failed", messageFromError(archiveError));
      }
    },
  });

  return (
    <Screen>
      <AdminHeader
        title="Inventory"
        subtitle={`${products.length} active products`}
        roleLabel={ROLE_LABELS[user?.role]}
        onBack={() => navigation.goBack()}
        right={canMutate ? <View style={styles.headerActions}><Pressable onPress={() => navigation.navigate("AdminBulkInventory")} style={styles.add} accessibilityRole="button" accessibilityLabel="Bulk upload inventory"><Ionicons name="cloud-upload-outline" size={20} color="white" /></Pressable><Pressable onPress={openCreate} style={styles.add} accessibilityRole="button" accessibilityLabel="Add product"><Ionicons name="add" size={24} color="white" /></Pressable></View> : null}
      />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search name, SKU, category or store" />
      {loading ? <LoadingBlock label="Loading inventory…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={shown}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id || item._id)}
          ListEmptyComponent={<EmptyBlock title="No products found" message="Try another search or add a product." />}
          renderItem={({ item }) => (
            <View style={adminStyles.card}>
              <View style={adminStyles.row}>
                <View style={styles.productIcon}><Ionicons name="cube-outline" size={24} color={colors.purple} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.cardTitle}>{item.name}</Text>
                  <Text style={adminStyles.cardSub}>{item.sku} • {item.category}{item.storeId?.name ? ` • ${item.storeId.name}` : ""}</Text>
                </View>
                <StatusPill label={item.isLowStock ? "Low stock" : "In stock"} tone={item.isLowStock ? undefined : "success"} />
              </View>
              <View style={styles.metrics}>
                <Metric label="Price" value={`₹${Number(item.price).toFixed(2)}`} />
                <Metric label="Stock" value={`${item.stock} ${item.unit || "piece"}`} />
                <Metric label="Reorder" value={item.reorder_level ?? 5} />
              </View>
              {canMutate ? <View style={adminStyles.actions}><ActionButton icon="create-outline" label="Edit" onPress={() => openEdit(item)} /><ActionButton icon="archive-outline" label="Archive" danger onPress={() => archive(item)} /></View> : null}
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => !saving && setModalOpen(false)}>
        <KeyboardAvoidingView style={adminStyles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={adminStyles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={adminStyles.modalTitle}>{editing ? "Edit product" : "Add product"}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <FormInput label="Product name *" value={form.name} maxLength={120} onChangeText={(value) => setForm((old) => ({ ...old, name: value }))} />
              <FormInput label="SKU *" value={form.sku} maxLength={80} onChangeText={(value) => setForm((old) => ({ ...old, sku: value }))} autoCapitalize="characters" />
              <FormInput label="Category *" value={form.category} maxLength={80} onChangeText={(value) => setForm((old) => ({ ...old, category: value }))} />
              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}><FormInput label="Price *" value={form.price} onChangeText={(value) => setForm((old) => ({ ...old, price: value }))} keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><FormInput label="Discount" value={form.discount_price} onChangeText={(value) => setForm((old) => ({ ...old, discount_price: value }))} keyboardType="decimal-pad" /></View>
              </View>
              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}><FormInput label="Stock *" value={form.stock} onChangeText={(value) => setForm((old) => ({ ...old, stock: value }))} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><FormInput label="Reorder level" value={form.reorder_level} onChangeText={(value) => setForm((old) => ({ ...old, reorder_level: value }))} keyboardType="number-pad" /></View>
              </View>
              <Text style={adminStyles.label}>Unit</Text>
              <View style={styles.chips}>{UNITS.map((unit) => <Choice key={unit} label={unit} selected={form.unit === unit} onPress={() => setForm((old) => ({ ...old, unit }))} />)}</View>
              <FormInput label="Expiry date (YYYY-MM-DD)" value={form.expiryDate} onChangeText={(value) => setForm((old) => ({ ...old, expiryDate: value }))} />
              <FormInput label="Image URL (optional)" value={form.image_url} maxLength={2048} onChangeText={(value) => setForm((old) => ({ ...old, image_url: value }))} autoCapitalize="none" />
              <Pressable onPress={pickImage} style={styles.imagePicker} accessibilityRole="button" accessibilityLabel="Choose product image">
                {imageAsset?.uri || form.image_url ? <Image source={{ uri: imageAsset?.uri || form.image_url }} style={styles.imagePreview} /> : <View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={25} color={colors.purple} /></View>}
                <View style={{ flex: 1 }}><Text style={styles.imageTitle}>{imageAsset ? "New image selected" : "Choose product image"}</Text><Text style={styles.imageSub}>JPG, PNG or WebP • max 5 MB</Text></View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
              {superAdmin && !editing ? (
                <>
                  <Text style={adminStyles.label}>Owning store *</Text>
                  <View style={styles.storeChoices}>{stores.map((store) => <Choice key={store._id} label={store.name} selected={form.storeId === store._id} onPress={() => setForm((old) => ({ ...old, storeId: store._id }))} />)}</View>
                </>
              ) : null}
              <Pressable onPress={() => setForm((old) => ({ ...old, is_featured: !old.is_featured }))} style={styles.toggle} accessibilityRole="checkbox" accessibilityLabel="Feature this product in the storefront" accessibilityState={{ checked: form.is_featured }}>
                <Ionicons name={form.is_featured ? "checkbox" : "square-outline"} size={23} color={colors.purple} />
                <Text style={styles.toggleText}>Feature this product in the storefront</Text>
              </Pressable>
              <View style={adminStyles.modalActions}>
                <Pressable disabled={saving} onPress={() => setModalOpen(false)} style={adminStyles.cancelButton} accessibilityRole="button" accessibilityLabel="Cancel"><Text style={adminStyles.cancelText}>Cancel</Text></Pressable>
                <Pressable disabled={saving} onPress={save} style={adminStyles.saveButton} accessibilityRole="button" accessibilityLabel="Save product">{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Save product</Text>}</Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function Metric({ label, value }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function FormInput({ label, ...props }) {
  return <View><Text style={adminStyles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholderTextColor="#9AA39D" style={adminStyles.input} /></View>;
}

function Choice({ label, selected, onPress }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  add: { width: 43, height: 43, borderRadius: 15, backgroundColor: "rgba(255,255,255,.17)", alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row", gap: 7 },
  list: { padding: 15, paddingBottom: 35 },
  productIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  metrics: { flexDirection: "row", backgroundColor: "#F6FAF7", borderRadius: 14, padding: 11, marginTop: 13 },
  metric: { flex: 1 },
  metricLabel: { color: colors.muted, fontSize: 9.5, fontWeight: "800" },
  metricValue: { color: colors.ink, fontWeight: "900", fontSize: 12, marginTop: 3 },
  formError: { color: colors.danger, backgroundColor: "#FFF1F2", padding: 11, borderRadius: 12, fontSize: 12, marginBottom: 12 },
  twoCols: { flexDirection: "row", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 13 },
  storeChoices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  choice: { borderRadius: 18, backgroundColor: "#F3F6F4", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  choiceSelected: { backgroundColor: colors.purple, borderColor: colors.purple },
  choiceText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  choiceTextSelected: { color: "white" },
  toggle: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9, marginVertical: 3 },
  toggleText: { color: colors.ink, fontWeight: "700", fontSize: 12, flex: 1 },
  imagePicker: { minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F8FAF9", padding: 9, marginBottom: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  imagePreview: { width: 52, height: 52, borderRadius: 13, backgroundColor: colors.purpleSoft },
  imagePlaceholder: { width: 52, height: 52, borderRadius: 13, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  imageTitle: { color: colors.ink, fontSize: 11.5, fontWeight: "900" },
  imageSub: { color: colors.muted, fontSize: 9.5, marginTop: 3 },
});
