import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { AddressProvider } from "./src/context/AddressContext";
import { CartProvider } from "./src/context/CartContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AddressProvider>
          <CartProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </CartProvider>
        </AddressProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
