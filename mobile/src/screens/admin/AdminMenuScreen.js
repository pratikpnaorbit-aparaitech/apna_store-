import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader } from "../../components/admin/AdminUI";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors, shadow } from "../../theme";

const superModules = [
  ["Stores", "Create and manage stores", "storefront-outline", "EntityManagement", { kind: "stores" }],
  ["Store admins", "Accounts, access and staff", "shield-checkmark-outline", "EntityManagement", { kind: "admins" }],
  ["Registered customers", "Customer app accounts", "people-outline", "EntityManagement", { kind: "registeredCustomers" }],
  ["Users & staff", "All platform roles and permissions", "people-circle-outline", "EntityManagement", { kind: "users" }],
  ["Delivery partners", "Partners, status and passwords", "bicycle-outline", "EntityManagement", { kind: "delivery" }],
  ["Inventory", "Products, pricing and stock", "cube-outline", "AdminInventory"],
  ["Orders", "Status and delivery assignment", "receipt-outline", "AdminOrders"],
  ["Support", "Review and resolve tickets", "headset-outline", "EntityManagement", { kind: "support" }],
  ["Notifications", "Order, support and system updates", "notifications-outline", "AdminNotifications"],
  ["Reports", "Revenue and transaction audit", "bar-chart-outline", "AdminReports"],
];

const adminModules = [
  ["Inventory", "Products, pricing and stock", "cube-outline", "AdminInventory"],
  ["Orders", "Store orders and delivery assignment", "receipt-outline", "AdminOrders"],
  ["POS billing", "Create an in-store bill", "calculator-outline", "AdminBilling"],
  ["Customers", "Loyalty and POS customers", "people-outline", "EntityManagement", { kind: "customers" }],
  ["My staff", "Store staff accounts", "person-add-outline", "EntityManagement", { kind: "staff" }],
  ["Suppliers", "Vendor and payment records", "business-outline", "EntityManagement", { kind: "suppliers" }],
  ["Notifications", "Order and store updates", "notifications-outline", "AdminNotifications"],
  ["Reports", "Revenue and transaction audit", "bar-chart-outline", "AdminReports"],
];

const staffModules = [
  ["Inventory", "View products and stock", "cube-outline", "AdminInventory"],
  ["POS billing", "Create an in-store bill", "calculator-outline", "AdminBilling"],
  ["Customers", "Loyalty and POS customers", "people-outline", "EntityManagement", { kind: "customers" }],
  ["Notifications", "Operational updates", "notifications-outline", "AdminNotifications"],
];

export default function AdminMenuScreen({ navigation }) {
  const { user } = useAuth();
  const modules = user?.role === ROLES.SUPER_ADMIN ? superModules : user?.role === ROLES.STAFF ? staffModules : adminModules;
  return (
    <Screen>
      <AdminHeader title="Operations" subtitle="Web functions, designed for phone screens" roleLabel={ROLE_LABELS[user?.role]} />
      <FlatList
        data={modules}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate(item[3], item[4])} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
            <View style={styles.icon}><Ionicons name={item[2]} size={23} color={colors.purple} /></View>
            <View style={{ flex: 1 }}><Text style={styles.title}>{item[0]}</Text><Text style={styles.sub}>{item[1]}</Text></View>
            <Ionicons name="chevron-forward" size={19} color={colors.muted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 15, paddingBottom: 35 },
  card: { minHeight: 82, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: colors.border, marginBottom: 11, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, ...shadow },
  icon: { width: 49, height: 49, borderRadius: 17, backgroundColor: colors.purpleSoft, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontWeight: "900", fontSize: 14.5 },
  sub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
