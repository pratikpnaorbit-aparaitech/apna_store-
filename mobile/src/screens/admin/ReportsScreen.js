import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock, SearchBox, StatCard, StatusPill, adminStyles } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../navigation/roleConfig";
import { colors } from "../../theme";

export default function ReportsScreen({ navigation }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [reportsResult, statsResult] = await Promise.all([api.get("/reports"), api.get("/reports/stats")]);
      setTransactions(Array.isArray(reportsResult.data) ? reportsResult.data : []);
      setStats(statsResult.data || { totalOrders: 0, totalRevenue: 0 });
      setError("");
    } catch (loadError) {
      setError(messageFromError(loadError, "Reports are unavailable."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const shown = useMemo(() => {
    const query = search.toLowerCase();
    return transactions.filter((item) => !query || [item.bill_number, item.customer_name, item.payment_mode, item.audit_status].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [search, transactions]);

  return (
    <Screen>
      <AdminHeader title="Reports" subtitle="Revenue and transaction audit" roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} />
      {loading ? <LoadingBlock label="Loading reports…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={shown}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={styles.list}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          ListHeaderComponent={(
            <>
              <View style={styles.stats}>
                <StatCard icon="receipt" label="POS transactions" value={stats.totalOrders || 0} tint="#6366F1" />
                <StatCard icon="cash" label="Total POS revenue" value={`₹${Number(stats.totalRevenue || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} tint={colors.purple} />
              </View>
              <SearchBox value={search} onChangeText={setSearch} placeholder="Search bill, customer or payment" />
              <Text style={adminStyles.sectionTitle}>Transactions</Text>
            </>
          )}
          ListEmptyComponent={<EmptyBlock title="No transactions found" message="Completed POS bills will appear here." />}
          renderItem={({ item }) => (
            <View style={adminStyles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Text style={adminStyles.cardTitle}>{item.bill_number || "Bill"}</Text><Text style={adminStyles.cardSub}>{item.customer_name || "Walk-in"} • {new Date(item.created_at).toLocaleString("en-IN")}</Text></View>
                <Text style={styles.amount}>₹{Number(item.total || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.footer}><Text style={styles.payment}>{item.payment_mode || "Payment"}</Text><StatusPill label={item.audit_status || "SUCCESS"} /></View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 15, paddingBottom: 35 },
  stats: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  amount: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.border },
  payment: { color: colors.muted, fontSize: 10.5, fontWeight: "900" },
});
