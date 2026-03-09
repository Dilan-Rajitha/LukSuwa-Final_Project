import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type Sex = "male" | "female";
type Lang = "en" | "si" | "ta";

export default function PatientSymptoms() {
  const [lang, setLang] = useState<Lang>("en");
  const [text, setText] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<Sex>("male");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const scrollRef = useRef<ScrollView>(null);

  const ENDPOINT = "/ai/symptom-check";

  // Auto-detect language from text input
  useEffect(() => {
    if (!text.trim()) return;

    const detectLanguage = (input: string): Lang => {
      const sinhalaPattern = /[\u0D80-\u0DFF]/;
      const tamilPattern = /[\u0B80-\u0BFF]/;

      if (sinhalaPattern.test(input)) return "si";
      if (tamilPattern.test(input)) return "ta";
      return "en";
    };

    const detectedLang = detectLanguage(text);
    if (detectedLang !== lang) setLang(detectedLang);
  }, [text]);

  const payload = useMemo(() => {
    return {
      lang,
      text: text.trim(),
      age: Number(age) || 0,
      sex,
      vitals: {
        additionalProp1: {},
      },
    };
  }, [lang, text, age, sex]);

  const onCheck = async () => {
    setError("");
    setResult(null);

    if (!payload.text) {
      setError("Please enter your symptoms.");
      return;
    }
    if (!payload.age || payload.age < 1 || payload.age > 120) {
      setError("Please enter a valid age (1–120).");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post(ENDPOINT, payload);
      setResult(res.data);

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const topConditions = result?.top_conditions ?? [];
  const triage = result?.triage;
  const disclaimer = result?.disclaimer;

  const triageLabel = (level?: string) => {
    if (!level) return "N/A";
    const map: Record<string, string> = {
      EMERGENCY: "Emergency care now",
      ER_NOW: "Go to ER now",
      GP_24_48H: "See a GP within 24–48 hours",
      GP_SOON: "See a GP soon",
      SELF_CARE: "Self-care recommended",
    };
    return map[level] ?? level;
  };

  const getTriageColor = (level?: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      EMERGENCY: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626" },
      ER_NOW: { bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626" },
      GP_24_48H: { bg: "#FFFBEB", border: "#FCD34D", text: "#D97706" },
      GP_SOON: { bg: "#EFF6FF", border: "#93C5FD", text: "#2563EB" },
      SELF_CARE: { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" },
    };
    return colors[level || ""] || colors.SELF_CARE;
  };

  const getLangLabel = (l: Lang) => {
    const labels = { en: "English", si: "සිංහල", ta: "தமிழ்" };
    return labels[l];
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F3F9FD" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ✅ Blue Header (match other screens) */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Symptom Checker</Text>
        <Text style={styles.headerSub}>
          Describe your symptoms and get instant AI-powered health insights
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patient Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                value={age}
                onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
                placeholder="28"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                style={styles.input}
                maxLength={3}
              />
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.row}>
                <Chip
                  active={sex === "male"}
                  onPress={() => setSex("male")}
                  text="Male"
                  icon="male"
                />
                <Chip
                  active={sex === "female"}
                  onPress={() => setSex("female")}
                  text="Female"
                  icon="female"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Symptoms Card */}
        <View style={styles.card}>
          <View style={styles.symptomHeader}>
            <Text style={styles.cardTitle}>Describe Your Symptoms</Text>
            {text.trim() ? (
              <View style={styles.langBadge}>
                <Ionicons name="language" size={11} color="#2B9FD8" />
                <Text style={styles.langBadgeText}>{getLangLabel(lang)}</Text>
              </View>
            ) : null}
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Example: fever, headache, body aches for 2 days"
            placeholderTextColor="#9CA3AF"
            style={styles.textArea}
            multiline
          />
          <View style={styles.hintRow}>
            <Ionicons name="information-circle" size={14} color="#2B9FD8" />
            <Text style={styles.hint}>Type in English, Sinhala or Tamil - auto-detected</Text>
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={onCheck}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.buttonText}>Analyze Symptoms</Text>
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
        {result ? (
          <View style={styles.resultContainer}>
            {/* Triage Alert */}
            {triage ? (
              <View
                style={[
                  styles.triageCard,
                  {
                    backgroundColor: getTriageColor(triage?.level).bg,
                    borderColor: getTriageColor(triage?.level).border,
                  },
                ]}
              >
                <View style={styles.triageHeader}>
                  <View
                    style={[
                      styles.triageIconContainer,
                      { backgroundColor: getTriageColor(triage?.level).border },
                    ]}
                  >
                    <Ionicons
                      name={
                        triage?.level?.includes("EMERGENCY") || triage?.level?.includes("ER")
                          ? "warning"
                          : "information-circle"
                      }
                      size={20}
                      color={getTriageColor(triage?.level).text}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.triageTitle, { color: getTriageColor(triage?.level).text }]}>
                      PRIORITY RECOMMENDATION
                    </Text>
                    <Text style={[styles.triageLevel, { color: getTriageColor(triage?.level).text }]}>
                      {triageLabel(triage?.level)}
                    </Text>
                  </View>
                </View>

                {Array.isArray(triage?.why) && triage.why.length > 0 ? (
                  <View style={styles.triageReasons}>
                    {triage.why.map((w: string, i: number) => (
                      <View key={i} style={styles.triageReasonRow}>
                        <View style={[styles.dot, { backgroundColor: getTriageColor(triage?.level).text }]} />
                        <Text style={[styles.triageWhy, { color: getTriageColor(triage?.level).text }]}>
                          {w}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Conditions */}
            <View style={styles.card}>
              <View style={styles.conditionsHeader}>
                <View>
                  <Text style={styles.cardTitle}>Possible Conditions</Text>
                  <Text style={styles.cardSubtitle}>Top 3 matches based on your symptoms</Text>
                </View>
              </View>

              {Array.isArray(topConditions) && topConditions.length > 0 ? (
                <View style={styles.conditionsList}>
                  {topConditions.slice(0, 3).map((c: any, idx: number) => (
                    <View key={c?.id ?? idx} style={styles.conditionCard}>
                      <View style={styles.conditionHeader}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.conditionName}>{c?.name ?? "Unknown"}</Text>
                          <Text style={styles.conditionId}>ID: {c?.id ?? "N/A"}</Text>
                        </View>
                      </View>

                      <View style={styles.probabilityContainer}>
                        <View style={styles.probabilityBar}>
                          <View
                            style={[
                              styles.probabilityActive,
                              { width: `${Math.min(Number(c?.prob_pct ?? 0), 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.probabilityText}>
                          {Number(c?.prob_pct ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No conditions identified</Text>
              )}
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="shield-checkmark" size={18} color="#2B9FD8" />
              <Text style={styles.disclaimer}>
                {disclaimer ??
                  "This is an educational aid only and not a medical diagnosis. If symptoms are severe or urgent, please consult a healthcare professional immediately."}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Chip({
  active,
  text,
  onPress,
  icon,
}: {
  active: boolean;
  text: string;
  onPress: () => void;
  icon?: any;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon && <Ionicons name={icon} size={14} color={active ? "#fff" : "#2B9FD8"} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 18,
    backgroundColor: "#F3F9FD",
    paddingBottom: 40,
    gap: 14,
  },

  /* ✅ Blue header bar */
  header: {
    backgroundColor: "#2B9FD8",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 18,
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },

  infoRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  infoItem: { flex: 1 },

  label: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8 },

  chip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#F3F9FD",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  chipActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  chipText: { fontSize: 13, fontWeight: "800", color: "#1A7BAF" },
  chipTextActive: { color: "#fff" },

  input: {
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F3F9FD",
    fontWeight: "700",
  },

  symptomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  langBadgeText: { fontSize: 10, fontWeight: "800", color: "#2B9FD8" },

  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F3F9FD",
    textAlignVertical: "top",
    fontWeight: "600",
    lineHeight: 22,
  },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  hint: { fontSize: 12, color: "#6B7280", fontWeight: "600", flex: 1 },

  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
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
  buttonDisabled: { opacity: 0.75 },
  buttonText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: -0.3 },

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

  resultContainer: { gap: 16 },

  triageCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  triageHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  triageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  triageTitle: { fontWeight: "800", fontSize: 11, letterSpacing: 0.5, marginBottom: 4 },
  triageLevel: { fontWeight: "900", fontSize: 16, letterSpacing: -0.3 },
  triageReasons: { marginTop: 14, gap: 8, paddingLeft: 52 },
  triageReasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 6 },
  triageWhy: { fontWeight: "600", fontSize: 13, flex: 1, lineHeight: 18 },

  conditionsHeader: { marginBottom: 14 },
  conditionsList: { gap: 12 },

  conditionCard: {
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 16,
    padding: 14,
  },
  conditionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  conditionName: { fontSize: 15, fontWeight: "900", color: "#111827", lineHeight: 20, letterSpacing: -0.3 },
  conditionId: { marginTop: 3, fontSize: 11, color: "#6B7280", fontWeight: "600" },

  probabilityContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  probabilityBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#D0EAFB", overflow: "hidden" },
  probabilityActive: { height: "100%", backgroundColor: "#2B9FD8", borderRadius: 3 },
  probabilityText: { fontSize: 13, color: "#374151", fontWeight: "800", minWidth: 45, textAlign: "right" },

  emptyText: { color: "#9CA3AF", fontWeight: "600", textAlign: "center", paddingVertical: 20, fontSize: 14 },

  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    padding: 14,
  },
  disclaimer: { fontSize: 12, color: "#1A6A8F", fontWeight: "600", flex: 1, lineHeight: 18 },
});