import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, shadow } from "../theme";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";

export default function ProductCard({ product, onPress, compact = false }) {
  const { add, items, change } = useCart();
  const { showToast } = useToast();
  const cartItem = items.find((item) => item._id === product._id);
  const price = Number(product.discount_price ?? product.price);
  const addProduct = (event) => {
    event?.stopPropagation?.();
    if (Number(product.stock) < 1) return Alert.alert("Out of stock", `${product.name} is currently unavailable.`);
    const result = add(product);
    if (!result.ok) {
      showToast({ title: "Couldn’t add item", message: result.message, type: "error" });
      return;
    }
    showToast({ title: "Added to cart", message: product.name });
  };
  return (
    <Pressable onPress={onPress} style={[styles.card, compact && styles.compact]}>
      <View style={styles.imageBox}>{product.image_url ? <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="contain" /> : <Ionicons name="basket-outline" size={40} color="#76B98F" />}{product.discount_price ? <Text style={styles.discount}>{Math.max(1, Math.round((1 - product.discount_price / product.price) * 100))}% OFF</Text> : null}</View>
      <View style={styles.content}><Text numberOfLines={2} style={styles.name}>{product.name}</Text><Text style={styles.weight}>{product.category || "Fresh product"}</Text><View style={styles.row}><View><Text style={styles.price}>₹{price}</Text>{product.discount_price ? <Text style={styles.old}>₹{product.price}</Text> : null}</View>{cartItem ? <View style={styles.stepper}><Pressable onPress={(event) => { event.stopPropagation?.(); change(product._id, -1); }}><Ionicons name="remove" size={17} color="white" /></Pressable><Text style={styles.qty}>{cartItem.quantity}</Text><Pressable onPress={(event) => { event.stopPropagation?.(); if (cartItem.quantity < Number(product.stock)) { change(product._id, 1); showToast({ title: "Added to cart", message: `${product.name} • Qty ${cartItem.quantity + 1}` }); } else Alert.alert("Stock limit", `Only ${product.stock} available.`); }}><Ionicons name="add" size={17} color="white" /></Pressable></View> : <Pressable onPress={addProduct} style={styles.add}><Text style={styles.addText}>{Number(product.stock) < 1 ? "SOLD" : "ADD"}</Text></Pressable>}</View></View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ card: { width: 164, borderRadius: 18, backgroundColor: "white", overflow: "hidden", borderWidth: 1, borderColor: colors.border, ...shadow }, compact: { width: "48.5%" }, imageBox: { height: 132, backgroundColor: "#FAF8FD", alignItems: "center", justifyContent: "center", position: "relative" }, image: { width: "86%", height: "86%" }, discount: { position: "absolute", top: 8, left: 8, backgroundColor: colors.purple, color: "white", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4, fontSize: 9, fontWeight: "900" }, content: { padding: 11 }, name: { minHeight: 37, color: colors.ink, fontSize: 13, fontWeight: "800", lineHeight: 18 }, weight: { color: colors.muted, fontSize: 11, marginTop: 4 }, row: { minHeight: 38, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 9 }, price: { fontSize: 15, color: colors.ink, fontWeight: "900" }, old: { color: "#9E98A5", textDecorationLine: "line-through", fontSize: 10 }, add: { minWidth: 58, height: 32, borderRadius: 10, borderWidth: 1.5, borderColor: colors.pink, alignItems: "center", justifyContent: "center" }, addText: { color: colors.pink, fontSize: 12, fontWeight: "900" }, stepper: { height: 32, borderRadius: 10, backgroundColor: colors.pink, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 8 }, qty: { color: "white", fontWeight: "900", fontSize: 12 } });
