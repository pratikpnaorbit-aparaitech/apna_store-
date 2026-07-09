import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import StateView from "../../components/StateView";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { colors, shadow } from "../../theme";

const STATUS_COLORS = {
  Confirmed: ["#FEF3C7", "#B45309"],
  Preparing: ["#FFEDD5", "#C2410C"],
  "Out for Delivery": ["#DBEAFE", "#1D4ED8"],
  Delivered: ["#DCFCE7", "#15803D"],
  Cancelled: ["#FEE2E2", "#B91C1C"],
  Placed: ["#EAF9F0", "#128744"],
};

const formatAddress = (address) => {
  if (!address) return "Address not available";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.pincode].filter(Boolean).join(", ") || "Address not available";
};

const getPhone = (order) => order?.address?.phone || order?.userId?.mobile || "";
const shortId = (order) => String(order?._id || "").slice(-6).toUpperCase();
const isActiveOrder = (order) => !["Delivered", "Cancelled"].includes(order.status);

const getLocationError = (error) => {
  if (error?.status === "denied") return "Location permission is blocked. Allow location permission from app settings and retry.";
  return error?.message || "Unable to get live location. Turn on GPS/location services and try again.";
};

export default function DeliveryDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationError, setLocationError] = useState("");
  const [lastPushed, setLastPushed] = useState(null);
  const [otpInputs, setOtpInputs] = useState({});
  const [otpRequested, setOtpRequested] = useState({});
  const [otpLoading, setOtpLoading] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const intervalRef = useRef(null);

  const loadOrders = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const { data } = await api.get("/delivery-partners/my-orders");
      setOrders(Array.isArray(data?.data) ? data.data : []);
      setError("");
    } catch (e) {
      setError(messageFromError(e, "Unable to load assigned orders."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useFocusEffect(useCallback(() => { loadOrders({ silent: true }); }, [loadOrders]));
  useEffect(() => {
    const hasOutForDelivery = orders.some((order) => order.status === "Out for Delivery");
    if (hasOutForDelivery) startLocationSharing();
    else stopLocationSharing();
    return () => stopLocationSharing();
  }, [orders]);

  const activeOrders = useMemo(() => orders.filter(isActiveOrder), [orders]);
  const completedOrders = useMemo(() => orders.filter((order) => order.status === "Delivered"), [orders]);

  const getCurrentLocation = async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) throw new Error("Device location services are off. Turn on GPS and try again.");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") throw permission;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
    const lat = Number(position.coords.latitude);
    const lng = Number(position.coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Device returned invalid GPS coordinates.");
    return { lat, lng };
  };

  const pushLocation = async ({ showAlert = false } = {}) => {
    try {
      setLocationStatus("acquiring");
      setLocationError("");
      const { lat, lng } = await getCurrentLocation();
      const { data } = await api.put("/delivery-partners/location", { lat, lng });
      if (!data?.success) throw new Error(data?.message || "Location was not saved on server.");
      setLastPushed(new Date());
      setLocationStatus("sharing");
      setLocationError("");
      if (showAlert) Alert.alert("Location updated", "Your live location was sent to the server.");
      return true;
    } catch (e) {
      const message = e.response ? messageFromError(e, "Failed to update live location.") : getLocationError(e);
      setLocationStatus("error");
      setLocationError(message);
      if (showAlert) Alert.alert("GPS issue", message);
      return false;
    }
  };

  const startLocationSharing = () => {
    if (intervalRef.current) return;
    pushLocation();
    intervalRef.current = setInterval(() => pushLocation({ showAlert: false }), 15000);
  };

  const stopLocationSharing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (!orders.some((order) => order.status === "Out for Delivery")) {
      setLocationStatus("idle");
      setLocationError("");
    }
  };

  const updateStatus = async (orderId, status) => {
    if (status === "Delivered") {
      Alert.alert("OTP required", "Delivery can be completed only after customer OTP verification.");
      return;
    }
    try {
      setUpdating(orderId);
      const { data } = await api.put(`/delivery-partners/order/${orderId}/status`, { status });
      setOrders((current) => current.map((order) => order._id === orderId ? (data.order || { ...order, status }) : order));
      if (status === "Out for Delivery") pushLocation();
    } catch (e) {
      Alert.alert("Status not updated", messageFromError(e, "Failed to update order status."));
    } finally {
      setUpdating("");
    }
  };

  const requestDeliveryOtp = async (orderId) => {
    try {
      setOtpLoading(orderId);
      const { data } = await api.post(`/orders/${orderId}/delivery-otp/request`);
      setOtpInputs((current) => ({ ...current, [orderId]: "" }));
      setOtpRequested((current) => ({ ...current, [orderId]: true }));
      Alert.alert("OTP sent", data?.message || "OTP sent to customer email.");
    } catch (e) {
      Alert.alert("OTP not sent", messageFromError(e, "Failed to send delivery OTP."));
    } finally {
      setOtpLoading("");
    }
  };

  const verifyDeliveryOtp = async (orderId) => {
    const otp = String(otpInputs[orderId] || "").trim();
    if (!/^\d{6}$/.test(otp)) return Alert.alert("Invalid OTP", "Enter the 6-digit OTP from customer.");
    try {
      setOtpLoading(orderId);
      const { data } = await api.post(`/orders/${orderId}/delivery-otp/verify`, { otp });
      setOrders((current) => current.map((order) => order._id === orderId ? (data.order || { ...order, status: "Delivered" }) : order));
      setOtpInputs((current) => ({ ...current, [orderId]: "" }));
      setOtpRequested((current) => ({ ...current, [orderId]: false }));
      Alert.alert("Delivery completed", data?.message || "Delivered successfully.");
      loadOrders({ silent: true });
    } catch (e) {
      Alert.alert("OTP verification failed", messageFromError(e, "Invalid or expired OTP."));
    } finally {
      setOtpLoading("");
    }
  };

  const openDirections = (order) => {
    const q = order?.customerLocation?.latitude && order?.customerLocation?.longitude
      ? `${order.customerLocation.latitude},${order.customerLocation.longitude}`
      : encodeURIComponent(formatAddress(order.address));
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`).catch(() => Alert.alert("Unable to open maps"));
  };

  const performLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    stopLocationSharing();

    // AuthContext sets user=null immediately; RootNavigator then remounts AuthStack(Login)
    // with a new key, so Android/iOS back cannot return to DeliveryDashboard.
    await logout();
  };

  const handleLogout = performLogout;

  const onRefresh = () => { setRefreshing(true); loadOrders({ silent: true }); };

  const renderOrder = ({ item: order }) => {
    const palette = STATUS_COLORS[order.status] || STATUS_COLORS.Placed;
    const phone = getPhone(order);
    return <View style={styles.card}>
      <View style={styles.cardTop}>
        <View><Text style={styles.orderId}>Order #{shortId(order)}</Text><Text style={styles.date}>{new Date(order.createdAt).toLocaleString("en-IN")}</Text></View>
        <Text style={[styles.status, { backgroundColor: palette[0], color: palette[1] }]}>{order.status}</Text>
      </View>
      <View style={styles.customerBox}>
        <Text style={styles.customer}>📞 {order.userId?.name || order.address?.name || "Customer"}{phone ? ` • ${phone}` : ""}</Text>
        <Text style={styles.address} numberOfLines={2}>📍 {formatAddress(order.address)}</Text>
      </View>
      <View style={styles.itemsBox}>
        <Text style={styles.miniLabel}>Items</Text>
        {order.items?.slice(0, 3).map((item, index) => <Text key={`${item.productId || item.name}-${index}`} style={styles.itemText}>{item.name} × {item.quantity}</Text>)}
        <View style={styles.amountRow}><View><Text style={styles.amount}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text><Text style={styles.payment}>{order.paymentMethod || "COD"} • {order.paymentStatus || "pending"}</Text></View><View style={styles.quickActions}><Pressable onPress={() => openDirections(order)} hitSlop={8} style={styles.mapButton}><Ionicons name="navigate-outline" size={15} color={colors.purpleDark} /><Text style={styles.mapText}>Directions</Text></Pressable><Pressable onPress={() => navigation.navigate("DeliveryOrderDetails", { order })} hitSlop={8} style={styles.detailsButton}><Ionicons name="document-text-outline" size={15} color="#075985" /><Text style={styles.detailsText}>Details</Text></Pressable></View></View>
      </View>
      <View style={styles.actions}>
        {(order.status === "Confirmed" || order.status === "Preparing") ? <Pressable disabled={updating === order._id} onPress={() => updateStatus(order._id, "Out for Delivery")} style={styles.blueButton}><Text style={styles.buttonText}>{updating === order._id ? "Updating…" : "Pick Up / Out for Delivery"}</Text></Pressable> : null}
        {order.status === "Out for Delivery" ? <View style={{ gap: 10 }}>
          <Pressable disabled={otpLoading === order._id} onPress={() => requestDeliveryOtp(order._id)} style={styles.orangeButton}><Text style={styles.buttonText}>{otpLoading === order._id ? "Sending OTP…" : "Send OTP to Customer"}</Text></Pressable>
          {otpRequested[order._id] ? <View style={styles.otpBox}>
            <Text style={styles.otpHelp}>OTP sent. Ask customer for the 6-digit OTP after handing over the order.</Text>
            <TextInput value={otpInputs[order._id] || ""} onChangeText={(text) => setOtpInputs((current) => ({ ...current, [order._id]: text.replace(/\D/g, "").slice(0, 6) }))} keyboardType="number-pad" inputMode="numeric" maxLength={6} placeholder="Enter OTP" placeholderTextColor="#9CA3AF" style={styles.otpInput} editable={otpLoading !== order._id} selectTextOnFocus />
            <Pressable disabled={otpLoading === order._id} onPress={() => verifyDeliveryOtp(order._id)} style={styles.greenButton}><Text style={styles.buttonText}>{otpLoading === order._id ? "Verifying…" : "Verify OTP & Complete Delivery"}</Text></Pressable>
          </View> : null}
        </View> : null}
      </View>
    </View>;
  };

  const locationLabel = locationStatus === "sharing" ? "Sharing Live" : locationStatus === "acquiring" ? "Getting GPS…" : locationStatus === "error" ? "GPS issue" : "GPS idle";

  return <Screen>
    <View style={styles.header}>
      <View style={styles.avatar}><Text style={{ fontSize: 22 }}>🏍️</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.name}>{user?.name || "Delivery Partner"}</Text><Text style={styles.vehicle}>{user?.vehicleType || "vehicle"} {user?.vehicleNumber ? `• ${user.vehicleNumber}` : ""}</Text></View>
      <Pressable onPress={handleLogout} disabled={logoutLoading} hitSlop={12} accessibilityRole="button" accessibilityLabel="Logout delivery account" style={({ pressed }) => [styles.logout, pressed && { opacity: 0.75 }, logoutLoading && { opacity: 0.6 }]}>
        {logoutLoading ? <ActivityIndicator size="small" color="white" /> : <><Ionicons name="log-out-outline" size={18} color="white" /><Text style={styles.logoutText}>Logout</Text></>}
      </Pressable>
    </View>

    <FlatList
      data={activeOrders}
      keyExtractor={(item) => item._id}
      renderItem={renderOrder}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.purple]} />}
      ListHeaderComponent={<View style={styles.contentTop}>
        <View style={styles.locationCard}>
          <View style={styles.locationHead}><Text style={styles.locationTitle}>📍 Live Location</Text><Text style={[styles.locationStatus, locationStatus === "error" && { color: colors.danger }, locationStatus === "sharing" && { color: colors.success }]}>● {locationLabel}</Text></View>
          <Pressable onPress={() => pushLocation({ showAlert: true })} style={styles.refreshButton}><Ionicons name="locate-outline" color="white" size={17} /><Text style={styles.buttonText}>Refresh Location</Text></Pressable>
          {locationStatus === "error" ? <Text style={styles.locationError}>{locationError}</Text> : null}
          {lastPushed ? <Text style={styles.lastPushed}>Last pushed: {lastPushed.toLocaleTimeString()}</Text> : null}
        </View>
        <View style={styles.stats}><View style={styles.stat}><Text style={styles.statNum}>{activeOrders.length}</Text><Text style={styles.statLabel}>Active</Text></View><View style={styles.stat}><Text style={[styles.statNum, { color: colors.success }]}>{completedOrders.length}</Text><Text style={styles.statLabel}>Delivered</Text></View><View style={styles.stat}><Text style={styles.statNum}>{orders.length}</Text><Text style={styles.statLabel}>Total</Text></View></View>
        <Text style={styles.sectionTitle}>🚀 Active Orders ({activeOrders.length})</Text>
      </View>}
      ListEmptyComponent={loading ? <StateView loading /> : error ? <StateView icon="cloud-offline-outline" title="Delivery unavailable" message={error} action="Try again" onAction={loadOrders} /> : <StateView icon="bicycle-outline" title="No active orders" message="Assigned orders will appear here." action="Refresh" onAction={loadOrders} />}
      ListFooterComponent={completedOrders.length ? <View style={styles.completedWrap}><Text style={styles.sectionTitle}>✅ Completed ({completedOrders.length})</Text>{completedOrders.slice(0, 5).map((order) => <View key={order._id} style={styles.completedCard}><View><Text style={styles.completedId}>#{shortId(order)}</Text><Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString("en-IN")}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.amount}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text><Text style={styles.completedBadge}>Delivered</Text></View></View>)}</View> : <View style={{ height: 24 }} />}
      contentContainerStyle={styles.listContent}
    />
  </Screen>;
}

const styles = StyleSheet.create({ header: { backgroundColor: colors.purple, paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }, avatar: { width: 46, height: 46, borderRadius: 18, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center" }, name: { color: "white", fontSize: 18, fontWeight: "900" }, vehicle: { color: "rgba(255,255,255,.82)", fontSize: 12, marginTop: 2 }, logout: { minWidth: 92, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,.20)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 12 }, logoutText: { color: "white", fontWeight: "900", fontSize: 12 }, listContent: { paddingBottom: 28 }, contentTop: { padding: 14, gap: 14 }, locationCard: { backgroundColor: colors.white, borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: "#FED7AA", ...shadow }, locationHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, locationTitle: { color: colors.ink, fontWeight: "900" }, locationStatus: { color: colors.muted, fontSize: 12, fontWeight: "900" }, refreshButton: { height: 48, borderRadius: 14, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, locationError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }, lastPushed: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 8 }, stats: { flexDirection: "row", gap: 10 }, stat: { flex: 1, backgroundColor: colors.white, borderRadius: 18, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: colors.border, ...shadow }, statNum: { color: "#F97316", fontSize: 24, fontWeight: "900" }, statLabel: { color: colors.muted, fontSize: 11, marginTop: 3 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 3, marginHorizontal: 14 }, card: { backgroundColor: colors.white, borderRadius: 20, marginHorizontal: 14, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadow }, cardTop: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, orderId: { color: colors.ink, fontWeight: "900", fontSize: 15 }, date: { color: colors.muted, fontSize: 11, marginTop: 3 }, status: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "900", overflow: "hidden" }, customerBox: { padding: 14, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: colors.border }, customer: { color: colors.ink, fontWeight: "800", fontSize: 13 }, address: { color: colors.muted, fontSize: 12, marginTop: 7, lineHeight: 18 }, itemsBox: { padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, miniLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", marginBottom: 6 }, itemText: { color: colors.muted, fontSize: 12, lineHeight: 19 }, amountRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, amount: { color: colors.ink, fontSize: 17, fontWeight: "900" }, payment: { color: colors.muted, fontSize: 11, marginTop: 2 }, quickActions: { flexDirection: "row", alignItems: "center", gap: 8 }, mapButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.purpleSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, mapText: { color: colors.purpleDark, fontSize: 11, fontWeight: "900" }, detailsButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#E0F2FE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 }, detailsText: { color: "#075985", fontSize: 11, fontWeight: "900" }, actions: { padding: 14 }, blueButton: { height: 50, borderRadius: 14, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" }, orangeButton: { height: 50, borderRadius: 14, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center" }, greenButton: { height: 50, borderRadius: 14, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontSize: 14, fontWeight: "900" }, otpBox: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 16, padding: 12, gap: 10 }, otpHelp: { color: "#047857", fontSize: 12, lineHeight: 17, fontWeight: "700" }, otpInput: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: "#86EFAC", backgroundColor: "white", color: colors.ink, textAlign: "center", fontSize: 20, fontWeight: "900", letterSpacing: 8 }, completedWrap: { marginTop: 8 }, completedCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: colors.white, borderRadius: 16, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border }, completedId: { color: colors.ink, fontWeight: "900" }, completedBadge: { color: colors.success, backgroundColor: "#DCFCE7", borderRadius: 10, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: "900", marginTop: 4 } });
