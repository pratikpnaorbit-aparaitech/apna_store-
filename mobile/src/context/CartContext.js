import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const KEY = "smartstore_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => value && setItems(JSON.parse(value))).catch(() => {}); }, []);

  const commit = (next) => {
    setItems(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  };
  const add = (product) => {
    const currentStore = items[0]?.storeId?._id || items[0]?.storeId;
    const productStore = product.storeId?._id || product.storeId;
    if (currentStore && productStore && currentStore !== productStore) return { ok: false, message: "Your cart has products from another store. Clear it before switching stores." };
    const found = items.find((item) => item._id === product._id);
    commit(found ? items.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) : [...items, { ...product, quantity: 1 }]);
    return { ok: true };
  };
  const change = (id, delta) => commit(items.map((item) => item._id === id ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  const clear = () => commit([]);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.discount_price ?? item.price) * item.quantity, 0);

  const value = useMemo(() => ({ items, count, subtotal, add, change, clear }), [items, count, subtotal]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
