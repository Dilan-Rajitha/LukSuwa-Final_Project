import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type UserLite = {
  _id?: string;
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  sex?: string;
  age?: number;
  role?: string;
};

type AppointmentStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

type Appointment = {
  _id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  patientId: UserLite | string;
  doctorId?: UserLite | string;
  rejectReason?: string;
};

type Filter = "pending" | "confirmed" | "rejected" | "all";

const fmtDT = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const asUser = (u: Appointment["patientId"]): UserLite => {
  if (!u) return {};
  if (typeof u === "string") return { _id: u };
  return u;
};

export default function DoctorAppointments() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Filter>("pending");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const title = useMemo(() => {
    if (status === "pending") return "Appointment Requests";
    if (status === "confirmed") return "Confirmed Appointments";
    if (status === "rejected") return "Rejected Appointments";
    return "All Appointments";
  }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/appointments/doctor/my?status=${status}`);
      setAppointments(res.data?.appointments || []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load appointments";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const update = async (appointmentId: string, action: "confirm" | "reject", reason?: string) => {
    setLoading(true);
    try {
      await API.post("/appointments/confirm", {
        appointmentId,
        action,
        rejectReason: reason,
      });

      await load();
      Alert.alert("Done", action === "confirm" ? "Appointment confirmed" : "Appointment rejected");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to update appointment";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const openReject = (id: string) => {
    setSelectedId(id);
    setRejectReason("");
    setRejectOpen(true);
  };

  const submitReject = () => {
    if (!selectedId) return;
    const r = rejectReason.trim() || "Rejected by doctor";
    setRejectOpen(false);
    update(selectedId, "reject", r);
  };

  const StatusPill = ({ value }: { value: AppointmentStatus }) => {
    const map: Record<AppointmentStatus, { bg: string; fg: string; text: string; border: string }> =
      {
        pending: { bg: "#FFFBEB", fg: "#D97706", border: "#FCD34D", text: "PENDING" },
        confirmed: { bg: "#ECFDF5", fg: "#059669", border: "#6EE7B7", text: "CONFIRMED" },
        rejected: { bg: "#FEF2F2", fg: "#DC2626", border: "#FCA5A5", text: "REJECTED" },
        cancelled: { bg: "#F3F4F6", fg: "#374151", border: "#E5E7EB", text: "CANCELLED" },
        completed: { bg: "#E0F3FB", fg: "#1A7BAF", border: "#D0EAFB", text: "COMPLETED" },
      };

    const s = map[value] || map.pending;
    return (
      <View style={[styles.pill, { backgroundColor: s.bg, borderColor: s.border }]}>
        <Text style={[styles.pillText, { color: s.fg }]}>{s.text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>Confirm / Reject with patient details.</Text>
        </View>

        <Pressable style={styles.refreshBtn} onPress={load} accessibilityLabel="Refresh">
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(["pending", "confirmed", "rejected", "all"] as const).map((k) => {
          const active = status === k;
          return (
            <Pressable
              key={k}
              onPress={() => setStatus(k)}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {k.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : null}

      <FlatList
        data={appointments}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const p = asUser(item.patientId);

          const patientName =
            p.firstName || p.lastName
              ? `${p.firstName || ""} ${p.lastName || ""}`.trim()
              : p.username || "Patient";

          const gender = (p.gender || p.sex || "—") as string;
          const age = typeof p.age === "number" ? String(p.age) : "—";

          const showActions = item.status === "pending";

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {patientName}
                </Text>
                <StatusPill value={item.status} />
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaIconBox}>
                  <Ionicons name="time-outline" size={14} color="#2B9FD8" />
                </View>
                <Text style={styles.metaText}>
                  <Text style={styles.metaLabel}>Time: </Text>
                  {fmtDT(item.startTime)} → {fmtDT(item.endTime)}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Patient details */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="person-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.detailText}>Username: {p.username || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="mail-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.detailText}>Email: {p.email || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="male-female-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.detailText}>Sex: {gender}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="calendar-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.detailText}>Age: {age}</Text>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="call-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.detailText}>Phone: {p.phone || "—"}</Text>
              </View>

              {item.status === "rejected" && item.rejectReason ? (
                <View style={styles.rejectCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.rejectNote}>Reason: {item.rejectReason}</Text>
                </View>
              ) : null}

              {/* Actions */}
              {showActions ? (
                <View style={styles.actions}>
                  <Pressable style={styles.confirmBtn} onPress={() => update(item._id, "confirm")}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.actionText}>Confirm</Text>
                  </Pressable>

                  <Pressable style={styles.rejectBtn} onPress={() => openReject(item._id)}>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.actionText}>Reject</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={26} color="#2B9FD8" />
            </View>
            <Text style={styles.emptyText}>No appointments found.</Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={rejectOpen} transparent animationType="fade" onRequestClose={() => setRejectOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Appointment</Text>
              <Pressable onPress={() => setRejectOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text style={styles.modalSub}>Add a reason (optional)</Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason..."
              placeholderTextColor="#9CA3AF"
              style={styles.modalInput}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setRejectOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalConfirm} onPress={submitReject}>
                <Text style={styles.modalConfirmText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - blue theme */
  header: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Filters */
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  filterBtnActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  filterText: { fontWeight: "900", fontSize: 11, color: "#111827" },
  filterTextActive: { color: "#FFFFFF" },

  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { fontWeight: "800", color: "#6B7280" },

  /* Cards */
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    gap: 10,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827", flex: 1, paddingRight: 10 },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: "900" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaIconBox: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  metaText: { color: "#374151", fontWeight: "800", flex: 1 },
  metaLabel: { color: "#6B7280", fontWeight: "900" },

  divider: { height: 1, backgroundColor: "#D0EAFB" },

  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIconBox: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { color: "#111827", fontWeight: "800", flex: 1 },

  rejectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
  },
  rejectNote: { fontWeight: "900", color: "#DC2626", flex: 1 },

  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  rejectBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  actionText: { color: "#fff", fontWeight: "900" },

  empty: { alignItems: "center", justifyContent: "center", padding: 30, gap: 10 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { color: "#9CA3AF", fontWeight: "900" },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSub: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  modalInput: {
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "800",
    color: "#111827",
    backgroundColor: "#F3F9FD",
  },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  modalCancel: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontWeight: "900", color: "#111827" },
  modalConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: { fontWeight: "900", color: "#fff" },
});