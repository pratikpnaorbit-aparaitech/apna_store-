import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { AddressProvider } from "./src/context/AddressContext";
import { CartProvider } from "./src/context/CartContext";
import { ToastProvider } from "./src/context/ToastContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <ToastProvider>
              <NavigationContainer>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </ToastProvider>
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
