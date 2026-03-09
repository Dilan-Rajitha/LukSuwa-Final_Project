import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchMyAppointments, type Appointment } from "../../../src/api/telemedicineApi";
import { AuthContext } from "../../../src/context/AuthContext";

export default function TelemedicineHistory() {
  const router = useRouter();
  // const { token } = useContext(AuthContext);
  const { token } = useContext(AuthContext) as any;

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const a = await fetchMyAppointments(token as string);
      setAppointments(a);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doctorLabel = (d: any) => {
    if (!d) return "Doctor";
    if (typeof d === "string") return d;
    return d.username || d.email || d._id || "Doctor";
  };

  // past = only after END time
  const past = useMemo(() => {
    const now = new Date();
    return (appointments ?? [])
      .filter((a) => new Date(a.endTime) <= now)
      .sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime));
  }, [appointments]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (match Prescription Scanner) */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Appointment History</Text>
          <Text style={styles.sub}>Past completed appointments</Text>
        </View>

        <Pressable onPress={load} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          data={past}
          keyExtractor={(a) => a._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    Doctor: {doctorLabel(item.doctorId)}
                  </Text>
                  <Text style={styles.meta}>{formatRange(item.startTime, item.endTime)}</Text>
                </View>

                <View style={[styles.badge, badgeStyle(item.status)]}>
                  <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="time-outline" size={26} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No History Yet</Text>
              <Text style={styles.emptySub}>History තාම නෑ.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const d = s.toLocaleDateString();
  const st = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const et = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${d} • ${st} - ${et}`;
}

function badgeStyle(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return { backgroundColor: "#10B981" };
    case "pending":
      return { backgroundColor: "#F59E0B" };
    case "rejected":
      return { backgroundColor: "#EF4444" };
    case "cancelled":
      return { backgroundColor: "#6B7280" };
    default:
      return { backgroundColor: "#111827" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - Blue */
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  h1: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  muted: { color: "#6B7280", fontWeight: "700" },

  /* Card (match your blue theme cards) */
  card: {
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  title: { fontSize: 13, fontWeight: "900", color: "#111827" },
  meta: { marginTop: 6, color: "#6B7280", fontWeight: "700" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: 30 },
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
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: "#111827" },
  emptySub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },
});