import { Ionicons } from "@expo/vector-icons";
import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

export default function AdminSettings() {
  const { user } = useContext(AuthContext) as any;

  const isAdmin = useMemo(() => {
    return String(user?.role || "").toLowerCase() === "admin";
  }, [user?.role]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPhone("");
    setGender("male");
    setAge("");
    setPassword("");
    setConfirm("");
  };

  const validateEmail = (v: string) => {
    const x = v.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
  };

  const createAdmin = async () => {
    if (!isAdmin) {
      Alert.alert("Access Denied", "Only admin accounts can create another admin.");
      return;
    }

    const u = username.trim();
    const e = email.trim().toLowerCase();
    const p = phone.trim();
    const a = Number(age);

    if (!u || !e || !p || !age || !password || !confirm) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    if (!validateEmail(e)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!Number.isFinite(a) || a < 10 || a > 120) {
      Alert.alert("Invalid Age", "Please enter a valid age.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      Alert.alert("Password Mismatch", "Password and confirm password must match.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        username: u,
        email: e,
        password,
        gender,
        age: a,
        phone: p,
        role: "admin",
      };

      const res = await API.post("/users", payload);

      Alert.alert("Admin Created", res?.data?.message || "Admin account created successfully.");
      resetForm();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to create admin.";

      Alert.alert("Create Failed", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Admin Settings</Text>
          <Text style={styles.sub}>Create and manage admin access</Text>
        </View>

        <View style={styles.rolePill}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
          <Text style={styles.roleText}>{(user?.role || "USER").toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Create Admin */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Create Admin Account</Text>
              <Text style={styles.sectionSub}>
                Add a new admin who can manage approvals and users.
              </Text>
            </View>

            <View style={styles.badge}>
              <Ionicons name="person-add-outline" size={14} color="#2B9FD8" />
            </View>
          </View>

          {!isAdmin ? (
            <View style={styles.warningBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
              <Text style={styles.warningText}>
                You are not logged in as an admin. Admin access is required to create admin accounts.
              </Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            {/* Username */}
            <Text style={styles.label}>Username *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="person-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g., Admin John"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="mail-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@email.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Phone */}
            <Text style={styles.label}>Phone *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="call-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="07xxxxxxxx"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "phone-pad"}
              />
            </View>

            {/* Gender */}
            <Text style={styles.label}>Gender *</Text>
            <View style={styles.genderRow}>
              {(["male", "female"] as const).map((g) => {
                const active = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, active && styles.genderChipActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.genderText, active && styles.genderTextActive]}>
                      {g.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Age */}
            <Text style={styles.label}>Age *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="calendar-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="e.g., 25"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Confirm */}
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputIconBox}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2B9FD8" />
              </View>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Re-enter password"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={resetForm}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Ionicons name="refresh-outline" size={18} color="#111827" />
                <Text style={styles.secondaryBtnText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, (!isAdmin || saving) && { opacity: 0.6 }]}
                onPress={createAdmin}
                activeOpacity={0.85}
                disabled={!isAdmin || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Create Admin</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>LukSuwa • Admin Panel</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#2B9FD8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  h1: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  roleText: { fontSize: 12, fontWeight: "900", color: "#FFFFFF" },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },

  section: { marginTop: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  sectionSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },

  warningBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: "800", color: "#92400E", lineHeight: 18 },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    padding: 16,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  label: { fontSize: 12, fontWeight: "900", color: "#6B7280", marginTop: 10, marginBottom: 8 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  input: { flex: 1, fontSize: 13, fontWeight: "900", color: "#111827" },

  genderRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  genderChipActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  genderText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  genderTextActive: { color: "#FFFFFF" },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "900", color: "#111827" },

  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { fontSize: 13, fontWeight: "900", color: "#FFFFFF" },

  footer: { marginTop: 18, textAlign: "center", color: "#9CA3AF", fontSize: 12, fontWeight: "700" },
});