import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";
import { useToast } from "../../context/ToastContext";

const emptyStore = { name: "", phone: "", email: "", categories: "", street: "", city: "", state: "", pincode: "" };

export default function StoreAdminDetailsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const adminId = route.params?.adminId;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [adminForm, setAdminForm] = useState({ name: "", email: "", isActive: true });
  const [storeForm, setStoreForm] = useState(emptyStore);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/users/admins/${adminId}`);
      setRecord(data.data);
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, "Store Admin details could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [adminId]);
  useEffect(() => { load(); }, [load]);

  const editAdmin = () => {
    setAdminForm({ name: record.admin.name || "", email: record.admin.email || "", isActive: Boolean(record.admin.isActive) });
    setFormError("");
    setModal("admin");
  };
  const editStore = () => {
    const store = record.store;
    setStoreForm(store ? {
      name: store.name || "", phone: store.phone || "", email: store.email || "", categories: (store.categories || []).join(", "),
      street: store.address?.street || "", city: store.address?.city || "", state: store.address?.state || "", pincode: store.address?.pincode || "",
    } : emptyStore);
    setFormError("");
    setModal("store");
  };

  const saveAdmin = async () => {
    if (saving) return;
    if (!adminForm.name.trim() || !adminForm.email.trim()) return setFormError("Name and email are required.");
    setSaving(true);
    try {
      await api.put(`/users/admins/${adminId}`, adminForm);
      setModal("");
      showToast({ title: "Admin updated", message: adminForm.name.trim() });
      await load();
    } catch (saveError) { setFormError(messageFromError(saveError, "Admin could not be updated.")); }
    finally { setSaving(false); }
  };

  const saveStore = async () => {
    if (saving) return;
    if (!storeForm.name.trim()) return setFormError("Store name is required.");
    setSaving(true);
    const payload = {
      name: storeForm.name.trim(), phone: storeForm.phone.trim(), email: storeForm.email.trim(),
      categories: storeForm.categories.split(",").map((category) => category.trim()).filter(Boolean),
      address: { street: storeForm.street.trim(), city: storeForm.city.trim(), state: storeForm.state.trim(), pincode: storeForm.pincode.trim() },
      ...(!record.store ? { adminId } : {}),
    };
    try {
      if (record.store) await api.put(`/stores/${record.store._id}`, payload);
      else await api.post("/stores", payload);
      setModal("");
      showToast({ title: record.store ? "Store updated" : "Store assigned", message: payload.name });
      await load();
    } catch (saveError) { setFormError(messageFromError(saveError, "Store could not be saved.")); }
    finally { setSaving(false); }
  };

  return (
    <Screen>
      <AdminHeader title="Store Admin profile" subtitle="Account, store and staff" roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} />
      {loading ? <LoadingBlock label="Loading administrator…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profile}>
            <View style={styles.avatar}><Text style={styles.initial}>{(record.admin.name || "A")[0].toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.name}>{record.admin.name}</Text><Text style={styles.meta}>{record.admin.email}</Text><StatusPill label={record.admin.isActive ? "Active" : "Inactive"} tone={record.admin.isActive ? "success" : undefined} /></View>
            <Pressable onPress={editAdmin} style={styles.edit}><Ionicons name="create-outline" size={20} color={colors.purple} /></Pressable>
          </View>

          <Text style={adminStyles.sectionTitle}>Assigned store</Text>
          <View style={adminStyles.card}>
            <View style={adminStyles.row}><View style={styles.icon}><Ionicons name="storefront" size={23} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={adminStyles.cardTitle}>{record.store?.name || "No store assigned"}</Text><Text style={adminStyles.cardSub}>{record.store ? [record.store.phone, record.store.email].filter(Boolean).join(" • ") || "Store profile" : "Assign a store to activate store-scoped operations."}</Text></View><Pressable onPress={editStore} style={styles.edit}><Ionicons name={record.store ? "create-outline" : "add"} size={20} color={colors.purple} /></Pressable></View>
            {record.store ? <><Text style={styles.address}>{[record.store.address?.street, record.store.address?.city, record.store.address?.state, record.store.address?.pincode].filter(Boolean).join(", ") || "No address"}</Text><View style={styles.tags}>{(record.store.categories || []).map((category) => <Text key={category} style={styles.tag}>{category}</Text>)}</View></> : null}
          </View>

          <Text style={adminStyles.sectionTitle}>Staff members ({record.staff.length})</Text>
          {record.staff.length ? record.staff.map((staff) => <View key={staff._id} style={adminStyles.card}><View style={adminStyles.row}><View style={styles.icon}><Ionicons name="person-outline" size={21} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={adminStyles.cardTitle}>{staff.name}</Text><Text style={adminStyles.cardSub}>{staff.email}{staff.mobile ? ` • ${staff.mobile}` : ""}</Text></View><StatusPill label={staff.isActive ? "Active" : "Inactive"} tone={staff.isActive ? "success" : undefined} /></View></View>) : <EmptyBlock title="No staff members" message="This store admin has not created staff accounts yet." />}
        </ScrollView>
      )}

      <EditModal visible={modal === "admin"} title="Edit administrator" saving={saving} error={formError} onClose={() => setModal("")} onSave={saveAdmin}>
        <Field label="Name *" value={adminForm.name} onChangeText={(name) => setAdminForm((old) => ({ ...old, name }))} />
        <Field label="Email *" value={adminForm.email} onChangeText={(email) => setAdminForm((old) => ({ ...old, email }))} keyboardType="email-address" autoCapitalize="none" />
        <Pressable onPress={() => setAdminForm((old) => ({ ...old, isActive: !old.isActive }))} style={styles.toggle}><Ionicons name={adminForm.isActive ? "checkbox" : "square-outline"} size={22} color={colors.purple} /><Text style={styles.toggleText}>Account active</Text></Pressable>
      </EditModal>

      <EditModal visible={modal === "store"} title={record?.store ? "Edit assigned store" : "Assign new store"} saving={saving} error={formError} onClose={() => setModal("")} onSave={saveStore}>
        <Field label="Store name *" value={storeForm.name} onChangeText={(name) => setStoreForm((old) => ({ ...old, name }))} />
        <Field label="Categories (comma-separated)" value={storeForm.categories} onChangeText={(categories) => setStoreForm((old) => ({ ...old, categories }))} />
        <Field label="Phone" value={storeForm.phone} onChangeText={(phone) => setStoreForm((old) => ({ ...old, phone }))} keyboardType="phone-pad" />
        <Field label="Email" value={storeForm.email} onChangeText={(email) => setStoreForm((old) => ({ ...old, email }))} keyboardType="email-address" autoCapitalize="none" />
        {[["street", "Street"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"]].map(([key, label]) => <Field key={key} label={label} value={storeForm[key]} onChangeText={(value) => setStoreForm((old) => ({ ...old, [key]: value }))} />)}
      </EditModal>
    </Screen>
  );
}

function Field({ label, ...props }) { return <View><Text style={adminStyles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#9AA39D" style={adminStyles.input} /></View>; }
function EditModal({ visible, title, saving, error, onClose, onSave, children }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => !saving && onClose()}><KeyboardAvoidingView style={adminStyles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={adminStyles.modalSheet}><ScrollView keyboardShouldPersistTaps="handled"><Text style={adminStyles.modalTitle}>{title}</Text>{error ? <Text style={styles.error}>{error}</Text> : null}{children}<View style={adminStyles.modalActions}><Pressable disabled={saving} onPress={onClose} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Cancel</Text></Pressable><Pressable disabled={saving} onPress={onSave} style={adminStyles.saveButton}>{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Save</Text>}</Pressable></View></ScrollView></View></KeyboardAvoidingView></Modal>;
}

const styles = StyleSheet.create({
  content: { padding: 15, paddingBottom: 40 },
  profile: { borderRadius: 22, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, ...shadow },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center" },
  initial: { color: "white", fontSize: 23, fontWeight: "900" },
  name: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  meta: { color: colors.muted, fontSize: 10.5, marginTop: 3, marginBottom: 8 },
  edit: { width: 41, height: 41, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  icon: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  address: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { color: colors.purpleDark, fontSize: 9.5, fontWeight: "800", backgroundColor: colors.purpleSoft, borderRadius: 15, paddingHorizontal: 9, paddingVertical: 5 },
  toggle: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  toggleText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  error: { color: colors.danger, backgroundColor: "#FFF1F2", borderRadius: 12, padding: 10, marginBottom: 11, fontSize: 11 },
});
