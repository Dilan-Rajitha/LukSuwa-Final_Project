
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { io, type Socket } from "socket.io-client";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

type Incoming = {
  callId: string;
  from: string; // patientId
  name?: string;
  callType: "video" | "audio";
};

function decodeJwtUserId(token?: string | null): string {
  try {
    if (!token) return "";
    const parts = token.split(".");
    if (parts.length !== 3) return "";
    const payload = JSON.parse(
      decodeURIComponent(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
    );
    return payload?.id || payload?._id || "";
  } catch {
    return "";
  }
}

function getSocketUrlFromAxios(): string {
  const base = (API as any)?.defaults?.baseURL as string | undefined;
  if (!base) return "http://192.168.1.2:5000";
  return base.replace(/\/api\/?$/, "");
}

export default function DoctorTelemedicine() {
  const router = useRouter();
  const { token, user } = useContext(AuthContext) as any;

  const myId = useMemo(() => {
    return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
  }, [user, token]);

  const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
  const socketRef = useRef<Socket | null>(null);

  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!myId) return;

    const sock = io(socketUrl, { transports: ["websocket", "polling"] });
    socketRef.current = sock;

    sock.on("connect", () => {
      setConnected(true);
      sock.emit("register", myId);
    });

    sock.on("disconnect", () => setConnected(false));

    sock.on("incoming-call", (data: Incoming) => {
      setIncoming(data);
    });

    sock.on("connect_error", (err: any) => {
      console.log("❌ Socket connect_error:", err?.message);
    });

    return () => {
      try {
        sock.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, [myId, socketUrl]);

  const reject = async () => {
    try {
      if (!incoming) return;

      socketRef.current?.emit("reject-call", { callId: incoming.callId, to: incoming.from });

      await API.post(
        "/calls/reject",
        { callId: incoming.callId, reason: "Rejected by doctor" },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to reject");
    } finally {
      setIncoming(null);
    }
  };

  const accept = () => {
    if (!incoming) return;

    router.push({
      pathname: "/main/doctor/callRoom",
      params: {
        callId: incoming.callId,
        patientId: incoming.from,
        patientName: incoming.name || "Patient",
        callType: incoming.callType,
      },
    } as any);

    setIncoming(null);
  };

  return (
    <View style={styles.page}>
      {/* Blue Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Doctor Calls</Text>
          <Text style={styles.sub}>
            Socket:{" "}
            <Text style={{ fontWeight: "900", color: connected ? "#ECFDF5" : "rgba(255,255,255,0.85)" }}>
              {connected ? "ONLINE" : "OFFLINE"}
            </Text>
            {"  "}• Keep this screen open to receive calls.
          </Text>
        </View>

        <Pressable
          style={styles.iconBtn}
          onPress={() => Alert.alert("Info", "Incoming call popup will appear here.")}
        >
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.heroIconCircle}>
          <Ionicons name="videocam-outline" size={30} color="#2B9FD8" />
        </View>

        <Text style={styles.title}>Waiting for calls</Text>
        <Text style={styles.muted}>
          When a patient initiates a call, a popup will appear. Tap Accept to open the call room.
        </Text>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, connected ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>{connected ? "Listening for incoming calls" : "Socket disconnected"}</Text>
        </View>

        <Text style={styles.debugText}>Doctor ID: {myId || "-"}</Text>
      </View>

      {/* Incoming call modal */}
      <Modal visible={!!incoming} transparent animationType="fade" onRequestClose={() => setIncoming(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIncoming(null)} />

          <View style={styles.modalCard}>
            <View style={styles.modalTop}>
              <View style={styles.modalIconCircle}>
                <Ionicons
                  name={incoming?.callType === "video" ? "videocam-outline" : "call-outline"}
                  size={20}
                  color="#FFFFFF"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Incoming {incoming?.callType === "video" ? "Video" : "Audio"} Call
                </Text>
                <Text style={styles.modalSub}>From: {incoming?.name || incoming?.from}</Text>
              </View>

              <Pressable onPress={() => setIncoming(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.rejectBtn]} onPress={reject}>
                <Ionicons name="close" size={18} color="#fff" />
                <Text style={styles.btnText}>Reject</Text>
              </Pressable>

              <Pressable style={[styles.btn, styles.acceptBtn]} onPress={accept}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.btnText}>Accept</Text>
              </Pressable>
            </View>

            <View style={styles.modalHint}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#2B9FD8" />
              <Text style={styles.modalHintText}>Accept will open the call room immediately.</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* Header - blue theme */
  header: {
    padding: 16,
    backgroundColor: "#2B9FD8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  h1: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.82)" },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Body */
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },
  muted: { textAlign: "center", color: "#6B7280", fontWeight: "700", lineHeight: 18 },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: "#10B981" },
  dotOff: { backgroundColor: "#EF4444" },
  statusText: { color: "#374151", fontWeight: "800", fontSize: 12 },

  debugText: { marginTop: 10, fontSize: 11, fontWeight: "800", color: "#9CA3AF" },

  /* Modal */
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  modalTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  modalSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },

  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
  },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnText: { color: "#fff", fontWeight: "900" },
  rejectBtn: { backgroundColor: "#DC2626" },
  acceptBtn: { backgroundColor: "#2B9FD8" },

  modalHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    padding: 12,
  },
  modalHintText: { color: "#1A7BAF", fontWeight: "700", flex: 1, lineHeight: 18 },
});









