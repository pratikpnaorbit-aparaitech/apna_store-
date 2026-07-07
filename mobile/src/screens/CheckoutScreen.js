import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import Screen from "../components/Screen";
import PrimaryButton from "../components/PrimaryButton";
import { api, messageFromError } from "../api/client";
import { useAddress } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors, shadow } from "../theme";

export default function CheckoutScreen({ route, navigation }) {
  const { user } = useAuth();
  const { selectedAddress } = useAddress();
  const { items, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const couponCode = route.params?.couponCode || "";
  const delivery = 40;
  const taxes = Number((subtotal * .05).toFixed(2));
  const discount = couponCode === "TRY50" && subtotal >= 99 ? Number(Math.min(subtotal * .5, 150).toFixed(2)) : 0;
  const total = subtotal + delivery + taxes - discount;

  const payload = () => ({
    items: items.map((item) => ({ productId: item._id, name: item.name, quantity: item.quantity })),
    storeId: items[0]?.storeId?._id || items[0]?.storeId,
    couponCode,
    address: { name: user?.name || "Customer", phone: user?.mobile || "", street: selectedAddress.address, city: selectedAddress.city || "", state: selectedAddress.state || "", pincode: selectedAddress.pincode || "" },
    customerLocation: selectedAddress.latitude ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude } : undefined,
  });

  const finish = (order) => { clear(); navigation.replace("OrderSuccess", { order }); };

  const payOnline = async () => {
    if (Platform.OS === "web") return Alert.alert("Mobile payment", "Razorpay UPI checkout is available in the Android/iOS app.");
    let appOrderId;
    try {
      const { data } = await api.post("/orders/payment/create", payload());
      appOrderId = data.orderId;
      const payment = await RazorpayCheckout.open({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || "INR",
        order_id: data.razorpayOrderId,
        name: "Smart Store",
        description: `Grocery order • ₹${total.toFixed(2)}`,
        prefill: { name: user?.name || "", email: user?.email || "", contact: user?.mobile || "" },
        theme: { color: colors.purple },
        method: { upi: true, card: true, netbanking: true, wallet: true },
      });
      const verified = await api.post("/orders/payment/verify", { orderId: appOrderId, ...payment });
      finish(verified.data.order);
    } catch (error) {
      if (appOrderId) await api.post(`/orders/payment/${appOrderId}/failure`, { state: "cancelled", reason: error.description || error.message || "Payment cancelled" }).catch(() => {});
      Alert.alert("Payment not completed", error.description || messageFromError(error, "You were not charged. Please try again or choose COD."));
    }
  };

  const place = async () => {
    if (!selectedAddress) return navigation.navigate("Location");
    if (!items.length) return Alert.alert("Cart is empty", "Add products before checkout.");
    setLoading(true);
    try {
      if (paymentMethod === "Razorpay") await payOnline();
      else { const { data } = await api.post("/orders/place", payload()); finish(data.order); }
    } catch (error) { Alert.alert("Couldn’t place order", messageFromError(error)); }
    finally { setLoading(false); }
  };

  return <Screen>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><Text style={styles.title}>Checkout</Text><View style={styles.safe}><Ionicons name="shield-checkmark" size={14} color={colors.success} /><Text style={styles.safeText}>100% secure</Text></View></View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Delivery address</Text><Pressable onPress={() => navigation.navigate("Location")} style={styles.card}><View style={styles.icon}><Ionicons name="location" size={21} color={colors.purple} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{selectedAddress?.label || "Choose address"}</Text><Text style={styles.cardSub}>{selectedAddress ? `${selectedAddress.address}, ${selectedAddress.city || ""}` : "Add a delivery address"}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></Pressable>
      <Text style={styles.sectionTitle}>Payment method</Text>
      <PaymentOption active={paymentMethod === "Razorpay"} icon="phone-portrait-outline" title="UPI / Cards / Wallets" sub="Pay securely with Razorpay" badge="RECOMMENDED" onPress={() => setPaymentMethod("Razorpay")} />
      <PaymentOption active={paymentMethod === "COD"} icon="cash-outline" title="Cash on delivery" sub="Pay cash or UPI when it arrives" onPress={() => setPaymentMethod("COD")} />
      <View style={styles.paymentNote}><Ionicons name="lock-closed" size={14} color={colors.success} /><Text style={styles.paymentNoteText}>Your payment details are encrypted and never stored by Smart Store.</Text></View>
      <Text style={styles.sectionTitle}>Payment summary</Text><View style={styles.summary}>{[["Item total", subtotal], ["Delivery", delivery], ["Taxes & handling", taxes], ...(discount ? [["Coupon discount", -discount]] : [])].map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, value < 0 && { color: colors.success }]}>{value < 0 ? `-₹${Math.abs(value).toFixed(2)}` : `₹${Number(value).toFixed(2)}`}</Text></View>)}<View style={styles.divider} /><View style={styles.row}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>₹{total.toFixed(2)}</Text></View></View>
    </ScrollView>
    <View style={styles.footer}><View><Text style={styles.pay}>₹{total.toFixed(2)}</Text><Text style={styles.paySub}>{paymentMethod === "Razorpay" ? "PAY SECURELY ONLINE" : "PAY ON DELIVERY"}</Text></View><PrimaryButton title={paymentMethod === "Razorpay" ? "Pay with Razorpay" : "Place COD order"} loading={loading} onPress={place} style={{ width: 195 }} /></View>
  </Screen>;
}

