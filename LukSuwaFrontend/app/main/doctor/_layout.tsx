import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatbotFloating from "../../../components/ChatbotFloating";
import ChatbotModal from "../../../components/ChatbotModal";

export default function DoctorTabsLayout() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2B9FD8",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            height: 40 + insets.bottom,
            paddingBottom: 1,
            paddingTop: 4,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            backgroundColor: "#FFFFFF",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarIconStyle: { marginTop: 4 },
        }}
      >
        {/* Doctor Home (doctor/index.jsx) */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="setAvailability"
          options={{
            title: "Availability",
            tabBarIcon: ({ color }) => (
              <Ionicons name="time-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Appointments (ඔයා create කරන screen එක) */}
        <Tabs.Screen
          name="appointments"
          options={{
            title: "Appts",
            tabBarIcon: ({ color }) => (
              <Ionicons name="calendar-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Telemedicine (incoming calls + call history) */}
        <Tabs.Screen
          name="telemedicine"
          options={{
            title: "Calls",
            tabBarIcon: ({ color }) => (
              <Ionicons name="videocam-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Messages / Chat (optional separate) */}
        {/* <Tabs.Screen
          name="messages"
          options={{
            title: "Chat",
            tabBarIcon: ({ color }) => (
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={color} />
            ),
          }}
        /> */}

        {/* Profile hide (route still available if needed) */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="callRoom" options={{ href: null }} />
        {/* <Tabs.Screen name="callChat" options={{ href: null }} /> */}
        <Tabs.Screen name="notifications" options={{ href: null }} />

        {/* new add */}
        <Tabs.Screen name="statistics" options={{ href: null }} />
      </Tabs>

      {/* Floating Chatbot -> open modal */}
      <ChatbotFloating onPress={() => setChatOpen(true)} />

      {/* Popup Chatbot Modal */}
      <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}













// new try

// import { Ionicons } from "@expo/vector-icons";
// import { Tabs, useRouter } from "expo-router";
// import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
// import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { io, type Socket } from "socket.io-client";

// import ChatbotFloating from "../../../components/ChatbotFloating";
// import ChatbotModal from "../../../components/ChatbotModal";
// import API from "../../../src/api/axiosConfig";
// import { AuthContext } from "../../../src/context/AuthContext";

// type Incoming = {
//   callId: string;
//   from: string;
//   name?: string;
//   callType: "video" | "audio";
// };

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

// export default function DoctorTabsLayout() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();

//   const { token, user } = useContext(AuthContext) as any;

//   const [chatOpen, setChatOpen] = useState(false);
//   const [incoming, setIncoming] = useState<Incoming | null>(null);
//   const [connected, setConnected] = useState(false);

//   const socketRef = useRef<Socket | null>(null);

//   const myId = useMemo(() => {
//     return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
//   }, [user, token]);

//   const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);

//   useEffect(() => {
//     if (!token || !myId) return;

//     const existing = socketRef.current;
//     if (existing?.connected) {
//       existing.emit("register", myId);
//       return;
//     }

//     const sock = io(socketUrl, {
//       transports: ["websocket", "polling"],
//       forceNew: false,
//       reconnection: true,
//       reconnectionAttempts: Infinity,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//     });

//     socketRef.current = sock;

//     const onConnect = () => {
//       setConnected(true);
//       sock.emit("register", myId);
//       console.log("Doctor socket connected and registered:", myId);
//     };

//     const onDisconnect = (reason?: string) => {
//       setConnected(false);
//       console.log("Doctor socket disconnected:", reason);
//     };

//     const onIncomingCall = (data: Incoming) => {
//       console.log("Incoming call for doctor:", data);
//       setIncoming(data);
//     };

//     const onConnectError = (err: any) => {
//       setConnected(false);
//       console.log("Doctor socket connect_error:", err?.message || err);
//     };

//     sock.on("connect", onConnect);
//     sock.on("disconnect", onDisconnect);
//     sock.on("incoming-call", onIncomingCall);
//     sock.on("connect_error", onConnectError);

//     return () => {
//       try {
//         sock.off("connect", onConnect);
//         sock.off("disconnect", onDisconnect);
//         sock.off("incoming-call", onIncomingCall);
//         sock.off("connect_error", onConnectError);
//         sock.disconnect();
//       } catch {}
//       socketRef.current = null;
//       setConnected(false);
//     };
//   }, [token, myId, socketUrl]);

//   const reject = async () => {
//     try {
//       if (!incoming) return;

//       socketRef.current?.emit("reject-call", {
//         callId: incoming.callId,
//         to: incoming.from,
//       });

//       await API.post(
//         "/calls/reject",
//         {
//           callId: incoming.callId,
//           reason: "Rejected by doctor",
//         },
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );
//     } catch (e: any) {
//       Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to reject");
//     } finally {
//       setIncoming(null);
//     }
//   };

//   const accept = () => {
//     if (!incoming) return;

//     const call = incoming;
//     setIncoming(null);

//     router.push({
//       pathname: "/main/doctor/callRoom",
//       params: {
//         callId: call.callId,
//         patientId: call.from,
//         patientName: call.name || "Patient",
//         callType: call.callType,
//       },
//     } as any);
//   };

//   return (
//     <View style={{ flex: 1, paddingTop: insets.top }}>
//       <Tabs
//         screenOptions={{
//           headerShown: false,
//           tabBarActiveTintColor: "#2B9FD8",
//           tabBarInactiveTintColor: "#9CA3AF",
//           tabBarStyle: {
//             height: 40 + insets.bottom,
//             paddingBottom: 1,
//             paddingTop: 4,
//             borderTopWidth: 1,
//             borderTopColor: "#F3F4F6",
//             backgroundColor: "#FFFFFF",
//             elevation: 8,
//             shadowColor: "#000",
//             shadowOffset: { width: 0, height: -2 },
//             shadowOpacity: 0.1,
//             shadowRadius: 8,
//           },
//           tabBarLabelStyle: {
//             fontSize: 11,
//             fontWeight: "600",
//             marginTop: 4,
//           },
//           tabBarIconStyle: { marginTop: 4 },
//         }}
//       >
//         <Tabs.Screen
//           name="index"
//           options={{
//             title: "Home",
//             tabBarIcon: ({ color }) => (
//               <Ionicons name="home-outline" size={24} color={color} />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="setAvailability"
//           options={{
//             title: "Availability",
//             tabBarIcon: ({ color }) => (
//               <Ionicons name="time-outline" size={24} color={color} />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="appointments"
//           options={{
//             title: "Appts",
//             tabBarIcon: ({ color }) => (
//               <Ionicons name="calendar-outline" size={24} color={color} />
//             ),
//           }}
//         />

//         <Tabs.Screen
//           name="telemedicine"
//           options={{
//             title: "Calls",
//             tabBarIcon: ({ color }) => (
//               <Ionicons name="videocam-outline" size={24} color={color} />
//             ),
//           }}
//         />

//         <Tabs.Screen name="profile" options={{ href: null }} />
//         <Tabs.Screen name="callRoom" options={{ href: null }} />
//         <Tabs.Screen name="notifications" options={{ href: null }} />
//         <Tabs.Screen name="statistics" options={{ href: null }} />
//       </Tabs>

//       <ChatbotFloating onPress={() => setChatOpen(true)} />
//       <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />

      

//       <Modal
//         visible={!!incoming}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setIncoming(null)}
//       >
//         <View style={styles.backdrop}>
//           <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIncoming(null)} />

//           <View style={styles.modalCard}>
//             <View style={styles.modalTop}>
//               <View style={styles.modalIconCircle}>
//                 <Ionicons
//                   name={incoming?.callType === "video" ? "videocam-outline" : "call-outline"}
//                   size={20}
//                   color="#FFFFFF"
//                 />
//               </View>

//               <View style={{ flex: 1 }}>
//                 <Text style={styles.modalTitle}>
//                   Incoming {incoming?.callType === "video" ? "Video" : "Audio"} Call
//                 </Text>
//                 <Text style={styles.modalSub}>From: {incoming?.name || incoming?.from}</Text>
//               </View>

//               <Pressable onPress={() => setIncoming(null)} style={styles.modalCloseBtn}>
//                 <Ionicons name="close" size={18} color="#FFFFFF" />
//               </Pressable>
//             </View>

//             <View style={styles.modalActions}>
//               <Pressable style={[styles.btn, styles.rejectBtn]} onPress={reject}>
//                 <Ionicons name="close" size={18} color="#fff" />
//                 <Text style={styles.btnText}>Reject</Text>
//               </Pressable>

//               <Pressable style={[styles.btn, styles.acceptBtn]} onPress={accept}>
//                 <Ionicons name="checkmark" size={18} color="#fff" />
//                 <Text style={styles.btnText}>Accept</Text>
//               </Pressable>
//             </View>

//             <View style={styles.modalHint}>
//               <Ionicons name="shield-checkmark-outline" size={16} color="#2B9FD8" />
//               <Text style={styles.modalHintText}>
//                 Accept will open the call room immediately.
//               </Text>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   socketBadgeWrap: {
//     position: "absolute",
//     top: 8,
//     right: 12,
//     zIndex: 30,
//   },
//   socketBadge: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 999,
//     borderWidth: 1,
//   },
//   socketOn: {
//     backgroundColor: "rgba(16,185,129,0.12)",
//     borderColor: "rgba(16,185,129,0.28)",
//   },
//   socketOff: {
//     backgroundColor: "rgba(239,68,68,0.12)",
//     borderColor: "rgba(239,68,68,0.28)",
//   },
//   socketDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   dotOn: { backgroundColor: "#10B981" },
//   dotOff: { backgroundColor: "#EF4444" },
//   socketText: {
//     fontSize: 11,
//     fontWeight: "800",
//     color: "#111827",
//   },

//   backdrop: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.35)",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 20,
//   },
//   modalCard: {
//     width: "100%",
//     maxWidth: 420,
//     backgroundColor: "#fff",
//     borderRadius: 20,
//     padding: 14,
//     gap: 12,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     shadowColor: "#2B9FD8",
//     shadowOpacity: 0.18,
//     shadowRadius: 18,
//     shadowOffset: { width: 0, height: 10 },
//     elevation: 10,
//   },
//   modalTop: { flexDirection: "row", alignItems: "center", gap: 10 },
//   modalIconCircle: {
//     width: 42,
//     height: 42,
//     borderRadius: 14,
//     backgroundColor: "#2B9FD8",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   modalTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
//   modalSub: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#6B7280" },
//   modalCloseBtn: {
//     width: 38,
//     height: 38,
//     borderRadius: 14,
//     backgroundColor: "#2B9FD8",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   modalActions: { flexDirection: "row", gap: 10, marginTop: 2 },
//   btn: {
//     flex: 1,
//     height: 50,
//     borderRadius: 16,
//     alignItems: "center",
//     justifyContent: "center",
//     flexDirection: "row",
//     gap: 8,
//   },
//   btnText: { color: "#fff", fontWeight: "900" },
//   rejectBtn: { backgroundColor: "#DC2626" },
//   acceptBtn: { backgroundColor: "#2B9FD8" },
//   modalHint: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     backgroundColor: "#E0F3FB",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     borderRadius: 14,
//     padding: 12,
//   },
//   modalHintText: {
//     color: "#1A7BAF",
//     fontWeight: "700",
//     flex: 1,
//     lineHeight: 18,
//   },
// });