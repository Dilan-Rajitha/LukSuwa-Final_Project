import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

export default function PharmacyCompleteProfile() {
  // ✅ TS-safe: AuthContext can be null initially
  const auth = useContext(AuthContext) as any;

  // If AuthProvider not ready yet
  if (!auth) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Loading...</Text>
      </View>
    );
  }

  const { token, user } = auth; // token/user available when logged in

  const mapRef = useRef<MapView>(null);

  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [locLoading, setLocLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Optional: prefill if user already has fields
  useEffect(() => {
    if (user?.pharmacy_name) setPharmacyName(user.pharmacy_name);
    if (user?.address) setAddress(user.address);
  }, [user]);

  const region: Region = useMemo(
    () => ({
      latitude: lat ?? 6.9271, // Colombo fallback
      longitude: lng ?? 79.8612,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }),
    [lat, lng]
  );

  const animateTo = (latitude: number, longitude: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      450
    );
  };

  const getMyLocation = async () => {
    try {
      setLocLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is required to set your pharmacy pin."
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = loc.coords.latitude;
      const longitude = loc.coords.longitude;

      setLat(latitude);
      setLng(longitude);
      animateTo(latitude, longitude);
    } catch (e: any) {
      Alert.alert(
        "Location Error",
        e?.message || "Failed to get your current location."
      );
    } finally {
      setLocLoading(false);
    }
  };

  useEffect(() => {
    // Auto set current location once
    getMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPin = (latitude: number, longitude: number) => {
    setLat(latitude);
    setLng(longitude);
  };

  const saveProfile = async () => {
    if (lat == null || lng == null) {
      Alert.alert(
        "Location Required",
        "Please set the pin on the map before saving."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        lat,
        lng,
        address: address.trim(),
        pharmacy_name: pharmacyName.trim(),
      };

      // axios interceptor adds Bearer token automatically.
      // If you ever need manual header, uncomment below:
      // const headers = { Authorization: `Bearer ${token}` };

      const res = await API.patch("/superusers/me/profile", payload);

      Alert.alert("Saved", res.data?.message || "Profile updated successfully.");
      router.replace("/main/pharmacy");
    } catch (err: any) {
      Alert.alert(
        "Update Failed",
        err?.response?.data?.message || err?.message || "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = lat != null && lng != null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>Complete Pharmacy Profile</Text>
        <Text style={styles.subtitle}>
          Set your pharmacy location pin. This is required to appear in nearby
          medicine search.
        </Text>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pharmacy Details</Text>

          <Text style={styles.label}>Pharmacy Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., ABC Pharmacy"
            placeholderTextColor="#9CA3AF"
            value={pharmacyName}
            onChangeText={setPharmacyName}
          />

          <Text style={styles.label}>Address (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Street, City, District"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        {/* Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Location Pin (required)</Text>

            <TouchableOpacity
              style={[styles.ghostBtn, locLoading && styles.disabled]}
              onPress={getMyLocation}
              disabled={locLoading}
              activeOpacity={0.85}
            >
              {locLoading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={16} color="#1A7BAF" />
                  <Text style={styles.ghostBtnText}>Use My GPS</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            Tap the map to place the pin. Drag the pin to fine-tune the
            location.
          </Text>

          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              initialRegion={region}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setPin(latitude, longitude);
              }}
            >
              {hasCoords && (
                <Marker
                  coordinate={{ latitude: lat!, longitude: lng! }}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setPin(latitude, longitude);
                  }}
                  title="Pharmacy Location"
                  description="Drag to adjust"
                />
              )}
            </MapView>
          </View>

          {hasCoords && (
            <View style={styles.coordsRow}>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>LAT</Text>
                <Text style={styles.pillValue}>{lat!.toFixed(6)}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillLabel}>LNG</Text>
                <Text style={styles.pillValue}>{lng!.toFixed(6)}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.disabled]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Save & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F3F9FD",
  },
  centerText: { fontWeight: "800", color: "#6B7280" },

  scroll: { flex: 1, backgroundColor: "#F3F9FD" },
  content: { flexGrow: 1 },
  container: { flex: 1, paddingHorizontal: 18, paddingVertical: 22 },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F3F9FD",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    color: "#111827",
    marginBottom: 12,
    fontWeight: "700",
  },
  textArea: { height: 90, textAlignVertical: "top" },

  helpText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 10,
    fontWeight: "600",
  },

  mapWrap: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    backgroundColor: "#FFFFFF",
  },
  map: { flex: 1 },

  coordsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F3F9FD",
  },
  pillLabel: { fontSize: 11, color: "#6B7280", fontWeight: "900", marginBottom: 4 },
  pillValue: { fontSize: 13, color: "#111827", fontWeight: "900" },

  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#E0F3FB",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ghostBtnText: { color: "#1A7BAF", fontWeight: "900", fontSize: 12 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#2B9FD8",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },

  backBtn: { marginTop: 10, alignItems: "center" },
  backText: { color: "#2B9FD8", fontSize: 13, fontWeight: "900" },

  disabled: { opacity: 0.6 },
});