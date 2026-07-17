import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { ActionButton, AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, SearchBox, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors } from "../../theme";
import { useToast } from "../../context/ToastContext";

const USER_ROLES = ["super_admin", "admin", "staff", "user"];
const PERMISSIONS = ["manage_users", "manage_roles", "delete_data", "export_data", "view_reports"];
const VEHICLES = ["bike", "scooter", "car", "van", "truck", "other"];
const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];

const definitions = {
  users: {
    title: "Users & roles", subtitle: "Platform accounts and permissions", icon: "people-outline",
    get: "/users", extract: (data) => data.data || [], create: "/users", update: (id) => `/users/${id}`, remove: (id) => `/users/${id}`,
    fields: ["name", "email", "password"], roles: true, permissions: true, canCreate: true, canEdit: true, canToggle: true, canDelete: true,
    empty: { name: "", email: "", password: "", role: "staff", permissions: [] },
  },
  admins: {
    title: "Store admins", subtitle: "Administrator accounts and access", icon: "shield-checkmark-outline",
    get: "/users", extract: (data) => (data.data || []).filter((item) => item.role === "admin"), create: "/users", update: (id) => `/users/${id}`, remove: (id) => `/users/${id}`,
    fields: ["name", "email", "password"], canCreate: true, canEdit: true, canToggle: true, canDelete: true, details: true,
    empty: { name: "", email: "", password: "", role: "admin", permissions: [] }, forceRole: "admin",
  },
  registeredCustomers: {
    title: "Registered customers", subtitle: "Accounts created in the customer app", icon: "person-circle-outline",
    get: "/users/registered-users", extract: (data) => Array.isArray(data) ? data : [], fields: [], readOnly: true,
    empty: {},
  },
  stores: {
    title: "Stores", subtitle: "Locations, admins and status", icon: "storefront-outline",
    get: "/stores", extract: (data) => data.data || [], create: "/stores", update: (id) => `/stores/${id}`,
    fields: ["name", "phone", "email", "street", "city", "state", "pincode"], adminChoice: true, canCreate: true, canToggle: true,
    empty: { name: "", phone: "", email: "", adminId: "", street: "", city: "", state: "", pincode: "" },
  },
  delivery: {
    title: "Delivery partners", subtitle: "Fleet, availability and passwords", icon: "bicycle-outline",
    get: "/delivery-partners", extract: (data) => data.data || [], create: "/delivery-partners", update: (id) => `/delivery-partners/${id}`, remove: (id) => `/delivery-partners/${id}`,
    fields: ["name", "phone", "email", "vehicleNumber"], vehicles: true, canCreate: true, canEdit: true, canToggle: true, canDelete: true, password: true,
    empty: { name: "", phone: "", email: "", vehicleType: "bike", vehicleNumber: "" },
  },
  customers: {
    title: "POS customers", subtitle: "Loyalty customers used by store billing", icon: "people-outline",
    get: "/customers", extract: (data) => Array.isArray(data) ? data : [], create: "/customers", remove: (id) => `/customers/${id}`,
    fields: ["name", "phone", "email"], canCreate: true, canDelete: true,
    empty: { name: "", phone: "", email: "" },
  },
  staff: {
    title: "My staff", subtitle: "Accounts restricted to your store", icon: "person-add-outline",
    get: "/users/my-staff", extract: (data) => data.data || [], create: "/users/my-staff", update: (id) => `/users/my-staff/${id}`, remove: (id) => `/users/my-staff/${id}`,
    fields: ["name", "email", "mobile", "password"], canCreate: true, canToggle: true, canDelete: true,
    empty: { name: "", email: "", mobile: "", password: "" },
  },
  suppliers: {
    title: "Suppliers", subtitle: "Vendor contacts and payment dues", icon: "business-outline",
    get: "/vendors", extract: (data) => Array.isArray(data) ? data : [], create: "/vendors", update: (id) => `/vendors/${id}`, remove: (id) => `/vendors/${id}`,
    fields: ["company_name", "category", "contact_person", "phone", "email", "account_manager", "payment_due", "address"], canCreate: true, canEdit: true, canDelete: true,
    empty: { company_name: "", category: "", contact_person: "", phone: "", email: "", account_manager: "", payment_due: "0", address: "" },
  },
  support: {
    title: "Support tickets", subtitle: "Review, reply and resolve", icon: "headset-outline",
    get: "/support-tickets", extract: (data) => data.tickets || [], fields: [], support: true, readOnly: true,
    empty: {},
  },
};

