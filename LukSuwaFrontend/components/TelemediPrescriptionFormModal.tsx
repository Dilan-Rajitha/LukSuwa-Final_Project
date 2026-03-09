import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import API from "../src/api/axiosConfig";

type Med = { name: string; dosage: string; frequency: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  token: string;
  callId: string;

  // optional defaults (nice UX)
  patientNameDefault?: string;
  doctorNameDefault?: string;

  // callback for parent chat to show message + save
  onCreated: (payload: { prescriptionId: string; pdfUrl: string }) => void;
};

export default function TelemediPrescriptionFormModal({
  visible,
  onClose,
  token,
  callId,
  patientNameDefault = "",
  doctorNameDefault = "",
  onCreated,
}: Props) {
  const [patientName, setPatientName] = useState(patientNameDefault);
  const [age, setAge] = useState("");
  const [doctorName, setDoctorName] = useState(doctorNameDefault);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [meds, setMeds] = useState<Med[]>([{ name: "", dosage: "", frequency: "" }]);
  const [saving, setSaving] = useState(false);

  const addRow = () => setMeds((p) => [...p, { name: "", dosage: "", frequency: "" }]);
  const removeRow = (idx: number) => setMeds((p) => p.filter((_, i) => i !== idx));

  const updateMed = (idx: number, patch: Partial<Med>) => {
    setMeds((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const canSave = useMemo(() => {
    if (!patientName.trim() || !age.trim() || !doctorName.trim() || !date.trim()) return false;
    const anyComplete = meds.some((m) => m.name.trim() && m.dosage.trim() && m.frequency.trim());
    return anyComplete;
  }, [patientName, age, doctorName, date, meds]);

  const save = async () => {
    if (!canSave || saving) return;

    const medicines = meds
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
      }))
      .filter((m) => m.name && m.dosage && m.frequency);

    try {
      setSaving(true);

      const res = await API.post(
        "/telemediPrescription/create",
        {
          callId,
          patientName: patientName.trim(),
          age: age.trim(),
          doctorName: doctorName.trim(),
          date, // "YYYY-MM-DD" -> backend converts
          medicines,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const prescriptionId = res.data?.prescriptionId;
      const pdfUrl = res.data?.pdfUrl;

      if (prescriptionId && pdfUrl) {
        onCreated({ prescriptionId, pdfUrl });
        onClose();
      }
    } catch (e) {
      console.log("Prescription save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.topBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.topIconCircle}>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>Create Prescription</Text>
                <Text style={styles.sub}>Fill details and generate PDF</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 12, paddingBottom: 18, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Field label="Patient Name" value={patientName} onChangeText={setPatientName} />
            <Field
              label="Age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="e.g., 24"
            />
            <Field label="Doctor Name" value={doctorName} onChangeText={setDoctorName} />
            <Field
              label="Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-02-25"
            />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Medicines</Text>

              <Pressable onPress={addRow} style={styles.smallBtn}>
                <Ionicons name="add" size={16} color="#2B9FD8" />
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>

            {meds.map((m, idx) => (
              <View key={idx} style={styles.medCard}>
                <View style={styles.medHeader}>
                  <Text style={styles.medTitle}>Medicine {idx + 1}</Text>
                  {meds.length > 1 && (
                    <Pressable onPress={() => removeRow(idx)} style={styles.trashBtn}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </Pressable>
                  )}
                </View>

                <Field
                  label="Medicine Name"
                  value={m.name}
                  onChangeText={(t: string) => updateMed(idx, { name: t })}
                  placeholder="e.g., Paracetamol"
                />
                <Field
                  label="Dosage"
                  value={m.dosage}
                  onChangeText={(t: string) => updateMed(idx, { dosage: t })}
                  placeholder="e.g., 500mg"
                />
                <Field
                  label="Frequency"
                  value={m.frequency}
                  onChangeText={(t: string) => updateMed(idx, { frequency: t })}
                  placeholder="e.g., 1-0-1 after meals"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.bottomBar}>
            <Pressable
              onPress={save}
              disabled={!canSave || saving}
              style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.saveText}>{saving ? "Saving..." : "Save & Generate PDF"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "900", color: "#111827" }}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },

  card: {
    height: "85%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },

  topBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2B9FD8",
  },
  topIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.2 },
  sub: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.82)" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  inputWrap: {
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    backgroundColor: "#F3F9FD",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontWeight: "700",
    color: "#111827",
    fontSize: 14,
    padding: 0,
  },

  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#E6F4FF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  smallBtnText: { fontWeight: "900", color: "#2B9FD8" },

  medCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  medHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  medTitle: { fontWeight: "900", color: "#111827" },
  trashBtn: { padding: 6, borderRadius: 10, backgroundColor: "#FEE2E2" },

  bottomBar: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { color: "#FFFFFF", fontWeight: "900" },
});