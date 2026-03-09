import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type NotifItem = {
  _id: string;
  title: string;
  body: string;
  createdAt: string;

  // backend field
  isRead: boolean;
  readAt?: string | null;

  data?: any;
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

export default function PatientNotifications() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((x) => !x.isRead).length,
    [items]
  );

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // GET /api/notifications/mine
      const res = await API.get("/notifications/mine");

      const listRaw = res?.data?.notifications || [];

      // normalize: some backends might return `read` (old) or `isRead` (new)
      const list: NotifItem[] = listRaw.map((n: any) => ({
        _id: n._id,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        isRead: Boolean(n.isRead ?? n.read ?? false),
        readAt: n.readAt ?? null,
        data: n.data ?? {},
      }));

      setItems(list);
    } catch (e: any) {
      console.log(
        "notifications load error:",
        e?.response?.status,
        e?.response?.data || e?.message
      );
      setItems([]); // no mock to avoid confusion
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  const markOneRead = async (id: string) => {
    // optimistic UI
    setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isRead: true } : x)));

    try {
      // PATCH /api/notifications/:id/read
      await API.patch(`/notifications/${id}/read`);
    } catch (e: any) {
      console.log("mark read error:", e?.response?.data || e?.message);
      // rollback
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isRead: false } : x)));
    }
  };

  const markAllRead = async () => {
    // optimistic UI
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));

    try {
      // POST /api/notifications/read-all
      await API.post(`/notifications/read-all`);
    } catch (e: any) {
      console.log("mark all read error:", e?.response?.data || e?.message);
      loadNotifications();
    }
  };

  const openNotification = async (n: NotifItem) => {
    if (!n.isRead) await markOneRead(n._id);

    // navigate based on notification type if needed
    router.push("/main/patient/bookAppointment");
  };

  const renderItem = ({ item }: { item: NotifItem }) => {
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.cardUnread]}
        activeOpacity={0.8}
        onPress={() => openNotification(item)}
      >
        <View style={styles.row}>
          <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={!item.isRead ? "#FFFFFF" : "#2B9FD8"}
            />
          </View>

          <View style={styles.content}>
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
      {/* Header (blue theme) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
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

      <FlatList
        data={items}
        keyExtractor={(x) => x._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={28} color="#2B9FD8" />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>You’ll see appointment updates here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header (match Prescription Scanner) */
  header: {
    backgroundColor: "#2B9FD8",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

  listContent: { padding: 16, paddingBottom: 28, gap: 12 },

  /* Cards */
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

  row: { flexDirection: "row", alignItems: "flex-start" },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapUnread: {
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },

  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: "900", color: "#111827" },
  time: { fontSize: 11, fontWeight: "800", color: "#6B7280" },
  body: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "#374151", lineHeight: 18 },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    marginLeft: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: "900", color: "#111827" },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "#6B7280" },
});