import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type Medication = {
  name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
};

export default function PatientPrescriptions() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);

  const ENDPOINT = "/ocr/upload";

  const patientInfo = result?.patientInfo;
  const meds: Medication[] = result?.medications ?? [];
  const savedCount = Array.isArray(result?.savedToDB) ? result.savedToDB.length : 0;

  const pickFromGallery = async () => {
    setError(""); setResult(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Please allow photo access."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9, allowsEditing: true,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    setError(""); setResult(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Please allow camera access."); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9, allowsEditing: true });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const buildFormData = (uri: string) => {
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
    const form = new FormData();
    form.append("image", { uri, name: `prescription.${ext}`, type: mime } as any);
    return form;
  };

  const upload = async () => {
    if (!imageUri) { setError("Please select an image first."); return; }
    setUploading(true); setError(""); setResult(null);
    try {
      const form = buildFormData(imageUri);
      const res = await API.post(ENDPOINT, form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const prettyPatient = useMemo(() => {
    const name = patientInfo?.name ?? null;
    const age = patientInfo?.age ?? null;
    return {
      name: name && String(name).trim().length ? String(name) : "Unknown",
      age: age && String(age).trim().length ? String(age) : "N/A",
    };
  }, [patientInfo]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F3F9FD" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Prescription Scanner</Text>
        <Text style={styles.subtitle}>
          Upload a handwritten prescription.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Image preview */}
        <View style={styles.previewBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <View style={styles.previewEmpty}>
              <View style={styles.previewIconCircle}>
                <Ionicons name="image-outline" size={32} color="#2B9FD8" />
              </View>
              <Text style={styles.previewTitle}>No image selected</Text>
              <Text style={styles.previewHint}>Take a photo or choose from gallery</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={pickFromGallery}>
            <View style={styles.actionIconBox}>
              <Ionicons name="images-outline" size={20} color="#2B9FD8" />
            </View>
            <Text style={styles.actionText}>Gallery</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={takePhoto}>
            <View style={styles.actionIconBox}>
              <Ionicons name="camera-outline" size={20} color="#2B9FD8" />
            </View>
            <Text style={styles.actionText}>Camera</Text>
          </Pressable>
        </View>

        {/* Upload button */}
        <Pressable
          style={[styles.uploadBtn, uploading && { opacity: 0.75 }]}
          onPress={upload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              <Text style={styles.uploadText}>Scan Prescription</Text>
            </>
          )}
        </Pressable>

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Results */}
        {result?.success ? (
          <View style={styles.resultCard}>

            {/* Success header */}
            <View style={styles.resultHeader}>
              <View style={styles.successIconBox}>
                <Ionicons name="checkmark-circle" size={22} color="#059669" />
              </View>
              <View>
                <Text style={styles.resultTitle}>Processed Successfully</Text>
                <Text style={styles.resultSub}>Prescription data extracted</Text>
              </View>
            </View>

            {/* Patient Info */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Patient Info</Text>
              </View>
              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <Ionicons name="person-outline" size={13} color="#2B9FD8" />
                  <Text style={styles.pillText}>{prettyPatient.name}</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="calendar-outline" size={13} color="#2B9FD8" />
                  <Text style={styles.pillText}>Age: {prettyPatient.age}</Text>
                </View>
              </View>
            </View>

            {/* Medications */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>
                  Medications ({Array.isArray(meds) ? meds.length : 0})
                </Text>
              </View>

              {Array.isArray(meds) && meds.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {meds.map((m, i) => (
                    <View key={i} style={styles.medCard}>
                      <View style={styles.medHeader}>
                        <View style={styles.medRank}>
                          <Text style={styles.medRankText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.medName}>
                          {m?.name ? String(m.name) : "Unknown medicine"}
                        </Text>
                      </View>
                      <View style={styles.medMetaRow}>
                        <View style={styles.medMetaPill}>
                          <Ionicons name="medical-outline" size={12} color="#2B9FD8" />
                          <Text style={styles.medMeta}>
                            {m?.dosage ? String(m.dosage) : "N/A"}
                          </Text>
                        </View>
                        <View style={styles.medMetaPill}>
                          <Ionicons name="time-outline" size={12} color="#2B9FD8" />
                          <Text style={styles.medMeta}>
                            {m?.frequency ? String(m.frequency) : "N/A"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No medicines detected.</Text>
              )}
            </View>

            {/* Saved */}
            <View style={styles.savedBanner}>
              <Ionicons name="checkmark-done-outline" size={18} color="#059669" />
              <Text style={styles.savedText}>
                Saved: <Text style={{ fontWeight: "900", color: "#059669" }}>{savedCount}</Text> item(s)
              </Text>
            </View>

            {/* Raw OCR toggle */}
            <Pressable onPress={() => setShowRaw((p) => !p)} style={styles.rawToggle}>
              <Ionicons name={showRaw ? "chevron-up" : "chevron-down"} size={18} color="#2B9FD8" />
              <Text style={styles.rawToggleText}>
                {showRaw ? "Hide raw OCR text" : "Show raw OCR text"}
              </Text>
            </Pressable>

            {showRaw ? (
              <View style={styles.rawBox}>
                <Text style={styles.rawText}>
                  {result?.rawText ? String(result.rawText) : "—"}
                </Text>
              </View>
            ) : null}

            <View style={styles.noteCard}>
              <Ionicons name="shield-checkmark-outline" size={15} color="#2B9FD8" />
              <Text style={styles.note}>
                Always verify medicines and instructions with a doctor or pharmacist.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 24,
    backgroundColor: "#F3F9FD",
    gap: 14,
  },

  /* Header */
  header: {
    backgroundColor: "#2B9FD8",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  title: {
    fontSize: 20, fontWeight: "900", color: "#FFFFFF",
    marginBottom: 2, letterSpacing: -0.5,
  },
  subtitle: { fontSize: 11, color: "rgba(255,255,255,0.82)", lineHeight: 18, fontWeight: "500" },

  /* Preview */
  previewBox: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  previewImg: { width: "100%", height: "100%" },
  previewEmpty: {
    flex: 1, justifyContent: "center", alignItems: "center", gap: 10,
  },
  previewIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: { fontSize: 15, fontWeight: "800", color: "#374151" },
  previewHint: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },

  /* Action buttons */
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  actionText: { fontWeight: "800", color: "#111827", fontSize: 14 },

  /* Upload */
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: -0.3 },

  /* Error */
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 14,
  },
  errorText: { color: "#DC2626", fontWeight: "700", fontSize: 14, flex: 1 },

  /* Result card */
  resultCard: {
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#D0EAFB",
  },
  successIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center", justifyContent: "center",
  },
  resultTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  resultSub: { fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 2 },

  /* Section */
  section: { gap: 10 },
  sectionTitleRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  sectionAccent: {
    width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },

  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  pillText: { color: "#1A7BAF", fontWeight: "800", fontSize: 12 },

  /* Med cards */
  medCard: {
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  medHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  medRank: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: "#2B9FD8",
    alignItems: "center", justifyContent: "center",
  },
  medRankText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  medName: { fontSize: 15, fontWeight: "900", color: "#111827", flex: 1 },
  medMetaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  medMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E0F3FB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  medMeta: { fontSize: 12, color: "#1A7BAF", fontWeight: "700" },

  emptyText: { color: "#9CA3AF", fontWeight: "700", fontSize: 13 },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    borderRadius: 12,
    padding: 12,
  },
  savedText: { color: "#111827", fontWeight: "700", fontSize: 13 },

  rawToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rawToggleText: { fontWeight: "800", color: "#2B9FD8", fontSize: 14 },

  rawBox: {
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    padding: 14,
  },
  rawText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },

  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    padding: 12,
  },
  note: { fontSize: 12, color: "#1A7BAF", fontWeight: "500", flex: 1, lineHeight: 18 },
});