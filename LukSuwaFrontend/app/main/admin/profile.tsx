import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../../src/context/AuthContext";

export default function AdminProfile() {
  const { user, logout } = useContext(AuthContext) as any;

  const initials = useMemo(() => {
    const name = user?.username || "Admin";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join("");
  }, [user?.username]);

  const roleLabel = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    if (role === "doctor") return "DOCTOR";
    if (role === "pharmacy") return "PHARMACY";
    if (role === "admin") return "ADMIN";
    return role ? role.toUpperCase() : "USER";
  }, [user?.role]);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          logout?.();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <View style={styles.centerIconCircle}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#2B9FD8" />
        </View>
        <Text style={styles.title}>Admin Profile</Text>
        <Text style={styles.sub}>No session found. Please login again.</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace("/auth/login")}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "A"}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.username || "Admin"}</Text>
          <Text style={styles.meta}>{user.email || "—"}</Text>

          <View style={styles.rolePill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#2B9FD8" />
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* Account Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="person-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue}>{user.username || "—"}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user.email || "—"}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="finger-print-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>User ID</Text>
            <Text style={styles.rowValue}>{user.id || user._id || "—"}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Role</Text>
            <Text style={styles.rowValue}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <View style={styles.dangerIconBox}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </View>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>LukSuwa • Admin Profile</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },
  content: { padding: 20, paddingBottom: 30, gap: 14 },

  center: {
    flex: 1,
    backgroundColor: "#F3F9FD",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  centerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  headerCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#2B9FD8",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 0.5 },

  name: { fontSize: 18, fontWeight: "900", color: "#111827", letterSpacing: -0.3 },
  meta: { marginTop: 4, fontSize: 13, color: "#6B7280", fontWeight: "600" },

  rolePill: {
    marginTop: 10,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roleText: { color: "#1A7BAF", fontSize: 12, fontWeight: "900" },

  section: { marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827", marginBottom: 10 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  rowBody: { flex: 1 },
  rowLabel: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
  rowValue: { marginTop: 2, fontSize: 15, color: "#111827", fontWeight: "800" },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: "#EF4444", fontWeight: "900", fontSize: 14 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#2B9FD8",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.30,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 6, fontSize: 14, color: "#6B7280", textAlign: "center", fontWeight: "600" },

  footerNote: {
    marginTop: 10,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
});