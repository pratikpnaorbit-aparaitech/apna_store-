import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../components/Screen";
import StateView from "../components/StateView";
import { api, messageFromError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { colors } from "../theme";

const statusColors = {
  completed: ["#FFF3DD", "#C26B08"],
  cancelled: ["#FDE7E9", "#C62828"],
  active: ["#E6F7ED", "#148A46"],
};

const summaryItems = [
  { key: "active", label: "Active", icon: "bag-handle-outline", color: "#16A34A", background: "#E8F8EF" },
  { key: "total", label: "Total Orders", icon: "cube-outline", color: "#3483FA", background: "#EAF2FF" },
  { key: "completed", label: "Completed", icon: "checkmark-circle-outline", color: "#F59E0B", background: "#FFF3DD" },
  { key: "cancelled", label: "Cancelled", icon: "close-circle-outline", color: "#EF4444", background: "#FDE7E9" },
];

const filters = [
  { key: "all", label: "All Orders" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const cancellationReasons = [
  "Ordered by mistake",
  "Changed my mind",
  "Delivery is taking too long",
  "Incorrect address",
  "Payment issue",
  "Other",
];

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const isCancelled = (order) => ["cancelled", "canceled"].includes(normalizeStatus(order.status));
const isCompleted = (order) => ["delivered", "completed"].includes(normalizeStatus(order.status));
const isActive = (order) => !isCancelled(order) && !isCompleted(order);

const isOrderCancellable = (order) => {
  const status = String(order.status || "");
  const paymentMethod = String(order.paymentMethod || "").toLowerCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  return ["Placed", "Confirmed"].includes(status) && !(paymentMethod === "razorpay" && paymentStatus === "paid");
};

const formatOrderDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return `${date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}, ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
};

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id || user?._id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [cancelOrder, setCancelOrder] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (!userId) return;
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get(`/orders/user/${userId}`);
      setOrders(Array.isArray(data) ? data : []);
      setError("");
    } catch (e) {
      setError(messageFromError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => ({
    active: orders.filter(isActive).length,
    total: orders.length,
    completed: orders.filter(isCompleted).length,
    cancelled: orders.filter(isCancelled).length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    if (selectedFilter === "active") return orders.filter(isActive);
    if (selectedFilter === "completed") return orders.filter(isCompleted);
    if (selectedFilter === "cancelled") return orders.filter(isCancelled);
    return orders;
  }, [orders, selectedFilter]);

  const resetCancelModal = () => {
    setCancelOrder(null);
    setSelectedReason("");
    setOtherReason("");
    setCancelError("");
  };

  const closeCancelModal = () => {
    if (!cancelling) resetCancelModal();
  };

  const performCancel = async () => {
    if (!cancelOrder || cancelling) return;
    const reason = selectedReason === "Other" ? otherReason.trim() : selectedReason;
    if (!reason || reason.length < 3) {
      setCancelError(selectedReason === "Other" ? "Please enter a cancellation reason." : "Please select a cancellation reason.");
      return;
    }

    try {
      setCancelling(cancelOrder._id);
      setCancelError("");
      const { data } = await api.put(`/orders/${cancelOrder._id}/cancel`, { reason });
      setOrders((current) => current.map((item) => item._id === cancelOrder._id ? data.order : item));
      resetCancelModal();
      showToast({ title: "Order cancelled", message: data.message || "The store and admin have been notified." });
      await load(true);
    } catch (e) {
      const message = messageFromError(e);
      if (e.response?.status === 409 && /picked up|delivery|already cancelled/i.test(message)) {
        resetCancelModal();
        Alert.alert("Order Can’t Be Cancelled", message, [{ text: "OK" }]);
        await load(true);
      } else {
        setCancelError(message);
      }
    } finally {
      setCancelling("");
    }
  };

  const askCancel = (order) => {
    if (["Picked Up", "Out for Delivery", "Delivered", "Cancelled"].includes(String(order.status || ""))) {
      Alert.alert(
        "Order Can’t Be Cancelled",
        "Your order has already been picked up and is on the way. It can no longer be cancelled.",
        [{ text: "OK" }],
      );
      return;
    }
    if (!isOrderCancellable(order)) {
      Alert.alert("Cannot cancel", "This order can no longer be cancelled because preparation, delivery or online payment has already started.");
      return;
    }
    setCancelOrder(order);
    setSelectedReason("");
    setOtherReason("");
    setCancelError("");
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>My Orders</Text>
          <Text style={styles.subtitle}>Track and manage all your orders</Text>
        </View>
        <View style={styles.headerButton} accessibilityLabel="Order filters">
          <Ionicons name="options-outline" size={21} color={colors.ink} />
        </View>
      </View>

      {loading ? <StateView loading /> : error ? <StateView icon="cloud-offline-outline" title="Orders unavailable" message={error} action="Try again" onAction={load} /> : !orders.length ? <StateView icon="receipt-outline" title="No orders yet" message="Your orders will appear here after checkout." action="Start shopping" onAction={() => navigation.navigate("Main", { screen: "HomeTab" })} /> :
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.purple} />}
        >
          <View style={styles.summaryRow}>
            {summaryItems.map((item) => (
              <View key={item.key} style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: item.background }]}>
                  <Ionicons name={item.icon} size={17} color={item.color} />
                </View>
                <Text style={styles.summaryCount}>{counts[item.key]}</Text>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tabs} accessibilityRole="tablist">
            {filters.map((filter) => {
              const selected = selectedFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setSelectedFilter(filter.key)}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Show ${filter.label.toLowerCase()}`}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.tabText, selected && styles.tabTextActive]}>{filter.label}</Text>
                  {selected ? <View style={styles.tabLine} /> : null}
                </Pressable>
              );
            })}
          </View>

          {!filteredOrders.length ? (
            <View style={styles.emptyFilter}>
              <Ionicons name="receipt-outline" size={28} color={colors.muted} />
              <Text style={styles.emptyTitle}>No {selectedFilter} orders</Text>
              <Text style={styles.emptyText}>Orders matching this filter will appear here.</Text>
            </View>
          ) : filteredOrders.map((order) => {
            const cancelled = isCancelled(order);
            const completed = isCompleted(order);
            const palette = statusColors[cancelled ? "cancelled" : completed ? "completed" : "active"];
            const canCancel = isOrderCancellable(order);
            const paymentStatus = String(order.paymentStatus || "pending");
            const paymentState = paymentStatus.toLowerCase();
            const paymentColor = ["paid", "successful", "success"].includes(paymentState) ? colors.success : ["failed", "failure"].includes(paymentState) ? colors.danger : colors.muted;
            const items = Array.isArray(order.items) ? order.items : [];
            const firstItem = items[0];
            const itemSummary = firstItem ? `${firstItem.name} × ${firstItem.quantity} ${firstItem.unit || "piece"}${items.length > 1 ? `  +${items.length - 1} more` : ""}` : "Order items unavailable";

            return (
              <Pressable
                key={order._id}
                onPress={() => navigation.navigate("OrderTracking", { orderId: order._id, order })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`Track order ${String(order._id).slice(-6).toUpperCase()}`}
              >
                <View style={styles.orderTop}>
                  <View style={[styles.orderIcon, { backgroundColor: palette[0] }]}>
                    <Ionicons name="bag-handle-outline" size={20} color={palette[1]} />
                  </View>
                  <View style={styles.orderHeading}>
                    <Text numberOfLines={1} style={styles.orderId}>ORDER #{String(order._id).slice(-6).toUpperCase()}</Text>
                    <Text numberOfLines={1} style={styles.date}>{formatOrderDate(order.createdAt)}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.status, { backgroundColor: palette[0], color: palette[1] }]}>{order.status || "Placed"}</Text>
                </View>

                <Text numberOfLines={2} style={styles.itemSummary}>• {itemSummary}</Text>

                {cancelled ? (
                  <View style={styles.reason}>
                    <Text style={styles.reasonTitle}>CANCELLATION REASON</Text>
                    <Text style={styles.reasonText}>{order.cancellationReason || "Order was cancelled."}</Text>
                  </View>
                ) : null}

                <View style={styles.divider} />
                <View style={styles.bottom}>
                  <View style={styles.amountArea}>
                    <Text style={styles.total}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text>
                    <View style={styles.paymentRow}>
                      <Text style={styles.payment}>{order.paymentMethod || "COD"}</Text>
                      <Text style={styles.paymentDot}>•</Text>
                      <Text style={[styles.payment, { color: paymentColor, fontWeight: "800" }]}>{paymentStatus}</Text>
                    </View>
                  </View>
                  {canCancel ? (
                    <Pressable
                      disabled={cancelling === order._id}
                      onPress={(event) => { event.stopPropagation(); askCancel(order); }}
                      style={({ pressed }) => [styles.cancel, pressed && styles.pressed, cancelling === order._id && styles.disabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel order"
                    >
                      <Text style={styles.cancelText}>{cancelling === order._id ? "Cancelling…" : "Cancel Order"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>}

      <Modal visible={Boolean(cancelOrder)} transparent animationType="slide" onRequestClose={closeCancelModal}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={closeCancelModal} accessibilityRole="button" accessibilityLabel="Close cancellation dialog" />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeadingRow}>
              <View style={styles.modalIcon}><Ionicons name="close-circle-outline" size={22} color={colors.danger} /></View>
              <View style={styles.modalHeadingText}>
                <Text style={styles.modalTitle}>Cancel Order</Text>
                <Text style={styles.modalMessage}>Please select or enter a reason for cancelling this order.</Text>
              </View>
            </View>

            <View style={styles.reasonOptions} accessibilityRole="radiogroup">
              {cancellationReasons.map((reason) => {
                const selected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => { setSelectedReason(reason); setCancelError(""); }}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={reason}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={[styles.reasonOptionText, selected && styles.reasonOptionTextSelected]}>{reason}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedReason === "Other" ? (
              <TextInput
                value={otherReason}
                onChangeText={(value) => { setOtherReason(value); setCancelError(""); }}
                placeholder="Enter your reason"
                placeholderTextColor="#9AA59D"
                multiline
                maxLength={500}
                style={styles.otherInput}
                accessibilityLabel="Other cancellation reason"
              />
            ) : null}

            {cancelError ? <Text style={styles.modalError}>{cancelError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable disabled={Boolean(cancelling)} onPress={closeCancelModal} style={[styles.keepButton, cancelling && styles.disabled]} accessibilityRole="button" accessibilityLabel="Keep order">
                <Text style={styles.keepButtonText}>Keep Order</Text>
              </Pressable>
              <Pressable disabled={Boolean(cancelling)} onPress={performCancel} style={[styles.confirmButton, cancelling && styles.disabled]} accessibilityRole="button" accessibilityLabel="Confirm cancellation">
                {cancelling ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.confirmButtonText}>Confirm Cancellation</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAFCFA" },
  header: { backgroundColor: "white", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#EEF2EF" },
  headerButton: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#EEF2EF", shadowColor: "#153E25", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  headerText: { flex: 1 },
  title: { color: colors.ink, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  content: { padding: 14, paddingBottom: 110 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  summaryCard: { flex: 1, minWidth: 0, backgroundColor: "white", borderRadius: 14, borderWidth: 1, borderColor: "#E8EEE9", paddingVertical: 11, paddingHorizontal: 7, alignItems: "center", shadowColor: "#153E25", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  summaryIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  summaryCount: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  summaryLabel: { color: colors.muted, fontSize: 9.5, marginTop: 2, width: "100%", textAlign: "center" },
  tabs: { height: 54, flexDirection: "row", backgroundColor: "white", borderWidth: 1, borderColor: "#E8EEE9", borderRadius: 15, marginBottom: 14, paddingHorizontal: 4 },
  tab: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", position: "relative", paddingHorizontal: 2 },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  tabTextActive: { color: colors.purpleDark, fontWeight: "900" },
  tabLine: { position: "absolute", height: 2.5, borderRadius: 3, backgroundColor: colors.purple, left: 8, right: 8, bottom: 0 },
  emptyFilter: { backgroundColor: "white", borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 28, alignItems: "center" },
  emptyTitle: { color: colors.ink, fontWeight: "900", fontSize: 15, marginTop: 10, textTransform: "capitalize" },
  emptyText: { color: colors.muted, fontSize: 11, marginTop: 4, textAlign: "center" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 14, marginBottom: 13, borderWidth: 1, borderColor: "#E5ECE7", shadowColor: "#153E25", shadowOpacity: 0.06, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  orderTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  orderIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  orderHeading: { flex: 1, minWidth: 0 },
  orderId: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  date: { color: colors.muted, fontSize: 10.5, marginTop: 4 },
  status: { maxWidth: "28%", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, fontSize: 9.5, fontWeight: "900", overflow: "hidden" },
  itemSummary: { color: colors.muted, fontSize: 11.5, lineHeight: 18, marginTop: 14 },
  reason: { backgroundColor: "#FFF1F2", borderRadius: 12, padding: 11, marginTop: 13 },
  reasonTitle: { fontSize: 9.5, fontWeight: "900", color: colors.danger, letterSpacing: 0.25 },
  reasonText: { fontSize: 11.5, color: "#A61B1B", marginTop: 4, lineHeight: 17 },
  divider: { height: 1, backgroundColor: "#E5ECE7", marginVertical: 13 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  amountArea: { flex: 1, minWidth: 0 },
  total: { color: colors.ink, fontSize: 19, fontWeight: "900" },
  paymentRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  payment: { color: colors.muted, fontSize: 10.5 },
  paymentDot: { color: colors.muted, fontSize: 10 },
  cancel: { minWidth: 116, borderWidth: 1.2, borderColor: "#FCA5A5", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "white", alignItems: "center" },
  cancelText: { color: colors.danger, fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8, 24, 14, 0.48)" },
  modalSheet: { backgroundColor: "white", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 34 : 22, maxHeight: "90%" },
  modalHandle: { width: 42, height: 4, borderRadius: 3, backgroundColor: "#D7E0D9", alignSelf: "center", marginBottom: 17 },
  modalHeadingRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  modalIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#FFF1F2", alignItems: "center", justifyContent: "center" },
  modalHeadingText: { flex: 1 },
  modalTitle: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  modalMessage: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  reasonOptions: { marginTop: 18, gap: 8 },
  reasonOption: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: "#E4EBE6", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FCFDFC" },
  reasonOptionSelected: { borderColor: colors.purple, backgroundColor: "#EFFAF3" },
  reasonOptionText: { color: colors.ink, fontSize: 12.5, fontWeight: "700", flex: 1 },
  reasonOptionTextSelected: { color: colors.purpleDark },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: "#A9B5AC", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.purple },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.purple },
  otherInput: { minHeight: 76, maxHeight: 120, marginTop: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FAFCFA", color: colors.ink, paddingHorizontal: 13, paddingVertical: 11, fontSize: 12.5, textAlignVertical: "top" },
  modalError: { color: colors.danger, fontSize: 11.5, fontWeight: "700", marginTop: 10 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  keepButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  keepButtonText: { color: colors.ink, fontSize: 12, fontWeight: "900" },
  confirmButton: { flex: 1.35, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.danger, paddingHorizontal: 12 },
  confirmButtonText: { color: "white", fontSize: 12, fontWeight: "900" },
});
