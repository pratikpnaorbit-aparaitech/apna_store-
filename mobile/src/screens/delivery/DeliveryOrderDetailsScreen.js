import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { api, messageFromError } from "../../api/client";
import { colors, shadow } from "../../theme";

const formatAddress = (address) => {
  if (!address) return "Address not available";
  if (typeof address === "string") return address;
  return [address.street, address.city, address.state, address.pincode].filter(Boolean).join(", ") || "Address not available";
};
const shortId = (order) => String(order?._id || "").slice(-6).toUpperCase();
const getPhone = (order) => order?.address?.phone || order?.userId?.mobile || "";
const canUseOtp = (order) => order?.status === "Out for Delivery";

export default function DeliveryOrderDetailsScreen({ route, navigation }) {
  const [order, setOrder] = useState(route.params?.order || null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState("");

  if (!order) return <Screen><View style={styles.center}><Text style={styles.title}>Order not found</Text></View></Screen>;

  const openMaps = () => {
    const q = order?.customerLocation?.latitude && order?.customerLocation?.longitude
      ? `${order.customerLocation.latitude},${order.customerLocation.longitude}`
      : encodeURIComponent(formatAddress(order.address));
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${q}`).catch(() => Alert.alert("Unable to open maps"));
  };

  const requestDeliveryOtp = async () => {
    try {
      setOtpLoading("request");
      const { data } = await api.post(`/orders/${order._id}/delivery-otp/request`);
      setOtp("");
      setOtpRequested(true);
      Alert.alert("OTP sent", data?.message || "OTP sent to customer email.");
    } catch (e) {
      Alert.alert("OTP not sent", messageFromError(e, "Failed to send delivery OTP."));
    } finally {
      setOtpLoading("");
    }
  };

  const verifyDeliveryOtp = async () => {
    const cleanOtp = String(otp || "").trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP from customer.");
      return;
    }
    try {
      setOtpLoading("verify");
      const { data } = await api.post(`/orders/${order._id}/delivery-otp/verify`, { otp: cleanOtp });
      const updatedOrder = data?.order || { ...order, status: "Delivered" };
      setOrder(updatedOrder);
      setOtp("");
      setOtpRequested(false);
      Alert.alert("Delivery completed", data?.message || "Delivered successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("OTP verification failed", messageFromError(e, "Invalid or expired OTP."));
    } finally {
      setOtpLoading("");
    }
  };

  const phone = getPhone(order);

  return <Screen>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()} hitSlop={12}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><Text style={styles.headerTitle}>Order #{shortId(order)}</Text></View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.rowBetween}><Text style={styles.title}>Delivery Status</Text><Text style={styles.status}>{order.status}</Text></View>
          <Text style={styles.muted}>Placed: {new Date(order.createdAt).toLocaleString("en-IN")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Customer</Text>
          <Text style={styles.value}>{order.userId?.name || order.address?.name || "Customer"}</Text>
          {phone ? <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.contactRow}><Ionicons name="call-outline" size={17} color={colors.purpleDark} /><Text style={styles.contactText}>{phone}</Text></Pressable> : null}
          {order.userId?.email ? <Text style={styles.muted}>{order.userId.email}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Delivery Address</Text>
          <Text style={styles.address}>{formatAddress(order.address)}</Text>
          <Pressable onPress={openMaps} style={styles.directionButton}><Ionicons name="navigate-outline" color="white" size={17} /><Text style={styles.directionText}>Open Directions</Text></Pressable>
        </View>

        {canUseOtp(order) ? <View style={styles.otpCard}>
          <Text style={styles.title}>Delivery OTP Verification</Text>
          <Text style={styles.otpHelp}>Send OTP to the customer email, collect the 6-digit code after handover, then verify to complete delivery.</Text>
          <Pressable disabled={!!otpLoading} onPress={requestDeliveryOtp} style={[styles.otpSendButton, !!otpLoading && styles.disabledButton]}>
            {otpLoading === "request" ? <ActivityIndicator color="white" /> : <Text style={styles.directionText}>{otpRequested ? "Resend OTP to Customer" : "Send OTP to Customer"}</Text>}
          </Pressable>
          {otpRequested ? <View style={styles.otpBox}>
            <TextInput
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter OTP"
              placeholderTextColor="#9CA3AF"
              style={styles.otpInput}
              editable={otpLoading !== "verify"}
              autoFocus
              selectTextOnFocus
            />
            <Pressable disabled={otpLoading === "verify"} onPress={verifyDeliveryOtp} style={[styles.verifyButton, otpLoading === "verify" && styles.disabledButton]}>
              {otpLoading === "verify" ? <ActivityIndicator color="white" /> : <Text style={styles.directionText}>Verify OTP & Complete Delivery</Text>}
            </Pressable>
          </View> : null}
        </View> : order.status === "Delivered" ? <View style={styles.completedCard}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><Text style={styles.completedText}>Delivery completed successfully.</Text></View> : null}

        <View style={styles.card}>
          <Text style={styles.title}>Items</Text>
          {order.items?.map((item, index) => <View key={`${item.productId || item.name}-${index}`} style={styles.itemRow}><View style={{ flex: 1 }}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.muted}>Qty: {item.quantity} {item.unit || "piece"}</Text></View><Text style={styles.itemPrice}>₹{Number(item.price || 0).toFixed(2)}</Text></View>)}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Amount</Text>
          <View style={styles.amountLine}><Text style={styles.muted}>Items total</Text><Text style={styles.value}>₹{Number(order.itemsTotal || 0).toFixed(2)}</Text></View>
          <View style={styles.amountLine}><Text style={styles.muted}>Delivery</Text><Text style={styles.value}>₹{Number(order.deliveryCharge || 0).toFixed(2)}</Text></View>
          <View style={styles.amountLine}><Text style={styles.muted}>GST</Text><Text style={styles.value}>₹{Number(order.gst || 0).toFixed(2)}</Text></View>
          {order.discount ? <View style={styles.amountLine}><Text style={styles.muted}>Discount</Text><Text style={[styles.value, { color: colors.success }]}>-₹{Number(order.discount).toFixed(2)}</Text></View> : null}
          <View style={[styles.amountLine, styles.totalLine]}><Text style={styles.totalLabel}>Grand total</Text><Text style={styles.total}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text></View>
          <Text style={styles.payment}>{order.paymentMethod || "COD"} • {order.paymentStatus || "pending"}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Screen>;
}

const styles = StyleSheet.create({ header: { height: 62, backgroundColor: colors.white, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, headerTitle: { color: colors.ink, fontSize: 20, fontWeight: "900" }, content: { padding: 14, paddingBottom: 34 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, card: { backgroundColor: colors.white, borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow }, rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { color: colors.ink, fontSize: 15, fontWeight: "900", marginBottom: 8 }, value: { color: colors.ink, fontWeight: "800" }, muted: { color: colors.muted, fontSize: 12, lineHeight: 18 }, status: { backgroundColor: colors.purpleSoft, color: colors.purpleDark, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, overflow: "hidden", fontSize: 11, fontWeight: "900" }, contactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, backgroundColor: colors.purpleSoft, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 }, contactText: { color: colors.purpleDark, fontWeight: "900" }, address: { color: colors.muted, lineHeight: 20, marginBottom: 12 }, directionButton: { height: 48, borderRadius: 14, backgroundColor: colors.purple, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, directionText: { color: "white", fontWeight: "900", textAlign: "center" }, itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, itemName: { color: colors.ink, fontWeight: "800", marginBottom: 2 }, itemPrice: { color: colors.ink, fontWeight: "900" }, amountLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }, totalLine: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 7, paddingTop: 12 }, totalLabel: { color: colors.ink, fontWeight: "900" }, total: { color: colors.ink, fontSize: 18, fontWeight: "900" }, payment: { color: colors.muted, marginTop: 6, fontSize: 12 }, otpCard: { backgroundColor: "#ECFDF5", borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#BBF7D0", ...shadow }, otpHelp: { color: "#047857", fontSize: 12, lineHeight: 18, marginBottom: 12, fontWeight: "700" }, otpSendButton: { height: 50, borderRadius: 14, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center" }, otpBox: { gap: 10, marginTop: 12 }, otpInput: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#86EFAC", backgroundColor: "white", color: colors.ink, textAlign: "center", fontSize: 22, fontWeight: "900", letterSpacing: 8 }, verifyButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.success, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, disabledButton: { opacity: 0.7 }, completedCard: { backgroundColor: "#ECFDF5", borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#BBF7D0", flexDirection: "row", alignItems: "center", gap: 8 }, completedText: { color: colors.success, fontWeight: "900", flex: 1 } });
