import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { useAddress } from "../context/AddressContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { colors } from "../theme";
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import LocationScreen from "../screens/LocationScreen";
import HomeScreen from "../screens/HomeScreen";
import CategoriesScreen from "../screens/CategoriesScreen";
import OffersScreen from "../screens/OffersScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import OrdersScreen from "../screens/OrdersScreen";
import OrderSuccessScreen from "../screens/OrderSuccessScreen";
import StoresScreen from "../screens/StoresScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import AboutScreen from "../screens/AboutScreen";
import DeliveryDashboardScreen from "../screens/delivery/DeliveryDashboardScreen";
import DeliveryOrderDetailsScreen from "../screens/delivery/DeliveryOrderDetailsScreen";

const Stack = createNativeStackNavigator(); const Tab = createBottomTabNavigator();
const tabIcons = { HomeTab: ["home", "home-outline"], CategoriesTab: ["grid", "grid-outline"], OffersTab: ["gift", "gift-outline"], CartTab: ["cart", "cart-outline"], ProfileTab: ["person", "person-outline"] };

function MainTabs() { const { count } = useCart(); return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarHideOnKeyboard: true, tabBarActiveTintColor: colors.purple, tabBarInactiveTintColor: "#958E9E", tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: "white" }, tabBarLabelStyle: { fontSize: 10, fontWeight: "800" }, tabBarIcon: ({ focused, color, size }) => <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} color={color} size={size} /> })}><Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} /><Tab.Screen name="CategoriesTab" component={CategoriesScreen} options={{ title: "Categories" }} /><Tab.Screen name="OffersTab" component={OffersScreen} options={{ title: "Pay & Win" }} /><Tab.Screen name="CartTab" component={CartScreen} options={{ title: "Cart", tabBarBadge: count || undefined, tabBarBadgeStyle: { backgroundColor: colors.pink, fontSize: 9 } }} /><Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} /></Tab.Navigator>; }

function AuthStack() { return <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}><Stack.Screen name="Login" component={LoginScreen} /><Stack.Screen name="Register" component={RegisterScreen} /><Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} /></Stack.Navigator>; }
function AppStack({ needsLocation }) { return <Stack.Navigator initialRouteName={needsLocation ? "Location" : "Main"} screenOptions={{ headerShown: false, animation: "slide_from_right" }}><Stack.Screen name="Main" component={MainTabs} /><Stack.Screen name="Location" component={LocationScreen} /><Stack.Screen name="Products" component={ProductsScreen} /><Stack.Screen name="ProductDetail" component={ProductDetailScreen} /><Stack.Screen name="Checkout" component={CheckoutScreen} /><Stack.Screen name="Orders" component={OrdersScreen} /><Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} /><Stack.Screen name="Stores" component={StoresScreen} /><Stack.Screen name="Payments" component={PaymentsScreen} /><Stack.Screen name="About" component={AboutScreen} /></Stack.Navigator>; }
function DeliveryStack() { return <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}><Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} /><Stack.Screen name="DeliveryOrderDetails" component={DeliveryOrderDetailsScreen} /></Stack.Navigator>; }

export default function RootNavigator() {
  const { user, loading, authEpoch } = useAuth();
  const { ready, selectedAddress } = useAddress();
  const { ready: cartReady } = useCart();

  useEffect(() => {
    console.log("[AuthInput] RootNavigator mounted");
    return () => console.log("[AuthInput] RootNavigator unmounted");
  }, []);

  if (loading || !ready || !cartReady) return <SplashScreen />;
  if (user?.role === "delivery_partner") return <DeliveryStack key={`delivery-session-${authEpoch}`} />;
  return user ? <AppStack key={`customer-session-${authEpoch}`} needsLocation={!selectedAddress} /> : <AuthStack key={`auth-session-${authEpoch}`} />;
}