const idOf = (item) => item?._id || item?.id;
const displayName = (item, kind) => {
  if (kind === "stores") return item.name;
  if (kind === "suppliers") return item.company_name;
  if (kind === "support") return item.ticketNumber || item.subject;
  return item.name || item.user?.name || item.email || "Record";
};
const secondaryText = (item, kind) => {
  if (kind === "stores") return [item.admin?.name, item.address?.city, item.phone].filter(Boolean).join(" • ");
  if (kind === "delivery") return [item.phone, item.vehicleType, item.vehicleNumber].filter(Boolean).join(" • ");
  if (kind === "customers") return [item.phone, `${item.points || 0} points`, `₹${Number(item.lifetime_spent || 0).toFixed(2)} spent`].join(" • ");
  if (kind === "suppliers") return [item.contact_person, item.phone, item.category].filter(Boolean).join(" • ");
  if (kind === "support") return `${item.user?.name || "Customer"} • ${item.category || "other"}`;
  return [item.email, item.mobile || item.phone, item.role].filter(Boolean).join(" • ");
};

export default function EntityManagementScreen({ navigation, route }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const kind = route.params?.kind;
  const definition = definitions[kind] || definitions.users;
  const allowedKinds = {
    [ROLES.SUPER_ADMIN]: ["users", "admins", "registeredCustomers", "stores", "delivery", "support"],
    [ROLES.ADMIN]: ["customers", "staff", "suppliers"],
    [ROLES.STAFF]: ["customers"],
  };
  const accessAllowed = allowedKinds[user?.role]?.includes(kind) || false;
  const [items, setItems] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(definition.empty);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [passwordRecord, setPasswordRecord] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [supportRecord, setSupportRecord] = useState(null);
  const [ticketStatus, setTicketStatus] = useState("open");
  const [adminReply, setAdminReply] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    if (!accessAllowed) {
      setError("Access denied for this role.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const requests = [api.get(definition.get)];
      if (definition.adminChoice) requests.push(api.get("/users"));
      const [result, usersResult] = await Promise.all(requests);
      setItems(definition.extract(result.data));
      setAdmins((usersResult?.data?.data || []).filter((candidate) => candidate.role === "admin" && !candidate.storeId));
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, `${definition.title} could not be loaded.`));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessAllowed, definition]);

  useEffect(() => {
    setItems([]);
    setForm(definition.empty);
    load();
  }, [definition, load]);

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [items, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...definition.empty, permissions: [...(definition.empty.permissions || [])] });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    const next = { ...definition.empty };
    definition.fields.forEach((field) => { next[field] = String(item[field] ?? ""); });
    if (definition.roles) next.role = item.role || "staff";
    if (definition.forceRole) next.role = definition.forceRole;
    if (definition.permissions || definition.forceRole) next.permissions = [...(item.permissions || [])];
    if (definition.vehicles) next.vehicleType = item.vehicleType || "bike";
    setForm(next);
    setFormError("");
    setModalOpen(true);
  };

  const validate = () => {
    const required = kind === "suppliers" ? ["company_name", "phone"]
      : kind === "stores" ? ["name", "adminId"]
        : kind === "customers" || kind === "delivery" ? ["name", "phone"]
          : ["name", "email"];
    const missing = required.some((field) => !String(form[field] || "").trim());
    if (missing) return "Please complete all required fields.";
    if (!editing && definition.fields.includes("password") && String(form.password || "").length < (kind === "delivery" ? 4 : 6)) return "A valid password is required for a new account.";
    return "";
  };

  const payloadForForm = () => {
    if (kind === "stores") return {
      name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), adminId: form.adminId,
      address: { street: form.street.trim(), city: form.city.trim(), state: form.state.trim(), pincode: form.pincode.trim() },
    };
    const payload = { ...form };
    if (definition.forceRole) payload.role = definition.forceRole;
    if (editing && !payload.password) delete payload.password;
    if (editing && ["users", "admins"].includes(kind)) payload.isActive = editing.isActive;
    if (kind === "suppliers") payload.payment_due = Number(payload.payment_due || 0);
    return payload;
  };

  const save = async () => {
    if (saving) return;
    const validation = validate();
    if (validation) return setFormError(validation);
    setSaving(true);
    setFormError("");
    try {
      const payload = payloadForForm();
      if (editing) await api.put(definition.update(idOf(editing)), payload);
      else await api.post(definition.create, payload);
      setModalOpen(false);
      showToast({ title: editing ? "Record updated" : "Record created", message: displayName(payload, kind) });
      await load(true);
    } catch (saveError) {
      setFormError(messageFromError(saveError, "Could not save this record."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item) => {
    const active = item.isActive !== undefined ? item.isActive : item.status === "ACTIVE";
    Alert.alert(`${active ? "Disable" : "Enable"} record?`, displayName(item, kind), [
      { text: "Cancel", style: "cancel" },
      {
        text: active ? "Disable" : "Enable", style: active ? "destructive" : "default", onPress: async () => {
          try {
            const payload = kind === "stores" || kind === "delivery" || kind === "staff"
              ? { isActive: !active }
              : { ...item, isActive: !active };
            await api.put(definition.update(idOf(item)), payload);
            await load(true);
          } catch (toggleError) { Alert.alert("Update failed", messageFromError(toggleError)); }
        },
      },
    ]);
  };

  const remove = (item) => Alert.alert("Delete record?", `${displayName(item, kind)} will be permanently removed.`, [
    { text: "Keep", style: "cancel" },
    {
      text: "Delete", style: "destructive", onPress: async () => {
        try {
          await api.delete(definition.remove(idOf(item)));
          setItems((current) => current.filter((record) => idOf(record) !== idOf(item)));
          showToast({ title: "Record removed", message: displayName(item, kind) });
        } catch (deleteError) { Alert.alert("Delete failed", messageFromError(deleteError)); }
      },
    },
  ]);

  const setPartnerPassword = async () => {
    if (newPassword.length < 4) return;
    setSaving(true);
    try {
      await api.put(`/delivery-partners/${idOf(passwordRecord)}/set-password`, { password: newPassword });
      setPasswordRecord(null);
      setNewPassword("");
      showToast({ title: "Password updated", message: `New delivery login is active for ${passwordRecord.name}.` });
    } catch (passwordError) { Alert.alert("Password update failed", messageFromError(passwordError)); }
    finally { setSaving(false); }
  };

  const openTicket = (item) => {
    setSupportRecord(item);
    setTicketStatus(item.status || "open");
    setAdminReply(item.adminReply || "");
  };

  const updateTicket = async () => {
    setSaving(true);
    try {
      await api.patch(`/support-tickets/${idOf(supportRecord)}`, { status: ticketStatus, adminReply: adminReply.trim() });
      setSupportRecord(null);
      await load(true);
      showToast({ title: "Ticket updated", message: `Status changed to ${ticketStatus.replace("_", " ")}.` });
    } catch (ticketError) { Alert.alert("Ticket update failed", messageFromError(ticketError)); }
    finally { setSaving(false); }
  };

  return (
    <Screen>
      <AdminHeader
        title={definition.title}
        subtitle={`${items.length} records • ${definition.subtitle}`}
        roleLabel={ROLE_LABELS[user?.role]}
        onBack={() => navigation.goBack()}
        right={accessAllowed && definition.canCreate ? <Pressable onPress={openCreate} style={styles.add}><Ionicons name="add" size={24} color="white" /></Pressable> : null}
      />
      <SearchBox value={search} onChangeText={setSearch} placeholder={`Search ${definition.title.toLowerCase()}`} />
      {loading ? <LoadingBlock label={`Loading ${definition.title.toLowerCase()}…`} /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={shown}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={styles.list}
          keyExtractor={(item, index) => String(idOf(item) || index)}
          ListEmptyComponent={<EmptyBlock title={`No ${definition.title.toLowerCase()} found`} message="Try another search or create a record." />}
          renderItem={({ item }) => (
            <View style={adminStyles.card}>
              <View style={adminStyles.row}>
                <View style={styles.icon}><Ionicons name={definition.icon} size={23} color={colors.purple} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.cardTitle}>{displayName(item, kind)}</Text>
                  <Text style={adminStyles.cardSub}>{secondaryText(item, kind) || "No additional details"}</Text>
                </View>
                {item.status || item.isActive !== undefined ? <StatusPill label={item.status || (item.isActive ? "Active" : "Inactive")} /> : null}
              </View>
              {kind === "support" ? <><Text style={styles.subject}>{item.subject}</Text><Text style={styles.description} numberOfLines={4}>{item.description}</Text>{item.adminReply ? <Text style={styles.reply}>Reply: {item.adminReply}</Text> : null}</> : null}
              {kind === "stores" ? <Text style={styles.description}>{[item.address?.street, item.address?.city, item.address?.state, item.address?.pincode].filter(Boolean).join(", ") || "No address provided"}</Text> : null}
              {kind === "suppliers" ? <Text style={styles.description}>Payment due: ₹{Number(item.payment_due || 0).toFixed(2)}</Text> : null}
              {definition.readOnly && !definition.support ? null : (
                <View style={adminStyles.actions}>
                  {definition.support ? <ActionButton icon="chatbox-ellipses-outline" label="Review" onPress={() => openTicket(item)} /> : null}
                  {definition.details ? <ActionButton icon="open-outline" label="Details" onPress={() => navigation.navigate("StoreAdminDetails", { adminId: idOf(item) })} /> : null}
                  {kind === "stores" && item.admin?._id ? <ActionButton icon="person-circle-outline" label="Admin" onPress={() => navigation.navigate("StoreAdminDetails", { adminId: item.admin._id })} /> : null}
                  {definition.canEdit ? <ActionButton icon="create-outline" label="Edit" onPress={() => openEdit(item)} /> : null}
                  {definition.canToggle ? <ActionButton icon={item.isActive ? "pause-outline" : "play-outline"} label={item.isActive ? "Disable" : "Enable"} danger={Boolean(item.isActive)} onPress={() => toggle(item)} /> : null}
                  {definition.password ? <ActionButton icon="key-outline" label="Set password" onPress={() => { setPasswordRecord(item); setNewPassword(""); }} /> : null}
                  {definition.canDelete && user?.role !== ROLES.STAFF ? <ActionButton icon="trash-outline" label="Delete" danger onPress={() => remove(item)} /> : null}
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => !saving && setModalOpen(false)}>
        <KeyboardAvoidingView style={adminStyles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={adminStyles.modalSheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={adminStyles.modalTitle}>{editing ? `Edit ${definition.title}` : `Create ${definition.title}`}</Text>
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              {definition.fields.map((field) => (
                <FormInput
                  key={field}
                  field={field}
                  value={form[field] ?? ""}
                  secureTextEntry={field === "password"}
                  keyboardType={["phone", "mobile", "payment_due"].includes(field) ? "number-pad" : field === "email" ? "email-address" : "default"}
                  onChangeText={(value) => setForm((old) => ({ ...old, [field]: value }))}
                  optional={field === "email" && ["delivery", "customers", "suppliers"].includes(kind)}
                />
              ))}
              {definition.roles ? <ChoiceGroup label="Role" values={USER_ROLES} selected={form.role} onSelect={(role) => setForm((old) => ({ ...old, role }))} /> : null}
              {definition.vehicles ? <ChoiceGroup label="Vehicle type" values={VEHICLES} selected={form.vehicleType} onSelect={(vehicleType) => setForm((old) => ({ ...old, vehicleType }))} /> : null}
              {definition.permissions || definition.forceRole ? <MultiChoice label="Permissions" values={PERMISSIONS} selected={form.permissions || []} onToggle={(permission) => setForm((old) => ({ ...old, permissions: old.permissions.includes(permission) ? old.permissions.filter((item) => item !== permission) : [...old.permissions, permission] }))} /> : null}
              {definition.adminChoice ? <ChoiceGroup label="Assign unassigned admin *" values={admins.map((admin) => admin._id)} labelFor={(id) => admins.find((admin) => admin._id === id)?.name || id} selected={form.adminId} onSelect={(adminId) => setForm((old) => ({ ...old, adminId }))} emptyMessage="No unassigned administrator is available. Create an admin first." /> : null}
              <View style={adminStyles.modalActions}>
                <Pressable disabled={saving} onPress={() => setModalOpen(false)} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Cancel</Text></Pressable>
                <Pressable disabled={saving} onPress={save} style={adminStyles.saveButton}>{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Save</Text>}</Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(passwordRecord)} transparent animationType="slide" onRequestClose={() => setPasswordRecord(null)}>
        <View style={adminStyles.modalBackdrop}><View style={adminStyles.modalSheet}>
          <Text style={adminStyles.modalTitle}>Set delivery password</Text>
          <Text style={styles.modalHelp}>This password will work with {passwordRecord?.phone} on the common app login page.</Text>
          <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 4 characters" placeholderTextColor="#9AA39D" style={adminStyles.input} />
          <View style={adminStyles.modalActions}><Pressable onPress={() => setPasswordRecord(null)} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Cancel</Text></Pressable><Pressable disabled={saving || newPassword.length < 4} onPress={setPartnerPassword} style={[adminStyles.saveButton, (saving || newPassword.length < 4) && styles.disabled]}>{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Set password</Text>}</Pressable></View>
        </View></View>
      </Modal>

      <Modal visible={Boolean(supportRecord)} transparent animationType="slide" onRequestClose={() => setSupportRecord(null)}>
        <KeyboardAvoidingView style={adminStyles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={adminStyles.modalSheet}>
          <Text style={adminStyles.modalTitle}>Review {supportRecord?.ticketNumber}</Text>
          <Text style={styles.modalHelp}>{supportRecord?.subject}</Text>
          <ChoiceGroup label="Status" values={TICKET_STATUSES} selected={ticketStatus} onSelect={setTicketStatus} />
          <Text style={adminStyles.label}>Reply to customer</Text>
          <TextInput value={adminReply} onChangeText={setAdminReply} multiline placeholder="Explain the resolution or next step" placeholderTextColor="#9AA39D" style={[adminStyles.input, styles.replyInput]} />
          <View style={adminStyles.modalActions}><Pressable onPress={() => setSupportRecord(null)} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Cancel</Text></Pressable><Pressable disabled={saving} onPress={updateTicket} style={adminStyles.saveButton}>{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Update ticket</Text>}</Pressable></View>
        </View></KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function FormInput({ field, optional, ...props }) {
  const labels = {
    name: "Name *", email: optional ? "Email (optional)" : "Email *", password: "Password *", phone: "Phone *", mobile: "Mobile", street: "Street", city: "City", state: "State", pincode: "PIN code",
    vehicleNumber: "Vehicle number", company_name: "Company name *", category: "Category", contact_person: "Contact person", account_manager: "Account manager", payment_due: "Payment due", address: "Address",
  };
  return <View><Text style={adminStyles.label}>{labels[field] || field.replaceAll("_", " ")}</Text><TextInput {...props} autoCapitalize={field === "email" ? "none" : undefined} placeholderTextColor="#9AA39D" style={adminStyles.input} /></View>;
}

function ChoiceGroup({ label, values, selected, onSelect, labelFor = (value) => value.replaceAll("_", " "), emptyMessage }) {
  return <View style={styles.choiceSection}><Text style={adminStyles.label}>{label}</Text>{values.length ? <View style={styles.choices}>{values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceOn]}><Text style={[styles.choiceText, selected === value && styles.choiceTextOn]}>{labelFor(value)}</Text></Pressable>)}</View> : <Text style={styles.emptyHelp}>{emptyMessage}</Text>}</View>;
}

function MultiChoice({ label, values, selected, onToggle }) {
  return <View style={styles.choiceSection}><Text style={adminStyles.label}>{label}</Text><View style={styles.choices}>{values.map((value) => <Pressable key={value} onPress={() => onToggle(value)} style={[styles.choice, selected.includes(value) && styles.choiceOn]}><Text style={[styles.choiceText, selected.includes(value) && styles.choiceTextOn]}>{value.replaceAll("_", " ")}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  add: { width: 43, height: 43, borderRadius: 15, backgroundColor: "rgba(255,255,255,.17)", alignItems: "center", justifyContent: "center" },
  list: { padding: 15, paddingBottom: 35 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  subject: { color: colors.ink, fontWeight: "900", fontSize: 13, marginTop: 13 },
  description: { color: colors.muted, fontSize: 11.5, lineHeight: 18, marginTop: 8 },
  reply: { color: colors.purpleDark, backgroundColor: colors.purpleSoft, padding: 10, borderRadius: 12, fontSize: 11, lineHeight: 17, marginTop: 10 },
  formError: { color: colors.danger, backgroundColor: "#FFF1F2", padding: 11, borderRadius: 12, fontSize: 12, marginBottom: 12 },
  choiceSection: { marginBottom: 13 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F4F7F5", paddingHorizontal: 11, paddingVertical: 8 },
  choiceOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  choiceText: { color: colors.muted, fontSize: 10.5, fontWeight: "800", textTransform: "capitalize" },
  choiceTextOn: { color: "white" },
  emptyHelp: { color: "#A16207", backgroundColor: "#FFFBEB", padding: 11, borderRadius: 12, fontSize: 11, lineHeight: 17 },
  modalHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -9, marginBottom: 15 },
  replyInput: { minHeight: 105, textAlignVertical: "top", paddingTop: 13 },
  disabled: { opacity: 0.45 },
});
