import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

type Appointment = {
  _id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  patientId: any;
};

type Notif = {
  _id: string;
  isRead: boolean;
  createdAt: string;
};

type BackendSlot = {
  start: string; // ISO
  end: string;   // ISO
  isBooked: boolean;
};

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(iso: string) {
  return new Date(iso).getTime() > Date.now();
}

export default function DoctorStatistics() {
  const { user } = useContext(AuthContext) as any;
  const doctorId = useMemo(() => user?.id || user?._id, [user]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [slots, setSlots] = useState<BackendSlot[]>([]);

  const load = useCallback(async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      // 1) appointments (all)
      // 2) notifications (mine)
      // 3) availability by doctorId
      const [aRes, nRes, sRes] = await Promise.all([
        API.get(`/appointments/doctor/my?status=all`),
        API.get(`/notifications/mine`),
        API.get(`/availability/doctor/${doctorId}`),
      ]);

      setAppointments(aRes?.data?.appointments || []);

      const rawNotifs = nRes?.data?.notifications || [];
      const notifs: Notif[] = rawNotifs.map((n: any) => ({
        _id: n._id,
        isRead: Boolean(n.isRead ?? n.read ?? false),
        createdAt: n.createdAt,
      }));
      setNotifications(notifs);

      setSlots(sRes?.data?.slots || []);
    } catch (e: any) {
      // keep screen usable even if one endpoint fails
      console.log("stats load error:", e?.response?.status, e?.response?.data || e?.message);
      setAppointments([]);
      setNotifications([]);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // -------- Stats --------
  const apptCounts = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
      cancelled: 0,
      completed: 0,
    };
    for (const a of appointments) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return counts;
  }, [appointments]);

  const todayConfirmed = useMemo(() => {
    return appointments.filter((a) => a.status === "confirmed" && isToday(a.startTime)).length;
  }, [appointments]);

  const upcomingConfirmed = useMemo(() => {
    return appointments.filter((a) => a.status === "confirmed" && isFuture(a.startTime)).length;
  }, [appointments]);

  const unreadNotifCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const notifToday = useMemo(() => {
    return notifications.filter((n) => isToday(n.createdAt)).length;
  }, [notifications]);

  const slotTotal = slots.length;
  const slotBooked = useMemo(() => slots.filter((s) => s.isBooked).length, [slots]);
  const slotFree = slotTotal - slotBooked;

  // Upcoming availability slots (future)
  const slotFutureFree = useMemo(() => {
    return slots.filter((s) => !s.isBooked && isFuture(s.start)).length;
  }, [slots]);

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Statistics</Text>
          <Text style={styles.sub}>Appointments • Notifications • Availability</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={load} activeOpacity={0.85}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading statistics...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Quick KPIs */}
          <View style={styles.grid}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="time-outline" size={18} color="#2B9FD8" />
              </View>
              <Text style={styles.kpiLabel}>Pending</Text>
              <Text style={styles.kpiValue}>{apptCounts.pending}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2B9FD8" />
              </View>
              <Text style={styles.kpiLabel}>Confirmed</Text>
              <Text style={styles.kpiValue}>{apptCounts.confirmed}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="notifications-outline" size={18} color="#2B9FD8" />
              </View>
              <Text style={styles.kpiLabel}>Unread</Text>
              <Text style={styles.kpiValue}>{unreadNotifCount}</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Ionicons name="calendar-outline" size={18} color="#2B9FD8" />
              </View>
              <Text style={styles.kpiLabel}>Free Slots</Text>
              <Text style={styles.kpiValue}>{slotFree}</Text>
            </View>
          </View>

          {/* Appointments section */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.cardTitle}>Appointments Overview</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Today (confirmed)</Text>
              <Text style={styles.rowValue}>{todayConfirmed}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Upcoming (confirmed)</Text>
              <Text style={styles.rowValue}>{upcomingConfirmed}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Rejected</Text>
              <Text style={styles.rowValue}>{apptCounts.rejected}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Cancelled</Text>
              <Text style={styles.rowValue}>{apptCounts.cancelled}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Completed</Text>
              <Text style={styles.rowValue}>{apptCounts.completed}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.linkBtn}
              onPress={() => router.push("/main/doctor/appointments")}
            >
              <Ionicons name="open-outline" size={18} color="#2B9FD8" />
              <Text style={styles.linkText}>Open Appointments</Text>
            </TouchableOpacity>
          </View>

          {/* Notifications section */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.cardTitle}>Notifications</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Unread</Text>
              <Text style={styles.rowValue}>{unreadNotifCount}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Received today</Text>
              <Text style={styles.rowValue}>{notifToday}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.linkBtn}
              onPress={() => router.push("/main/doctor/notifications")}
            >
              <Ionicons name="open-outline" size={18} color="#2B9FD8" />
              <Text style={styles.linkText}>Open Notifications</Text>
            </TouchableOpacity>
          </View>

          {/* Availability section */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.cardTitle}>Availability</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Total slots</Text>
              <Text style={styles.rowValue}>{slotTotal}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Booked</Text>
              <Text style={styles.rowValue}>{slotBooked}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Free</Text>
              <Text style={styles.rowValue}>{slotFree}</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.rowLabel}>Future free slots</Text>
              <Text style={styles.rowValue}>{slotFutureFree}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.linkBtn}
              onPress={() => router.push("/main/doctor/setAvailability")}
            >
              <Ionicons name="open-outline" size={18} color="#2B9FD8" />
              <Text style={styles.linkText}>Open Set Availability</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>LukSuwa • Doctor Statistics</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

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
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 2, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 20 },
  muted: { color: "#6B7280", fontWeight: "700" },

  container: { padding: 16, paddingBottom: 28, gap: 12 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpiCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    gap: 6,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiLabel: { color: "#6B7280", fontWeight: "800", fontSize: 12 },
  kpiValue: { color: "#111827", fontWeight: "900", fontSize: 20 },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8" },
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: "#6B7280", fontWeight: "800", fontSize: 12 },
  rowValue: { color: "#111827", fontWeight: "900", fontSize: 13 },

  divider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 4 },

  linkBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignSelf: "flex-start",
  },
  linkText: { color: "#1A7BAF", fontWeight: "900", fontSize: 12 },

  footerNote: {
    marginTop: 6,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
});