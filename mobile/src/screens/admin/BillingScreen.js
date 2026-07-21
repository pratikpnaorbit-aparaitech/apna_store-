import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, SearchBox, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";
import { useToast } from "../../context/ToastContext";
import QRCode from "react-native-qrcode-svg";

const PAYMENT_MODES = ["CASH", "UPI", "CARD", "WALLET"];
const STORE_UPI_ID = process.env.EXPO_PUBLIC_STORE_UPI_ID || "7410781884@ibl";

export default function BillingScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [phone, setPhone] = useState("");
  const [joinLoyalty, setJoinLoyalty] = useState(false);
  const [customer, setCustomer] = useState({ name: "", email: "" });
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [customerLookup, setCustomerLookup] = useState("idle");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/inventory");
      setProducts(Array.isArray(data) ? data : []);
      setError("");
    } catch (loadError) { setError(messageFromError(loadError, "Products are unavailable for billing.")); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let active = true;
    setExistingCustomer(null);
    setJoinLoyalty(false);
    if (phone.length !== 10) {
      setCustomerLookup("idle");
      return () => { active = false; };
    }
    setCustomerLookup("checking");
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/customers/check", { params: { phone } });
        if (!active) return;
        setExistingCustomer(data.exists ? data.customer : null);
        setCustomerLookup(data.exists ? "found" : "missing");
      } catch {
        if (active) setCustomerLookup("error");
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [phone]);

  const shown = useMemo(() => products.filter((item) => !search || [item.name, item.sku, item.category].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))), [products, search]);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const gst = subtotal * 0.18;
  const estimate = subtotal + gst;
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(STORE_UPI_ID)}&pn=SmartStore&am=${estimate.toFixed(2)}&cu=INR&tn=SmartStore%20Purchase`;

  const add = (product) => {
    if (product.expiryStatus === "EXPIRED") return Alert.alert("Product unavailable", `${product.name} is expired or expires today.`);
    if (Number(product.stock) < 1) return;
    const discountPercent = Number(product.discountPercent || 0);
    const effectivePrice = Number((Number(product.price) * (1 - discountPercent / 100)).toFixed(2));
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => item.id === product.id ? { ...item, qty: Math.min(item.qty + 1, Number(product.stock)) } : item);
      return [...current, { ...product, mrp: Number(product.price), price: effectivePrice, discountPercent, qty: 1 }];
    });
  };
  const change = (id, delta) => setCart((current) => current.map((item) => item.id === id ? { ...item, qty: Math.min(item.qty + delta, Number(item.stock)) } : item).filter((item) => item.qty > 0));

  const createBill = async () => {
    if (saving) return;
    if (!cart.length) return;
    if (!/^\d{10}$/.test(phone)) return Alert.alert("Invalid phone", "Enter the customer's 10-digit phone number.");
    if (joinLoyalty && (!phone || customer.name.trim().length < 2)) return Alert.alert("Customer details required", "Name and phone are required to join loyalty.");
    if (paymentMode === "CASH" && Number(cashReceived) < estimate) return Alert.alert("Cash amount is too low", `Enter at least ₹${estimate.toFixed(2)}.`);
    if (paymentMode !== "CASH" && !paymentConfirmed) return Alert.alert("Confirm payment", `Confirm the ${paymentMode} payment before creating the bill.`);
    setSaving(true);
    try {
      const { data } = await api.post("/billing", {
        paymentMode,
        items: cart.map((item) => ({ productId: item.id, qty: item.qty })),
        phone: phone || undefined,
        joinLoyalty,
        newCustomer: joinLoyalty ? customer : undefined,
        cashReceived: paymentMode === "CASH" ? Number(cashReceived) : undefined,
      });
      setBill(data);
      setCart([]);
      setCheckoutOpen(false);
      setPhone("");
      setCustomer({ name: "", email: "" });
      setCashReceived("");
      setPaymentConfirmed(false);
      showToast({ title: "Bill completed", message: `${data.billNo} • ₹${Number(data.total).toFixed(2)}` });
      await load();
    } catch (billError) { Alert.alert("Billing failed", messageFromError(billError)); }
    finally { setSaving(false); }
  };

  return (
    <Screen>
      <AdminHeader title="POS billing" subtitle={`${cart.reduce((sum, item) => sum + item.qty, 0)} items • ₹${estimate.toFixed(2)}`} roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} right={cart.length ? <Pressable onPress={() => setCheckoutOpen(true)} style={styles.checkoutIcon}><Ionicons name="cart" size={21} color="white" /><Text style={styles.badge}>{cart.length}</Text></Pressable> : null} />
      <SearchBox value={search} onChangeText={setSearch} placeholder="Search product, SKU or category" />
      {bill ? <Pressable onPress={() => setBill(null)} style={styles.success}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><View style={{ flex: 1 }}><Text style={styles.successTitle}>{bill.billNo}</Text><Text style={styles.successSub}>Bill saved • ₹{Number(bill.total).toFixed(2)} • {bill.pointsAdded || 0} points added</Text></View><Ionicons name="close" size={18} color={colors.muted} /></Pressable> : null}
      {loading ? <LoadingBlock label="Loading billable products…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={shown}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<EmptyBlock title="No products found" message="Try another search." />}
          renderItem={({ item }) => {
            const selected = cart.find((product) => product.id === item.id);
            const discount = Number(item.discountPercent || 0);
            const effectivePrice = Number(item.price) * (1 - discount / 100);
            const unavailable = Number(item.stock) < 1 || item.expiryStatus === "EXPIRED";
            return <View style={styles.product}>
              <View style={styles.productIcon}><Ionicons name="cube-outline" size={22} color={colors.purple} /></View>
              <View style={{ flex: 1 }}><Text style={styles.productName}>{item.name}</Text><Text style={styles.productSub}>{item.sku} • {item.stock} {item.unit} available</Text><View style={styles.priceRow}><Text style={styles.price}>₹{effectivePrice.toFixed(2)}</Text>{discount ? <><Text style={styles.mrp}>₹{Number(item.price).toFixed(2)}</Text><Text style={styles.discount}>{discount}% OFF</Text></> : null}</View></View>
              {selected ? <View style={styles.stepper}><Pressable onPress={() => change(item.id, -1)}><Ionicons name="remove" size={18} color="white" /></Pressable><Text style={styles.qty}>{selected.qty}</Text><Pressable onPress={() => change(item.id, 1)}><Ionicons name="add" size={18} color="white" /></Pressable></View> : <Pressable disabled={unavailable} onPress={() => add(item)} style={[styles.add, unavailable && styles.disabled]}><Text style={styles.addText}>{item.expiryStatus === "EXPIRED" ? "EXPIRED" : Number(item.stock) < 1 ? "OUT" : "ADD"}</Text></Pressable>}
            </View>;
          }}
        />
      )}
      {cart.length ? <View style={styles.footer}><View><Text style={styles.footerTotal}>₹{estimate.toFixed(2)}</Text><Text style={styles.footerSub}>ESTIMATED WITH 18% GST</Text></View><Pressable onPress={() => setCheckoutOpen(true)} style={styles.review}><Text style={styles.reviewText}>Review bill</Text><Ionicons name="arrow-forward" size={17} color="white" /></Pressable></View> : null}

      <Modal visible={checkoutOpen} transparent animationType="slide" onRequestClose={() => !saving && setCheckoutOpen(false)}>
        <View style={adminStyles.modalBackdrop}><View style={adminStyles.modalSheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={adminStyles.modalTitle}>Complete POS bill</Text>
            {cart.map((item) => <View key={item.id} style={styles.cartLine}><Text style={styles.cartName}>{item.qty}× {item.name}</Text><Text style={styles.cartAmount}>₹{(item.qty * Number(item.price)).toFixed(2)}</Text></View>)}
            <View style={styles.totalBox}><Text style={styles.totalText}>Estimated total</Text><Text style={styles.totalValue}>₹{estimate.toFixed(2)}</Text></View>
            <Text style={adminStyles.label}>Payment mode</Text>
            <View style={styles.choices}>{PAYMENT_MODES.map((mode) => <Pressable key={mode} onPress={() => { setPaymentMode(mode); setPaymentConfirmed(false); }} style={[styles.choice, paymentMode === mode && styles.choiceOn]}><Text style={[styles.choiceText, paymentMode === mode && styles.choiceTextOn]}>{mode}</Text></Pressable>)}</View>
            <Text style={adminStyles.label}>Customer phone *</Text>
            <TextInput value={phone} onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor="#9AA39D" style={adminStyles.input} />
            {customerLookup === "checking" ? <Text style={styles.lookup}>Checking customer…</Text> : null}
            {existingCustomer ? <View style={styles.customerFound}><Ionicons name="person-circle" size={25} color={colors.success} /><View><Text style={styles.customerName}>{existingCustomer.name}</Text><Text style={styles.customerMeta}>{existingCustomer.loyalty_id} • {existingCustomer.points || 0} points</Text></View></View> : null}
            {customerLookup === "missing" ? <Pressable onPress={() => setJoinLoyalty((value) => !value)} style={styles.loyalty}><Ionicons name={joinLoyalty ? "checkbox" : "square-outline"} size={22} color={colors.purple} /><Text style={styles.loyaltyText}>Enroll as a new loyalty customer</Text></Pressable> : null}
            {joinLoyalty ? <><Text style={adminStyles.label}>Customer name *</Text><TextInput value={customer.name} onChangeText={(name) => setCustomer((old) => ({ ...old, name }))} placeholder="Full name" placeholderTextColor="#9AA39D" style={adminStyles.input} /><Text style={adminStyles.label}>Customer email</Text><TextInput value={customer.email} onChangeText={(email) => setCustomer((old) => ({ ...old, email }))} keyboardType="email-address" autoCapitalize="none" placeholder="Optional email" placeholderTextColor="#9AA39D" style={adminStyles.input} /></> : null}
            {paymentMode === "CASH" ? <><Text style={adminStyles.label}>Cash received *</Text><TextInput value={cashReceived} onChangeText={setCashReceived} keyboardType="decimal-pad" placeholder={`At least ₹${estimate.toFixed(2)}`} placeholderTextColor="#9AA39D" style={adminStyles.input} />{Number(cashReceived) >= estimate ? <Text style={styles.change}>Change: ₹{(Number(cashReceived) - estimate).toFixed(2)}</Text> : null}</> : paymentMode === "UPI" ? <View style={styles.upiBox}><Text style={styles.upiTitle}>Scan QR to pay ₹{estimate.toFixed(2)}</Text><View style={styles.qr}><QRCode value={upiPayUrl} size={160} /></View><Text style={styles.upiId}>{STORE_UPI_ID}</Text><Pressable onPress={() => setPaymentConfirmed((value) => !value)} style={[styles.confirmPayment, paymentConfirmed && styles.confirmed]}><Ionicons name={paymentConfirmed ? "checkmark-circle" : "scan-outline"} size={19} color="white" /><Text style={styles.confirmText}>{paymentConfirmed ? "Payment received" : "Confirm payment"}</Text></Pressable></View> : <Pressable onPress={() => setPaymentConfirmed((value) => !value)} style={styles.loyalty}><Ionicons name={paymentConfirmed ? "checkbox" : "square-outline"} size={22} color={colors.purple} /><Text style={styles.loyaltyText}>I confirm the {paymentMode} payment is complete</Text></Pressable>}
            <View style={adminStyles.modalActions}><Pressable disabled={saving} onPress={() => setCheckoutOpen(false)} style={adminStyles.cancelButton}><Text style={adminStyles.cancelText}>Cancel</Text></Pressable><Pressable disabled={saving} onPress={createBill} style={adminStyles.saveButton}>{saving ? <ActivityIndicator color="white" /> : <Text style={adminStyles.saveText}>Create bill</Text>}</Pressable></View>
          </ScrollView>
        </View></View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkoutIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "rgba(255,255,255,.17)", alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#F59E0B", color: "white", fontSize: 9, fontWeight: "900", textAlign: "center", paddingTop: 2 },
  success: { marginHorizontal: 15, marginTop: 11, borderRadius: 15, padding: 12, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", flexDirection: "row", alignItems: "center", gap: 9 },
  successTitle: { color: "#047857", fontWeight: "900", fontSize: 12 },
  successSub: { color: "#047857", fontSize: 10.5, marginTop: 2 },
  list: { padding: 15, paddingBottom: 115 },
  product: { minHeight: 90, borderRadius: 18, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, marginBottom: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, ...shadow },
  productIcon: { width: 47, height: 47, borderRadius: 16, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  productName: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  productSub: { color: colors.muted, fontSize: 9.5, marginTop: 3 },
  price: { color: colors.purpleDark, fontWeight: "900", fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mrp: { color: colors.muted, fontSize: 9.5, textDecorationLine: "line-through", marginTop: 4 },
  discount: { color: colors.success, fontSize: 8.5, fontWeight: "900", marginTop: 4 },
  add: { minWidth: 55, height: 39, borderRadius: 12, borderWidth: 1.5, borderColor: colors.purple, alignItems: "center", justifyContent: "center" },
  addText: { color: colors.purple, fontSize: 11, fontWeight: "900" },
  stepper: { minWidth: 94, height: 39, borderRadius: 12, backgroundColor: colors.purple, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qty: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.4 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 83, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...shadow },
  footerTotal: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  footerSub: { color: colors.muted, fontSize: 8.5, fontWeight: "800", marginTop: 2 },
  review: { height: 48, borderRadius: 15, backgroundColor: colors.purple, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 7 },
  reviewText: { color: "white", fontWeight: "900" },
  cartLine: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border },
  cartName: { color: colors.ink, fontSize: 11.5, flex: 1 },
  cartAmount: { color: colors.ink, fontWeight: "900", fontSize: 11.5 },
  totalBox: { borderRadius: 15, backgroundColor: colors.purpleSoft, padding: 13, flexDirection: "row", justifyContent: "space-between", marginVertical: 14 },
  totalText: { color: colors.purpleDark, fontWeight: "800" },
  totalValue: { color: colors.purpleDark, fontSize: 17, fontWeight: "900" },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  choice: { borderRadius: 17, backgroundColor: "#F4F7F5", borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 8 },
  choiceOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  choiceText: { color: colors.muted, fontSize: 10.5, fontWeight: "900" },
  choiceTextOn: { color: "white" },
  loyalty: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 13 },
  loyaltyText: { color: colors.ink, fontSize: 11.5, fontWeight: "700", flex: 1 },
  lookup: { color: colors.muted, fontSize: 10.5, marginTop: -8, marginBottom: 12 },
  customerFound: { borderRadius: 14, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", padding: 11, marginTop: -8, marginBottom: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  customerName: { color: "#047857", fontSize: 11.5, fontWeight: "900" },
  customerMeta: { color: "#047857", fontSize: 9.5, marginTop: 2 },
  change: { color: colors.success, fontSize: 11, fontWeight: "900", marginTop: -8, marginBottom: 13 },
  upiBox: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: "#F9FBFA", alignItems: "center", padding: 14, marginBottom: 14 },
  upiTitle: { color: colors.ink, fontSize: 12, fontWeight: "900", marginBottom: 12 },
  qr: { backgroundColor: "white", padding: 9, borderRadius: 10 },
  upiId: { color: colors.muted, fontSize: 10.5, fontWeight: "700", marginTop: 9 },
  confirmPayment: { width: "100%", minHeight: 43, borderRadius: 13, backgroundColor: colors.purple, marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  confirmed: { backgroundColor: colors.success },
  confirmText: { color: "white", fontSize: 11.5, fontWeight: "900", textTransform: "uppercase" },
});
