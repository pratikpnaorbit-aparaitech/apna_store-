import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../components/Screen";
import StateView from "../components/StateView";
import { api, messageFromError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, shadow } from "../theme";

const statusColors = { Delivered:["#DCFCE7","#15803D"],Cancelled:["#FEE2E2","#B91C1C"],"Out for Delivery":["#E8F8EF","#08783A"],Preparing:["#FEF3C7","#B45309"],Confirmed:["#DBEAFE","#1D4ED8"],Placed:["#EAF9F0","#128744"] };
const cancelReasons = ["Ordered by mistake / address issue", "Delivery is taking too long"];

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState("");
  const load = useCallback(async () => { try { const { data } = await api.get(`/orders/user/${user.id}`); setOrders(data); setError(""); } catch (e) { setError(messageFromError(e)); } finally { setLoading(false); } }, [user.id]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);

  const performCancel = async (order, reason) => {
    try { setCancelling(order._id); const { data } = await api.put(`/orders/${order._id}/cancel`, { reason }); setOrders(current => current.map(item => item._id === order._id ? data.order : item)); Alert.alert("Order cancelled", "The store and admin have been notified."); }
    catch (e) { Alert.alert("Couldn’t cancel order", messageFromError(e)); }
    finally { setCancelling(""); }
  };
  const askCancelReason = (order) => Alert.alert("Why are you cancelling?", "The reason will be shared with the store.", [
    { text: "Keep order", style: "cancel" },
    ...cancelReasons.map(reason => ({ text: reason, onPress: () => performCancel(order, reason) })),
  ]);

  return <Screen>
    <View style={styles.header}><Pressable onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable><Text style={styles.title}>My orders</Text></View>
    {loading ? <StateView loading /> : error ? <StateView icon="cloud-offline-outline" title="Orders unavailable" message={error} action="Try again" onAction={load} /> : !orders.length ? <StateView icon="receipt-outline" title="No orders yet" message="Your orders will appear here after checkout." action="Start shopping" onAction={() => navigation.navigate("Main", { screen: "HomeTab" })} /> :
      <ScrollView contentContainerStyle={styles.content}>{orders.map(order => { const palette = statusColors[order.status] || statusColors.Placed; const canCancel = ["Placed","Confirmed"].includes(order.status) && !(order.paymentMethod === "Razorpay" && order.paymentStatus === "paid"); return <View key={order._id} style={styles.card}>
        <View style={styles.top}><View><Text style={styles.orderId}>ORDER #{String(order._id).slice(-6).toUpperCase()}</Text><Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString()}</Text></View><Text style={[styles.status,{backgroundColor:palette[0],color:palette[1]}]}>{order.status}</Text></View>
        <View style={styles.items}>{order.items?.slice(0,3).map(item => <Text key={item.productId} numberOfLines={1} style={styles.item}>• {item.name} × {item.quantity} {item.unit || "piece"}</Text>)}</View>
        {order.cancellationReason ? <View style={styles.reason}><Text style={styles.reasonTitle}>Cancellation reason</Text><Text style={styles.reasonText}>{order.cancellationReason}</Text></View> : null}
        <View style={styles.bottom}><View><Text style={styles.total}>₹{Number(order.totalAmount).toFixed(2)}</Text><Text style={styles.payment}>{order.paymentMethod} • {order.paymentStatus}</Text></View>{canCancel ? <Pressable disabled={cancelling === order._id} onPress={() => askCancelReason(order)} style={styles.cancel}><Text style={styles.cancelText}>{cancelling === order._id ? "Cancelling…" : "Cancel order"}</Text></Pressable> : null}</View>
      </View>; })}</ScrollView>}
  </Screen>;
}

const styles = StyleSheet.create({header:{height:62,backgroundColor:"white",paddingHorizontal:18,flexDirection:"row",alignItems:"center",gap:15,borderBottomWidth:1,borderBottomColor:colors.border},title:{color:colors.ink,fontSize:20,fontWeight:"900"},content:{padding:14,paddingBottom:30},card:{backgroundColor:"white",borderRadius:18,padding:15,marginBottom:12,borderWidth:1,borderColor:colors.border,...shadow},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},orderId:{color:colors.ink,fontWeight:"900",fontSize:12},date:{color:colors.muted,fontSize:10,marginTop:4},status:{borderRadius:20,paddingHorizontal:9,paddingVertical:6,fontSize:9,fontWeight:"900"},items:{marginVertical:13,paddingVertical:10,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border},item:{color:colors.muted,fontSize:11,lineHeight:19},reason:{backgroundColor:"#FEF2F2",borderRadius:12,padding:10,marginBottom:12},reasonTitle:{fontSize:9,fontWeight:"900",color:colors.danger,textTransform:"uppercase"},reasonText:{fontSize:11,color:"#991B1B",marginTop:3},bottom:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},total:{color:colors.ink,fontSize:16,fontWeight:"900"},payment:{color:colors.muted,fontSize:10,marginTop:2},cancel:{borderWidth:1,borderColor:"#FECACA",borderRadius:10,paddingHorizontal:12,paddingVertical:8},cancelText:{color:colors.danger,fontSize:11,fontWeight:"900"}});