// new try

// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
// import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
// import { io, type Socket } from "socket.io-client";
// import API from "../../../src/api/axiosConfig";
// import { AuthContext } from "../../../src/context/AuthContext";

// function decodeJwtUserId(token?: string | null): string {
//   try {
//     if (!token) return "";
//     const parts = token.split(".");
//     if (parts.length !== 3) return "";
//     const payload = JSON.parse(
//       decodeURIComponent(
//         atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
//           .split("")
//           .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
//           .join("")
//       )
//     );
//     return payload?.id || payload?._id || "";
//   } catch {
//     return "";
//   }
// }

// function getSocketUrlFromAxios(): string {
//   const base = (API as any)?.defaults?.baseURL as string | undefined;
//   if (!base) return "http://192.168.1.2:5000";
//   return base.replace(/\/api\/?$/, "");
// }

// export default function DoctorTelemedicine() {
//   const router = useRouter();
//   const { token, user } = useContext(AuthContext) as any;

//   const myId = useMemo(() => {
//     return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
//   }, [user, token]);

//   const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
//   const socketRef = useRef<Socket | null>(null);

//   const [connected, setConnected] = useState(false);

//   useEffect(() => {
//     if (!myId) return;

//     const sock = io(socketUrl, {
//       transports: ["websocket", "polling"],
//       autoConnect: true,
//     });

//     socketRef.current = sock;

//     sock.on("connect", () => {
//       setConnected(true);
//       sock.emit("register", myId);
//     });

//     sock.on("disconnect", () => {
//       setConnected(false);
//     });

//     sock.on("connect_error", (err: any) => {
//       setConnected(false);
//       console.log("❌ Doctor socket connect_error:", err?.message);
//     });

//     return () => {
//       try {
//         sock.disconnect();
//       } catch {}
//       socketRef.current = null;
//       setConnected(false);
//     };
//   }, [myId, socketUrl]);

//   return (
//     <SafeAreaView style={styles.page}>
//       <View style={styles.header}>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.h1}>Doctor Calls</Text>
//           <Text style={styles.sub}>
//             Incoming calls are handled globally while you use the doctor app.
//           </Text>
//         </View>
//       </View>

//       <View style={styles.body}>
//         <View style={styles.heroIconCircle}>
//           <Ionicons name="videocam-outline" size={30} color="#2B9FD8" />
//         </View>

//         <Text style={styles.title}>Ready to receive calls</Text>
//         <Text style={styles.muted}>
//           You do not need to keep this screen open anymore. Incoming patient calls
//           will appear as a popup from any doctor tab.
//         </Text>

