import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import StateView from "../components/StateView";
import { api, messageFromError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

const statusColors = {
  Delivered: ["#DCFCE7", "#15803D"],
  Cancelled: ["#FEE2E2", "#B91C1C"],
  "Out for Delivery": ["#E8F8EF", "#08783A"],
  Preparing: ["#FEF3C7", "#B45309"],
  Confirmed: ["#DBEAFE", "#1D4ED8"],
  Placed: ["#EAF9F0", "#128744"],
};

const cancelAllowed = (order) => {
  const status = String(order.status || "");
  const paymentMethod = String(order.paymentMethod || "").toLowerCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  return ["Placed", "Confirmed"].includes(status) && !(paymentMethod === "razorpay" && paymentStatus === "paid");
};

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState("");

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

  const activeCount = useMemo(() => orders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length, [orders]);

  const performCancel = async (order) => {
    try {
      setCancelling(order._id);
      const { data } = await api.put(`/orders/${order._id}/cancel`, { reason: "Cancelled by customer from mobile app" });
      setOrders((current) => current.map((item) => item._id === order._id ? data.order : item));
      Alert.alert("Order cancelled", data.message || "The store and admin have been notified.");
      await load(true);
    } catch (e) {
      Alert.alert("Couldn’t cancel order", messageFromError(e));
    } finally {
      setCancelling("");
    }
  };

  const askCancel = (order) => {
    if (!cancelAllowed(order)) {
      Alert.alert("Cannot cancel", "This order can no longer be cancelled because preparation, delivery or online payment has already started.");
      return;
    }
    Alert.alert("Cancel order?", "This will notify the store and restore reserved stock if the order is eligible.", [
      { text: "Keep order", style: "cancel" },
      { text: "Cancel order", style: "destructive", onPress: () => performCancel(order) },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.title}>My orders</Text><Text style={styles.subtitle}>{activeCount} active • {orders.length} total</Text></View>
      </View>
      {loading ? <StateView loading /> : error ? <StateView icon="cloud-offline-outline" title="Orders unavailable" message={error} action="Try again" onAction={load} /> : !orders.length ? <StateView icon="receipt-outline" title="No orders yet" message="Your orders will appear here after checkout." action="Start shopping" onAction={() => navigation.navigate("Main", { screen: "HomeTab" })} /> :
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.purple} />}>
          {orders.map((order) => {
            const palette = statusColors[order.status] || statusColors.Placed;
            const canCancel = cancelAllowed(order);
            return (
              <View key={order._id} style={styles.card}>
                <View style={styles.top}>
                  <View><Text style={styles.orderId}>ORDER #{String(order._id).slice(-6).toUpperCase()}</Text><Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text></View>
                  <Text style={[styles.status, { backgroundColor: palette[0], color: palette[1] }]}>{order.status}</Text>
                </View>
                <View style={styles.items}>{order.items?.slice(0, 4).map((item, index) => <Text key={`${item.productId || item.name}-${index}`} numberOfLines={1} style={styles.item}>• {item.name} × {item.quantity} {item.unit || "piece"}</Text>)}</View>
                {order.cancellationReason ? <View style={styles.reason}><Text style={styles.reasonTitle}>Cancellation reason</Text><Text style={styles.reasonText}>{order.cancellationReason}</Text></View> : null}
                <View style={styles.bottom}>
                  <View><Text style={styles.total}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text><Text style={styles.payment}>{order.paymentMethod || "COD"} • {order.paymentStatus || "pending"}</Text></View>
                  {canCancel ? <Pressable disabled={cancelling === order._id} onPress={() => askCancel(order)} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.72 }, cancelling === order._id && { opacity: 0.55 }]} accessibilityRole="button" accessibilityLabel="Cancel order"><Text style={styles.cancelText}>{cancelling === order._id ? "Cancelling…" : "Cancel Order"}</Text></Pressable> : null}
                </View>
              </View>
            );
          })}
        </ScrollView>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 68, backgroundColor: "white", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.ink, fontSize: 21, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  content: { padding: 14, paddingBottom: 30 },
  card: { backgroundColor: "white", borderRadius: 20, padding: 15, marginBottom: 13, borderWidth: 1, borderColor: colors.border, ...shadow },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  orderId: { color: colors.ink, fontWeight: "900", fontSize: 12.5 },
  date: { color: colors.muted, fontSize: 10, marginTop: 4 },
  status: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, fontSize: 9, fontWeight: "900", overflow: "hidden" },
  items: { marginVertical: 13, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  item: { color: colors.muted, fontSize: 11.5, lineHeight: 20 },
  reason: { backgroundColor: "#FEF2F2", borderRadius: 12, padding: 10, marginBottom: 12 },
  reasonTitle: { fontSize: 9, fontWeight: "900", color: colors.danger, textTransform: "uppercase" },
  reasonText: { fontSize: 11, color: "#991B1B", marginTop: 3 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  total: { color: colors.ink, fontSize: 17, fontWeight: "900" },
  payment: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  cancel: { borderWidth: 1, borderColor: "#FECACA", borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: "#FFF7F7" },
  cancelText: { color: colors.danger, fontSize: 11, fontWeight: "900" },
});
