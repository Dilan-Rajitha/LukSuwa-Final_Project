import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type SlotUI = {
  id: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  isBooked?: boolean;
};

type BackendSlot = {
  start: string; // ISO
  end: string;   // ISO
  isBooked: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toHM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const parseLocalDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`);
const isValidYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isValidHM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function buildTimes(step = 15) {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) out.push(`${pad2(h)}:${pad2(m)}`);
  }
  return out;
}
const TIMES_15 = buildTimes(15);

export default function SetAvailability() {
  const { user } = useContext(AuthContext) as any;

  const doctorId = useMemo(() => user?.id || user?._id, [user]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [slots, setSlots] = useState<SlotUI[]>([
    { id: String(Date.now()), date: toYMD(new Date()), startTime: "09:00", endTime: "12:00" },
  ]);

  // Time Picker Modal state (no new packages)
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [tpSlotId, setTpSlotId] = useState<string>("");
  const [tpField, setTpField] = useState<"startTime" | "endTime">("startTime");
  const [tpValue, setTpValue] = useState<string>("09:00");
  const [tpQuery, setTpQuery] = useState("");

  const addSlot = () => {
    const now = new Date();
    setSlots((prev) => [
      ...prev,
      { id: String(Date.now()), date: toYMD(now), startTime: "09:00", endTime: "12:00" },
    ]);
  };

  const removeSlot = (id: string) => setSlots((prev) => prev.filter((s) => s.id !== id));

  const updateSlot = (id: string, key: keyof SlotUI, value: string | boolean) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  };

  const validateSlots = (list: SlotUI[]) => {
    if (!list.length) return "Add at least one slot.";

    for (const s of list) {
      if (!isValidYMD(s.date)) return "Date format must be YYYY-MM-DD.";
      if (!isValidHM(s.startTime) || !isValidHM(s.endTime)) return "Time format must be HH:MM (24h).";

      const start = parseLocalDateTime(s.date, s.startTime);
      const end = parseLocalDateTime(s.date, s.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Invalid date/time value.";
      if (end <= start) return "End time must be after start time.";
    }

    const normalized = list
      .map((s) => ({
        id: s.id,
        start: parseLocalDateTime(s.date, s.startTime).getTime(),
        end: parseLocalDateTime(s.date, s.endTime).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 1; i < normalized.length; i++) {
      if (normalized[i].start < normalized[i - 1].end) {
        return "Some slots are overlapping. Please adjust times.";
      }
    }
    return null;
  };

  const loadMyAvailability = async () => {
    if (!doctorId) return;

    setLoading(true);
    try {
      const res = await API.get(`/availability/doctor/${doctorId}`);
      const apiSlots: BackendSlot[] = res.data?.slots || [];

      if (!apiSlots.length) {
        setSlots([{ id: String(Date.now()), date: toYMD(new Date()), startTime: "09:00", endTime: "12:00" }]);
        return;
      }

      const uiSlots: SlotUI[] = apiSlots.map((s, idx) => {
        const start = new Date(s.start);
        const end = new Date(s.end);
        return {
          id: `api-${idx}-${start.getTime()}`,
          date: toYMD(start),
          startTime: toHM(start),
          endTime: toHM(end),
          isBooked: !!s.isBooked,
        };
      });

      setSlots(uiSlots);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to load availability";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!doctorId) {
      Alert.alert("Auth missing", "Please login again.");
      return;
    }

    const err = validateSlots(slots);
    if (err) {
      Alert.alert("Fix this", err);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slots: slots.map((s) => ({
          start: parseLocalDateTime(s.date, s.startTime).toISOString(),
          end: parseLocalDateTime(s.date, s.endTime).toISOString(),
        })),
      };

      const res = await API.post("/availability/set-weekly", payload);

      Alert.alert("Saved", res.data?.message || "Availability saved");
      await loadMyAvailability();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save availability";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadMyAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const bookedCount = useMemo(() => slots.filter((s) => s.isBooked).length, [slots]);

  const openTimePicker = (slotId: string, field: "startTime" | "endTime", current: string) => {
    setTpSlotId(slotId);
    setTpField(field);
    setTpValue(current);
    setTpQuery("");
    setTimePickerOpen(true);
  };

  const closeTimePicker = () => {
    setTimePickerOpen(false);
    setTpQuery("");
  };

  const applyTime = () => {
    // If user typed custom value, validate. Otherwise use selected.
    const candidate = (tpQuery.trim() ? tpQuery.trim() : tpValue).replace(/\s/g, "");
    if (!isValidHM(candidate)) {
      Alert.alert("Invalid time", "Please enter time in HH:MM (24h). Example: 09:30");
      return;
    }
    updateSlot(tpSlotId, tpField, candidate);
    closeTimePicker();
  };

  const filteredTimes = useMemo(() => {
    const q = tpQuery.trim();
    if (!q) return TIMES_15;
    return TIMES_15.filter((t) => t.startsWith(q));
  }, [tpQuery]);

  return (
    <View style={styles.page}>
      {/* Blue header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Availability</Text>
          <Text style={styles.sub}>Set your weekly slots (patients can book from these).</Text>
        </View>

        <Pressable style={styles.refreshBtn} onPress={loadMyAvailability}>
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total slots</Text>
            <Text style={styles.statValue}>{slots.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Booked (hidden to patient)</Text>
            <Text style={styles.statValue}>{bookedCount}</Text>
          </View>
          {/* <Text style={styles.note}>Note: Patient endpoint only returns free slots (isBooked=false).</Text> */}
        </View>

        {slots.map((s) => (
          <View key={s.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.smallIconBox}>
                  <Ionicons name="time-outline" size={16} color="#2B9FD8" />
                </View>
                <Text style={styles.cardTitle}>Time Slot</Text>

                {s.isBooked ? (
                  <View style={styles.bookedPill}>
                    <Text style={styles.bookedText}>BOOKED</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={[styles.trashBtn, s.isBooked && { opacity: 0.4 }]}
                disabled={!!s.isBooked}
                onPress={() => removeSlot(s.id)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              value={s.date}
              onChangeText={(v) => updateSlot(s.id, "date", v)}
              placeholder="2025-12-20"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!s.isBooked}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Start</Text>

                {/* Tap to pick time */}
                <Pressable
                  onPress={() => !s.isBooked && openTimePicker(s.id, "startTime", s.startTime)}
                  style={[styles.timePick, s.isBooked && { opacity: 0.55 }]}
                >
                  <Text style={styles.timePickText}>{s.startTime}</Text>
                  <Ionicons name="chevron-down" size={18} color="#2B9FD8" />
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>End</Text>

                <Pressable
                  onPress={() => !s.isBooked && openTimePicker(s.id, "endTime", s.endTime)}
                  style={[styles.timePick, s.isBooked && { opacity: 0.55 }]}
                >
                  <Text style={styles.timePickText}>{s.endTime}</Text>
                  <Ionicons name="chevron-down" size={18} color="#2B9FD8" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <Pressable style={styles.addBtn} onPress={addSlot}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addText}>Add Slot</Text>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={saveAvailability}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
          <Text style={styles.saveText}>{saving ? "Saving..." : "Save Availability"}</Text>
        </Pressable>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={timePickerOpen} transparent animationType="fade" onRequestClose={closeTimePicker}>
        <View style={styles.tpOverlay}>
          <Pressable style={styles.tpBackdrop} onPress={closeTimePicker} />
          <View style={styles.tpCard}>
            <View style={styles.tpHeader}>
              <Text style={styles.tpTitle}>
                Select {tpField === "startTime" ? "Start Time" : "End Time"}
              </Text>
              <Pressable onPress={closeTimePicker} style={styles.tpCloseBtn}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.tpSearchRow}>
              <View style={styles.tpSearchIcon}>
                <Ionicons name="search-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={tpQuery}
                onChangeText={setTpQuery}
                placeholder="Search or type (HH:MM) e.g., 09:30"
                placeholderTextColor="#9CA3AF"
                style={styles.tpSearchInput}
              />
            </View>

            <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>
              <View style={styles.tpGrid}>
                {filteredTimes.slice(0, 96).map((t) => {
                  const active = t === tpValue;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setTpValue(t)}
                      style={[styles.tpTimeChip, active && styles.tpTimeChipActive]}
                    >
                      <Text style={[styles.tpTimeText, active && styles.tpTimeTextActive]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.tpActions}>
              <Pressable onPress={closeTimePicker} style={styles.tpBtnGhost}>
                <Text style={styles.tpBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyTime} style={styles.tpBtnPrimary}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.tpBtnPrimaryText}>Apply</Text>
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
    paddingHorizontal: 18,
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

  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingHorizontal: 18, paddingVertical: 10 },
  loadingText: { fontWeight: "800", color: "#6B7280" },

  statsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  statLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  statValue: { fontSize: 13, fontWeight: "900", color: "#111827" },
  note: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#9CA3AF" },

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
  cardTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },

  smallIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  bookedPill: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bookedText: { color: "#D97706", fontWeight: "900", fontSize: 11 },

  trashBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  input: {
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    backgroundColor: "#F3F9FD",
  },

  /* time picker button */
  timePick: {
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F3F9FD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timePickText: { fontSize: 14, fontWeight: "900", color: "#111827" },

  addBtn: {
    height: 46,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addText: { color: "#fff", fontWeight: "900" },

  saveBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  /* Time Picker Modal */
  tpOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  tpBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  tpCard: {
    width: "92%",
    maxWidth: 440,
    height: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    overflow: "hidden",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tpHeader: {
    height: 62,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2B9FD8",
  },
  tpTitle: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  tpCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  tpSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
  },
  tpSearchIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  tpSearchInput: { flex: 1, fontSize: 13, fontWeight: "800", color: "#111827" },

  tpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tpTimeChip: {
    width: "30%",
    minWidth: 88,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  tpTimeChipActive: {
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },
  tpTimeText: { fontWeight: "900", color: "#111827" },
  tpTimeTextActive: { color: "#FFFFFF" },

  tpActions: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
  },
  tpBtnGhost: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  tpBtnGhostText: { fontWeight: "900", color: "#111827" },

  tpBtnPrimary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  tpBtnPrimaryText: { fontWeight: "900", color: "#FFFFFF" },
});