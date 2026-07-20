import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { ActionButton, AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, SearchBox, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { API_URL, api, messageFromError } from "../../api/client";
import { authStorage } from "../../utils/authStorage";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors } from "../../theme";
import { useToast } from "../../context/ToastContext";

const STATUSES = ["Placed", "Confirmed", "Preparing", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"];
const FILTERS = ["All", ...STATUSES];
const STATUS_OPTIONS = STATUSES.filter((status) => status !== "Delivered");

export default function OrderManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [statusOrder, setStatusOrder] = useState(null);
  const [assignOrder, setAssignOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const superAdmin = user?.role === ROLES.SUPER_ADMIN;
  const canAssign = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  const storeId = user?.storeId?._id || user?.storeId;
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const orderUrl = superAdmin ? "/orders/all" : `/orders/store/${storeId}`;
      if (!superAdmin && !storeId) throw new Error("No store is assigned to this account.");
      const requests = [api.get(orderUrl)];
      if (canAssign) requests.push(api.get("/delivery-partners"));
      const [ordersResult, partnersResult] = await Promise.all(requests);
      setOrders(Array.isArray(ordersResult.data) ? ordersResult.data : []);
      setPartners(partnersResult?.data?.data || []);
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, loadError.message || "Orders are unavailable."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAssign, storeId, superAdmin]);

  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => orders.filter((order) => {
    const matchesFilter = filter === "All" || order.status === filter;
    const needle = search.toLowerCase();
    const matchesSearch = !needle || [order._id, order.userId?.name, order.userId?.mobile, order.address?.name, order.address?.phone].some((value) => String(value || "").toLowerCase().includes(needle));
    return matchesFilter && matchesSearch;
  }), [filter, orders, search]);

  const updateLocal = (updated) => setOrders((current) => current.map((order) => order._id === updated._id ? updated : order));

  const changeStatus = async (order, status, reason) => {
    if (busyId) return;
    setBusyId(order._id);
    try {
      const { data } = await api.put(`/orders/${order._id}/status`, { status, reason });
      updateLocal(data.order);
      setStatusOrder(null);
      setCancelReason("");
      showToast({ title: "Order updated", message: `Status changed to ${status}.` });
    } catch (statusError) {
      Alert.alert("Status update failed", messageFromError(statusError));
    } finally {
      setBusyId("");
    }
  };

  const selectStatus = (order, status) => {
    if (status === order.status) return;
    if (status === "Cancelled") {
      setCancelReason("");
      setStatusOrder({ ...order, requestedStatus: status });
      return;
    }
    Alert.alert("Change order status?", `${String(order._id).slice(-6).toUpperCase()} will move from ${order.status} to ${status}.`, [
      { text: "Keep current", style: "cancel" },
      { text: "Update", onPress: () => changeStatus(order, status) },
    ]);
  };

  const assign = async (partner) => {
    if (!assignOrder || busyId) return;
    setBusyId(assignOrder._id);
    try {
      const { data } = await api.put(`/orders/${assignOrder._id}/assign-delivery`, { deliveryPartnerId: partner._id });
      updateLocal(data.order);
      setAssignOrder(null);
      showToast({ title: "Delivery assigned", message: `${partner.name} received the order.` });
      await load(true);
    } catch (assignError) {
      Alert.alert("Assignment failed", messageFromError(assignError));
    } finally {
      setBusyId("");
    }
  };

  const downloadInvoice = async (order) => {
    if (invoiceId) return;
    setInvoiceId(order._id);
    const invoiceName = `INV-${String(order._id).slice(-8).toUpperCase()}.pdf`;
    try {
      if (Platform.OS === "web") {
        const { data } = await api.get(`/orders/${order._id}/invoice`, { responseType: "blob" });
        const url = URL.createObjectURL(data);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = invoiceName;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        const token = await authStorage.getItem("auth_token");
        const result = await FileSystem.downloadAsync(
          `${API_URL}/orders/${order._id}/invoice`,
          `${FileSystem.cacheDirectory}${invoiceName}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (result.status < 200 || result.status >= 300) throw new Error("Invoice download failed.");
        if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
        await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "Share invoice", UTI: "com.adobe.pdf" });
      }
    } catch (invoiceError) {
      Alert.alert("Invoice unavailable", invoiceError.response ? messageFromError(invoiceError, "Could not download this invoice.") : invoiceError.message || "Could not download this invoice.");
    } finally {
      setInvoiceId("");
    }
  };

  return (
    <Screen>
      <AdminHeader title="Orders" subtitle={`${orders.length} orders in scope`} roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search order, customer or phone" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((status) => <Pressable key={status} onPress={() => setFilter(status)} style={[styles.filter, filter === status && styles.filterOn]}><Text style={[styles.filterText, filter === status && styles.filterTextOn]}>{status}</Text></Pressable>)}
      </ScrollView>
      {loading ? <LoadingBlock label="Loading orders…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={shown}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<EmptyBlock title="No matching orders" message="Try a different status or search." />}
          renderItem={({ item }) => (
            <View style={adminStyles.card}>
              <View style={styles.top}>
                <View><Text style={styles.orderId}>#{String(item._id).slice(-6).toUpperCase()}</Text><Text style={adminStyles.cardSub}>{new Date(item.createdAt).toLocaleString("en-IN")}</Text></View>
                <StatusPill label={item.status} />
              </View>
              <View style={styles.customer}>
                <Ionicons name="person-circle-outline" size={25} color={colors.purple} />
                <View style={{ flex: 1 }}><Text style={adminStyles.cardTitle}>{item.userId?.name || item.address?.name || "Customer"}</Text><Text style={adminStyles.cardSub}>{item.userId?.mobile || item.address?.phone || "No phone"}</Text></View>
                <Text style={styles.amount}>₹{Number(item.totalAmount || 0).toFixed(2)}</Text>
              </View>
              <Text style={styles.address} numberOfLines={2}>{[item.address?.street, item.address?.city, item.address?.pincode].filter(Boolean).join(", ") || "Address unavailable"}</Text>
              <Text style={styles.items} numberOfLines={3}>{(item.items || []).map((product) => `${product.quantity}× ${product.name}`).join(" • ")}</Text>
              <View style={styles.payment}><Text style={styles.paymentText}>{item.paymentMethod || "COD"} • {item.paymentStatus || "pending"}</Text>{item.deliveryPartnerId ? <Text style={styles.partner}>🛵 {item.deliveryPartnerId.name}</Text> : null}</View>
              <View style={adminStyles.actions}>
                <ActionButton icon="document-text-outline" label={invoiceId === item._id ? "Preparing…" : "Invoice"} disabled={Boolean(invoiceId)} onPress={() => downloadInvoice(item)} />
                <ActionButton icon="swap-horizontal-outline" label="Status" disabled={busyId === item._id} onPress={() => setStatusOrder(item)} />
                {canAssign && item.status !== "Cancelled" && item.status !== "Delivered" ? <ActionButton icon="bicycle-outline" label={item.deliveryPartnerId ? "Reassign" : "Assign delivery"} disabled={busyId === item._id} onPress={() => setAssignOrder(item)} /> : null}
              </View>
            </View>
          )}
        />
      )}

      <Modal transparent visible={Boolean(statusOrder)} animationType="slide" onRequestClose={() => setStatusOrder(null)}>
        <View style={adminStyles.modalBackdrop}>
          <View style={adminStyles.modalSheet}>
            <Text style={adminStyles.modalTitle}>Update order status</Text>
            <Text style={styles.modalHelp}>Current status: {statusOrder?.status}</Text>
            {statusOrder?.requestedStatus === "Cancelled" ? (
              <>
                <Text style={adminStyles.label}>Cancellation reason *</Text>
                <TextInput value={cancelReason} onChangeText={setCancelReason} multiline placeholder="Why is this order being cancelled?" placeholderTextColor="#9AA39D" style={[adminStyles.input, styles.reason]} />
                <View style={adminStyles.modalActions}>
                  <Pressable onPress={() => setStatusOrder(null)} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Keep order</Text></Pressable>
                  <Pressable disabled={cancelReason.trim().length < 3 || Boolean(busyId)} onPress={() => changeStatus(statusOrder, "Cancelled", cancelReason.trim())} style={[adminStyles.saveButton, { backgroundColor: colors.danger }, (cancelReason.trim().length < 3 || busyId) && styles.disabled]}>{busyId ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Cancel order</Text>}</Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statusGrid}>{STATUS_OPTIONS.map((status) => <Pressable key={status} disabled={status === statusOrder?.status} onPress={() => selectStatus(statusOrder, status)} style={[styles.statusChoice, status === statusOrder?.status && styles.statusCurrent, status === "Cancelled" && styles.statusDanger]}><Text style={[styles.statusChoiceText, status === statusOrder?.status && styles.statusCurrentText, status === "Cancelled" && { color: colors.danger }]}>{status}</Text></Pressable>)}</View>
                <Text style={styles.otpNote}>Delivered status is set only after the delivery partner verifies the customer OTP.</Text>
                <Pressable onPress={() => setStatusOrder(null)} style={[adminStyles.cancelButton, { marginTop: 12 }]}><Text style={adminStyles.cancelText}>Close</Text></Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(assignOrder)} animationType="slide" onRequestClose={() => setAssignOrder(null)}>
        <View style={adminStyles.modalBackdrop}>
          <View style={adminStyles.modalSheet}>
            <Text style={adminStyles.modalTitle}>Assign delivery partner</Text>
            <Text style={styles.modalHelp}>Only active and available partners can be selected.</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {partners.filter((partner) => partner.isActive && partner.isAvailable).map((partner) => (
                <Pressable key={partner._id} onPress={() => assign(partner)} style={styles.partnerChoice}>
                  <View style={styles.partnerIcon}><Ionicons name="bicycle" size={21} color={colors.purple} /></View>
                  <View style={{ flex: 1 }}><Text style={adminStyles.cardTitle}>{partner.name}</Text><Text style={adminStyles.cardSub}>{partner.phone} • {partner.vehicleType || "vehicle"} {partner.vehicleNumber || ""}</Text></View>
                  {busyId ? <ActivityIndicator color={colors.purple} /> : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
                </Pressable>
              ))}
              {!partners.some((partner) => partner.isActive && partner.isAvailable) ? <EmptyBlock title="No partner available" message="Create or activate a delivery partner first." /> : null}
            </ScrollView>
            <Pressable onPress={() => setAssignOrder(null)} style={[adminStyles.cancelButton, { marginTop: 12 }]}><Text style={adminStyles.cancelText}>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 15, paddingVertical: 11, gap: 7 },
  filter: { borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 },
  filterOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterText: { color: colors.muted, fontSize: 10.5, fontWeight: "800" },
  filterTextOn: { color: "white" },
  list: { padding: 15, paddingTop: 3, paddingBottom: 35 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderId: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  customer: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border },
  amount: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  address: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 10 },
  items: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 8 },
  payment: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F6FAF7", borderRadius: 12, padding: 10, marginTop: 11 },
  paymentText: { color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  partner: { color: colors.purpleDark, fontSize: 10.5, fontWeight: "800" },
  modalHelp: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -9, marginBottom: 15 },
  statusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChoice: { minWidth: "47%", minHeight: 45, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F9FBFA", alignItems: "center", justifyContent: "center", padding: 8 },
  statusCurrent: { backgroundColor: colors.purpleSoft, borderColor: colors.purple },
  statusDanger: { backgroundColor: "#FFF1F2", borderColor: "#FECACA" },
  statusChoiceText: { color: colors.ink, fontSize: 11, fontWeight: "900", textAlign: "center" },
  statusCurrentText: { color: colors.purpleDark },
  reason: { minHeight: 95, textAlignVertical: "top", paddingTop: 13 },
  disabled: { opacity: 0.45 },
  partnerChoice: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  partnerIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  otpNote: { color: colors.muted, fontSize: 10.5, lineHeight: 16, marginTop: 11 },
});