//         {/* socket status */}
//         <View style={[styles.socketBadge, connected ? styles.socketBadgeOn : styles.socketBadgeOff]}>
//           <View style={[styles.socketDot, connected ? styles.socketDotOn : styles.socketDotOff]} />
//           <Text style={[styles.socketText, connected ? styles.socketTextOn : styles.socketTextOff]}>
//             {connected ? "online" : "offline"}
//           </Text>
//         </View>

//         <View style={styles.infoCard}>
//           <View style={styles.infoRow}>
//             <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
//             <Text style={styles.infoText}>Incoming call popup works across doctor tabs</Text>
//           </View>

//           <View style={styles.infoRow}>
//             <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
//             <Text style={styles.infoText}>Accept opens the doctor call room immediately</Text>
//           </View>

//           <View style={styles.infoRow}>
//             <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
//             <Text style={styles.infoText}>Reject notifies the patient instantly</Text>
//           </View>
//         </View>

//         <View style={styles.actions}>
//           <Pressable
//             style={styles.secondaryBtn}
//             onPress={() => router.push("/main/doctor/appointments" as any)}
//           >
//             <Ionicons name="calendar-outline" size={18} color="#2B9FD8" />
//             <Text style={styles.secondaryBtnText}>Open Appointments</Text>
//           </Pressable>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   page: {
//     flex: 1,
//     backgroundColor: "#F3F9FD",
//   },

//   header: {
//     padding: 16,
//     backgroundColor: "#2B9FD8",
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(255,255,255,0.18)",
//     flexDirection: "row",
//     gap: 10,
//     alignItems: "center",
//   },

//   h1: {
//     fontSize: 18,
//     fontWeight: "900",
//     color: "#FFFFFF",
//     letterSpacing: -0.3,
//   },

//   sub: {
//     marginTop: 4,
//     fontSize: 11,
//     fontWeight: "600",
//     color: "rgba(255,255,255,0.82)",
//   },

//   body: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//     gap: 14,
//   },

//   heroIconCircle: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     backgroundColor: "#E0F3FB",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   title: {
//     fontSize: 18,
//     fontWeight: "900",
//     color: "#111827",
//   },

//   muted: {
//     textAlign: "center",
//     color: "#6B7280",
//     fontWeight: "700",
//     lineHeight: 20,
//     maxWidth: 360,
//   },

//   socketBadge: {
//     marginTop: 4,
//     minHeight: 42,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     borderRadius: 999,
//     borderWidth: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },

//   socketBadgeOn: {
//     backgroundColor: "#ECFDF5",
//     borderColor: "#BBF7D0",
//   },

//   socketBadgeOff: {
//     backgroundColor: "#FEF2F2",
//     borderColor: "#FECACA",
//   },

//   socketDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 999,
//   },

//   socketDotOn: {
//     backgroundColor: "#10B981",
//   },

//   socketDotOff: {
//     backgroundColor: "#EF4444",
//   },

//   socketText: {
//     fontWeight: "800",
//     fontSize: 13,
//   },

//   socketTextOn: {
//     color: "#047857",
//   },

//   socketTextOff: {
//     color: "#B91C1C",
//   },

//   infoCard: {
//     width: "100%",
//     maxWidth: 420,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     padding: 16,
//     gap: 12,
//     marginTop: 8,
//   },

//   infoRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//   },

//   infoText: {
//     flex: 1,
//     color: "#374151",
//     fontWeight: "700",
//     lineHeight: 18,
//   },

//   actions: {
//     width: "100%",
//     maxWidth: 420,
//     gap: 10,
//     marginTop: 8,
//   },

//   secondaryBtn: {
//     height: 50,
//     borderRadius: 16,
//     backgroundColor: "#FFFFFF",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     alignItems: "center",
//     justifyContent: "center",
//     flexDirection: "row",
//     gap: 8,
//   },

//   secondaryBtnText: {
//     color: "#2B9FD8",
//     fontWeight: "900",
//     fontSize: 14,
//   },
// });