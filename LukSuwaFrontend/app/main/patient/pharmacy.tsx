import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type PharmacyItem = {
  _id: string;
  name: string;
  sku?: string;
  qty: number;
  unit_price?: number;
  brand?: string;
  strength?: string;
  batch_no?: string;
  expiry_date?: string | null;
};

type PharmacyData = {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress?: string;
  pharmacyPhone?: string;
  location?: { latitude: number; longitude: number };
  distance?: number;
  items: PharmacyItem[];
};

export default function PatientPharmacy() {
  const { token } = useContext(AuthContext) as any;

  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [hasLocationPerm, setHasLocationPerm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("list");
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [userLocation, setUserLocation] = useState({ latitude: 7.2906, longitude: 80.6337 });

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  useEffect(() => {
    (async () => {
      try {
        setLocLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        const granted = status === "granted";
        setHasLocationPerm(granted);
        if (!granted) {
          Alert.alert("Permission needed", "Location permission is required to show your current location.");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserLocation(coords);
        setTimeout(() => {
          mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 700);
        }, 350);
      } catch (err: any) {
        Alert.alert("Location Error", err?.message || "Failed to get current location");
      } finally {
        setLocLoading(false);
      }
    })();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const searchMedicine = async () => {
    if (!searchQuery.trim()) { Alert.alert("Search Required", "Please enter a medicine name to search"); return; }
    if (!token) { Alert.alert("Unauthorized", "Please login again (token missing)."); return; }
    try {
      setLoading(true);
      const res = await API.get(
        `/patient/pharmacies/search?medicine=${encodeURIComponent(searchQuery.trim())}`,
        { headers: authHeaders }
      );
      const data: PharmacyData[] = res.data?.pharmacies || [];
      const withDistance = data.map((p) => {
        if (p.location) {
          return { ...p, distance: calculateDistance(userLocation.latitude, userLocation.longitude, p.location.latitude, p.location.longitude) };
        }
        return { ...p, distance: 999 };
      });
      withDistance.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      setPharmacies(withDistance);
      if (withDistance.length === 0) {
        Alert.alert("Not Found", `No pharmacies have "${searchQuery}" in stock`);
      } else {
        setTimeout(() => {
          mapRef.current?.animateToRegion({ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 }, 600);
        }, 200);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || (e?.response?.status === 401 ? "Unauthorized (token invalid/expired)" : null) || e?.message || "Failed to search";
      Alert.alert("Search Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const openDirections = (pharmacy: PharmacyData) => {
    if (!pharmacy.location) { Alert.alert("Location Unavailable", "This pharmacy doesn't have location information"); return; }
    const { latitude, longitude } = pharmacy.location;
    const label = encodeURIComponent(pharmacy.pharmacyName);
    const url = Platform.select({ ios: `maps:0,0?q=${label}@${latitude},${longitude}`, android: `geo:0,0?q=${latitude},${longitude}(${label})` });
    if (url) Linking.openURL(url).catch(() => Alert.alert("Error", "Failed to open maps"));
  };

  const callPharmacy = (phone?: string) => {
    if (!phone) { Alert.alert("Phone Unavailable", "This pharmacy doesn't have phone information"); return; }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Error", "Failed to open phone dialer"));
  };

  const openDetails = (pharmacy: PharmacyData) => {
    setSelectedPharmacy(pharmacy);
    setDetailsOpen(true);
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Medicine Finder</Text>
          <Text style={styles.sub}>Search medicines in nearby pharmacies</Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons name="list" size={18} color={viewMode === "list" ? "#fff" : "rgba(255,255,255,0.65)"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
            onPress={() => setViewMode("map")}
          >
            <Ionicons name="map" size={18} color={viewMode === "map" ? "#fff" : "rgba(255,255,255,0.65)"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#2B9FD8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for medicine (e.g., Paracetamol)"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchMedicine}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
              <Ionicons name="close" size={15} color="#2B9FD8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={searchMedicine} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Location loading hint */}
      {locLoading && (
        <View style={styles.infoBar}>
          <ActivityIndicator size="small" color="#2B9FD8" />
          <View>
            <Text style={styles.infoBarText}>Getting your current location…</Text>
            <Text style={styles.infoBarSub}>Please allow location permission</Text>
          </View>
        </View>
      )}

      {/* Results Count */}
      {pharmacies.length > 0 && (
        <View style={styles.resultsBar}>
          <View style={styles.resultsBarLeft}>
            <Ionicons name="checkmark-circle" size={16} color="#2B9FD8" />
            <Text style={styles.resultsText}>
              Found in <Text style={{ fontWeight: "900" }}>{pharmacies.length}</Text>{" "}
              {pharmacies.length === 1 ? "pharmacy" : "pharmacies"}
            </Text>
          </View>
          <Text style={styles.resultsSubText}>Sorted by distance</Text>
        </View>
      )}

      {/* Content */}
      {viewMode === "list" ? (
        <FlatList
          data={pharmacies}
          keyExtractor={(item) => item.pharmacyId}
          contentContainerStyle={{ paddingBottom: 30, paddingTop: 4 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="medical-outline" size={36} color="#2B9FD8" />
              </View>
              <Text style={styles.emptyTitle}>No Results</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `Search for "${searchQuery}" to find pharmacies with this medicine in stock`
                  : "Enter a medicine name above to search"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.pharmacyCard}>
              <View style={styles.cardHeader}>
                <View style={styles.pharmacyIconBox}>
                  <Ionicons name="medkit" size={22} color="#2B9FD8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pharmacyName} numberOfLines={1}>{item.pharmacyName}</Text>
                  {item.pharmacyAddress ? (
                    <Text style={styles.pharmacyAddress} numberOfLines={1}>{item.pharmacyAddress}</Text>
                  ) : null}
                </View>
                {item.distance !== undefined && item.distance < 999 && (
                  <View style={styles.distancePill}>
                    <Ionicons name="location" size={12} color="#2B9FD8" />
                    <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.stockInfo}>
                <View style={styles.stockPill}>
                  <Ionicons name="cube-outline" size={13} color="#2B9FD8" />
                  <Text style={styles.stockText}>
                    {item.items.length} {item.items.length === 1 ? "item" : "items"} in stock
                  </Text>
                </View>
              </View>

              {item.items.slice(0, 2).map((medicine, idx) => (
                <View key={idx} style={styles.medicineRow}>
                  <View style={styles.medDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicineName} numberOfLines={1}>{medicine.name}</Text>
                    <Text style={styles.medicineDetails}>
                      {medicine.brand && `${medicine.brand} • `}
                      {medicine.strength && `${medicine.strength} • `}
                      Qty: {medicine.qty}
                    </Text>
                  </View>
                  {medicine.unit_price ? (
                    <Text style={styles.medicinePrice}>Rs. {medicine.unit_price.toFixed(2)}</Text>
                  ) : null}
                </View>
              ))}

              {item.items.length > 2 && (
                <TouchableOpacity style={styles.viewMoreBtn} onPress={() => openDetails(item)}>
                  <Text style={styles.viewMoreText}>View all {item.items.length} items</Text>
                  <Ionicons name="chevron-forward" size={14} color="#2B9FD8" />
                </TouchableOpacity>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openDirections(item)} activeOpacity={0.85}>
                  <Ionicons name="navigate-outline" size={16} color="#2B9FD8" />
                  <Text style={styles.actionBtnText}>Directions</Text>
                </TouchableOpacity>

                {item.pharmacyPhone && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => callPharmacy(item.pharmacyPhone)} activeOpacity={0.85}>
                    <Ionicons name="call-outline" size={16} color="#059669" />
                    <Text style={[styles.actionBtnText, { color: "#059669" }]}>Call</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={[styles.actionBtn, { flex: 1 }, styles.actionBtnPrimary]} onPress={() => openDetails(item)} activeOpacity={0.85}>
                  <Ionicons name="information-circle-outline" size={16} color="#fff" />
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            style={{ flex: 1 }}
            initialRegion={{ latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
            showsUserLocation={hasLocationPerm}
            showsMyLocationButton={hasLocationPerm}
          >
            <Marker coordinate={userLocation} title="Your Location" pinColor="#EF4444" />
            {pharmacies.map((pharmacy) =>
              pharmacy.location ? (
                <Marker
                  key={pharmacy.pharmacyId}
                  coordinate={pharmacy.location}
                  title={pharmacy.pharmacyName}
                  description={`${pharmacy.items.length} items in stock`}
                  onPress={() => openDetails(pharmacy)}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="medkit" size={22} color="#fff" />
                  </View>
                </Marker>
              ) : null
            )}
          </MapView>

          {pharmacies.length > 0 && (
            <View style={styles.mapOverlay}>
              <View style={styles.mapOverlayInner}>
                <Ionicons name="location" size={16} color="#2B9FD8" />
                <View>
                  <Text style={styles.mapOverlayTitle}>
                    {pharmacies.length} {pharmacies.length === 1 ? "Pharmacy" : "Pharmacies"} Found
                  </Text>
                  <Text style={styles.mapOverlayText}>Tap markers for details</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Details Modal */}
      <Modal visible={detailsOpen} transparent animationType="slide" onRequestClose={() => setDetailsOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalPharmacyIcon}>
                <Ionicons name="medkit" size={20} color="#2B9FD8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedPharmacy?.pharmacyName}</Text>
                {selectedPharmacy?.pharmacyAddress && (
                  <Text style={styles.modalSubtitle} numberOfLines={1}>{selectedPharmacy.pharmacyAddress}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDetailsOpen(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.modalSectionRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.modalSectionTitle}>Available Medicines</Text>
            </View>

            <FlatList
              data={selectedPharmacy?.items || []}
              keyExtractor={(item, idx) => `${item._id}-${idx}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.modalMedicineRow}>
                  <View style={styles.modalMedIcon}>
                    <Ionicons name="medical-outline" size={14} color="#2B9FD8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalMedicineName}>{item.name}</Text>
                    <View style={styles.modalMedicineDetails}>
                      {item.brand && <Text style={styles.modalDetailText}>Brand: {item.brand}</Text>}
                      {item.strength && <Text style={styles.modalDetailText}>Strength: {item.strength}</Text>}
                      {item.batch_no && <Text style={styles.modalDetailText}>Batch: {item.batch_no}</Text>}
                      <Text style={styles.modalDetailText}>Qty: {item.qty}</Text>
                      {item.expiry_date && (
                        <Text style={styles.modalDetailText}>Exp: {String(item.expiry_date).slice(0, 10)}</Text>
                      )}
                    </View>
                  </View>
                  {item.unit_price ? (
                    <View style={styles.modalPriceBox}>
                      <Text style={styles.modalPrice}>Rs. {item.unit_price.toFixed(2)}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => selectedPharmacy && openDirections(selectedPharmacy)}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.modalActionText}>Get Directions</Text>
              </TouchableOpacity>

              {selectedPharmacy?.pharmacyPhone && (
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: "#059669" }]}
                  onPress={() => callPharmacy(selectedPharmacy.pharmacyPhone)}
                >
                  <Ionicons name="call" size={18} color="#fff" />
                  <Text style={styles.modalActionText}>Call Pharmacy</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: "#2B9FD8",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#FFFFFF" },
  sub: { marginTop: 3, fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.80)" },

  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: "rgba(255,255,255,0.30)" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F9FD",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: "600", color: "#111827" },
  clearBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  searchBtn: {
    width: 50, height: 50, borderRadius: 15,
    backgroundColor: "#2B9FD8",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },

  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#E0F3FB",
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
  },
  infoBarText: { fontSize: 13, fontWeight: "800", color: "#1A7BAF" },
  infoBarSub: { fontSize: 11, fontWeight: "600", color: "#2B9FD8", marginTop: 1 },

  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#E0F3FB",
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
  },
  resultsBarLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  resultsText: { fontSize: 13, fontWeight: "700", color: "#1A7BAF" },
  resultsSubText: { fontSize: 11, fontWeight: "700", color: "#2B9FD8" },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginBottom: 8 },
  emptyText: {
    fontSize: 13, fontWeight: "500", color: "#6B7280",
    textAlign: "center", lineHeight: 20,
  },

  pharmacyCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    padding: 16,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  pharmacyIconBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  pharmacyName: { fontSize: 15, fontWeight: "900", color: "#111827" },
  pharmacyAddress: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 3 },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  distanceText: { fontSize: 11, fontWeight: "900", color: "#2B9FD8" },

  cardDivider: { height: 1, backgroundColor: "#E8F4FB", marginVertical: 12 },

  stockInfo: { marginBottom: 10 },
  stockPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stockText: { fontSize: 12, fontWeight: "800", color: "#2B9FD8" },

  medicineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#F3F9FD",
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E0F3FB",
  },
  medDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2B9FD8" },
  medicineName: { fontSize: 13, fontWeight: "900", color: "#111827" },
  medicineDetails: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 2 },
  medicinePrice: { fontSize: 13, fontWeight: "900", color: "#059669" },

  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    marginTop: 2,
  },
  viewMoreText: { fontSize: 12, fontWeight: "900", color: "#2B9FD8" },

  cardActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F3F9FD",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
  },
  actionBtnGreen: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  actionBtnPrimary: { backgroundColor: "#2B9FD8", borderColor: "#2B9FD8" },
  actionBtnText: { fontSize: 12, fontWeight: "800", color: "#2B9FD8" },

  customMarker: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#2B9FD8",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFFFFF",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.40,
    shadowRadius: 6,
    elevation: 5,
  },

  mapOverlay: {
    position: "absolute",
    top: 16, left: 16, right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  mapOverlayInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  mapOverlayTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  mapOverlayText: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#D0EAFB",
    alignSelf: "center",
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    gap: 12,
  },
  modalPharmacyIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  modalSubtitle: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 3 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  modalDivider: { height: 1, backgroundColor: "#E0F3FB", marginBottom: 12 },

  modalSectionRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, marginBottom: 12,
  },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8" },
  modalSectionTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },

  modalMedicineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F9FF",
  },
  modalMedIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  modalMedicineName: { fontSize: 14, fontWeight: "900", color: "#111827" },
  modalMedicineDetails: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  modalDetailText: {
    fontSize: 11, fontWeight: "700", color: "#6B7280",
    backgroundColor: "#F3F9FD",
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6,
  },
  modalPriceBox: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  modalPrice: { fontSize: 13, fontWeight: "900", color: "#059669" },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2B9FD8",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modalActionText: { fontSize: 14, fontWeight: "900", color: "#fff" },
});