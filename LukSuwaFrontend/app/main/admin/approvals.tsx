import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

type PendingUser = {
  _id: string;
  username?: string;
  email?: string;
  phone_number?: string;
  role?: "doctor" | "pharmacy" | string;

  certificate_id?: string;
  certificate_image?: string;

  specialization?: string;

  license_id?: string;
  pharmacy_name?: string;

  createdAt?: string;
};

export default function AdminApprovals() {
  const { token } = useContext(AuthContext) as any;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [items, setItems] = useState<PendingUser[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "doctor" | "pharmacy">("all");

  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const normalizeRole = (u: PendingUser) => {
    const r = (u?.role || "").toLowerCase();
    if (r.includes("doctor")) return "doctor";
    if (r.includes("pharmacy")) return "pharmacy";
    return r || "unknown";
  };

  const fileUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;

    const base = (API.defaults.baseURL || "").replace(/\/+$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${base}${p}`;
  };

  const mandatoryValue = (val?: string) => {
    const v = (val || "").trim();
    return v ? v : "—";
  };

  const roleLabel = (u: PendingUser) => {
    const r = normalizeRole(u);
    if (r === "doctor") return "DOCTOR";
    if (r === "pharmacy") return "PHARMACY";
    return r.toUpperCase();
  };

  const fetchPending = async () => {
    try {
      if (!token) {
        setItems([]);
        setLoading(false);
        return;
      }

      const res = await API.get("/superusers/pending", { headers: authHeaders });
      const list = res?.data?.users || res?.data?.pending || res?.data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.log("approvals fetch error:", e?.response?.status, e?.response?.data || e?.message);
      const msg =
        e?.response?.status === 401
          ? "Unauthorized (401). Please login again."
          : e?.response?.data?.message || e?.message || "Failed to load pending approvals";
      Alert.alert("Load Failed", msg);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPending();
    }, [token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items
      .filter((u) => {
        const role = normalizeRole(u);
        if (tab === "doctor" && role !== "doctor") return false;
        if (tab === "pharmacy" && role !== "pharmacy") return false;
        return true;
      })
      .filter((u) => {
        if (!q) return true;
        const hay = `${u.username || ""} ${u.email || ""} ${u.certificate_id || ""} ${
          u.specialization || ""
        } ${u.license_id || ""} ${u.pharmacy_name || ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [items, query, tab]);

  const counts = useMemo(() => {
    const all = items.length;
    const doctors = items.filter((u) => normalizeRole(u) === "doctor").length;
    const pharmacies = items.filter((u) => normalizeRole(u) === "pharmacy").length;
    return { all, doctors, pharmacies };
  }, [items]);

  const approve = async (u: PendingUser) => {
    try {
      if (!token) return Alert.alert("Login Required", "Please login again.");

      setItems((prev) => prev.filter((x) => x._id !== u._id));
      await API.patch(`/superusers/${u._id}/approve`, {}, { headers: authHeaders });

      Alert.alert("Approved", `${u.username || u.email || "User"} approved successfully.`);
    } catch (e: any) {
      console.log("approve error:", e?.response?.status, e?.response?.data || e?.message);
      fetchPending();
      Alert.alert("Approve Failed", e?.response?.data?.message || e?.message || "Failed to approve user");
    }
  };

  const openImage = (url?: string) => {
    const u = fileUrl(url);
    if (!u) {
      Alert.alert("No Image", "Certificate image not available.");
      return;
    }
    setImageUrl(u);
    setImageOpen(true);
  };

  const renderCard = ({ item }: { item: PendingUser }) => {
    const role = normalizeRole(item);
    const certImg = fileUrl(item.certificate_image);

    return (
      <View style={styles.card}>
        {/* Top */}
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.username || item.pharmacy_name || "Unknown"}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.email || "—"}
            </Text>
          </View>

          <View style={styles.rolePill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#2B9FD8" />
            <Text style={styles.roleText}>{roleLabel(item)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Mandatory fields */}
        <View style={styles.mandatoryBox}>
          <View style={styles.mandatoryRow}>
            <Text style={styles.mandatoryLabel}>Certificate ID</Text>
            <Text style={styles.mandatoryValue} numberOfLines={1}>
              {mandatoryValue(item.certificate_id)}
            </Text>
          </View>

          {role === "doctor" ? (
            <View style={styles.mandatoryRow}>
              <Text style={styles.mandatoryLabel}>Specialization</Text>
              <Text style={styles.mandatoryValue} numberOfLines={1}>
                {mandatoryValue(item.specialization)}
              </Text>
            </View>
          ) : role === "pharmacy" ? (
            <View style={styles.mandatoryRow}>
              <Text style={styles.mandatoryLabel}>License ID</Text>
              <Text style={styles.mandatoryValue} numberOfLines={1}>
                {mandatoryValue(item.license_id)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Image */}
        <View style={{ marginTop: 12 }}>
          <Text style={styles.imageLabel}>Certificate Image</Text>

          {certImg ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => openImage(item.certificate_image)}
              style={styles.imageWrap}
            >
              <Image source={{ uri: certImg }} style={styles.image} resizeMode="cover" />
              <View style={styles.imageHint}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
                <Text style={styles.imageHintText}>Tap to view</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageMissing}>
              <Ionicons name="image-outline" size={18} color="#9CA3AF" />
              <Text style={styles.imageMissingText}>No certificate image</Text>
            </View>
          )}
        </View>

        {/* Actions (Approve only) */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.approveBtn}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert("Approve", "Approve this account?", [
                { text: "Cancel", style: "cancel" },
                { text: "Approve", onPress: () => approve(item) },
              ])
            }
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Approvals</Text>
          <Text style={styles.sub}>Approve doctors & pharmacies to access the system</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.85}>
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "all" && styles.tabBtnActive]}
          onPress={() => setTab("all")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>All ({counts.all})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === "doctor" && styles.tabBtnActive]}
          onPress={() => setTab("doctor")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === "doctor" && styles.tabTextActive]}>
            Doctors ({counts.doctors})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === "pharmacy" && styles.tabBtnActive]}
          onPress={() => setTab("pharmacy")}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, tab === "pharmacy" && styles.tabTextActive]}>
            Pharmacies ({counts.pharmacies})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <View style={styles.searchIconBox}>
          <Ionicons name="search-outline" size={18} color="#2B9FD8" />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, email, certificate id..."
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
          <Text style={styles.loadingText}>Loading pending approvals...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-circle-outline" size={30} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No Pending Approvals</Text>
              <Text style={styles.emptySub}>
                {tab === "all" ? "All accounts are already handled." : "No pending accounts for this category."}
              </Text>
            </View>
          }
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Fullscreen Image Modal */}
      <Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}>
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageTopBar}>
            <Text style={styles.imageTopTitle}>Certificate</Text>
            <TouchableOpacity style={styles.imageCloseBtn} onPress={() => setImageOpen(false)} activeOpacity={0.85}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Pressable style={styles.imageBackdrop} onPress={() => setImageOpen(false)}>
            <Pressable style={styles.imageModalCard} onPress={() => {}}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.fullImage} resizeMode="contain" />
              ) : (
                <View style={styles.fullImageMissing}>
                  <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                  <Text style={{ color: "#9CA3AF", fontWeight: "800", marginTop: 8 }}>Image not available</Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Blue header */
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

  /* Tabs */
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  tabText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  tabTextActive: { color: "#FFFFFF" },

  /* Search */
  searchBar: {
    marginTop: 12,
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

  /* Card */
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
  name: { fontSize: 16, fontWeight: "900", color: "#111827" },
  meta: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  rolePill: {
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
  roleText: { fontSize: 12, fontWeight: "900", color: "#1A7BAF" },

  divider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 12 },

  mandatoryBox: {
    gap: 10,
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    padding: 12,
  },
  mandatoryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  mandatoryLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280" },
  mandatoryValue: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "900", color: "#111827" },

  imageLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280", marginBottom: 8 },
  imageWrap: {
    width: "100%",
    height: 170,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    position: "relative",
  },
  image: { width: "100%", height: "100%" },

  imageHint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(43,159,216,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageHintText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  imageMissing: {
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#F3F9FD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  imageMissingText: { fontSize: 12, fontWeight: "900", color: "#9CA3AF" },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },

  approveBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  approveText: { color: "#fff", fontWeight: "900", fontSize: 13 },

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

  /* Fullscreen image modal */
  imageModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)" },
  imageTopBar: {
    paddingTop: Platform.OS === "ios" ? 54 : 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageTopTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  imageCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageBackdrop: { flex: 1, padding: 12 },
  imageModalCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  fullImage: { width: "100%", height: "100%" },
  fullImageMissing: { flex: 1, alignItems: "center", justifyContent: "center" },
});