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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type Tip = {
  _id: string;
  title: string;
  body: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminHealthTips() {
  const { user } = useContext(AuthContext) as any;

  const isAdmin = useMemo(
    () => String(user?.role || "").toLowerCase() === "admin",
    [user?.role]
  );

  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tip | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("general");
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (t: Tip) => {
    setEditing(t);
    setTitle(t.title || "");
    setBody(t.body || "");
    setCategory(t.category || "general");
    setModalOpen(true);
  };

  const fetchTips = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const res = await API.get("/health-tips");
      setTips(res?.data?.tips || []);
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || e?.message || "Failed to load tips");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTips();
    }, [isAdmin])
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return (tips || [])
      .filter((t) => {
        if (tab === "active") return t.isActive === true;
        if (tab === "inactive") return t.isActive === false;
        return true;
      })
      .filter((t) => {
        if (!query) return true;
        const a = (t.title || "").toLowerCase();
        const b = (t.body || "").toLowerCase();
        const c = (t.category || "").toLowerCase();
        return a.includes(query) || b.includes(query) || c.includes(query);
      });
  }, [tips, tab, q]);

  const saveTip = async () => {
    if (!isAdmin) {
      Alert.alert("Access Denied", "Admin only.");
      return;
    }

    const t = title.trim();
    const b = body.trim();
    const c = (category || "general").trim() || "general";

    if (!t || !b) {
      Alert.alert("Missing Fields", "Title and body are required.");
      return;
    }

    try {
      setSaving(true);

      if (editing?._id) {
        await API.patch(`/health-tips/${editing._id}`, { title: t, body: b, category: c });
        Alert.alert("Updated", "Tip updated successfully.");
      } else {
        await API.post(`/health-tips`, { title: t, body: b, category: c });
        Alert.alert("Created", "Tip created successfully.");
      }

      setModalOpen(false);
      resetForm();
      fetchTips();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleTip = async (t: Tip) => {
    if (!isAdmin) return;
    try {
      await API.patch(`/health-tips/${t._id}/toggle`);
      fetchTips();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || e?.message || "Toggle failed");
    }
  };

  const deleteTip = async (t: Tip) => {
    if (!isAdmin) return;

    Alert.alert("Delete Tip", "Are you sure you want to delete this tip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await API.delete(`/health-tips/${t._id}`);
            fetchTips();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.message || e?.message || "Delete failed");
          }
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <View style={styles.centerIconCircle}>
          <Ionicons name="shield-outline" size={28} color="#2B9FD8" />
        </View>
        <Text style={styles.centerTitle}>Admin Only</Text>
        <Text style={styles.centerSub}>You don’t have permission to access Health Tips.</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Health Tips</Text>
          <Text style={styles.sub}>Create, edit, activate/deactivate, and delete tips</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openCreate} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconBox}>
            <Ionicons name="search-outline" size={18} color="#2B9FD8" />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search tips by title, body, category..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ("")} activeOpacity={0.8}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["all", "active", "inactive"] as const).map((k) => {
          const active = tab === k;
          return (
            <TouchableOpacity
              key={k}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setTab(k)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{k.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading tips...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={28} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No Tips</Text>
              <Text style={styles.emptySub}>Create your first health tip using the + button.</Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaPill}>
                        <Ionicons name="pricetag-outline" size={14} color="#2B9FD8" />
                        <Text style={styles.metaText}>{(item.category || "general").toUpperCase()}</Text>
                      </View>

                      <View style={[styles.statusPill, item.isActive ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, item.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                          {item.isActive ? "ACTIVE" : "INACTIVE"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={18} color="#2B9FD8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.cardBody} numberOfLines={4}>
                  {item.body}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, item.isActive ? styles.actionWarn : styles.actionOk]}
                    onPress={() => toggleTip(item)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={item.isActive ? "pause-outline" : "play-outline"}
                      size={16}
                      color="#111827"
                    />
                    <Text style={styles.actionText}>{item.isActive ? "Deactivate" : "Activate"}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={() => deleteTip(item)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color="#111827" />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "Edit Tip" : "Create Tip"}</Text>

              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.modalClose} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Drink enough water daily"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            <Text style={styles.label}>Category</Text>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="general, dengue, hygiene..."
              placeholderTextColor="#9CA3AF"
              style={styles.input}
            />

            <Text style={styles.label}>Tip Text *</Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Write the health tip content..."
              placeholderTextColor="#9CA3AF"
              style={[styles.input, styles.textarea]}
              multiline
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                onPress={saveTip}
                activeOpacity={0.85}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.primaryText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - blue theme */
  header: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#2B9FD8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search */
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
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

  /* Tabs */
  tabs: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  tabPillActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  tabText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  tabTextActive: { color: "#FFFFFF" },

  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: 30 },
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
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: "#111827" },
  emptySub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },

  /* Card */
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaText: { fontSize: 11, fontWeight: "900", color: "#1A7BAF" },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusActive: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  statusInactive: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  statusText: { fontSize: 11, fontWeight: "900" },
  statusTextActive: { color: "#059669" },
  statusTextInactive: { color: "#D97706" },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  cardBody: { marginTop: 10, fontSize: 12, fontWeight: "700", color: "#374151", lineHeight: 18 },

  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  actionOk: { backgroundColor: "#ECFDF5", borderColor: "#6EE7B7" },
  actionWarn: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  actionDanger: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },

  label: { marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: "900", color: "#6B7280" },
  input: {
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 13, fontWeight: "900", color: "#111827" },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#2B9FD8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryText: { fontSize: 13, fontWeight: "900", color: "#FFFFFF" },

  /* Admin only view */
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F3F9FD" },
  centerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: "#111827" },
  centerSub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center" },
});