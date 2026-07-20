import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Screen from "../../components/Screen";
import { AdminHeader, EmptyBlock, ErrorBlock, LoadingBlock } from "../../components/admin/AdminUI";
import { api, messageFromError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../navigation/roleConfig";
import { colors } from "../../theme";

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
      setError("");
    } catch (loadError) { setError(messageFromError(loadError, "Notifications are unavailable.")); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (item) => {
    if (item.read) return;
    try {
      await api.patch(`/notifications/${item._id}/read`);
      setItems((current) => current.map((record) => record._id === item._id ? { ...record, read: true } : record));
      setUnread((value) => Math.max(0, value - 1));
    } catch (markError) {
      setError(messageFromError(markError, "Could not mark the notification as read."));
    }
  };
  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch (markError) {
      setError(messageFromError(markError, "Could not mark all notifications as read."));
    }
  };

  return (
    <Screen>
      <AdminHeader title="Notifications" subtitle={`${unread} unread`} roleLabel={ROLE_LABELS[user?.role]} onBack={() => navigation.goBack()} right={unread ? <Pressable onPress={markAll} style={styles.readAll}><Ionicons name="checkmark-done" size={19} color="white" /><Text style={styles.readAllText}>Read all</Text></Pressable> : null} />
      {loading ? <LoadingBlock label="Loading notifications…" /> : error ? <ErrorBlock message={error} onRetry={load} /> : (
        <FlatList
          data={items}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<EmptyBlock title="You’re all caught up" message="New operational updates will appear here." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => markRead(item)} style={[styles.card, !item.read && styles.unread]}>
              <View style={[styles.dot, item.read && styles.dotRead]} />
              <View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("en-IN")}</Text></View>
              {!item.read ? <Ionicons name="mail-unread-outline" size={18} color={colors.purple} /> : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  readAll: { height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,.16)", paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  readAllText: { color: "white", fontSize: 10, fontWeight: "900" },
  list: { padding: 15, paddingBottom: 35 },
  card: { minHeight: 92, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 10, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  unread: { backgroundColor: "#EDFBF2", borderColor: "#B7E9C9" },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.purple, marginTop: 5 },
  dotRead: { backgroundColor: "#D5DED8" },
  title: { color: colors.ink, fontWeight: "900", fontSize: 13 },
  message: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  date: { color: "#96A19A", fontSize: 9.5, marginTop: 6 },
});
