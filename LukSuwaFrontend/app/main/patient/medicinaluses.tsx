import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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

export default function MedicinalUses() {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const ENDPOINT = "/ai/medicine/uses";

  const payload = useMemo(
    () => ({
      name: name.trim(),
      strength: strength.trim(),
    }),
    [name, strength]
  );

  const pickText = (data: any) => {
    if (!data) return "";
    if (typeof data === "string") return data;
    return (
      data?.uses ||
      data?.usage ||
      data?.description ||
      data?.answer ||
      data?.message ||
      data?.response ||
      ""
    );
  };

  const toBullets = (text: string) => {
    const cleaned = text
      .replace(/\r/g, "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (cleaned.length > 1) return cleaned;

    const parts = text
      .split(".")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return parts.length > 1 ? parts.map((p) => p + ".") : [text];
  };

  const onSearch = async () => {
    setError("");
    setResult(null);

    if (!payload.name) {
      setError("Please enter a medicine name.");
      return;
    }
    if (!payload.strength) {
      setError("Please enter the strength (e.g., 500mg, 10mg).");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post(ENDPOINT, payload);
      setResult(res.data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resultText = useMemo(() => pickText(result), [result]);
  const bullets = useMemo(() => (resultText ? toBullets(resultText) : []), [resultText]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F3F9FD" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header (match Prescription Scanner) */}
      <View style={styles.header}>
        <Text style={styles.title}>Medicinal Uses</Text>
        <Text style={styles.subtitle}>
          Search by medicine name and strength to understand common uses
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Search Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medicine Information</Text>

          <View>
            <Text style={styles.label}>Medicine Name</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <Ionicons name="medical" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Paracetamol"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Strength</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <Ionicons name="speedometer" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={strength}
                onChangeText={setStrength}
                placeholder="e.g., 500mg"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.hintRow}>
            <Ionicons name="information-circle" size={14} color="#2B9FD8" />
            <Text style={styles.hint}>
              Enter both name and strength for accurate results
            </Text>
          </View>
        </View>

        {/* Search Button (match blue upload button style) */}
        <Pressable
          onPress={onSearch}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.buttonText}>Search Medicine</Text>
            </>
          )}
        </Pressable>

        {/* Error (same as prescription) */}
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Results */}
        {result ? (
          <View style={styles.resultContainer}>
            {/* Medicine Info Header */}
            <View style={styles.medicineHeader}>
              <View style={styles.medicineIconContainer}>
                <Ionicons name="flask-outline" size={22} color="#059669" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.medicineName}>{payload.name}</Text>
                <Text style={styles.medicineStrength}>{payload.strength}</Text>
              </View>

              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            {/* Uses Card */}
            <View style={styles.card}>
              <View style={styles.usesHeader}>
                <Ionicons name="list" size={18} color="#111827" />
                <Text style={styles.cardTitle}>Common Uses</Text>
              </View>

              {bullets.length > 0 ? (
                <View style={styles.bulletList}>
                  {bullets.map((b, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={styles.bulletIcon}>
                        <View style={styles.bulletDot} />
                      </View>
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.rawTextContainer}>
                  <Text style={styles.rawText}>
                    {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Disclaimer (match noteCard vibe) */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2B9FD8" />
              <Text style={styles.disclaimer}>
                This information is educational. Always follow a doctor's advice and read the medicine label before use.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 24,
    backgroundColor: "#F3F9FD",
    paddingBottom: 40,
    gap: 14,
  },

  /* Header (same as Prescription Scanner) */
  header: {
    backgroundColor: "#2B9FD8",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Card (match prescription resultCard) */
  card: {
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

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
  },

  /* Inputs (match pill/input softness) */
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F3F9FD",
  },
  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
    padding: 0,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hint: {
    fontSize: 12,
    color: "#1A7BAF",
    fontWeight: "600",
    flex: 1,
  },

  /* Primary button (match uploadBtn) */
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: -0.3,
  },

  /* Error (same as prescription) */
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
  errorText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },

  resultContainer: { gap: 16 },

  /* Medicine header card (same card style) */
  medicineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  medicineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: -0.3,
  },
  medicineStrength: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A7BAF",
    marginTop: 3,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },

  usesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },

  /* Bullets (match soft blue pills) */
  bulletList: { gap: 12 },
  bulletRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  bulletIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2B9FD8",
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
    fontWeight: "600",
  },

  rawTextContainer: {
    backgroundColor: "#F3F9FD",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  rawText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },

  /* Disclaimer (like noteCard) */
  disclaimerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 12,
    padding: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: "#1A7BAF",
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
});