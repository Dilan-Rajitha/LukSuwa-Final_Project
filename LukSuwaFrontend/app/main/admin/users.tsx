import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type NormalUser = {
  _id: string;
  username?: string;
  email?: string;
  gender?: string;
  age?: number;
  phone?: string;
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

type UnifiedUser = {
  kind: "user" | "superuser";
  _id: string;
  username?: string;
  email?: string;
  phone?: string;
  gender?: string;
  age?: number;
  role?: string;
  createdAt?: string;

  certificate_id?: string;
  specialization?: string;
  license_id?: string;
  pharmacy_name?: string;
  isApproved?: boolean;
  isProfileComplete?: boolean;
};

type FilterKey = "all" | "users" | "doctors" | "pharmacies" | "admins";

export default function AdminUsers() {
  const { token } = useContext(AuthContext) as any;

  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [patientsUsers, setPatientsUsers] = useState<NormalUser[]>([]);
  const [superusers, setSuperusers] = useState<SuperUser[]>([]);

  const [query, setQuery] = useState("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState("Details");
  const [detailsRows, setDetailsRows] = useState<{ label: string; value: string }[]>([]);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return String(d);
      return date.toISOString().slice(0, 10);
    } catch {
      return String(d);
    }
  };

  const normRole = (r?: string) => (r || "").toLowerCase().trim();

  const openDetails = (title: string, rows: { label: string; value: string }[]) => {
    setDetailsTitle(title);
    setDetailsRows(rows);
    setDetailsOpen(true);
  };

  const fetchAll = async () => {
    try {
      if (!token) {
        setPatientsUsers([]);
        setSuperusers([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [uRes, sRes] = await Promise.allSettled([
        API.get("/users", { headers: authHeaders }),
        API.get("/superusers", { headers: authHeaders }),
      ]);

      if (uRes.status === "fulfilled") {
        const list = uRes.value?.data || [];
        setPatientsUsers(Array.isArray(list) ? list : []);
      } else {
        console.log("users fetch error:", (uRes.reason as any)?.message);
        setPatientsUsers([]);
      }

      if (sRes.status === "fulfilled") {
        const payload = sRes.value?.data;
        const list = payload?.users || payload || [];
        setSuperusers(Array.isArray(list) ? list : []);
      } else {
        console.log("superusers fetch error:", (sRes.reason as any)?.message);
        setSuperusers([]);
      }
    } catch (e: any) {
      console.log("admin users fetch error:", e?.response?.status, e?.response?.data || e?.message);
      Alert.alert("Load Failed", e?.response?.data?.message || e?.message || "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const allUnified: UnifiedUser[] = useMemo(() => {
    const a: UnifiedUser[] = (patientsUsers || []).map((u) => ({
      kind: "user",
      _id: u._id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      gender: u.gender,
      age: u.age,
      role: u.role || "user",
      createdAt: u.createdAt,
    }));

    const b: UnifiedUser[] = (superusers || []).map((s) => ({
      kind: "superuser",
      _id: s._id,
      username: s.username,
      email: s.email,
      role: s.role,
      createdAt: s.createdAt,
      certificate_id: s.certificate_id,
      specialization: s.specialization,
      license_id: s.license_id,
      pharmacy_name: s.pharmacy_name,
      isApproved: s.isApproved,
      isProfileComplete: s.isProfileComplete,
    }));

    const merged = [...a, ...b];
    merged.sort((x, y) => {
      const dx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      const dy = y.createdAt ? new Date(y.createdAt).getTime() : 0;
      return dy - dx;
    });

    return merged;
  }, [patientsUsers, superusers]);

  const counts = useMemo(() => {
    const all = allUnified.length;
    const doctors = allUnified.filter((u) => normRole(u.role) === "doctor").length;
    const pharmacies = allUnified.filter((u) => normRole(u.role) === "pharmacy").length;
    const admins = allUnified.filter((u) => normRole(u.role) === "admin").length;

    const users = allUnified.filter((u) => {
      const r = normRole(u.role);
      return r !== "doctor" && r !== "pharmacy" && r !== "admin";
    }).length;

    return { all, users, doctors, pharmacies, admins };
  }, [allUnified]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();

    let base = allUnified;

    if (filter === "doctors") base = base.filter((u) => normRole(u.role) === "doctor");
    if (filter === "pharmacies") base = base.filter((u) => normRole(u.role) === "pharmacy");
    if (filter === "admins") base = base.filter((u) => normRole(u.role) === "admin");
    if (filter === "users") {
      base = base.filter((u) => {
        const r = normRole(u.role);
        return r !== "doctor" && r !== "pharmacy" && r !== "admin";
      });
    }

    if (!q) return base;

    return base.filter((u) => {
      const hay = `${u.username || ""} ${u.email || ""} ${u.phone || ""} ${u.role || ""} ${
        u.certificate_id || ""
      } ${u.specialization || ""} ${u.license_id || ""} ${u.pharmacy_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allUnified, filter, query]);

  const RolePill = ({ role }: { role?: string }) => {
    const r = normRole(role);
    const label = r ? r.toUpperCase() : "USER";

    const icon =
      r === "admin"
        ? "shield-checkmark-outline"
        : r === "doctor"
        ? "medkit-outline"
        : r === "pharmacy"
        ? "storefront-outline"
        : "person-outline";

    // blue-theme friendly colors
    const fg =
      r === "admin" ? "#111827" : r === "doctor" ? "#2B9FD8" : r === "pharmacy" ? "#059669" : "#6B7280";

    const bg =
      r === "doctor" ? "#E0F3FB" : r === "pharmacy" ? "#ECFDF5" : r === "admin" ? "#F3F4F6" : "#F3F9FD";

    const border =
      r === "doctor" ? "#D0EAFB" : r === "pharmacy" ? "#6EE7B7" : r === "admin" ? "#E5E7EB" : "#D0EAFB";

    return (
      <View style={[styles.rolePill, { backgroundColor: bg, borderColor: border }]}>
        <Ionicons name={icon as any} size={14} color={fg} />
        <Text style={[styles.rolePillText, { color: fg }]}>{label}</Text>
      </View>
    );
  };

  const StatusPill = ({ approved }: { approved?: boolean }) => {
    const ok = approved === true;
    return (
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: ok ? "#ECFDF5" : "#FFFBEB",
            borderColor: ok ? "#6EE7B7" : "#FCD34D",
          },
        ]}
      >
        <Ionicons
          name={ok ? "checkmark-circle-outline" : "time-outline"}
          size={14}
          color={ok ? "#059669" : "#D97706"}
        />
        <Text style={[styles.statusText, { color: ok ? "#059669" : "#D97706" }]}>
          {ok ? "APPROVED" : "PENDING"}
        </Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: UnifiedUser }) => {
    const r = normRole(item.role);
    const title =
      r === "pharmacy"
        ? item.pharmacy_name || item.username || "Pharmacy"
        : item.username || "Unknown";

    const isSuper = item.kind === "superuser";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          const rows: { label: string; value: string }[] = [
            { label: "Username", value: item.username || "—" },
            { label: "Email", value: item.email || "—" },
            { label: "Role", value: (item.role || "—").toUpperCase() },
            { label: "User ID", value: item._id },
            { label: "Created", value: formatDate(item.createdAt) },
          ];

          if (item.phone) rows.splice(2, 0, { label: "Phone", value: item.phone });

          if (isSuper) {
            rows.splice(3, 0, { label: "Certificate ID", value: item.certificate_id || "—" });

            if (r === "doctor") rows.splice(4, 0, { label: "Specialization", value: item.specialization || "—" });
            if (r === "pharmacy") {
              rows.splice(4, 0, { label: "License ID", value: item.license_id || "—" });
              rows.splice(5, 0, { label: "Pharmacy Name", value: item.pharmacy_name || "—" });
            }

            rows.splice(rows.length - 2, 0, { label: "Approved", value: item.isApproved === true ? "YES" : "NO" });
            rows.splice(rows.length - 2, 0, {
              label: "Profile Complete",
              value: item.isProfileComplete === true ? "YES" : "NO",
            });
          } else {
            if (item.gender) rows.splice(3, 0, { label: "Gender", value: item.gender || "—" });
            if (item.age != null) rows.splice(3, 0, { label: "Age", value: String(item.age) });
          }

          openDetails("User Details", rows);
        }}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.email || "—"}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <RolePill role={item.role} />
            {isSuper ? <StatusPill approved={item.isApproved} /> : null}
          </View>
        </View>

        <View style={styles.cardDivider} />

        {isSuper ? (
          <>
            <View style={styles.kvRow}>
              <Text style={styles.kLabel}>Certificate ID</Text>
              <Text style={styles.kValue} numberOfLines={1}>
                {item.certificate_id || "—"}
              </Text>
            </View>

            {r === "doctor" ? (
              <View style={styles.kvRow}>
                <Text style={styles.kLabel}>Specialization</Text>
                <Text style={styles.kValue} numberOfLines={1}>
                  {item.specialization || "—"}
                </Text>
              </View>
            ) : null}

            {r === "pharmacy" ? (
              <View style={styles.kvRow}>
                <Text style={styles.kLabel}>License ID</Text>
                <Text style={styles.kValue} numberOfLines={1}>
                  {item.license_id || "—"}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.kvRow}>
              <Text style={styles.kLabel}>Phone</Text>
              <Text style={styles.kValue} numberOfLines={1}>
                {item.phone || "—"}
              </Text>
            </View>

            <View style={styles.kvRow}>
              <Text style={styles.kLabel}>Created</Text>
              <Text style={styles.kValue}>{formatDate(item.createdAt)}</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const FilterChip = ({
    k,
    label,
    count,
    icon,
  }: {
    k: FilterKey;
    label: string;
    count: number;
    icon: any;
  }) => {
    const active = filter === k;
    return (
      <TouchableOpacity onPress={() => setFilter(k)} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
        <Ionicons name={icon} size={16} color={active ? "#fff" : "#2B9FD8"} />
        <Text style={[styles.chipText, active && styles.chipTextActive]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.sub}>All users in the system</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.chipsWrap}>
        <FilterChip k="all" label="All" count={counts.all} icon="apps-outline" />
        <FilterChip k="users" label="Users" count={counts.users} icon="people-outline" />
        <FilterChip k="doctors" label="Doctors" count={counts.doctors} icon="medkit-outline" />
        <FilterChip k="pharmacies" label="Pharmacies" count={counts.pharmacies} icon="storefront-outline" />
        <FilterChip k="admins" label="Admins" count={counts.admins} icon="shield-checkmark-outline" />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <View style={styles.searchIconBox}>
          <Ionicons name="search-outline" size={18} color="#2B9FD8" />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email, id..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={26} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No Results</Text>
              <Text style={styles.emptySub}>{query ? "Try a different search keyword." : "No users found."}</Text>
            </View>
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Details Modal */}
      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailsTitle}</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)} style={styles.modalClose} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            {detailsRows.map((r, idx) => (
              <View key={idx} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {r.value}
                </Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Blue Header */
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#2B9FD8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Filter chips */
  chipsWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  chipActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  chipText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  chipTextActive: { color: "#FFFFFF" },

  /* Search */
  searchBar: {
    marginTop: 8,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  searchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "800", color: "#111827" },
  clearBtn: { padding: 2 },

  /* Cards */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  cardSub: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 12, fontWeight: "900" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "900" },

  cardDivider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 12 },

  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  kLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280" },
  kValue: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "900", color: "#111827" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, fontWeight: "800", color: "#6B7280" },

  empty: { alignItems: "center", justifyContent: "center", padding: 40, marginTop: 60 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "900", color: "#111827" },
  emptySub: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#6B7280", textAlign: "center" },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDivider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 12 },

  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 10 },
  detailLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280", width: 120 },
  detailValue: { flex: 1, fontSize: 12, fontWeight: "900", color: "#111827", textAlign: "right" },
});