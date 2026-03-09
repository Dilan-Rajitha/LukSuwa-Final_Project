

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  VideoSourceType,
} from "react-native-agora";
import { io, type Socket } from "socket.io-client";

import CallChatModal from "../../../components/CallChatModal";
import API from "../../../src/api/axiosConfig";
import { acceptCall, endCall as endCallApi, getAgoraToken, type CallType } from "../../../src/api/callApi";
import { AuthContext } from "../../../src/context/AuthContext";

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

export default function DoctorCallRoom() {
  const router = useRouter();
  const { token, user } = useContext(AuthContext) as any;

  const params = useLocalSearchParams<{
    callId: string;
    patientId: string;
    patientName: string;
    callType: CallType;
  }>();

  const callId = String(params.callId || "");
  const patientId = String(params.patientId || "");
  const patientName = String(params.patientName || "Patient");
  const callType: CallType = params.callType === "audio" ? "audio" : "video";
  const isVideo = callType === "video";

  const myId = useMemo(() => {
    return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
  }, [user, token]);

  const myName = String((user as any)?.username || "Doctor");

  const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
  const socketRef = useRef<Socket | null>(null);

  const engineRef = useRef<IRtcEngine | null>(null);

  const [phase, setPhase] = useState<"accepting" | "connected" | "ended">("accepting");
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);

  const cleanupSocket = () => {
    try { socketRef.current?.disconnect?.(); } catch {}
    socketRef.current = null;
  };

  const cleanupAgora = () => {
    try {
      if (engineRef.current) {
        engineRef.current.leaveChannel();
        engineRef.current.release();
      }
    } catch {}
    engineRef.current = null;
    setRemoteUid(null);
  };

  const fullCleanup = () => {
    cleanupSocket();
    cleanupAgora();
  };

  const end = async (silent?: boolean) => {
    try {
      if (callId && token) {
        await endCallApi(token as string, { callId }).catch(() => {});
        socketRef.current?.emit("end-call", { callId, to: patientId });
      }
    } catch {}
    setPhase("ended");
    fullCleanup();
    if (!silent) router.back();
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    try { engineRef.current?.muteLocalAudioStream(!next); } catch {}
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try { engineRef.current?.setEnableSpeakerphone(next); } catch {}
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    try {
      engineRef.current?.muteLocalVideoStream(!next);
      if (next) engineRef.current?.startPreview?.();
    } catch {}
  };

  const startAgora = async () => {
    if (!token) throw new Error("Token missing");
    if (!callId) throw new Error("callId missing");

    const agora = await getAgoraToken(token as string, callId);

    const engine = createAgoraRtcEngine();
    engineRef.current = engine;

    engine.initialize({ appId: agora.appId });

    engine.registerEventHandler({
      onJoinChannelSuccess: () => console.log("✅ Doctor joined channel"),
      onUserJoined: (_connection, uid) => setRemoteUid(uid),
      onUserOffline: (_connection, uid) => setRemoteUid((prev) => (prev === uid ? null : prev)),
    });

    engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    engine.enableAudio();
    if (isVideo) {
      engine.enableVideo();
      engine.startPreview?.();
    } else {
      engine.disableVideo();
    }

    engine.setEnableSpeakerphone(true);

    engine.joinChannel(agora.token, agora.channelName, agora.uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  };

  const start = async () => {
    if (!callId || !patientId) {
      Alert.alert("Missing", "callId / patientId missing");
      router.back();
      return;
    }
    if (!token) {
      Alert.alert("Auth", "Token missing");
      router.back();
      return;
    }
    if (!myId) {
      Alert.alert("Auth", "Doctor ID missing");
      router.back();
      return;
    }

    setPhase("accepting");

    try {
      await acceptCall(token as string, { callId });

      const sock = io(socketUrl, { transports: ["websocket", "polling"] });
      socketRef.current = sock;

      sock.on("connect", async () => {
        sock.emit("register", myId);

        sock.emit("answer-call", {
          callId,
          to: patientId,
          signal: { provider: "agora" },
        });

        setPhase("connected");

        try {
          await startAgora();
        } catch (e: any) {
          Alert.alert("Agora", e?.message || "Failed to join channel");
          end(true);
        }
      });

      sock.on("call-ended", ({ callId: cid, message }: any) => {
        if (cid && cid !== callId) return;
        Alert.alert("Ended", message || "Call ended");
        end(true);
      });

      sock.on("connect_error", (err: any) => console.log("❌ Socket error:", err?.message));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to accept call";
      Alert.alert("Accept failed", msg);
      end(true);
    }
  };

  useEffect(() => {
    start();
    return () => fullCleanup();
  }, []);

  const showRemote = isVideo && remoteUid;

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue header */}
      <View style={styles.header}>
        <Pressable onPress={() => end()} style={styles.endIconBtn}>
          <Ionicons name="call-outline" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{isVideo ? "Video Call" : "Audio Call"}</Text>
          <Text style={styles.sub}>
            {phase === "accepting" ? "Connecting..." : phase === "connected" ? "Connected" : "Ended"}
            {"  "}• {patientName}
          </Text>
          {remoteUid ? <Text style={styles.roomText}>Remote UID: {remoteUid}</Text> : null}
        </View>

        <Pressable onPress={() => setChatOpen(true)} style={styles.iconBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {phase !== "connected" ? (
          <View style={styles.waitWrap}>
            <View style={styles.waitCard}>
              <View style={styles.waitIconCircle}>
                <Ionicons name="time-outline" size={26} color="#2B9FD8" />
              </View>
              <Text style={styles.waitText}>Connecting...</Text>
              <Text style={styles.waitSub}>Please wait while the call is being established.</Text>
              <View style={styles.waitRow}>
                <ActivityIndicator />
                <Text style={styles.waitMeta}>Accepting call</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.stage}>
            {/* Remote Full */}
            <View style={styles.remote}>
              {isVideo ? (
                showRemote ? (
                  <RtcSurfaceView canvas={{ uid: remoteUid! }} style={StyleSheet.absoluteFill} />
                ) : (
                  <View style={styles.centerDark}>
                    <ActivityIndicator />
                    <Text style={styles.smallTextDark}>Waiting for patient video...</Text>
                  </View>
                )
              ) : (
                <View style={styles.centerDark}>
                  <View style={styles.audioIconCircle}>
                    <Ionicons name="call-outline" size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.audioTitle}>Audio Connected</Text>
                  <Text style={styles.smallTextDark}>Remote UID: {remoteUid ?? "..."}</Text>
                </View>
              )}
            </View>

            {/* Local PiP */}
            {isVideo ? (
              <View style={styles.pip}>
                <RtcSurfaceView
                  canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Controls - blue theme */}
      <View style={styles.controls}>
        <Pressable onPress={toggleMic} style={[styles.ctrlBtn, !micOn && styles.ctrlOff]}>
          <Ionicons name={micOn ? "mic" : "mic-off"} size={20} color="#111827" />
          <Text style={styles.ctrlText}>Mic</Text>
        </Pressable>

        <Pressable onPress={toggleSpeaker} style={[styles.ctrlBtn, !speakerOn && styles.ctrlOff]}>
          <Ionicons name={speakerOn ? "volume-high" : "volume-mute"} size={20} color="#111827" />
          <Text style={styles.ctrlText}>Speaker</Text>
        </Pressable>

        {isVideo ? (
          <Pressable onPress={toggleCam} style={[styles.ctrlBtn, !camOn && styles.ctrlOff]}>
            <Ionicons name={camOn ? "videocam" : "videocam-off"} size={20} color="#111827" />
            <Text style={styles.ctrlText}>Camera</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => end()} style={[styles.ctrlBtn, styles.hangBtn]}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={[styles.ctrlText, { color: "#fff" }]}>End</Text>
        </Pressable>
      </View>

      {!!token && !!callId && !!myId ? (
        <CallChatModal
          visible={chatOpen}
          onClose={() => setChatOpen(false)}
          token={token as string}
          callId={callId}
          myId={myId}
          myName={myName}
          peerId={patientId}
          peerName={patientName}
          socket={socketRef.current}
          myRole="doctor"   // new add
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  /* Header - match app theme */
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2B9FD8",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Red end button (UX) */
  endIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(220,38,38,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  h1: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
  sub: { marginTop: 2, fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
  roomText: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  body: { flex: 1, backgroundColor: "#000" },
  stage: { flex: 1 },
  remote: { flex: 1, backgroundColor: "#000" },

  pip: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 120,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  /* Waiting - blue theme card */
  waitWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  waitCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    padding: 18,
    gap: 10,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    alignItems: "center",
  },
  waitIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F3FB",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  waitText: { fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" },
  waitSub: { fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },
  waitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  waitMeta: { fontSize: 12, fontWeight: "800", color: "#1A7BAF" },

  /* Connected but no video yet / audio screen */
  centerDark: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  smallTextDark: { fontSize: 12, fontWeight: "800", color: "#fff", opacity: 0.75, textAlign: "center" },
  audioIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  audioTitle: { fontSize: 14, fontWeight: "900", color: "#fff" },

  /* Controls */
  controls: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#D0EAFB",
  },
  ctrlBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F3F9FD",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  ctrlText: { fontSize: 12, fontWeight: "900", color: "#111827" },
  ctrlOff: { opacity: 0.45 },
  hangBtn: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
});









// new try


// import { Ionicons } from "@expo/vector-icons";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Pressable,
//   SafeAreaView,
//   StyleSheet,
//   Text,
//   View,
// } from "react-native";
// import {
//   ChannelProfileType,
//   ClientRoleType,
//   createAgoraRtcEngine,
//   IRtcEngine,
//   RtcSurfaceView,
//   VideoSourceType,
// } from "react-native-agora";
// import { io, type Socket } from "socket.io-client";

// import CallChatModal from "../../../components/CallChatModal";
// import API from "../../../src/api/axiosConfig";
// import {
//   acceptCall,
//   endCall as endCallApi,
//   getAgoraToken,
//   type CallType,
// } from "../../../src/api/callApi";
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

// export default function DoctorCallRoom() {
//   const router = useRouter();
//   const { token, user } = useContext(AuthContext) as any;

//   const params = useLocalSearchParams<{
//     callId: string;
//     patientId: string;
//     patientName: string;
//     callType: CallType;
//   }>();

//   const callId = String(params.callId || "");
//   const patientId = String(params.patientId || "");
//   const patientName = String(params.patientName || "Patient");
//   const callType: CallType = params.callType === "audio" ? "audio" : "video";
//   const isVideo = callType === "video";

//   const myId = useMemo(() => {
//     return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
//   }, [user, token]);

//   const myName = String((user as any)?.username || "Doctor");

//   const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
//   const socketRef = useRef<Socket | null>(null);
//   const engineRef = useRef<IRtcEngine | null>(null);

//   const startedRef = useRef(false);
//   const endingRef = useRef(false);

//   const [phase, setPhase] = useState<"accepting" | "connected" | "ended">("accepting");
//   const [remoteUid, setRemoteUid] = useState<number | null>(null);

//   const [micOn, setMicOn] = useState(true);
//   const [speakerOn, setSpeakerOn] = useState(true);
//   const [camOn, setCamOn] = useState(true);

//   const [chatOpen, setChatOpen] = useState(false);

//   const removeSocketListeners = () => {
//     const sock = socketRef.current;
//     if (!sock) return;

//     sock.off("connect");
//     sock.off("call-ended");
//     sock.off("connect_error");
//   };

//   const cleanupSocket = () => {
//     try {
//       removeSocketListeners();
//       socketRef.current?.disconnect?.();
//     } catch {}
//     socketRef.current = null;
//   };

//   const cleanupAgora = () => {
//     try {
//       if (engineRef.current) {
//         try {
//           engineRef.current.leaveChannel();
//         } catch {}
//         try {
//           engineRef.current.release();
//         } catch {}
//       }
//     } catch {}
//     engineRef.current = null;
//     setRemoteUid(null);
//   };

//   const resetUiState = () => {
//     startedRef.current = false;
//     endingRef.current = false;
//     setRemoteUid(null);
//     setChatOpen(false);
//     setMicOn(true);
//     setSpeakerOn(true);
//     setCamOn(true);
//   };

//   const fullCleanup = () => {
//     cleanupSocket();
//     cleanupAgora();
//     resetUiState();
//   };

//   const end = async (silent?: boolean) => {
//     if (endingRef.current) return;
//     endingRef.current = true;

//     try {
//       console.log("Ending doctor call:", callId);

//       if (callId && token) {
//         try {
//           await endCallApi(token as string, { callId });
//         } catch (e) {
//           console.log("doctor endCallApi failed:", e);
//         }

//         try {
//           socketRef.current?.emit("end-call", { callId, to: patientId });
//         } catch (e) {
//           console.log("doctor socket end-call emit failed:", e);
//         }
//       }
//     } catch (e) {
//       console.log("doctor end error:", e);
//     }

//     setPhase("ended");
//     fullCleanup();

//     if (!silent) {
//       router.replace("/main/doctor/telemedicine" as any);
//     }
//   };

//   const toggleMic = () => {
//     const next = !micOn;
//     setMicOn(next);
//     try {
//       engineRef.current?.muteLocalAudioStream(!next);
//     } catch {}
//   };

//   const toggleSpeaker = () => {
//     const next = !speakerOn;
//     setSpeakerOn(next);
//     try {
//       engineRef.current?.setEnableSpeakerphone(next);
//     } catch {}
//   };

//   const toggleCam = () => {
//     const next = !camOn;
//     setCamOn(next);
//     try {
//       engineRef.current?.muteLocalVideoStream(!next);
//       if (next) engineRef.current?.startPreview?.();
//     } catch {}
//   };

//   const startAgora = async () => {
//     if (!token) throw new Error("Token missing");
//     if (!callId) throw new Error("callId missing");

//     const agora = await getAgoraToken(token as string, callId);

//     const engine = createAgoraRtcEngine();
//     engineRef.current = engine;

//     engine.initialize({ appId: agora.appId });

//     engine.registerEventHandler({
//       onJoinChannelSuccess: () => console.log("✅ Doctor joined channel"),
//       onUserJoined: (_connection, uid) => {
//         console.log("👤 Patient joined:", uid);
//         setRemoteUid(uid);
//       },
//       onUserOffline: (_connection, uid) => {
//         console.log("👋 Patient left:", uid);
//         setRemoteUid((prev) => (prev === uid ? null : prev));
//       },
//     });

//     engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
//     engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

//     engine.enableAudio();

//     if (isVideo) {
//       engine.enableVideo();
//       engine.startPreview?.();
//     } else {
//       engine.disableVideo();
//     }

//     engine.setEnableSpeakerphone(true);

//     engine.joinChannel(agora.token, agora.channelName, agora.uid, {
//       clientRoleType: ClientRoleType.ClientRoleBroadcaster,
//     });
//   };

//   const start = async () => {
//     if (startedRef.current) return;
//     startedRef.current = true;

//     if (!callId || !patientId) {
//       Alert.alert("Missing", "callId / patientId missing");
//       router.replace("/main/doctor/telemedicine" as any);
//       return;
//     }

//     if (!token) {
//       Alert.alert("Auth", "Token missing");
//       router.replace("/main/doctor/telemedicine" as any);
//       return;
//     }

//     if (!myId) {
//       Alert.alert("Auth", "Doctor ID missing");
//       router.replace("/main/doctor/telemedicine" as any);
//       return;
//     }

//     setPhase("accepting");

//     try {
//       await acceptCall(token as string, { callId });

//       const sock = io(socketUrl, {
//         transports: ["websocket", "polling"],
//         forceNew: true,
//       });

//       socketRef.current = sock;

//       sock.on("connect", async () => {
//         sock.emit("register", myId);

//         sock.emit("answer-call", {
//           callId,
//           to: patientId,
//           signal: { provider: "agora" },
//         });

//         setPhase("connected");

//         try {
//           await startAgora();
//         } catch (e: any) {
//           Alert.alert("Agora", e?.message || "Failed to join channel");
//           end(true);
//         }
//       });

//       sock.on("call-ended", ({ callId: cid, message }: any) => {
//         if (cid && cid !== callId) return;
//         Alert.alert("Ended", message || "Call ended");
//         end(true);
//       });

//       sock.on("connect_error", (err: any) => {
//         console.log("❌ Doctor socket error:", err?.message);
//       });
//     } catch (e: any) {
//       startedRef.current = false;
//       const msg = e?.response?.data?.message || e?.message || "Failed to accept call";
//       Alert.alert("Accept failed", msg);
//       end(true);
//     }
//   };

//   useEffect(() => {
//     start();

//     return () => {
//       fullCleanup();
//     };
//   }, []);

//   const showRemote = isVideo && remoteUid;

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <Pressable onPress={() => end()} style={styles.endIconBtn}>
//           <Ionicons name="call-outline" size={20} color="#FFFFFF" />
//         </Pressable>

//         <View style={{ flex: 1 }}>
//           <Text style={styles.h1}>{isVideo ? "Video Call" : "Audio Call"}</Text>
//           <Text style={styles.sub}>
//             {phase === "accepting" ? "Connecting..." : phase === "connected" ? "Connected" : "Ended"}
//             {"  "}• {patientName}
//           </Text>
//           {remoteUid ? <Text style={styles.roomText}>Remote UID: {remoteUid}</Text> : null}
//         </View>

//         <Pressable onPress={() => setChatOpen(true)} style={styles.iconBtn}>
//           <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
//         </Pressable>
//       </View>

//       <View style={styles.body}>
//         {phase !== "connected" ? (
//           <View style={styles.waitWrap}>
//             <View style={styles.waitCard}>
//               <View style={styles.waitIconCircle}>
//                 <Ionicons name="time-outline" size={26} color="#2B9FD8" />
//               </View>
//               <Text style={styles.waitText}>Connecting...</Text>
//               <Text style={styles.waitSub}>Please wait while the call is being established.</Text>
//               <View style={styles.waitRow}>
//                 <ActivityIndicator />
//                 <Text style={styles.waitMeta}>Accepting call</Text>
//               </View>
//             </View>
//           </View>
//         ) : (
//           <View style={styles.stage}>
//             <View style={styles.remote}>
//               {isVideo ? (
//                 showRemote ? (
//                   <RtcSurfaceView canvas={{ uid: remoteUid! }} style={StyleSheet.absoluteFill} />
//                 ) : (
//                   <View style={styles.centerDark}>
//                     <ActivityIndicator />
//                     <Text style={styles.smallTextDark}>Waiting for patient video...</Text>
//                   </View>
//                 )
//               ) : (
//                 <View style={styles.centerDark}>
//                   <View style={styles.audioIconCircle}>
//                     <Ionicons name="call-outline" size={28} color="#FFFFFF" />
//                   </View>
//                   <Text style={styles.audioTitle}>Audio Connected</Text>
//                   <Text style={styles.smallTextDark}>Remote UID: {remoteUid ?? "..."}</Text>
//                 </View>
//               )}
//             </View>

//             {isVideo ? (
//               <View style={styles.pip}>
//                 <RtcSurfaceView
//                   canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
//                   style={StyleSheet.absoluteFill}
//                 />
//               </View>
//             ) : null}
//           </View>
//         )}
//       </View>

//       <View style={styles.controls}>
//         <Pressable onPress={toggleMic} style={[styles.ctrlBtn, !micOn && styles.ctrlOff]}>
//           <Ionicons name={micOn ? "mic" : "mic-off"} size={20} color="#111827" />
//           <Text style={styles.ctrlText}>Mic</Text>
//         </Pressable>

//         <Pressable onPress={toggleSpeaker} style={[styles.ctrlBtn, !speakerOn && styles.ctrlOff]}>
//           <Ionicons name={speakerOn ? "volume-high" : "volume-mute"} size={20} color="#111827" />
//           <Text style={styles.ctrlText}>Speaker</Text>
//         </Pressable>

//         {isVideo ? (
//           <Pressable onPress={toggleCam} style={[styles.ctrlBtn, !camOn && styles.ctrlOff]}>
//             <Ionicons name={camOn ? "videocam" : "videocam-off"} size={20} color="#111827" />
//             <Text style={styles.ctrlText}>Camera</Text>
//           </Pressable>
//         ) : null}

//         <Pressable onPress={() => end()} style={[styles.ctrlBtn, styles.hangBtn]}>
//           <Ionicons name="call-outline" size={20} color="#fff" />
//           <Text style={[styles.ctrlText, { color: "#fff" }]}>End</Text>
//         </Pressable>
//       </View>

//       {!!token && !!callId && !!myId ? (
//         <CallChatModal
//           visible={chatOpen}
//           onClose={() => setChatOpen(false)}
//           token={token as string}
//           callId={callId}
//           myId={myId}
//           myName={myName}
//           peerId={patientId}
//           peerName={patientName}
//           socket={socketRef.current}
//         />
//       ) : null}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#000" },

//   header: {
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 12,
//     backgroundColor: "#2B9FD8",
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(255,255,255,0.18)",
//   },

//   iconBtn: {
//     width: 42,
//     height: 42,
//     borderRadius: 14,
//     backgroundColor: "rgba(255,255,255,0.18)",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   endIconBtn: {
//     width: 42,
//     height: 42,
//     borderRadius: 14,
//     backgroundColor: "rgba(220,38,38,0.95)",
//     alignItems: "center",
//     justifyContent: "center",
//   },

//   h1: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 },
//   sub: { marginTop: 2, fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.82)" },
//   roomText: { marginTop: 2, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

//   body: { flex: 1, backgroundColor: "#000" },
//   stage: { flex: 1 },
//   remote: { flex: 1, backgroundColor: "#000" },

//   pip: {
//     position: "absolute",
//     right: 12,
//     bottom: 12,
//     width: 120,
//     height: 180,
//     borderRadius: 16,
//     overflow: "hidden",
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.25)",
//   },

//   waitWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
//   waitCard: {
//     width: "100%",
//     maxWidth: 420,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 20,
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     padding: 18,
//     gap: 10,
//     shadowColor: "#2B9FD8",
//     shadowOpacity: 0.12,
//     shadowRadius: 14,
//     shadowOffset: { width: 0, height: 8 },
//     elevation: 6,
//     alignItems: "center",
//   },
//   waitIconCircle: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     backgroundColor: "#E0F3FB",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   waitText: { fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" },
//   waitSub: { fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },
//   waitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
//   waitMeta: { fontSize: 12, fontWeight: "800", color: "#1A7BAF" },

//   centerDark: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
//   smallTextDark: { fontSize: 12, fontWeight: "800", color: "#fff", opacity: 0.75, textAlign: "center" },
//   audioIconCircle: {
//     width: 68,
//     height: 68,
//     borderRadius: 34,
//     backgroundColor: "rgba(255,255,255,0.14)",
//     borderWidth: 1,
//     borderColor: "rgba(255,255,255,0.22)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   audioTitle: { fontSize: 14, fontWeight: "900", color: "#fff" },

//   controls: {
//     flexDirection: "row",
//     gap: 10,
//     paddingHorizontal: 12,
//     paddingVertical: 12,
//     backgroundColor: "#FFFFFF",
//     borderTopWidth: 1,
//     borderTopColor: "#D0EAFB",
//   },
//   ctrlBtn: {
//     flex: 1,
//     height: 54,
//     borderRadius: 16,
//     backgroundColor: "#F3F9FD",
//     borderWidth: 1,
//     borderColor: "#D0EAFB",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 4,
//   },
//   ctrlText: { fontSize: 12, fontWeight: "900", color: "#111827" },
//   ctrlOff: { opacity: 0.45 },
//   hangBtn: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
// });