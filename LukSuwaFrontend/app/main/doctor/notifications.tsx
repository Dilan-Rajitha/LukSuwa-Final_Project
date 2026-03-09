import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type Notif = {
  _id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  createdAt: string;

  isRead: boolean;
  readAt?: string | null;
};

function timeAgo(iso: string) {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DoctorNotifications() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(() => items.filter((x) => !x.isRead).length, [items]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await API.get("/notifications/mine");
      const raw = res?.data?.notifications ?? [];

      const list: Notif[] = raw.map((n: any) => ({
        _id: n._id,
        type: n.type ?? "SYSTEM_EVENT",
        title: n.title ?? "",
        body: n.body ?? "",
        data: n.data ?? {},
        createdAt: n.createdAt,
        isRead: Boolean(n.isRead ?? n.read ?? false),
        readAt: n.readAt ?? null,
      }));

      setItems(list);
    } catch (e: any) {
      console.log("notif list error:", e?.response?.status, e?.response?.data || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const markOneRead = async (id: string) => {
    setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isRead: true } : x)));
    try {
      await API.patch(`/notifications/${id}/read`);
    } catch (e: any) {
      console.log("mark read error:", e?.response?.data || e?.message);
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isRead: false } : x)));
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await API.post(`/notifications/read-all`);
    } catch (e: any) {
      console.log("mark all read error:", e?.response?.data || e?.message);
      fetchNotifications();
    }
  };

  const openNotification = async (n: Notif) => {
    if (!n.isRead) await markOneRead(n._id);
    router.push("/main/doctor/appointments");
  };

  const renderItem = ({ item }: { item: Notif }) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        activeOpacity={0.85}
        onPress={() => openNotification(item)}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color={!item.isRead ? "#FFFFFF" : "#2B9FD8"}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.topRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>

            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          </View>

          {!item.isRead ? <View style={styles.dot} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0 ? `${unreadCount} unread` : loading ? "Loading..." : "All caught up"}
          </Text>
        </View>

        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.8}>
          <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x._id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={28} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>You’re all caught up.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - blue theme */
  header: {
    backgroundColor: "#2B9FD8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  headerSub: { marginTop: 2, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },
  markAllBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: { padding: 16, paddingBottom: 30, gap: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { marginTop: 10, color: "#6B7280", fontWeight: "700" },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardUnread: {
    borderColor: "#BFE3FA",
    backgroundColor: "#EAF6FF",
  },

  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapUnread: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },

  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: "900", color: "#111827" },
  body: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "#4B5563", lineHeight: 18 },
  time: { fontSize: 11, fontWeight: "800", color: "#9CA3AF" },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginLeft: 6,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { marginTop: 6, fontSize: 16, fontWeight: "900", color: "#111827" },
  emptySub: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#6B7280" },
});