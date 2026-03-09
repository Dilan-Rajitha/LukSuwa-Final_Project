import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
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
import {
  createAppointment,
  fetchDoctorAvailability,
  type Slot,
} from "../../../src/api/telemedicineApi";
import { AuthContext } from "../../../src/context/AuthContext";

export default function BookAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ doctorId: string; doctorName?: string }>();
  const { token } = useContext(AuthContext) as any;

  const doctorId = String(params.doctorId || "");
  const doctorName = params.doctorName ?? "Doctor";

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);

  const load = async () => {
    try {
      if (!doctorId) return;
      setLoading(true);
      const s = await fetchDoctorAvailability(token as string, doctorId);
      setSlots(s);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const onCreate = async () => {
    if (!selected) return Alert.alert("Select a slot", "Please select a time slot.");

    try {
      setLoading(true);
      await createAppointment(token as string, {
        doctorId,
        startTime: selected.start,
        endTime: selected.end,
      });

      Alert.alert(
        "Success",
        "Appointment created (pending). You can join after the doctor confirms."
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header (blue theme) */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1} numberOfLines={1}>
            Book • {doctorName}
          </Text>
          <Text style={styles.sub}>Select an available time slot</Text>
        </View>

        <Pressable onPress={load} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading slots...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          {slots.length === 0 ? (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#2B9FD8" />
              <Text style={styles.infoText}>
                This doctor has not set availability yet, or all slots are already booked.
              </Text>
            </View>
          ) : null}

          <FlatList
            data={slots}
            keyExtractor={(s, idx) => `${s.start}-${s.end}-${idx}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }) => {
              const active = selected?.start === item.start && selected?.end === item.end;
              return (
                <Pressable
                  onPress={() => setSelected(item)}
                  style={[styles.slotRow, active && styles.slotActive]}
                >
                  <View style={[styles.slotIcon, active && styles.slotIconActive]}>
                    <Ionicons
                      name={active ? "checkmark" : "time-outline"}
                      size={16}
                      color={active ? "#FFFFFF" : "#2B9FD8"}
                    />
                  </View>

                  <Text style={[styles.slotText, active && styles.slotTextActive]}>
                    {formatRange(item.start, item.end)}
                  </Text>
                </Pressable>
              );
            }}
          />

          <Pressable
            disabled={!selected}
            onPress={onCreate}
            style={[styles.btn, selected ? styles.btnPrimary : styles.btnDisabled]}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.btnText}>Create Appointment</Text>
          </Pressable>

          <View style={styles.noteCard}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#2B9FD8" />
            <Text style={styles.helper}>
              Note: The appointment will be created as pending. Once the doctor confirms, the status will change to
              “CONFIRMED” in the Telemedicine screen.
            </Text>
          </View>
        </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - match Prescription Scanner */
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
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

  /* Info card */
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { color: "#1A7BAF", fontWeight: "700", fontSize: 12, flex: 1, lineHeight: 18 },

  /* Slots */
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  slotActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  slotIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  slotIconActive: { backgroundColor: "rgba(255,255,255,0.22)", borderColor: "rgba(255,255,255,0.35)" },
  slotText: { fontWeight: "800", color: "#111827" },
  slotTextActive: { color: "#FFFFFF" },

  /* Button */
  btn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnPrimary: { backgroundColor: "#2B9FD8" },
  btnDisabled: { backgroundColor: "#9CA3AF" },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: -0.2 },

  /* Note card */
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  helper: { color: "#1A7BAF", fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 18 },
});