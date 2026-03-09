import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { importInventoryCsv, parseInventoryCsv } from "../../../src/api/inventoryApi";

type Mapping = {
  name?: string;
  qty?: string;
  sku?: string;
  unit_price?: string;
  expiry_date?: string;
  batch_no?: string;
  brand?: string;
  strength?: string;
};

export default function CsvUpload() {
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const readyToImport = useMemo(() => !!mapping.name && !!mapping.qty, [mapping]);

  const pickCsv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "application/vnd.ms-excel", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;
      const f = res.assets?.[0];
      if (!f) return;

      // Validate file extension
      if (!f.name?.toLowerCase().endsWith(".csv")) {
        Alert.alert("Invalid file", "Please select a .csv file");
        return;
      }

      setFile(f);
      setHeaders([]);
      setPreview([]);
      setTotalRows(0);
      setMapping({});
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to pick file");
    }
  };

  const parseCsv = async () => {
    if (!file) {
      Alert.alert("No file", "Please select a CSV file first.");
      return;
    }

    try {
      setLoading(true);

      const data = await parseInventoryCsv(file.uri, file.name);

      const h = data.headers || [];
      const p = data.preview || [];
      const suggested = (data as any).suggestedMapping || {};

      setHeaders(h);
      setPreview(p);
      setTotalRows(data.totalRows || 0);

      // Use suggested mapping from backend
      setMapping({
        name: suggested.name || undefined,
        qty: suggested.qty || undefined,
        sku: suggested.sku || undefined,
        unit_price: suggested.unit_price || undefined,
        expiry_date: suggested.expiry_date || undefined,
        batch_no: suggested.batch_no || undefined,
        brand: suggested.brand || undefined,
        strength: suggested.strength || undefined,
      });

      const mappedCount = Object.values(suggested).filter(Boolean).length;
      Alert.alert(
        "Parsed Successfully",
        `Found ${h.length} columns\nAuto-mapped: ${mappedCount} fields\n\nTotal rows: ${data.totalRows}`
      );
    } catch (e: any) {
      Alert.alert("Parse Failed", e?.response?.data?.message || e?.message || "Error parsing CSV");
    } finally {
      setLoading(false);
    }
  };

  const importCsv = async () => {
    if (!file) {
      Alert.alert("No file", "Please select a CSV file first.");
      return;
    }

    if (!readyToImport) {
      Alert.alert("Mapping Missing", "Please ensure at least Name and Quantity are mapped");
      return;
    }

    try {
      setLoading(true);

      const data = await importInventoryCsv({
        fileUri: file.uri,
        fileName: file.name,
        mapping: mapping as Record<string, string>,
        mode,
      });

      const autoDeleteMsg = data.autoDeleted ? `\n\n🗑️ Auto-deleted ${data.autoDeleted} expired items` : "";
      Alert.alert("Success", (data.message || "Inventory imported successfully!") + autoDeleteMsg);
      router.back();
    } catch (e: any) {
      Alert.alert("Import Failed", e?.response?.data?.message || e?.message || "Error importing CSV");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>CSV Import</Text>
          <Text style={styles.sub}>Upload and import inventory from CSV</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select File */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.cardTitle}>Select CSV File</Text>
          </View>
          <Text style={styles.help}>Choose a CSV file containing your inventory data</Text>

          <TouchableOpacity style={styles.btn} onPress={pickCsv} activeOpacity={0.85}>
            <Ionicons name="document-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>{file ? "Change File" : "Select CSV File"}</Text>
          </TouchableOpacity>

          {file ? (
            <View style={styles.filePill}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text-outline" size={16} color="#2B9FD8" />
              </View>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
            </View>
          ) : null}
        </View>

        {/* Step 2: Parse CSV */}
        <View style={styles.card}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, !file && { opacity: 0.5 }]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={[styles.cardTitle, !file && { opacity: 0.5 }]}>Parse & Map Columns</Text>
          </View>
          <Text style={[styles.help, !file && { opacity: 0.5 }]}>
            Parse the CSV and auto-map columns to inventory fields
          </Text>

          <TouchableOpacity
            style={[styles.btnAlt, !file && styles.disabled]}
            onPress={parseCsv}
            disabled={!file || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <>
                <Ionicons name="sync-outline" size={18} color="#2B9FD8" />
                <Text style={styles.btnAltText}>Parse CSV & Auto-Map</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Step 3: Review Mapping */}
        {headers.length > 0 && (
          <View style={styles.card}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.cardTitle}>Review Mapping</Text>
            </View>
            <Text style={styles.help}>
              Verify the auto-mapped columns. <Text style={{ fontWeight: "900" }}>Name</Text> and{" "}
              <Text style={{ fontWeight: "900" }}>Quantity</Text> are required.
            </Text>

            <View style={styles.mappingBox}>
              <MappingRow label="Name" value={mapping.name} required />
              <MappingRow label="Quantity" value={mapping.qty} required />
              <MappingRow label="SKU" value={mapping.sku} />
              <MappingRow label="Unit Price" value={mapping.unit_price} />
              <MappingRow label="Brand" value={mapping.brand} />
              <MappingRow label="Strength" value={mapping.strength} />
              <MappingRow label="Batch No" value={mapping.batch_no} />
              <MappingRow label="Expiry Date" value={mapping.expiry_date} />
            </View>

            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Ionicons name="document-text-outline" size={16} color="#2B9FD8" />
                <Text style={styles.statText}>{totalRows} rows</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="list-outline" size={16} color="#059669" />
                <Text style={styles.statText}>{headers.length} columns</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={16} color="#7C3AED" />
                <Text style={styles.statText}>{preview.length} preview</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Import Settings */}
        {headers.length > 0 && (
          <View style={styles.card}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={styles.cardTitle}>Import Mode</Text>
            </View>
            <Text style={styles.help}>Choose how to import the data</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.pill, mode === "merge" && styles.pillActive]}
                onPress={() => setMode("merge")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="git-merge-outline"
                  size={18}
                  color={mode === "merge" ? "#2B9FD8" : "#6B7280"}
                />
                <Text style={[styles.pillText, mode === "merge" && styles.pillTextActive]}>Merge</Text>
                <Text style={[styles.pillSubText, mode === "merge" && { color: "#1A7BAF" }]}>
                  Update/Add
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pill, mode === "replace" && styles.pillActiveRed]}
                onPress={() => setMode("replace")}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={mode === "replace" ? "#EF4444" : "#6B7280"}
                />
                <Text style={[styles.pillText, mode === "replace" && styles.pillTextActive]}>Replace</Text>
                <Text style={[styles.pillSubText, mode === "replace" && { color: "#EF4444" }]}>
                  Delete All
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.infoBox,
                mode === "replace" && { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
              ]}
            >
              <Ionicons
                name={mode === "merge" ? "information-circle" : "warning"}
                size={18}
                color={mode === "merge" ? "#2B9FD8" : "#EF4444"}
              />
              <Text style={[styles.infoText, mode === "replace" && { color: "#DC2626" }]}>
                {mode === "merge"
                  ? "Merge will update existing items (match by SKU or Name) and add new ones"
                  : "Replace will DELETE all existing inventory and import fresh data from CSV"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.importBtn, (!readyToImport || loading) && styles.disabled]}
              onPress={importCsv}
              disabled={!readyToImport || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.importText}>Import {totalRows} Items</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Preview Section */}
        {preview.length > 0 && (
          <View style={styles.card}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}>
                <Ionicons name="eye-outline" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.cardTitle}>Preview Data</Text>
            </View>
            <Text style={styles.help}>First {preview.length} rows from your CSV</Text>

            <View style={styles.previewBox}>
              {preview.map((row, idx) => (
                <View key={idx} style={styles.previewRow}>
                  <View style={styles.previewIdx}>
                    <Text style={styles.previewIdxText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {Object.entries(row)
                      .slice(0, 4)
                      .map(([k, v], i) => (
                        <Text key={i} style={styles.previewData} numberOfLines={1}>
                          <Text style={{ fontWeight: "900", color: "#111827" }}>{k}:</Text> {String(v)}
                        </Text>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

function MappingRow({
  label,
  value,
  required,
}: {
  label: string;
  value?: string;
  required?: boolean;
}) {
  return (
    <View style={styles.mapRow}>
      <Text style={styles.mapLabel}>
        {label}
        {required ? <Text style={{ color: "#EF4444" }}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.mapValue,
          !value && { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
        ]}
      >
        <Text style={[styles.mapValueText, !value && { color: "#DC2626" }]}>
          {value || "Not mapped"}
        </Text>
        {value ? (
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
        ) : (
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 2, fontSize: 11, fontWeight: "500", color: "rgba(255,255,255,0.82)" },

  content: { padding: 18, paddingBottom: 30 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    marginBottom: 16,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 13, fontWeight: "900", color: "#1A7BAF" },

  cardTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  help: { marginTop: 6, fontSize: 12, color: "#6B7280", fontWeight: "600", lineHeight: 18 },

  btn: {
    marginTop: 14,
    backgroundColor: "#2B9FD8",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  btnAlt: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  btnAltText: { color: "#1A7BAF", fontWeight: "900", fontSize: 14 },

  filePill: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { flex: 1, color: "#111827", fontWeight: "900", fontSize: 13 },

  mappingBox: { marginTop: 12, gap: 8 },
  mapRow: { gap: 6 },
  mapLabel: { fontSize: 12, fontWeight: "900", color: "#6B7280" },
  mapValue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F9FD",
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mapValueText: { flex: 1, fontWeight: "900", color: "#111827", fontSize: 13 },

  statsBox: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statItem: {
    flex: 1,
    minWidth: 90,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F9FD",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  statText: { fontSize: 12, fontWeight: "900", color: "#111827" },

  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
  },
  pillActive: { backgroundColor: "#E0F3FB", borderColor: "#2B9FD8" },
  pillActiveRed: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  pillText: { fontWeight: "900", color: "#111827", fontSize: 13 },
  pillTextActive: { color: "#111827" },
  pillSubText: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", marginTop: 2 },

  infoBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#E0F3FB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  infoText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#1A7BAF", lineHeight: 18 },

  importBtn: {
    marginTop: 16,
    backgroundColor: "#2B9FD8",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  importText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  previewBox: { marginTop: 12, gap: 10 },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F3F9FD",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  previewIdx: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  previewIdxText: { fontSize: 12, fontWeight: "900", color: "#1A7BAF" },
  previewData: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginTop: 4 },

  disabled: { opacity: 0.55 },
});