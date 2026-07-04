import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const web = Platform.OS === "web";

export const authStorage = {
  getItem: (key) => web ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key, value) => web ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key) => web ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};
