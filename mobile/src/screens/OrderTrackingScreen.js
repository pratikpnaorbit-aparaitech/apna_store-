import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import Screen from "../components/Screen";
import StateView from "../components/StateView";
import { api, messageFromError } from "../api/client";
import { colors, shadow } from "../theme";

const TRACKABLE_STATUSES = ["Picked Up", "Out for Delivery"];
const FALLBACK_STEPS = [
  ["placed", "Order Placed"],
  ["accepted", "Accepted"],
  ["preparing", "Preparing"],
  ["assigned", "Assigned Delivery Partner"],
  ["pickedUp", "Picked Up"],
  ["outForDelivery", "Out For Delivery"],
  ["delivered", "Delivered"],
];

const formatAddress = (address) => {
  if (!address) return "Address not available";
  if (typeof address === "string") return address;
  return [address.name, address.street, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ") || "Address not available";
};

const buildFallbackTimeline = (order) => {
  const rank = {
    Placed: 0,
    Confirmed: 1,
    Preparing: 2,
    "Picked Up": 4,
    "Out for Delivery": 5,
    Delivered: 6,
  }[order?.status] ?? 0;
  return FALLBACK_STEPS.map(([key, label], index) => ({
    key,
    label,
    completed: order?.status !== "Cancelled" && (index <= rank || (key === "assigned" && Boolean(order?.deliveryPartnerId))),
    current: order?.status !== "Cancelled" && index === rank,
  }));
};

const validCoordinate = (value) => Number.isFinite(Number(value));

function createMapHtml(partnerLocation, customerLocation) {
  const partnerLat = Number(partnerLocation.latitude);
  const partnerLng = Number(partnerLocation.longitude);
  const hasCustomer = validCoordinate(customerLocation?.latitude) && validCoordinate(customerLocation?.longitude);
  const customerLat = hasCustomer ? Number(customerLocation.latitude) : partnerLat;
  const customerLng = hasCustomer ? Number(customerLocation.longitude) : partnerLng;
  return `<!doctype html>
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0} .pin{width:34px;height:34px;border-radius:17px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:18px}.partner{background:#18A957}.customer{background:#2563EB}</style>
  </head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  const map=L.map('map',{zoomControl:true,attributionControl:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const delivery=[${partnerLat},${partnerLng}];
  const deliveryIcon=L.divIcon({className:'',html:'<div class="pin partner">🛵</div>',iconSize:[34,34],iconAnchor:[17,17]});
  L.marker(delivery,{icon:deliveryIcon}).addTo(map).bindPopup('Delivery partner');
  ${hasCustomer ? `const customer=[${customerLat},${customerLng}];const customerIcon=L.divIcon({className:'',html:'<div class="pin customer">⌂</div>',iconSize:[34,34],iconAnchor:[17,17]});L.marker(customer,{icon:customerIcon}).addTo(map).bindPopup('Delivery address');L.polyline([delivery,customer],{color:'#18A957',weight:4,dashArray:'8 8'}).addTo(map);map.fitBounds([delivery,customer],{padding:[42,42],maxZoom:16});` : "map.setView(delivery,16);"}
  </script></body></html>`;
}

export default function OrderTrackingScreen({ route, navigation }) {
  const orderId = route.params?.orderId || route.params?.order?._id;
  const [order, setOrder] = useState(route.params?.order || null);
  const [timeline, setTimeline] = useState([]);
  const [location, setLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(route.params?.order?.customerLocation || null);
  const [locationVisible, setLocationVisible] = useState(false);
  const [loading, setLoading] = useState(!route.params?.order);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async ({ initial = false } = {}) => {
      if (!orderId) return;
      try {
        if (initial) setLoading(true);
        const { data } = await api.get(`/orders/${orderId}/tracking`);
        if (!active) return;
        const nextOrder = data?.order;
        setOrder(nextOrder);
        setTimeline(Array.isArray(data?.timeline) ? data.timeline : buildFallbackTimeline(nextOrder));
        setCustomerLocation(nextOrder?.customerLocation || null);
        const canShowLocation = Boolean(data?.locationVisible) && TRACKABLE_STATUSES.includes(nextOrder?.status);
        setLocationVisible(canShowLocation);
        if (canShowLocation) {
          const locationResponse = await api.get(`/orders/${orderId}/location`);
          if (!active) return;
          setLocation(locationResponse.data?.visible ? locationResponse.data.location : null);
          setCustomerLocation(locationResponse.data?.customerLocation || nextOrder?.customerLocation || null);
        } else {
          setLocation(null);
        }
        setError("");
      } catch (requestError) {
        if (active && (!order || initial)) setError(messageFromError(requestError, "Unable to load order tracking."));
      } finally {
        if (active) setLoading(false);
      }
    };
    load({ initial: true });
    const timer = setInterval(() => load(), 12000);
    return () => { active = false; clearInterval(timer); };
  }, [orderId]);

  const steps = timeline.length ? timeline : buildFallbackTimeline(order);
  const partner = order?.deliveryPartnerId;
  const mapHtml = useMemo(
    () => (location && validCoordinate(location.latitude) && validCoordinate(location.longitude)
      ? createMapHtml(location, customerLocation)
      : ""),
    [customerLocation, location],
  );

  if (loading && !order) return <Screen><StateView loading /></Screen>;
  if (error && !order) return <Screen><StateView icon="cloud-offline-outline" title="Tracking unavailable" message={error} /></Screen>;
  if (!order) return <Screen><StateView icon="receipt-outline" title="Order not found" message="This order is no longer available." /></Screen>;

  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerSubtitle}>ORDER #{String(order._id).slice(-6).toUpperCase()}</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {order.status === "Cancelled" ? <View style={styles.cancelled}><Ionicons name="close-circle" size={22} color={colors.danger} /><View style={{ flex: 1 }}><Text style={styles.cancelledTitle}>Order cancelled</Text><Text style={styles.cancelledText}>{order.cancellationReason || "This order was cancelled."}</Text></View></View> : null}

        <View style={styles.card}>
          <View style={styles.cardHeading}><Text style={styles.sectionTitle}>Order details</Text><Text style={styles.amount}>₹{Number(order.totalAmount || 0).toFixed(2)}</Text></View>
          {(order.items || []).map((item, index) => <View key={`${item.productId || item.name}-${index}`} style={styles.itemRow}><Text numberOfLines={2} style={styles.itemName}>{item.name}</Text><Text style={styles.itemQty}>× {item.quantity} {item.unit || "piece"}</Text></View>)}
          <View style={styles.divider} />
          <DetailRow icon="location-outline" label="Delivery address" value={formatAddress(order.address)} />
          <DetailRow icon="card-outline" label="Payment method" value={`${order.paymentMethod || "COD"} • ${order.paymentStatus || "pending"}`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order status</Text>
          <Text style={styles.currentStatus}>{order.status}</Text>
          <View style={styles.timeline}>
            {steps.map((step, index) => <View key={step.key} style={styles.stepRow}>
              <View style={styles.stepRail}>
                <View style={[styles.stepCircle, step.completed && styles.stepCircleDone, step.current && styles.stepCircleCurrent]}>
                  {step.completed ? <Ionicons name="checkmark" size={14} color="white" /> : <View style={styles.stepInner} />}
                </View>
                {index < steps.length - 1 ? <View style={[styles.stepLine, step.completed && steps[index + 1]?.completed && styles.stepLineDone]} /> : null}
              </View>
              <Text style={[styles.stepLabel, step.completed && styles.stepLabelDone, step.current && styles.stepLabelCurrent]}>{step.label}</Text>
            </View>)}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery partner</Text>
          {!partner ? <View style={styles.searching}><ActivityIndicator size="small" color={colors.purple} /><Text style={styles.searchingText}>Searching for delivery partner...</Text></View> : <View style={styles.partnerRow}>
            <View style={styles.partnerAvatar}><Ionicons name="bicycle-outline" size={24} color={colors.purpleDark} /></View>
            <View style={{ flex: 1 }}><Text style={styles.partnerName}>{partner.name}</Text><Text style={styles.partnerVehicle}>{[partner.vehicleType, partner.vehicleNumber].filter(Boolean).join(" • ") || "Vehicle details unavailable"}</Text></View>
            {partner.phone ? <Pressable onPress={() => Linking.openURL(`tel:${partner.phone}`)} style={styles.callButton} accessibilityRole="button" accessibilityLabel="Call delivery partner"><Ionicons name="call" size={18} color="white" /></Pressable> : null}
          </View>}
        </View>

        {locationVisible ? <View style={styles.card}>
          <View style={styles.cardHeading}><Text style={styles.sectionTitle}>Live delivery location</Text>{location?.updatedAt ? <Text style={styles.updated}>Updated {new Date(location.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text> : null}</View>
          {mapHtml ? <View style={styles.mapWrap}><WebView key={`${location.latitude}-${location.longitude}`} originWhitelist={["*"]} source={{ html: mapHtml }} style={styles.map} javaScriptEnabled domStorageEnabled /></View> : <View style={styles.waitingLocation}><ActivityIndicator color={colors.purple} /><Text style={styles.searchingText}>Waiting for delivery partner GPS...</Text></View>}
        </View> : null}
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ icon, label, value }) {
  return <View style={styles.detailRow}><View style={styles.detailIcon}><Ionicons name={icon} size={18} color={colors.purpleDark} /></View><View style={{ flex: 1 }}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  header: { height: 70, backgroundColor: "white", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  headerSubtitle: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 3 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.purpleSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: { color: colors.purpleDark, fontSize: 9, fontWeight: "900" },
  content: { padding: 14, paddingBottom: 34 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 15, marginBottom: 13, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  amount: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingTop: 11 },
  itemName: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: "700" },
  itemQty: { color: colors.muted, fontSize: 11 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  detailRow: { flexDirection: "row", gap: 10, marginBottom: 13 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  detailValue: { color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: "700", marginTop: 2, textTransform: "capitalize" },
  currentStatus: { alignSelf: "flex-start", backgroundColor: colors.purpleSoft, color: colors.purpleDark, borderRadius: 12, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 6, fontSize: 10, fontWeight: "900", marginTop: 9 },
  timeline: { marginTop: 16 },
  stepRow: { minHeight: 48, flexDirection: "row" },
  stepRail: { width: 28, alignItems: "center" },
  stepCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: "white", borderWidth: 2, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", zIndex: 2 },
  stepCircleDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepCircleCurrent: { borderWidth: 3 },
  stepInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CBD5E1" },
  stepLine: { position: "absolute", top: 21, bottom: -1, width: 2, backgroundColor: "#E2E8F0" },
  stepLineDone: { backgroundColor: colors.success },
  stepLabel: { color: colors.muted, fontSize: 12, paddingTop: 3, marginLeft: 7 },
  stepLabelDone: { color: colors.ink, fontWeight: "700" },
  stepLabelCurrent: { color: colors.purpleDark, fontWeight: "900" },
  searching: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, backgroundColor: colors.purpleSoft, borderRadius: 13, padding: 13 },
  searchingText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 13 },
  partnerAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.purpleSoft },
  partnerName: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  partnerVehicle: { color: colors.muted, fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  callButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  updated: { color: colors.muted, fontSize: 9 },
  mapWrap: { height: 280, borderRadius: 15, overflow: "hidden", marginTop: 13, borderWidth: 1, borderColor: colors.border },
  map: { flex: 1, backgroundColor: "#E8F1EB" },
  waitingLocation: { height: 150, borderRadius: 15, backgroundColor: colors.purpleSoft, marginTop: 13, alignItems: "center", justifyContent: "center", gap: 10 },
  cancelled: { flexDirection: "row", gap: 10, backgroundColor: "#FFF1F2", borderWidth: 1, borderColor: "#FECDD3", borderRadius: 16, padding: 13, marginBottom: 13 },
  cancelledTitle: { color: colors.danger, fontWeight: "900" },
  cancelledText: { color: "#9F1239", fontSize: 11, lineHeight: 17, marginTop: 3 },
});
