
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  fetchDoctors,
  fetchMyAppointments,
  type Appointment,
  type Doctor,
} from "../../../src/api/telemedicineApi";
import { AuthContext } from "../../../src/context/AuthContext";

const GRACE_MIN = 10;

export default function TelemedicineScreen() {
  const router = useRouter();
  const { token } = useContext(AuthContext) as any;

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      if (!token) { Alert.alert("Auth Error", "Please login again."); return; }
      const [d, a] = await Promise.all([
        fetchDoctors(token as string),
        fetchMyAppointments(token as string),
      ]);
      setDoctors(d);
      setAppointments(a);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load telemedicine data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openBooking = (doc: Doctor) => {
    router.push({
      pathname: "/main/patient/bookAppointment",
      params: { doctorId: doc._id, doctorName: doc.username },
    } as any);
  };

  const doctorLabel = (d: any) => {
    if (!d) return "Doctor";
    if (typeof d === "string") return d;
    return d.username || d.email || d._id || "Doctor";
  };

  const doctorIdStr = (d: any) => {
    if (!d) return "";
    if (typeof d === "string") return d;
    return d._id || "";
  };

  const filteredDoctors = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((d) => {
      const name = (d.username || "").toLowerCase();
      const spec = ((d as any).specialization || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      return name.includes(query) || spec.includes(query) || email.includes(query);
    });
  }, [doctors, q]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return (appointments ?? [])
      .filter((a) => new Date(a.endTime) > now)
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  }, [appointments]);

  const goHistory = () => router.push("/main/patient/telemedicineHistory" as any);

  const getCallWindow = (appt: Appointment) => {
    const now = new Date();
    const start = new Date(appt.startTime);
    const end = new Date(appt.endTime);
    const startWithGrace = new Date(start.getTime() - GRACE_MIN * 60 * 1000);
    const inWindow = now >= startWithGrace && now <= end;
    return { inWindow, allowedFrom: startWithGrace, allowedUntil: end };
  };

  const handleCallPress = (doctorId: string, appointmentId: string, callType: "video" | "audio") => {
    if (!token) { Alert.alert("Auth Error", "Please login again."); return; }
    router.push({
      pathname: "/main/patient/callRoom",
      params: { doctorId, appointmentId, callType },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Telemedicine</Text>
          <Text style={styles.sub}>Search doctors & manage appointments</Text>
        </View>
        <Pressable onPress={goHistory} style={styles.iconBtn}>
          <Ionicons name="time-outline" size={20} color="#2B9FD8" />
        </Pressable>
        <Pressable onPress={load} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#2B9FD8" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2B9FD8" size="large" />
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          data={upcomingAppointments}
          keyExtractor={(a) => a._id}
          ListHeaderComponent={
            <>
              {/* Search bar */}
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={18} color="#2B9FD8" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search by name / specialization / email..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                />
                {q.length > 0 ? (
                  <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
                    <Ionicons name="close" size={16} color="#2B9FD8" />
                  </Pressable>
                ) : null}
              </View>

              {/* Doctors section */}
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionTitle}>Available Doctors</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{filteredDoctors.length}</Text>
                </View>
              </View>

              {filteredDoctors.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="person-outline" size={28} color="#9CA3AF" />
                  <Text style={styles.muted}>No approved doctors found.</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredDoctors}
                  keyExtractor={(d) => d._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 6 }}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => openBooking(item)} style={styles.docCard}>
                      <View style={styles.docTop}>
                        <View style={styles.docAvatar}>
                          <Text style={styles.docAvatarText}>
                            {(item.username?.[0] || "D").toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docName} numberOfLines={1}>{item.username}</Text>
                          <Text style={styles.docSpec} numberOfLines={1}>
                            {(item as any).specialization || "General Practitioner"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.docMeta} numberOfLines={1}>{item.email}</Text>

                      <View style={styles.docBtn}>
                        <Text style={styles.docBtnText}>Book Appointment</Text>
                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                      </View>
                    </Pressable>
                  )}
                />
              )}

              <View style={{ height: 20 }} />

              {/* Appointments section */}
              <View style={styles.sectionRow}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionAccent} />
                  <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{upcomingAppointments.length}</Text>
                </View>
              </View>

              <View style={styles.infoHint}>
                <Ionicons name="information-circle-outline" size={14} color="#2B9FD8" />
                <Text style={styles.infoHintText}>
                  Call buttons are enabled only when the doctor confirms and during the appointment window.
                </Text>
              </View>

              <View style={{ height: 12 }} />
            </>
          }
          renderItem={({ item }) => {
            const docId = doctorIdStr(item.doctorId);
            const isConfirmed = item.status === "confirmed";
            const win = getCallWindow(item);
            const canCall = isConfirmed && win.inWindow;

            const disabledReason = !isConfirmed
              ? "Doctor confirmation required"
              : !win.inWindow
              ? `Call available from ${fmtTime(win.allowedFrom)} until ${fmtTime(win.allowedUntil)}`
              : "";

            return (
              <View style={styles.apptCard}>
                <View style={styles.apptCardTop}>
                  <View style={styles.apptDocAvatar}>
                    <Text style={styles.apptDocAvatarText}>
                      {(doctorLabel(item.doctorId)?.[0] || "D").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptTitle} numberOfLines={1}>
                      {doctorLabel(item.doctorId)}
                    </Text>
                    <Text style={styles.apptMeta}>{formatRange(item.startTime, item.endTime)}</Text>
                  </View>
                  <View style={[styles.badge, badgeStyle(item.status)]}>
                    <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.apptActions}>
                  <Pressable
                    disabled={!canCall}
                    style={[styles.callBtn, !canCall && styles.callBtnDisabled]}
                    onPress={() => handleCallPress(docId, item._id, "video")}
                  >
                    <Ionicons name="videocam-outline" size={18} color="#fff" />
                    <Text style={styles.callBtnText}>Video Call</Text>
                  </Pressable>

                  <Pressable
                    disabled={!canCall}
                    style={[styles.callBtn, { backgroundColor: "#0F766E" }, !canCall && styles.callBtnDisabled]}
                    onPress={() => handleCallPress(docId, item._id, "audio")}
                  >
                    <Ionicons name="call-outline" size={18} color="#fff" />
                    <Text style={styles.callBtnText}>Audio Call</Text>
                  </Pressable>
                </View>

                {!canCall ? (
                  <View style={styles.hintRow}>
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.pendingHint}>{disabledReason}</Text>
                  </View>
                ) : (
                  <View style={styles.hintRow}>
                    <View style={styles.readyDot} />
                    <Text style={styles.readyHint}>Call available now</Text>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={28} color="#9CA3AF" />
              <Text style={styles.muted}>No upcoming appointments.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const d = s.toLocaleDateString();
  const st = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const et = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${d} • ${st} - ${et}`;
}

function fmtTime(d: Date) {
  return d.toLocaleString([], {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function badgeStyle(status: Appointment["status"]) {
  switch (status) {
    case "confirmed": return { backgroundColor: "#10B981" };
    case "pending":   return { backgroundColor: "#F59E0B" };
    case "rejected":  return { backgroundColor: "#EF4444" };
    case "cancelled": return { backgroundColor: "#6B7280" };
    default:          return { backgroundColor: "#111827" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header */
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2B9FD8",
  },
  h1: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.80)" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "#6B7280", fontWeight: "600", fontSize: 13 },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: "#FFFFFF",
    marginBottom: 4,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontWeight: "600", color: "#111827", fontSize: 14 },
  clearBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F3FB",
  },

  /* Section headers */
  sectionRow: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8" },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  countBadge: {
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  countBadgeText: { fontSize: 12, fontWeight: "800", color: "#2B9FD8" },

  infoHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#E0F3FB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  infoHintText: { fontSize: 12, color: "#1A7BAF", fontWeight: "600", flex: 1, lineHeight: 17 },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },

  /* Doctor card */
  docCard: {
    width: 260,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    gap: 10,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  docTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  docAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },
  docAvatarText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  docName: { fontSize: 15, fontWeight: "900", color: "#111827" },
  docSpec: { marginTop: 2, fontWeight: "700", color: "#6B7280", fontSize: 12 },
  docMeta: { color: "#9CA3AF", fontWeight: "600", fontSize: 12 },
  docBtn: {
    backgroundColor: "#2B9FD8",
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  docBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  /* Appointment card */
  apptCard: {
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  apptCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  apptDocAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E0F3FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  apptDocAvatarText: { color: "#2B9FD8", fontWeight: "900", fontSize: 16 },
  apptTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  apptMeta: { marginTop: 2, color: "#6B7280", fontWeight: "600", fontSize: 12 },

  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 11 },

  apptActions: { flexDirection: "row", gap: 10 },
  callBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  callBtnDisabled: { opacity: 0.35 },
  callBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  pendingHint: { color: "#9CA3AF", fontWeight: "700", fontSize: 12, flex: 1 },
  readyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  readyHint: { color: "#059669", fontWeight: "900", fontSize: 12 },
});














// new try code

// import { Ionicons } from "@expo/vector-icons";
// import { useFocusEffect, useRouter } from "expo-router";
// import React, { useCallback, useContext, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Pressable,
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from "react-native";
// import {
//   fetchDoctors,
//   fetchMyAppointments,
//   type Appointment,
//   type Doctor,
// } from "../../../src/api/telemedicineApi";
// import { AuthContext } from "../../../src/context/AuthContext";

// const GRACE_MIN = 10;

// export default function TelemedicineScreen() {
//   const router = useRouter();
//   const { token } = useContext(AuthContext) as any;

//   const [loading, setLoading] = useState(true);
//   const [doctors, setDoctors] = useState<Doctor[]>([]);
//   const [appointments, setAppointments] = useState<Appointment[]>([]);
//   const [q, setQ] = useState("");

//   const load = useCallback(async () => {
//     try {
//       setLoading(true);

//       if (!token) {
//         Alert.alert("Auth Error", "Please login again.");
//         return;
//       }

//       const [d, a] = await Promise.all([
//         fetchDoctors(token as string),
//         fetchMyAppointments(token as string),
//       ]);

//       setDoctors(d);
//       setAppointments(a);
//     } catch (e: any) {
//       Alert.alert("Error", e?.message ?? "Failed to load telemedicine data");
//     } finally {
//       setLoading(false);
//     }
//   }, [token]);

//   useFocusEffect(
//     useCallback(() => {
//       load();
//     }, [load])
//   );

//   const openBooking = (doc: Doctor) => {
//     router.push({
//       pathname: "/main/patient/bookAppointment",
//       params: { doctorId: doc._id, doctorName: doc.username },
//     } as any);
//   };

//   const doctorLabel = (d: any) => {
//     if (!d) return "Doctor";
//     if (typeof d === "string") return d;
//     return d.username || d.email || d._id || "Doctor";
//   };

//   const doctorIdStr = (d: any) => {
//     if (!d) return "";
//     if (typeof d === "string") return d;
//     return d._id || "";
//   };

//   const filteredDoctors = useMemo(() => {
//     const query = q.trim().toLowerCase();
//     if (!query) return doctors;

//     return doctors.filter((d) => {
//       const name = (d.username || "").toLowerCase();
//       const spec = ((d as any).specialization || "").toLowerCase();
//       const email = (d.email || "").toLowerCase();
//       return name.includes(query) || spec.includes(query) || email.includes(query);
//     });
//   }, [doctors, q]);

//   const upcomingAppointments = useMemo(() => {
//     const now = new Date();

//     return (appointments ?? [])
//       .filter((a) => new Date(a.endTime) > now)
//       .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
//   }, [appointments]);

//   const goHistory = () => router.push("/main/patient/telemedicineHistory" as any);

//   const getCallWindow = (appt: Appointment) => {
//     const now = new Date();
//     const start = new Date(appt.startTime);
//     const end = new Date(appt.endTime);
//     const startWithGrace = new Date(start.getTime() - GRACE_MIN * 60 * 1000);
//     const inWindow = now >= startWithGrace && now <= end;

//     return { inWindow, allowedFrom: startWithGrace, allowedUntil: end };
//   };

//   const handleCallPress = (
//     doctorId: string,
//     appointmentId: string,
//     callType: "video" | "audio"
//   ) => {
//     if (!token) {
//       Alert.alert("Auth Error", "Please login again.");
//       return;
//     }

//     router.push({
//       pathname: "/main/patient/callRoom",
//       params: { doctorId, appointmentId, callType },
//     } as any);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.h1}>Telemedicine</Text>
//           <Text style={styles.sub}>Search doctors & manage appointments</Text>
//         </View>

//         <Pressable onPress={goHistory} style={styles.iconBtn}>
//           <Ionicons name="time-outline" size={20} color="#2B9FD8" />
//         </Pressable>

//         <Pressable onPress={load} style={styles.iconBtn}>
//           <Ionicons name="refresh" size={20} color="#2B9FD8" />
//         </Pressable>
//       </View>

//       {loading ? (
//         <View style={styles.center}>
//           <ActivityIndicator color="#2B9FD8" size="large" />
//           <Text style={styles.muted}>Loading...</Text>
//         </View>
//       ) : (
//         <FlatList
//           contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
//           data={upcomingAppointments}
//           keyExtractor={(a) => a._id}
//           ListHeaderComponent={
//             <>
//               <View style={styles.searchWrap}>
//                 <Ionicons name="search" size={18} color="#2B9FD8" />
//                 <TextInput
//                   value={q}
//                   onChangeText={setQ}
//                   placeholder="Search by name / specialization / email..."
//                   placeholderTextColor="#9CA3AF"
//                   style={styles.searchInput}
//                 />
//                 {q.length > 0 ? (
//                   <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
//                     <Ionicons name="close" size={16} color="#2B9FD8" />
//                   </Pressable>
//                 ) : null}
//               </View>

//               <View style={styles.sectionRow}>
//                 <View style={styles.sectionTitleRow}>
//                   <View style={styles.sectionAccent} />
//                   <Text style={styles.sectionTitle}>Available Doctors</Text>
//                 </View>
//                 <View style={styles.countBadge}>
//                   <Text style={styles.countBadgeText}>{filteredDoctors.length}</Text>
//                 </View>
//               </View>

//               {filteredDoctors.length === 0 ? (
//                 <View style={styles.emptyBox}>
//                   <Ionicons name="person-outline" size={28} color="#9CA3AF" />
//                   <Text style={styles.muted}>No approved doctors found.</Text>
//                 </View>
//               ) : (
//                 <FlatList
//                   data={filteredDoctors}
//                   keyExtractor={(d) => d._id}
//                   horizontal
//                   showsHorizontalScrollIndicator={false}
//                   contentContainerStyle={{ paddingVertical: 6 }}
//                   renderItem={({ item }) => (
//                     <Pressable onPress={() => openBooking(item)} style={styles.docCard}>
//                       <View style={styles.docTop}>
//                         <View style={styles.docAvatar}>
//                           <Text style={styles.docAvatarText}>
//                             {(item.username?.[0] || "D").toUpperCase()}
//                           </Text>
//                         </View>
//                         <View style={{ flex: 1 }}>
//                           <Text style={styles.docName} numberOfLines={1}>
//                             {item.username}
//                           </Text>
//                           <Text style={styles.docSpec} numberOfLines={1}>
//                             {(item as any).specialization || "General Practitioner"}
//                           </Text>
//                         </View>
//                       </View>

//                       <Text style={styles.docMeta} numberOfLines={1}>
//                         {item.email}
//                       </Text>

//                       <View style={styles.docBtn}>
//                         <Text style={styles.docBtnText}>Book Appointment</Text>
//                         <Ionicons name="chevron-forward" size={16} color="#fff" />
//                       </View>
//                     </Pressable>
//                   )}
//                 />
//               )}

//               <View style={{ height: 20 }} />

//               <View style={styles.sectionRow}>
//                 <View style={styles.sectionTitleRow}>
//                   <View style={styles.sectionAccent} />
//                   <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
//                 </View>
//                 <View style={styles.countBadge}>
//                   <Text style={styles.countBadgeText}>{upcomingAppointments.length}</Text>
//                 </View>
//               </View>

//               <View style={styles.infoHint}>
//                 <Ionicons name="information-circle-outline" size={14} color="#2B9FD8" />
//                 <Text style={styles.infoHintText}>
//                   Call buttons are enabled only when the doctor confirms and during the
//                   appointment window.
//                 </Text>
//               </View>

//               <View style={{ height: 12 }} />
//             </>
//           }
//           renderItem={({ item }) => {
//             const docId = doctorIdStr(item.doctorId);
//             const isConfirmed = item.status === "confirmed";
//             const win = getCallWindow(item);
//             const canCall = isConfirmed && win.inWindow;

//             const disabledReason = !isConfirmed
//               ? "Doctor confirmation required"
//               : !win.inWindow
//               ? `Call available from ${fmtTime(win.allowedFrom)} until ${fmtTime(
//                   win.allowedUntil
//                 )}`
//               : "";

//             return (
//               <View style={styles.apptCard}>
//                 <View style={styles.apptCardTop}>
//                   <View style={styles.apptDocAvatar}>
//                     <Text style={styles.apptDocAvatarText}>
//                       {(doctorLabel(item.doctorId)?.[0] || "D").toUpperCase()}
//                     </Text>
//                   </View>

//                   <View style={{ flex: 1 }}>
//                     <Text style={styles.apptTitle} numberOfLines={1}>
//                       {doctorLabel(item.doctorId)}
//                     </Text>
//                     <Text style={styles.apptMeta}>
//                       {formatRange(item.startTime, item.endTime)}
//                     </Text>
//                   </View>

//                   <View style={[styles.badge, badgeStyle(item.status)]}>
//                     <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
//                   </View>
//                 </View>

//                 <View style={styles.apptActions}>
//                   <Pressable
//                     disabled={!canCall}
//                     style={[styles.callBtn, !canCall && styles.callBtnDisabled]}
//                     onPress={() => handleCallPress(docId, item._id, "video")}
//                   >
//                     <Ionicons name="videocam-outline" size={18} color="#fff" />
//                     <Text style={styles.callBtnText}>Video Call</Text>
//                   </Pressable>

//                   <Pressable
//                     disabled={!canCall}
//                     style={[
//                       styles.callBtn,
//                       { backgroundColor: "#0F766E" },
//                       !canCall && styles.callBtnDisabled,
//                     ]}
//                     onPress={() => handleCallPress(docId, item._id, "audio")}
//                   >
//                     <Ionicons name="call-outline" size={18} color="#fff" />
//                     <Text style={styles.callBtnText}>Audio Call</Text>
//                   </Pressable>
//                 </View>

//                 {!canCall ? (
//                   <View style={styles.hintRow}>
//                     <Ionicons name="time-outline" size={13} color="#9CA3AF" />
//                     <Text style={styles.pendingHint}>{disabledReason}</Text>
//                   </View>
//                 ) : (
//                   <View style={styles.hintRow}>
//                     <View style={styles.readyDot} />
//                     <Text style={styles.readyHint}>Call available now</Text>
//                   </View>
//                 )}
//               </View>
//             );
//           }}
//           ListEmptyComponent={
//             <View style={styles.emptyBox}>
//               <Ionicons name="calendar-outline" size={28} color="#9CA3AF" />
//               <Text style={styles.muted}>No upcoming appointments.</Text>
//             </View>
//           }
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// function formatRange(startISO: string, endISO: string) {
//   const s = new Date(startISO);
//   const e = new Date(endISO);
//   const d = s.toLocaleDateString();
//   const st = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   const et = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//   return `${d} • ${st} - ${et}`;
// }

// function fmtTime(d: Date) {
//   return d.toLocaleString([], {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function badgeStyle(status: Appointment["status"]) {
//   switch (status) {
//     case "confirmed":
//       return { backgroundColor: "#10B981" };
//     case "pending":
//       return { backgroundColor: "#F59E0B" };
//     case "rejected":
//       return { backgroundColor: "#EF4444" };
//     case "cancelled":
//       return { backgroundColor: "#6B7280" };
//     default:
//       return { backgroundColor: "#111827" };
//   }
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#F3F9FD" },

//   header: {
//     paddingHorizontal: 18,
//     paddingTop: 14,
//     paddingBottom: 14,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     backgroundColor: "#2B9FD8",
//   },
//   h1: { fontSize: 20, fontWeight: "900", color: "#FFFFFF" },
//   sub: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.80)" },
//   iconBtn: {
//     width: 40,
//     height: 40,
//     borderRadius: 13,
//     backgroundColor: "rgba(255,255,255,0.20)",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
//   muted: { color: "#6B7280", fontWeight: "600", fontSize: 13 },

//   searchWrap: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     borderWidth: 1.5,
//     borderColor: "#D0EAFB",
//     borderRadius: 16,
//     paddingHorizontal: 14,
//     height: 50,
//     backgroundColor: "#FFFFFF",
//     marginBottom: 4,
//     shadowColor: "#2B9FD8",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 8,
//     elevation: 2,
//   },
//   searchInput: { flex: 1, fontWeight: "600", color: "#111827", fontSize: 14 },
//   clearBtn: {
//     width: 30,
//     height: 30,
//     borderRadius: 9,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#E0F3FB",
//   },

//   sectionRow: {
//     marginTop: 16,
//     marginBottom: 10,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
//   sectionAccent: { width: 4, height: 16, borderRadius: 2, backgroundColor: "#2B9FD8" },
//   sectionTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
//   countBadge: {
//     backgroundColor: "#E0F3FB",
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//   },
//   countBadgeText: { fontSize: 12, fontWeight: "800", color: "#2B9FD8" },

//   infoHint: {
//     flexDirection: "row",
//     alignItems: "flex-start",
//     gap: 6,
//     backgroundColor: "#E0F3FB",
//     borderRadius: 12,
//     paddingHorizontal: 12,
//     paddingVertical: 9,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//   },
//   infoHintText: { fontSize: 12, color: "#1A7BAF", fontWeight: "600", flex: 1, lineHeight: 17 },

//   emptyBox: {
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     paddingVertical: 24,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 16,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//   },

//   docCard: {
//     width: 260,
//     padding: 16,
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     marginRight: 12,
//     backgroundColor: "#FFFFFF",
//     gap: 10,
//     shadowColor: "#2B9FD8",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.08,
//     shadowRadius: 10,
//     elevation: 3,
//   },
//   docTop: { flexDirection: "row", gap: 12, alignItems: "center" },
//   docAvatar: {
//     width: 46,
//     height: 46,
//     borderRadius: 15,
//     backgroundColor: "#2B9FD8",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   docAvatarText: { color: "#fff", fontWeight: "900", fontSize: 18 },
//   docName: { fontSize: 15, fontWeight: "900", color: "#111827" },
//   docSpec: { marginTop: 2, fontWeight: "700", color: "#6B7280", fontSize: 12 },
//   docMeta: { color: "#9CA3AF", fontWeight: "600", fontSize: 12 },
//   docBtn: {
//     backgroundColor: "#2B9FD8",
//     paddingVertical: 11,
//     borderRadius: 14,
//     alignItems: "center",
//     justifyContent: "center",
//     flexDirection: "row",
//     gap: 8,
//     shadowColor: "#2B9FD8",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   docBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

//   apptCard: {
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     borderRadius: 20,
//     padding: 16,
//     marginBottom: 12,
//     backgroundColor: "#FFFFFF",
//     gap: 12,
//     shadowColor: "#2B9FD8",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.07,
//     shadowRadius: 10,
//     elevation: 3,
//   },
//   apptCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
//   apptDocAvatar: {
//     width: 42,
//     height: 42,
//     borderRadius: 13,
//     backgroundColor: "#E0F3FB",
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//   },
//   apptDocAvatarText: { color: "#2B9FD8", fontWeight: "900", fontSize: 16 },
//   apptTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
//   apptMeta: { marginTop: 2, color: "#6B7280", fontWeight: "600", fontSize: 12 },

//   badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
//   badgeText: { color: "#fff", fontWeight: "900", fontSize: 11 },

//   apptActions: { flexDirection: "row", gap: 10 },
//   callBtn: {
//     flex: 1,
//     height: 46,
//     borderRadius: 14,
//     backgroundColor: "#2B9FD8",
//     alignItems: "center",
//     justifyContent: "center",
//     flexDirection: "row",
//     gap: 8,
//     shadowColor: "#2B9FD8",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.25,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   callBtnDisabled: { opacity: 0.35 },
//   callBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

//   hintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
//   pendingHint: { color: "#9CA3AF", fontWeight: "700", fontSize: 12, flex: 1 },
//   readyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
//   readyHint: { color: "#059669", fontWeight: "900", fontSize: 12 },
// });