import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useAddress } from "../context/AddressContext";
import { useCart } from "../context/CartContext";
import { colors } from "../theme";
import { hasPermission, ROLE_LABELS, ROLES } from "./roleConfig";
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
import OrderTrackingScreen from "../screens/OrderTrackingScreen";
import StoresScreen from "../screens/StoresScreen";
import PaymentsScreen from "../screens/PaymentsScreen";
import AboutScreen from "../screens/AboutScreen";
import DeliveryDashboardScreen from "../screens/delivery/DeliveryDashboardScreen";
import DeliveryOrderDetailsScreen from "../screens/delivery/DeliveryOrderDetailsScreen";
import AdminHomeScreen from "../screens/admin/AdminHomeScreen";
import AdminMenuScreen from "../screens/admin/AdminMenuScreen";
import AdminAccountScreen from "../screens/admin/AdminAccountScreen";
import InventoryManagementScreen from "../screens/admin/InventoryManagementScreen";
import OrderManagementScreen from "../screens/admin/OrderManagementScreen";
import EntityManagementScreen from "../screens/admin/EntityManagementScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";
import BillingScreen from "../screens/admin/BillingScreen";
import NotificationsScreen from "../screens/admin/NotificationsScreen";
import BulkInventoryUploadScreen from "../screens/admin/BulkInventoryUploadScreen";
import StoreAdminDetailsScreen from "../screens/admin/StoreAdminDetailsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

const tabIcons = {
  HomeTab: ["home", "home-outline"],
  CategoriesTab: ["grid", "grid-outline"],
  OffersTab: ["gift", "gift-outline"],
  CartTab: ["cart", "cart-outline"],
  ProfileTab: ["person", "person-outline"],
};

function MainTabs() {
  const { count } = useCart();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: "#958E9E",
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ focused, color, size }) => <Ionicons name={tabIcons[route.name][focused ? 0 : 1]} color={color} size={size} />,
    })}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} />
      <Tab.Screen name="CategoriesTab" component={CategoriesScreen} options={{ title: "Categories" }} />
      <Tab.Screen name="OffersTab" component={OffersScreen} options={{ title: "Pay & Win" }} />
      <Tab.Screen name="CartTab" component={CartScreen} options={{ title: "Cart", tabBarBadge: count || undefined, tabBarBadgeStyle: styles.badge }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

function CustomerMainScreen({ navigation }) {
  const { clearPendingIntent, pendingIntent, user } = useAuth();
  useEffect(() => {
    if (user?.role !== ROLES.USER || !pendingIntent?.name) return undefined;
    const intent = pendingIntent;
    clearPendingIntent();
    const timer = setTimeout(() => navigation.navigate(intent.name, intent.params), 0);
    return () => clearTimeout(timer);
  }, [clearPendingIntent, navigation, pendingIntent, user?.role]);
  return <MainTabs />;
}

function CustomerStack() {
  const { user } = useAuth();
  const customer = user?.role === ROLES.USER;
  return (
    <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Main" component={CustomerMainScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Stores" component={StoresScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      {!customer ? <>
        <Stack.Screen name="Login" component={LoginScreen} options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </> : <>
        <Stack.Screen name="Location" component={LocationScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
      </>}
    </Stack.Navigator>
  );
}

function DeliveryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} />
      <Stack.Screen name="DeliveryOrderDetails" component={DeliveryOrderDetailsScreen} />
    </Stack.Navigator>
  );
}

const adminTabIcons = {
  AdminDashboardTab: ["speedometer", "speedometer-outline"],
  AdminOperationsTab: ["apps", "apps-outline"],
  AdminAccountTab: ["person-circle", "person-circle-outline"],
};

function AdminTabs() {
  return (
    <AdminTab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: "#718078",
      tabBarStyle: styles.adminTabBar,
      tabBarLabelStyle: styles.adminTabLabel,
      tabBarIcon: ({ focused, color, size }) => <Ionicons name={adminTabIcons[route.name][focused ? 0 : 1]} color={color} size={size} />,
    })}>
      <AdminTab.Screen name="AdminDashboardTab" component={AdminHomeScreen} options={{ title: "Dashboard" }} />
      <AdminTab.Screen name="AdminOperationsTab" component={AdminMenuScreen} options={{ title: "Operations" }} />
      <AdminTab.Screen name="AdminAccountTab" component={AdminAccountScreen} options={{ title: "Account" }} />
    </AdminTab.Navigator>
  );
}

function AdminStack() {
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="AdminRoot" component={AdminTabs} />
      {(hasPermission(user?.role, "inventory") || hasPermission(user?.role, "inventory.read")) ? <Stack.Screen name="AdminInventory" component={InventoryManagementScreen} /> : null}
      {hasPermission(user?.role, "inventory") ? <Stack.Screen name="AdminBulkInventory" component={BulkInventoryUploadScreen} /> : null}
      {hasPermission(user?.role, "orders") ? <Stack.Screen name="AdminOrders" component={OrderManagementScreen} /> : null}
      {hasPermission(user?.role, "reports") ? <Stack.Screen name="AdminReports" component={ReportsScreen} /> : null}
      {hasPermission(user?.role, "billing") ? <Stack.Screen name="AdminBilling" component={BillingScreen} /> : null}
      <Stack.Screen name="AdminNotifications" component={NotificationsScreen} />
      <Stack.Screen name="EntityManagement" component={EntityManagementScreen} />
      {hasPermission(user?.role, "users") ? <Stack.Screen name="StoreAdminDetails" component={StoreAdminDetailsScreen} /> : null}
    </Stack.Navigator>
  );
}

function UnsupportedRoleScreen() {
  const { logout, user } = useAuth();
  return (
    <View style={styles.unsupported}>
      <Ionicons name="lock-closed-outline" size={38} color={colors.danger} />
      <Text style={styles.unsupportedTitle}>Access unavailable</Text>
      <Text style={styles.unsupportedText}>The role “{ROLE_LABELS[user?.role] || user?.role || "unknown"}” is not configured for this app.</Text>
      <Pressable onPress={logout} style={styles.unsupportedButton}><Text style={styles.unsupportedButtonText}>Return to guest home</Text></Pressable>
    </View>
  );
}

export default function RootNavigator() {
  const { authEpoch, loading, user } = useAuth();
  const { ready } = useAddress();
  const { ready: cartReady } = useCart();

  if (loading || !ready || !cartReady) return <SplashScreen />;
  if (!user || user.role === ROLES.USER) return <CustomerStack key={`customer-${authEpoch}-${user ? "member" : "guest"}`} />;
  if (user.role === ROLES.DELIVERY_PARTNER) return <DeliveryStack key={`delivery-${authEpoch}`} />;
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF].includes(user.role)) return <AdminStack key={`admin-${authEpoch}-${user.role}`} />;
  return <UnsupportedRoleScreen />;
}

const styles = StyleSheet.create({
  tabBar: { height: 68, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: "white" },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  badge: { backgroundColor: colors.pink, fontSize: 9 },
  adminTabBar: { height: 69, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: "white" },
  adminTabLabel: { fontSize: 10, fontWeight: "900" },
  unsupported: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 28 },
  unsupportedTitle: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 15 },
  unsupportedText: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: "center", marginTop: 8 },
  unsupportedButton: { backgroundColor: colors.purple, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, marginTop: 18 },
  unsupportedButtonText: { color: "white", fontWeight: "900" },
});
