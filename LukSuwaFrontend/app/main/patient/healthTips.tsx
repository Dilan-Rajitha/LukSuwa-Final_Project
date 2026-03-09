import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";

type Tip = {
  _id: string;
  title: string;
  body: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
};

export default function PatientHealthTips() {
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("all"); // all or category

  const fetchTips = async () => {
    try {
      setLoading(true);
      const res = await API.get("/health-tips/public");
      setTips(res?.data?.tips || []);
    } catch (e: any) {
      console.log("health tips error:", e?.message || e);
      setTips([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTips();
    }, [])
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    (tips || []).forEach((t) => set.add((t.category || "general").toLowerCase()));
    return ["all", ...Array.from(set).sort()];
  }, [tips]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (tips || [])
      .filter((t) => {
        if (tab === "all") return true;
        return (t.category || "general").toLowerCase() === tab;
      })
      .filter((t) => {
        if (!query) return true;
        const a = (t.title || "").toLowerCase();
        const b = (t.body || "").toLowerCase();
        const c = (t.category || "").toLowerCase();
        return a.includes(query) || b.includes(query) || c.includes(query);
      });
  }, [tips, q, tab]);

  return (
    <View style={styles.page}>
      {/* Header (match Prescription Scanner) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Health Tips</Text>
          <Text style={styles.sub}>Latest active health tips</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchTips} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
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
            placeholder="Search tips..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            returnKeyType="search"
          />

          {q ? (
            <TouchableOpacity onPress={() => setQ("")} activeOpacity={0.8} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category chips */}
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 20 }}
          renderItem={({ item }) => {
            const active = tab === item;
            return (
              <TouchableOpacity
                onPress={() => setTab(item)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading tips...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="bulb-outline" size={28} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No Tips Found</Text>
              <Text style={styles.emptySub}>Try another keyword or category.</Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Ionicons name="sparkles-outline" size={18} color="#2B9FD8" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.catPill}>
                        <Ionicons name="pricetag-outline" size={13} color="#2B9FD8" />
                        <Text style={styles.catText}>
                          {(item.category || "general").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.cardBody}>{item.body}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header (same vibe as Prescription Scanner header) */
  header: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.5 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  /* Search */
  searchWrap: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "800", color: "#111827" },
  clearBtn: { padding: 2 },

  /* Chips */
  chipsRow: { paddingTop: 12, paddingBottom: 6 },
  chip: {
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  chipActive: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  chipText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  chipTextActive: { color: "#FFFFFF" },

  /* Loading */
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  /* Empty */
  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: 30 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  emptyTitle: { marginTop: 10, fontSize: 18, fontWeight: "900", color: "#111827" },
  emptySub: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  /* Cards (match Prescription Scanner cards) */
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },

  metaRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  catPill: {
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
  catText: { fontSize: 11, fontWeight: "900", color: "#1A7BAF" },

  cardBody: { marginTop: 10, fontSize: 12, fontWeight: "700", color: "#374151", lineHeight: 18 },
});