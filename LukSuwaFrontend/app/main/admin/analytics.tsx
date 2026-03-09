

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type NormalUser = {
  _id: string;
  username?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: number;
  role?: string;
  createdAt?: string;
};

type SuperUser = {
  _id: string;
  username?: string;
  email?: string;
  role?: "doctor" | "pharmacy" | string;
  certificate_id?: string;
  specialization?: string;
  license_id?: string;
  pharmacy_name?: string;
  isApproved?: boolean;
  isProfileComplete?: boolean;
  createdAt?: string;
};

type PendingUser = {
  _id: string;
  username?: string;
  email?: string;
  role?: "doctor" | "pharmacy" | string;
  certificate_id?: string;
  certificate_image?: string;
  specialization?: string;
  license_id?: string;
  pharmacy_name?: string;
  createdAt?: string;
};

type Tip = {
  _id: string;
  title: string;
  body: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type UnifiedUser = {
  kind: "user" | "superuser";
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  isApproved?: boolean;
  isProfileComplete?: boolean;
  pharmacy_name?: string;
};

const normRole = (r?: string) => (r || "").toLowerCase().trim();

const safeDate = (d?: string) => {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return x;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

function fmtDate(d?: string) {
  const x = safeDate(d);
  if (!x) return "—";
  return x.toISOString().slice(0, 10);
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { user, token } = useContext(AuthContext) as any;

  const isAdmin = useMemo(() => String(user?.role || "").toLowerCase() === "admin", [user?.role]);
  const authHeaders = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<NormalUser[]>([]);
  const [superusers, setSuperusers] = useState<SuperUser[]>([]);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);

  const fetchAll = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [uRes, sRes, pRes, tRes] = await Promise.allSettled([
        API.get("/users", { headers: authHeaders }),
        API.get("/superusers", { headers: authHeaders }),
        API.get("/superusers/pending", { headers: authHeaders }),
        API.get("/health-tips", { headers: authHeaders }),
      ]);

      if (uRes.status === "fulfilled") {
        const list = uRes.value?.data || [];
        setUsers(Array.isArray(list) ? list : []);
      } else setUsers([]);

      if (sRes.status === "fulfilled") {
        const payload = sRes.value?.data;
        const list = payload?.users || payload || [];
        setSuperusers(Array.isArray(list) ? list : []);
      } else setSuperusers([]);

      if (pRes.status === "fulfilled") {
        const payload = pRes.value?.data;
        const list = payload?.users || payload?.pending || payload || [];
        setPending(Array.isArray(list) ? list : []);
      } else setPending([]);

      if (tRes.status === "fulfilled") {
        const list = tRes.value?.data?.tips || [];
        setTips(Array.isArray(list) ? list : []);
      } else setTips([]);
    } catch (e: any) {
      Alert.alert("Load Failed", e?.response?.data?.message || e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { setLoading(true); fetchAll(); }, [isAdmin, token]));

  const onRefresh = async () => { setRefreshing(true); await fetchAll(); };

  const unifiedUsers: UnifiedUser[] = useMemo(() => {
    const a: UnifiedUser[] = (users || []).map((u) => ({
      kind: "user", _id: u._id, username: u.username, email: u.email,
      role: u.role || "user", createdAt: u.createdAt,
    }));
    const b: UnifiedUser[] = (superusers || []).map((s) => ({
      kind: "superuser", _id: s._id, username: s.pharmacy_name || s.username,
      email: s.email, role: s.role, createdAt: s.createdAt,
      isApproved: s.isApproved, isProfileComplete: s.isProfileComplete,
      pharmacy_name: s.pharmacy_name,
    }));
    return [...a, ...b].sort((x, y) => {
      const dx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      const dy = y.createdAt ? new Date(y.createdAt).getTime() : 0;
      return dy - dx;
    });
  }, [users, superusers]);

  const counts = useMemo(() => {
    const totalUsers = unifiedUsers.length;
    const admins = unifiedUsers.filter((u) => normRole(u.role) === "admin").length;
    const doctors = unifiedUsers.filter((u) => normRole(u.role) === "doctor").length;
    const pharmacies = unifiedUsers.filter((u) => normRole(u.role) === "pharmacy").length;
    const regularUsers = unifiedUsers.filter((u) => {
      const r = normRole(u.role);
      return r !== "admin" && r !== "doctor" && r !== "pharmacy";
    }).length;
    const approved = (superusers || []).filter((s) => s.isApproved === true).length;
    const profileComplete = (superusers || []).filter((s) => s.isProfileComplete === true).length;
    const pendingApprovals = pending.length;
    const pendingDoctors = pending.filter((p) => normRole(p.role) === "doctor").length;
    const pendingPharmacies = pending.filter((p) => normRole(p.role) === "pharmacy").length;
    const activeTips = (tips || []).filter((t) => t.isActive === true).length;
    const inactiveTips = (tips || []).filter((t) => t.isActive === false).length;
    const d7 = daysAgo(7).getTime();
    const d30 = daysAgo(30).getTime();
    const new7 = unifiedUsers.filter((u) => { const dt = safeDate(u.createdAt); return dt ? dt.getTime() >= d7 : false; }).length;
    const new30 = unifiedUsers.filter((u) => { const dt = safeDate(u.createdAt); return dt ? dt.getTime() >= d30 : false; }).length;
    return { totalUsers, regularUsers, doctors, pharmacies, admins, pendingApprovals, pendingDoctors, pendingPharmacies, approved, profileComplete, activeTips, inactiveTips, new7, new30 };
  }, [unifiedUsers, superusers, pending, tips]);

  const recentUsers = useMemo(() => unifiedUsers.slice(0, 6), [unifiedUsers]);

  const tipSummary = useMemo(() => {
    const list = [...(tips || [])];
    list.sort((a, b) => {
      const da = safeDate(a.updatedAt || a.createdAt)?.getTime() || 0;
      const db = safeDate(b.updatedAt || b.createdAt)?.getTime() || 0;
      return db - da;
    });
    return list.slice(0, 4);
  }, [tips]);

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Ionicons name="shield-outline" size={46} color="#9CA3AF" />
        <Text style={styles.centerTitle}>Admin Only</Text>
        <Text style={styles.centerSub}>You don't have permission to access Analytics.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.sub}>System overview (users, approvals, health tips)</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Ionicons name="refresh" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B9FD8" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top KPIs */}
        <View style={styles.grid2}>
          <StatCard icon="people-outline" label="Total Users" value={counts.totalUsers} hint={`New: ${counts.new7} (7d) • ${counts.new30} (30d)`} />
          <StatCard icon="shield-checkmark-outline" label="Pending Approvals" value={counts.pendingApprovals} hint={`Doctors: ${counts.pendingDoctors} • Pharmacies: ${counts.pendingPharmacies}`} tone="warn" />
          <StatCard icon="medkit-outline" label="Doctors" value={counts.doctors} hint={`Approved Superusers: ${counts.approved}`} />
          <StatCard icon="storefront-outline" label="Pharmacies" value={counts.pharmacies} hint={`Profile Complete: ${counts.profileComplete}`} />
        </View>

        {/* Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>User Breakdown</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="pie-chart-outline" size={14} color="#2B9FD8" />
              <Text style={styles.pillText}>COUNTS</Text>
            </View>
          </View>
          <RowKV label="Regular Users" value={counts.regularUsers} />
          <RowKV label="Doctors" value={counts.doctors} />
          <RowKV label="Pharmacies" value={counts.pharmacies} />
          <RowKV label="Admins" value={counts.admins} />
          <View style={styles.divider} />
          <RowKV label="Pending Approvals" value={counts.pendingApprovals} accent="warn" />
          <RowKV label="Approved Superusers" value={counts.approved} accent="ok" />
          <RowKV label="Profile Complete (Superusers)" value={counts.profileComplete} />
        </View>

        {/* Health Tips */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>Health Tips</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/main/admin/healthTips")} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={18} color="#2B9FD8" />
            </TouchableOpacity>
          </View>
          <View style={styles.grid2}>
            <MiniPill label="Active" value={counts.activeTips} tone="ok" />
            <MiniPill label="Inactive" value={counts.inactiveTips} tone="warn" />
          </View>
          {tipSummary.length ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              {tipSummary.map((t) => (
                <View key={t._id} style={styles.listItem}>
                  <View style={styles.listIcon}>
                    <Ionicons
                      name={t.isActive ? "checkmark-circle-outline" : "time-outline"}
                      size={18}
                      color={t.isActive ? "#059669" : "#C2410C"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.listSub} numberOfLines={1}>
                      {(t.category || "general").toUpperCase()} • Updated: {fmtDate(t.updatedAt || t.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.muted}>No tips found.</Text>
          )}
        </View>

        {/* Recent Users */}
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardAccent} />
              <Text style={styles.cardTitle}>Recent Accounts</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/main/admin/users")} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={18} color="#2B9FD8" />
            </TouchableOpacity>
          </View>
          {recentUsers.length ? (
            <View style={{ gap: 10 }}>
              {recentUsers.map((u) => {
                const role = normRole(u.role);
                const title = u.username || u.email || "Unknown";
                const tag =
                  role === "admin"   ? { bg: "#E0F3FB", fg: "#2B9FD8", text: "ADMIN" }
                  : role === "doctor"  ? { bg: "#EFF6FF", fg: "#1D4ED8", text: "DOCTOR" }
                  : role === "pharmacy"? { bg: "#ECFDF5", fg: "#059669", text: "PHARMACY" }
                  :                     { bg: "#F3F4F6", fg: "#6B7280", text: "USER" };
                return (
                  <View key={`${u.kind}-${u._id}`} style={styles.listItem}>
                    <View style={styles.listIcon}>
                      <Ionicons
                        name={u.kind === "superuser" ? "person-circle-outline" : "person-outline"}
                        size={18}
                        color="#2B9FD8"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.listSub} numberOfLines={1}>{u.email || "—"} • {fmtDate(u.createdAt)}</Text>
                    </View>
                    <View style={[styles.roleTag, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.roleTagText, { color: tag.fg }]}>{tag.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>No recent accounts found.</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={styles.cardAccent} />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/main/admin/approvals")} activeOpacity={0.85}>
              <Ionicons name="checkmark-done-outline" size={18} color="#2B9FD8" />
              <Text style={styles.actionText}>Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/main/admin/users")} activeOpacity={0.85}>
              <Ionicons name="people-outline" size={18} color="#2B9FD8" />
              <Text style={styles.actionText}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/main/admin/healthTips")} activeOpacity={0.85}>
              <Ionicons name="heart-outline" size={18} color="#2B9FD8" />
              <Text style={styles.actionText}>Health Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 26 }} />
      </ScrollView>
    </View>
  );
}


function StatCard({ icon, label, value, hint, tone }: { icon: any; label: string; value: number; hint?: string; tone?: "ok" | "warn" }) {
  const pill =
    tone === "warn" ? { bg: "#FFF7ED", border: "#FED7AA" }
    : tone === "ok"  ? { bg: "#ECFDF5", border: "#A7F3D0" }
    :                  { bg: "#E0F3FB", border: "#D0EAFB" };
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: pill.bg, borderColor: pill.border }]}>
        <Ionicons name={icon} size={18} color="#2B9FD8" />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

function RowKV({ label, value, accent }: { label: string; value: number; accent?: "ok" | "warn" }) {
  const c = accent === "ok" ? "#059669" : accent === "warn" ? "#C2410C" : "#111827";
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kLabel}>{label}</Text>
      <Text style={[styles.kValue, { color: c }]}>{value}</Text>
    </View>
  );
}

function MiniPill({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const bg = tone === "ok" ? "#ECFDF5" : tone === "warn" ? "#FFF7ED" : "#F3F4F6";
  const fg = tone === "ok" ? "#059669" : tone === "warn" ? "#C2410C" : "#111827";
  return (
    <View style={[styles.miniPill, { backgroundColor: bg }]}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, { color: fg }]}>{value}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  sub: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },

  content: { padding: 16, paddingBottom: 30, gap: 12 },

  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    gap: 6,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 14,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  statLabel: { marginTop: 4, fontSize: 12, fontWeight: "900", color: "#6B7280" },
  statValue: { fontSize: 22, fontWeight: "900", color: "#111827" },
  statHint: { fontSize: 11, fontWeight: "700", color: "#6B7280", lineHeight: 16 },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 10, marginBottom: 10,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },

  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E0F3FB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: "#D0EAFB",
  },
  pillText: { fontSize: 11, fontWeight: "900", color: "#2B9FD8" },

  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8 },
  kLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  kValue: { fontSize: 12, fontWeight: "900", color: "#111827" },

  divider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 8 },

  miniPill: {
    width: "48%", borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: "#D0EAFB", gap: 4,
  },
  miniLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280" },
  miniValue: { fontSize: 18, fontWeight: "900" },

  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },

  listItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14,
    backgroundColor: "#F3F9FD",
    borderWidth: 1, borderColor: "#D0EAFB",
  },
  listIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
  },
  listTitle: { fontSize: 13, fontWeight: "900", color: "#111827" },
  listSub: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "#6B7280" },

  roleTag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  roleTagText: { fontSize: 11, fontWeight: "900" },

  muted: { marginTop: 6, color: "#6B7280", fontWeight: "700" },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  actionBtn: {
    flex: 1, minWidth: 100, height: 46, borderRadius: 14,
    backgroundColor: "#E0F3FB",
    borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  actionText: { fontSize: 12, fontWeight: "900", color: "#2B9FD8" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  centerTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: "#111827" },
  centerSub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center" },
});