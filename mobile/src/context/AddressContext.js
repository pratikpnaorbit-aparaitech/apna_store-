import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AddressContext = createContext(null);
const KEY = "smartstore_addresses_v1";

export function AddressProvider({ children }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => {
      const saved = value ? JSON.parse(value) : [];
      setAddresses(saved);
      setSelectedAddress(saved.find((item) => item.selected) || saved[0] || null);
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const saveAll = async (next, selectedId) => {
    const normalized = next.map((item) => ({ ...item, selected: item.id === selectedId }));
    setAddresses(normalized);
    setSelectedAddress(normalized.find((item) => item.selected) || null);
    await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
  };

  const addAddress = async (address) => {
    const item = { id: `${Date.now()}`, label: address.label || "Home", ...address };
    await saveAll([...addresses, item], item.id);
  };

  const selectAddress = async (id) => saveAll(addresses, id);

  const value = useMemo(() => ({ addresses, selectedAddress, ready, addAddress, selectAddress }), [addresses, selectedAddress, ready]);
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export const useAddress = () => useContext(AddressContext);