function PaymentOption({ active, icon, title, sub, badge, onPress }) { return <Pressable onPress={onPress} style={[styles.card, styles.paymentCard, active && styles.activeCard]}><View style={styles.icon}><Ionicons name={icon} size={22} color={colors.purple} /></View><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Text style={styles.cardTitle}>{title}</Text>{badge ? <Text style={styles.badge}>{badge}</Text> : null}</View><Text style={styles.cardSub}>{sub}</Text></View><Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={24} color={active ? colors.success : colors.border} /></Pressable>; }

const styles = StyleSheet.create({ header:{height:62,paddingHorizontal:18,backgroundColor:"white",flexDirection:"row",alignItems:"center",gap:16,borderBottomWidth:1,borderBottomColor:colors.border},title:{color:colors.ink,fontSize:20,fontWeight:"900",flex:1},safe:{flexDirection:"row",alignItems:"center",gap:4},safeText:{color:colors.success,fontSize:10,fontWeight:"800"},content:{padding:15,paddingBottom:30},sectionTitle:{color:colors.ink,fontSize:15,fontWeight:"900",marginTop:17,marginBottom:10},card:{backgroundColor:"white",borderRadius:17,borderWidth:1,borderColor:colors.border,padding:14,flexDirection:"row",alignItems:"center",gap:12},paymentCard:{marginBottom:10},activeCard:{borderColor:colors.purple,borderWidth:2,backgroundColor:colors.purpleSoft},icon:{width:42,height:42,borderRadius:14,backgroundColor:colors.purpleSoft,alignItems:"center",justifyContent:"center"},cardTitle:{color:colors.ink,fontWeight:"900",fontSize:13},cardSub:{color:colors.muted,fontSize:11,lineHeight:16,marginTop:3},badge:{fontSize:8,fontWeight:"900",color:colors.success,backgroundColor:"#DCFCE7",paddingHorizontal:6,paddingVertical:3,borderRadius:6},paymentNote:{flexDirection:"row",gap:8,alignItems:"center",paddingHorizontal:5,marginTop:4},paymentNoteText:{flex:1,color:colors.muted,fontSize:10,lineHeight:15},summary:{backgroundColor:"white",borderRadius:18,padding:16,...shadow},row:{flexDirection:"row",justifyContent:"space-between",marginVertical:7},label:{color:colors.muted,fontSize:12},value:{color:colors.ink,fontWeight:"700",fontSize:12},divider:{height:1,backgroundColor:colors.border,marginVertical:7},totalLabel:{color:colors.ink,fontWeight:"900",fontSize:15},totalValue:{color:colors.ink,fontWeight:"900",fontSize:16},footer:{backgroundColor:"white",borderTopWidth:1,borderTopColor:colors.border,padding:13,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},pay:{fontSize:17,fontWeight:"900",color:colors.ink},paySub:{color:colors.muted,fontSize:9,marginTop:2} });
