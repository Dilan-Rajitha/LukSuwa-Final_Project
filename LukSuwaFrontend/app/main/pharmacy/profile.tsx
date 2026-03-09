import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useContext, useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AuthContext } from "../../../src/context/AuthContext";

export default function PharmacyProfile() {
  const { user, logout } = useContext(AuthContext) as any;

  const initials = useMemo(() => {
    const name = user?.pharmacy_name || user?.username || "User";
    return String(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join("");
  }, [user?.username, user?.pharmacy_name]);

  const roleLabel = useMemo(() => {
    const role = String(user?.role || "").toLowerCase();
    if (role === "doctor") return "DOCTOR";
    if (role === "pharmacy") return "PHARMACY";
    if (role === "admin") return "ADMIN";
    return role ? role.toUpperCase() : "USER";
  }, [user?.role]);

  const approvedLabel = useMemo(() => {
    if (user?.type !== "SuperUser") return null;
    return user?.isApproved ? "APPROVED" : "PENDING";
  }, [user?.type, user?.isApproved]);

  const profileCompleteLabel = useMemo(() => {
    if (user?.role !== "pharmacy") return null;
    return user?.isProfileComplete ? "PROFILE COMPLETE" : "PROFILE INCOMPLETE";
  }, [user?.role, user?.isProfileComplete]);

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
          <Ionicons name="business-outline" size={28} color="#2B9FD8" />
        </View>

        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>No session found. Please login again.</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace("/auth/login")} activeOpacity={0.85}>
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = user?.pharmacy_name || user?.username || "User";
  const userId = user?.id || user?._id || "—";

  const okGreen = "#059669";
  const warnOrange = "#D97706";

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "U"}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.meta}>{user.email}</Text>

          <View style={styles.pillsRow}>
            <View style={styles.rolePill}>
              <Ionicons name="business-outline" size={14} color="#2B9FD8" />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>

            {approvedLabel && (
              <View style={[styles.statusPill, user?.isApproved ? styles.okPill : styles.warnPill]}>
                <Ionicons
                  name={user?.isApproved ? "checkmark-circle-outline" : "time-outline"}
                  size={14}
                  color={user?.isApproved ? okGreen : warnOrange}
                />
                <Text style={[styles.statusText, { color: user?.isApproved ? okGreen : warnOrange }]}>
                  {approvedLabel}
                </Text>
              </View>
            )}

            {profileCompleteLabel && (
              <View style={[styles.statusPill, user?.isProfileComplete ? styles.okPill : styles.warnPill]}>
                <Ionicons
                  name={user?.isProfileComplete ? "checkmark-done-outline" : "alert-circle-outline"}
                  size={14}
                  color={user?.isProfileComplete ? okGreen : warnOrange}
                />
                <Text style={[styles.statusText, { color: user?.isProfileComplete ? okGreen : warnOrange }]}>
                  {profileCompleteLabel}
                </Text>
              </View>
            )}
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
            <Text style={styles.rowValue}>{userId}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Account Type</Text>
            <Text style={styles.rowValue}>{roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* Pharmacy Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pharmacy Details</Text>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="id-card-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>License ID</Text>
            <Text style={styles.rowValue}>{user.license_id || "—"}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="document-text-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Certificate ID</Text>
            <Text style={styles.rowValue}>{user.certificate_id || "—"}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="location-outline" size={18} color="#2B9FD8" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Address</Text>
            <Text style={styles.rowValue}>{user.address || "—"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionBtnInfo}
          onPress={() => router.push("/main/pharmacy/completeProfile")}
          activeOpacity={0.85}
        >
          <View style={styles.actionIconBox}>
            <Ionicons name="map-outline" size={18} color="#2B9FD8" />
          </View>
          <Text style={styles.actionBtnTextInfo}>Update Location</Text>
          <Ionicons name="chevron-forward" size={18} color="#2B9FD8" />
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={handleLogout} activeOpacity={0.85}>
          <View style={styles.dangerIconBox}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </View>
          <Text style={styles.actionBtnTextDanger}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>LukSuwa • Pharmacy Profile</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },
  content: { padding: 20, paddingBottom: 30 },

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

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },

  rolePill: {
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

  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  okPill: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  warnPill: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  statusText: { fontSize: 12, fontWeight: "900" },

  section: { marginTop: 18 },
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

  actionBtn: {
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
  actionBtnTextDanger: { color: "#EF4444", fontWeight: "900", fontSize: 14 },

  actionBtnInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    marginTop: 2,
  },
  actionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnTextInfo: { flex: 1, color: "#1A7BAF", fontWeight: "900", fontSize: 14 },

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
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  title: { fontSize: 22, fontWeight: "900", color: "#111827" },
  sub: { marginTop: 8, fontSize: 14, color: "#6B7280", textAlign: "center", fontWeight: "600" },

  footerNote: {
    marginTop: 10,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
});