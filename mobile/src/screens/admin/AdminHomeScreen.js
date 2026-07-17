import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, ErrorBlock, LoadingBlock, StatCard, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS, ROLES } from "../../navigation/roleConfig";
import { colors } from "../../theme";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function AdminHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const superAdmin = user?.role === ROLES.SUPER_ADMIN;
  const staff = user?.role === ROLES.STAFF;

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      if (superAdmin) {
        const [usersResult, storesResult, ordersResult, deliveryResult] = await Promise.all([
          api.get("/users"), api.get("/stores"), api.get("/orders/all"), api.get("/delivery-partners"),
        ]);
        const users = usersResult.data.data || [];
        const stores = storesResult.data.data || [];
        const orders = ordersResult.data || [];
        const partners = deliveryResult.data.data || [];
        setData({
          stats: {
            users: users.length,
            admins: users.filter((item) => item.role === ROLES.ADMIN).length,
            stores: stores.length,
            orders: orders.length,
            revenue: orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
            delivery: partners.length,
          },
          recent: orders.slice(0, 5),
        });
      } else {
        const [stats, weekly, payment, recent, lowStock] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/dashboard/weekly-revenue"),
          api.get("/dashboard/payment-chart"),
          api.get("/dashboard/recent-transactions"),
          api.get("/dashboard/low-stock"),
        ]);
        setData({
          stats: stats.data.stats || {},
          weekly: weekly.data || [],
          payment: payment.data || [],
          recent: recent.data || [],
          lowStock: lowStock.data || { count: 0, items: [] },
        });
      }
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, "Dashboard data is unavailable."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [superAdmin]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => {
    const stats = data?.stats || {};
    if (superAdmin) return [
      ["people", "Platform users", stats.users, "#6366F1", "EntityManagement", { kind: "users" }],
      ["storefront", "Stores", stats.stores, colors.purple, "EntityManagement", { kind: "stores" }],
      ["receipt", "Online orders", stats.orders, "#F59E0B", "AdminOrders"],
      ["wallet", "Order value", money(stats.revenue), "#0EA5E9", "AdminReports"],
      ["shield-checkmark", "Store admins", stats.admins, "#8B5CF6", "EntityManagement", { kind: "admins" }],
      ["bicycle", "Delivery partners", stats.delivery, "#F97316", "EntityManagement", { kind: "delivery" }],
    ];
    return [
      ["cash", "Today’s revenue", money(stats.todayRevenue), colors.purple],
      ["wallet", "Total revenue", money(stats.totalRevenue), "#6366F1"],
      ["bag-check", "Orders today", stats.todayOrders || stats.todaySales || 0, "#F59E0B", staff ? undefined : "AdminOrders"],
      ["cart", "Online orders", stats.totalOrders || 0, "#0EA5E9", staff ? undefined : "AdminOrders"],
      ["cube", "Active products", stats.totalProducts || 0, "#8B5CF6", "AdminInventory"],
      ["warning", "Low stock", data?.lowStock?.count || 0, "#DC2626", "AdminInventory"],
    ];
  }, [data, staff, superAdmin]);

  return (
    <Screen>
      <AdminHeader title={`Hello, ${user?.name || "Admin"}`} subtitle={superAdmin ? "Platform overview" : "Your store performance today"} roleLabel={ROLE_LABELS[user?.role]} />
      {loading ? <LoadingBlock label="Loading live dashboard…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.purple} />} contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            {cards.map(([icon, label, value, tint, route, params]) => (
              <StatCard key={label} icon={icon} label={label} value={value} tint={tint} onPress={route ? () => navigation.navigate(route, params) : undefined} />
            ))}
          </View>

          <Text style={adminStyles.sectionTitle}>{superAdmin ? "Recent online orders" : "Recent POS transactions"}</Text>
          {(data?.recent || []).length ? (data.recent || []).map((item) => (
            <Pressable key={item._id || item.id} onPress={superAdmin ? () => navigation.navigate("AdminOrders") : undefined} style={adminStyles.card}>
              <View style={adminStyles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.cardTitle}>{superAdmin ? `Order #${String(item._id).slice(-6).toUpperCase()}` : item.bill_no || item.bill_number || "Transaction"}</Text>
                  <Text style={adminStyles.cardSub}>{superAdmin ? item.userId?.name || item.address?.name || "Customer" : item.payment_mode || "Payment"}</Text>
                </View>
                <View style={styles.end}>
                  <Text style={styles.amount}>{money(item.totalAmount ?? item.total)}</Text>
                  <StatusPill label={item.status || item.audit_status || "SUCCESS"} />
                </View>
              </View>
            </Pressable>
          )) : <Text style={styles.empty}>No recent activity.</Text>}

          {!superAdmin && data?.lowStock?.items?.length ? (
            <>
              <Text style={adminStyles.sectionTitle}>Needs restocking</Text>
              {data.lowStock.items.slice(0, 5).map((item) => (
                <Pressable key={item._id || item.id} onPress={() => navigation.navigate("AdminInventory")} style={adminStyles.card}>
                  <Text style={adminStyles.cardTitle}>{item.name}</Text>
                  <Text style={adminStyles.cardSub}>SKU {item.sku || "—"} • {item.stock} remaining</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 15, paddingBottom: 40 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginBottom: 26 },
  end: { alignItems: "flex-end", gap: 6 },
  amount: { color: colors.ink, fontWeight: "900", fontSize: 14 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 30 },
});
