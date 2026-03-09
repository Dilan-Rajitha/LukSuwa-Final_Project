import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import {
  fetchInventory,
  InventoryItem,
  updateAutoRefreshSettings,
} from "../../../src/api/inventoryApi";

export default function PharmacyInventory() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState("");
  const [items, setItems] = useState<InventoryItem[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);
  const [daysBeforeExpiry, setDaysBeforeExpiry] = useState(7);

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [clearAfterDays, setClearAfterDays] = useState(3);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const data: any = await fetchInventory(q);
      setItems(data.items || []);

      if (data.autoDeleteSettings) {
        setAutoDeleteEnabled(Boolean(data.autoDeleteSettings.enabled));
        setDaysBeforeExpiry(Number(data.autoDeleteSettings.daysBeforeExpiry || 7));
      }

      if (data.autoRefreshSettings) {
        setAutoRefreshEnabled(Boolean(data.autoRefreshSettings.enabled));
        setClearAfterDays(Number(data.autoRefreshSettings.clearAfterDays || 3));
      }

      if (data.autoRefreshed) {
        const n = Number(data.refreshDeletedItems || 0);
        Alert.alert("Auto Refresh", `Inventory auto-cleared (${n} items removed)`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (it: InventoryItem) => { setEditItem({ ...it }); setEditOpen(true); };

  const saveEdit = async () => {
    if (!editItem) return;
    try {
      setLoading(true);
await API.patch(`/inventory/${editItem._id}`, {
  name: editItem.name,
  sku: editItem.sku || "",
  qty: Number(editItem.qty || 0),
  unit_price: Number(editItem.unit_price || 0),
  brand: editItem.brand || "",
  strength: editItem.strength || "",
  batch_no: editItem.batch_no || "",
  expiry_date: editItem.expiry_date || null,
});
Alert.alert("Success", "Item updated successfully");
      setEditOpen(false);
      setEditItem(null);
      await loadInventory();
    } catch (e: any) {
      Alert.alert("Update failed", e?.response?.data?.message || e?.message || "Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    Alert.alert("Delete item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await API.delete(`/inventory/${id}`);
            Alert.alert("Success", "Item deleted successfully");
            await loadInventory();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.response?.data?.message || e?.message || "Failed to delete");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await API.put("/inventory/settings/auto-delete", { enabled: autoDeleteEnabled, daysBeforeExpiry });
      Alert.alert("Success", "Auto-delete settings updated");
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || e?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const saveAutoRefresh = async () => {
    try {
      setLoading(true);
      await updateAutoRefreshSettings({ enabled: autoRefreshEnabled, clearAfterDays });
      Alert.alert("Success", "Auto-refresh settings updated");
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.message || e?.message || "Failed to update auto-refresh settings");
    } finally {
      setLoading(false);
    }
  };

  const manualCleanup = async () => {
    Alert.alert("Manual Cleanup", "This will delete all expired items based on your auto-delete settings. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clean Now", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const res = await API.post("/inventory/cleanup");
            Alert.alert("Success", res.data?.message || "Cleanup completed");
            await loadInventory();
          } catch (e: any) {
            Alert.alert("Failed", e?.response?.data?.message || e?.message || "Cleanup failed");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.sub}>Manage your pharmacy stock</Text>
        </View>

        <TouchableOpacity style={styles.csvBtn} onPress={() => router.push("/main/pharmacy/csvUpload")} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.csvBtnText}>CSV Import</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsOpen(true)} activeOpacity={0.85}>
          <Ionicons name="settings-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconBox}>
            <Ionicons name="search-outline" size={18} color="#2B9FD8" />
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name, SKU, brand..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            onSubmitEditing={loadInventory}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setRefreshing(true); loadInventory(); }}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#2B9FD8" />
            : <Ionicons name="refresh-outline" size={20} color="#2B9FD8" />}
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(it) => it._id}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 6 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#2B9FD8"
            onRefresh={() => { setRefreshing(true); loadInventory(); }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                SKU: {item.sku || "—"} • Qty: {item.qty} • Price: {item.unit_price ?? 0}
              </Text>
              {item.brand || item.strength ? (
                <Text style={styles.itemMeta2}>
                  {item.brand ? `Brand: ${item.brand}` : ""}
                  {item.strength ? ` • Strength: ${item.strength}` : ""}
                </Text>
              ) : null}
              {item.expiry_date ? (
                <View style={styles.expiryPill}>
                  <Ionicons name="calendar-outline" size={14} color="#2B9FD8" />
                  <Text style={styles.expiryText}>Expiry: {String(item.expiry_date).slice(0, 10)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={18} color="#2B9FD8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtnDanger} onPress={() => deleteItem(item._id)} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={26} color="#2B9FD8" />
            </View>
            <Text style={styles.emptyTitle}>{loading ? "Loading..." : "No inventory items found."}</Text>
            <Text style={styles.emptySub}>Try searching a different keyword or import items using CSV.</Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <Text style={styles.modalSub}>Update stock details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Name</Text>
            <TextInput style={styles.modalInput} value={editItem?.name || ""} onChangeText={(t) => setEditItem((p) => p ? { ...p, name: t } : p)} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Qty</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" value={String(editItem?.qty ?? 0)} onChangeText={(t) => setEditItem((p) => p ? { ...p, qty: Number(t || 0) } : p)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Unit Price</Text>
                <TextInput style={styles.modalInput} keyboardType="numeric" value={String(editItem?.unit_price ?? 0)} onChangeText={(t) => setEditItem((p) => p ? { ...p, unit_price: Number(t || 0) } : p)} />
              </View>
            </View>

            <Text style={styles.modalLabel}>SKU</Text>
            <TextInput style={styles.modalInput} value={editItem?.sku || ""} onChangeText={(t) => setEditItem((p) => p ? { ...p, sku: t } : p)} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Brand</Text>
                <TextInput style={styles.modalInput} value={editItem?.brand || ""} onChangeText={(t) => setEditItem((p) => p ? { ...p, brand: t } : p)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Strength</Text>
                <TextInput style={styles.modalInput} value={editItem?.strength || ""} onChangeText={(t) => setEditItem((p) => p ? { ...p, strength: t } : p)} />
              </View>
            </View>

            <Text style={styles.modalLabel}>Batch No</Text>
            <TextInput style={styles.modalInput} value={editItem?.batch_no || ""} onChangeText={(t) => setEditItem((p) => p ? { ...p, batch_no: t } : p)} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalBtnGhost} onPress={() => setEditOpen(false)} activeOpacity={0.85}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={saveEdit} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="save-outline" size={16} color="#fff" /><Text style={styles.modalBtnPrimaryText}>Save</Text></>)}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsSheet}>
            {/* Header */}
            <View style={styles.settingsSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Inventory Settings</Text>
                <Text style={styles.modalSub}>Auto-delete & auto-refresh</Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={styles.modalCloseBtn} activeOpacity={0.85}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.settingsBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Auto Delete */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Ionicons name="trash-outline" size={14} color="#2B9FD8" />
                  <Text style={styles.sectionTitle}>Auto-Delete (Expired Items)</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Enable Auto-Delete</Text>
                  <TouchableOpacity style={[styles.toggle, autoDeleteEnabled && styles.toggleActive]} onPress={() => setAutoDeleteEnabled(!autoDeleteEnabled)} activeOpacity={0.9}>
                    <View style={[styles.toggleThumb, autoDeleteEnabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingHint}>Delete items expiring within:</Text>
                <View style={styles.daysRow}>
                  {[3, 7, 30, 60, 90].map((days) => (
                    <TouchableOpacity key={days} style={[styles.daysPill, daysBeforeExpiry === days && styles.daysPillActive]} onPress={() => setDaysBeforeExpiry(days)} disabled={!autoDeleteEnabled} activeOpacity={0.85}>
                      <Text style={[styles.daysPillText, daysBeforeExpiry === days && styles.daysPillTextActive, !autoDeleteEnabled && { opacity: 0.4 }]}>{days}d</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.settingsBtnRow}>
                  <TouchableOpacity style={[styles.settingsSaveBtn, { flex: 1 }]} onPress={saveSettings} disabled={loading} activeOpacity={0.85}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="save-outline" size={15} color="#fff" /><Text style={styles.settingsSaveBtnText}>Save Settings</Text></>)}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cleanupBtnInline, !autoDeleteEnabled && { opacity: 0.4 }]} onPress={manualCleanup} disabled={!autoDeleteEnabled} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Auto Refresh */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <Ionicons name="refresh-outline" size={14} color="#2B9FD8" />
                  <Text style={styles.sectionTitle}>Auto Refresh (Full Clear)</Text>
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Enable Auto-Refresh</Text>
                  <TouchableOpacity style={[styles.toggle, autoRefreshEnabled && styles.toggleActive]} onPress={() => setAutoRefreshEnabled(!autoRefreshEnabled)} activeOpacity={0.9}>
                    <View style={[styles.toggleThumb, autoRefreshEnabled && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.settingHint}>Clear inventory after:</Text>
                <View style={styles.daysRow}>
                  {[3, 7, 14, 30, 60, 90].map((d) => (
                    <TouchableOpacity key={d} style={[styles.daysPill, clearAfterDays === d && styles.daysPillActive]} onPress={() => setClearAfterDays(d)} disabled={!autoRefreshEnabled} activeOpacity={0.85}>
                      <Text style={[styles.daysPillText, clearAfterDays === d && styles.daysPillTextActive, !autoRefreshEnabled && { opacity: 0.4 }]}>{d}d</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[styles.settingsSaveBtn, { marginTop: 12 }]} onPress={saveAutoRefresh} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="refresh-outline" size={15} color="#fff" /><Text style={styles.settingsSaveBtnText}>Save Auto-Refresh</Text></>)}
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.settingsBtnRow}>
                <TouchableOpacity style={[styles.modalBtnGhost, { flex: 1 }]} onPress={() => setSettingsOpen(false)} activeOpacity={0.85}>
                  <Text style={styles.modalBtnGhostText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.settingsSaveBtn, { flex: 1 }]} onPress={async () => { setSettingsOpen(false); await loadInventory(); }} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (<><Ionicons name="sync-outline" size={15} color="#fff" /><Text style={styles.settingsSaveBtnText}>Refresh List</Text></>)}
                </TouchableOpacity>
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* ── Header ── */
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },
  csvBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14,
  },
  csvBtnText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  settingsBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },

  /* ── Search ── */
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D0EAFB",
    borderRadius: 14, paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },
  searchIconBox: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: "#E0F3FB", borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
  },
  searchInput: { flex: 1, fontWeight: "800", color: "#111827", fontSize: 13 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
  },

  /* ── Item cards ── */
  itemCard: {
    marginHorizontal: 18, marginBottom: 10,
    backgroundColor: "#FFFFFF", borderRadius: 18,
    borderWidth: 1, borderColor: "#D0EAFB",
    padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
    shadowColor: "#2B9FD8", shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  itemName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  itemMeta: { marginTop: 6, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  itemMeta2: { marginTop: 4, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  expiryPill: {
    marginTop: 8, alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#E0F3FB", borderWidth: 1, borderColor: "#D0EAFB",
  },
  expiryText: { fontSize: 11, fontWeight: "900", color: "#1A7BAF" },
  itemActions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#E0F3FB", borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnDanger: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5",
    alignItems: "center", justifyContent: "center",
  },

  /* ── Empty ── */
  empty: { alignItems: "center", justifyContent: "center", padding: 40, marginTop: 40 },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#E0F3FB", borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: "900", color: "#111827", textAlign: "center" },
  emptySub: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },

  /* ── Modals ── */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 18 },
  modalCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    maxHeight: "90%", borderWidth: 1, borderColor: "#D0EAFB",
  },
  modalTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 },
  modalTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  modalSub: { marginTop: 4, fontSize: 10, fontWeight: "700", color: "#6B7280" },
  modalCloseBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: "#2B9FD8", alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { marginTop: 10, fontSize: 13, fontWeight: "900", color: "#111827" },
  divider: { height: 1, backgroundColor: "#D0EAFB", marginVertical: 14 },
  modalLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280", marginTop: 8, marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5, borderColor: "#D0EAFB", borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontWeight: "800", color: "#111827", backgroundColor: "#F3F9FD",
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 5 },
  modalBtnGhost: {
    flex: 1, borderRadius: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: "#D0EAFB",
    alignItems: "center", backgroundColor: "#FFFFFF",
  },
  modalBtnGhostText: { fontWeight: "900", color: "#111827" },
  modalBtnPrimary: {
    flex: 1, borderRadius: 16, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8", shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  modalBtnPrimaryText: { fontWeight: "900", color: "#fff" },

  /* ── Settings ── */
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  settingLabel: { fontSize: 13, fontWeight: "900", color: "#111827" },
  settingHint: { marginTop: 12, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: "#D0EAFB", padding: 2, justifyContent: "center" },
  toggleActive: { backgroundColor: "#2B9FD8" },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF" },
  toggleThumbActive: { alignSelf: "flex-end" },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  daysPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: "#D0EAFB", backgroundColor: "#FFFFFF",
  },
  daysPillActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  daysPillText: { fontSize: 12, fontWeight: "900", color: "#6B7280" },
  daysPillTextActive: { color: "#FFFFFF" },
  cleanupBtnInline: {
    width: 54, height: 48, borderRadius: 16,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5",
    alignItems: "center", justifyContent: "center",
  },

  /* ── Settings bottom sheet ── */
  settingsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  settingsSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: "#D0EAFB",
  },
  settingsSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
    gap: 10,
  },
  settingsBody: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 30,
  },
  settingsSection: {
    gap: 4,
  },
  settingsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  settingsBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  settingsSaveBtn: {
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#2B9FD8",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.20,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  settingsSaveBtnText: { fontWeight: "900", color: "#fff", fontSize: 13 },
});