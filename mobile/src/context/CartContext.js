import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const KEY = "smartstore_cart_v1";

export function CartProvider({ children }) {
  const { user, loading: authLoading, authEpoch } = useAuth();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => {
    const saved = value ? JSON.parse(value) : [];
    setItems(Array.isArray(saved) ? saved : []);
  }).catch(() => setItems([])).finally(() => setReady(true)); }, []);

  const commit = (next) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };
  const add = (product) => {
    const currentStore = items[0]?.storeId?._id || items[0]?.storeId;
    const productStore = product.storeId?._id || product.storeId;
    if (currentStore && productStore && currentStore !== productStore) return { ok: false, message: "Your cart has products from another store. Clear it before switching stores." };
    const found = items.find((item) => item._id === product._id);
    const stock = Number(product.stock);
    if (Number.isFinite(stock) && stock < 1) return { ok: false, message: "This product is out of stock." };
    if (found && Number.isFinite(stock) && found.quantity >= stock) return { ok: false, message: `Only ${stock} available.` };
    commit(found ? items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }]);
    return { ok: true };
  };
  const change = (id, delta) => commit(items.map((item) => {
    if (item._id !== id) return item;
    const stock = Number(item.stock);
    const nextQuantity = item.quantity + delta;
    return { ...item, quantity: Number.isFinite(stock) ? Math.min(nextQuantity, stock) : nextQuantity };
  }).filter((item) => item.quantity > 0));
  const clear = () => commit([]);
  useEffect(() => {
    if (!authLoading && !user) setItems([]);
  }, [authLoading, user, authEpoch]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.discount_price ?? item.price) * item.quantity, 0);

  const value = useMemo(() => ({ items, count, subtotal, ready, add, change, clear }), [items, count, subtotal, ready]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
