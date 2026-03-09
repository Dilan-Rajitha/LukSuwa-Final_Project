

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
import { io, type Socket } from "socket.io-client";

import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  VideoSourceType,
} from "react-native-agora";

import CallChatModal from "../../../components/CallChatModal";
import API from "../../../src/api/axiosConfig";
import {
  endCall as endCallApi,
  getAgoraToken,
  initiateCall as initiateCallApi,
  type CallType,
} from "../../../src/api/callApi";
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

export default function PatientCallRoom() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    doctorId: string;
    appointmentId: string;
    callType: CallType;
  }>();

  const { token, user } = useContext(AuthContext) as any;

  const doctorId = String(params.doctorId || "");
  const appointmentId = String(params.appointmentId || "");
  const callType: CallType = params.callType === "audio" ? "audio" : "video";
  const isVideo = callType === "video";

  const myId = useMemo(() => {
    return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
  }, [user, token]);

  const myName = String((user as any)?.username || "Patient");

  const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
  const socketRef = useRef<Socket | null>(null);

  const engineRef = useRef<IRtcEngine | null>(null);
  const callIdRef = useRef<string>("");

  const [phase, setPhase] = useState<"starting" | "ringing" | "connected" | "ended">("starting");
  const [statusText, setStatusText] = useState("");

  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);

  const cleanupSocket = () => {
    try {
      socketRef.current?.disconnect?.();
    } catch {}
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

  const endCall = async (silent?: boolean) => {
    try {
      const callId = callIdRef.current;
      if (callId && token) {
        await endCallApi(token as string, { callId }).catch(() => {});
        socketRef.current?.emit("end-call", { callId, to: doctorId });
      }
    } catch {}
    setPhase("ended");
    setStatusText("");
    fullCleanup();
    if (!silent) router.back();
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    try {
      engineRef.current?.muteLocalAudioStream(!next);
    } catch {}
  };

  const toggleSpeaker = () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      engineRef.current?.setEnableSpeakerphone(next);
    } catch {}
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    try {
      engineRef.current?.muteLocalVideoStream(!next);
      if (next) engineRef.current?.startPreview?.();
    } catch {}
  };

  const startAgora = async (callId: string) => {
    if (!token) throw new Error("Token missing");

    const agora = await getAgoraToken(token as string, callId);

    const engine = createAgoraRtcEngine();
    engineRef.current = engine;

    engine.initialize({ appId: agora.appId });

    engine.registerEventHandler({
      onJoinChannelSuccess: () => console.log("✅ Patient joined channel"),
      onUserJoined: (_connection, uid) => {
        console.log("👤 Doctor joined:", uid);
        setRemoteUid(uid);
      },
      onUserOffline: (_connection, uid) => {
        console.log("👋 Doctor left:", uid);
        setRemoteUid((prev) => (prev === uid ? null : prev));
      },
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
    if (!doctorId || !appointmentId) {
      Alert.alert("Missing", "doctorId / appointmentId missing");
      router.back();
      return;
    }
    if (!token) {
      Alert.alert("Auth Error", "Token missing. Please login again.");
      router.back();
      return;
    }
    if (!myId) {
      Alert.alert("Auth Error", "User ID missing. Please login again.");
      router.back();
      return;
    }

    setPhase("starting");
    setStatusText("Initiating call...");

    let callId = "";
    try {
      const call = await initiateCallApi(token as string, {
        doctorId,
        appointmentId,
        callType,
      });
      callId = call.callId;
      callIdRef.current = callId;
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to initiate call";
      Alert.alert("Call blocked", msg);
      router.back();
      return;
    }

    const sock = io(socketUrl, { transports: ["websocket", "polling"] });
    socketRef.current = sock;

    sock.on("connect", () => {
      sock.emit("register", myId);

      setPhase("ringing");
      setStatusText("Calling doctor...");

      sock.emit("call-user", {
        callId,
        userToCall: doctorId,
        from: myId,
        name: myName,
        callType,
        signalData: { provider: "agora" },
      });
    });

    sock.on("call-accepted", async ({ callId: cid }: any) => {
      if (cid !== callIdRef.current) return;

      try {
        setPhase("connected");
        setStatusText("Connected");
        await startAgora(callIdRef.current);
      } catch (e: any) {
        Alert.alert("Agora", e?.message || "Failed to join channel");
        endCall(true);
      }
    });

    sock.on("call-rejected", ({ callId: cid, message }: any) => {
      if (cid !== callIdRef.current) return;
      Alert.alert("Rejected", message || "Doctor rejected the call");
      endCall(true);
    });

    sock.on("user-not-available", (d: any) => {
      Alert.alert("Doctor Offline", d?.message || "Doctor is not online");
      endCall(true);
    });

    sock.on("call-ended", ({ callId: cid, message }: any) => {
      if (cid !== callIdRef.current) return;
      Alert.alert("Ended", message || "Call has ended");
      endCall(true);
    });

    sock.on("connect_error", () => {
      Alert.alert("Socket Error", "Failed to connect. Check baseURL/IP.");
    });
  };

  useEffect(() => {
    start();
    return () => {
      fullCleanup();
    };
  }, []);

  const showRemote = isVideo && remoteUid;

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue header (theme) */}
      <View style={styles.header}>
        <Pressable onPress={() => endCall()} style={styles.iconBtn}>
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{isVideo ? "Video Call" : "Audio Call"}</Text>
          <Text style={styles.sub}>
            {phase.toUpperCase()} {statusText ? `• ${statusText}` : ""}
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
              <Text style={styles.waitText}>Waiting for doctor...</Text>
              <Text style={styles.smallText}>The call starts when the doctor accepts.</Text>

              <View style={styles.waitRow}>
                <ActivityIndicator />
                <Text style={styles.waitMeta}>{statusText || "Connecting..."}</Text>
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
                    <Text style={styles.smallTextDark}>Waiting for doctor video...</Text>
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

      {/* Controls (theme) */}
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

        <Pressable onPress={() => endCall()} style={[styles.ctrlBtn, styles.hangBtn]}>
          <Ionicons name="call-outline" size={20} color="#fff" />
          <Text style={[styles.ctrlText, { color: "#fff" }]}>End</Text>
        </Pressable>
      </View>

      {!!token && !!callIdRef.current && !!myId ? (
        <CallChatModal
          visible={chatOpen}
          onClose={() => setChatOpen(false)}
          token={token as string}
          callId={callIdRef.current}
          myId={myId}
          myName={myName}
          peerId={doctorId}
          peerName={"Doctor"}
          socket={socketRef.current}
           myRole="patient"  // new add
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  /* Header - blue theme */
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#2B9FD8",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
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

  /* Waiting (theme card) */
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
  smallText: { fontSize: 12, fontWeight: "700", color: "#6B7280", textAlign: "center", lineHeight: 18 },
  waitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  waitMeta: { fontSize: 12, fontWeight: "800", color: "#1A7BAF" },

  /* Center dark (when connected but no video yet) */
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












// new try code

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
// import { io, type Socket } from "socket.io-client";

// import {
//   ChannelProfileType,
//   ClientRoleType,
//   createAgoraRtcEngine,
//   IRtcEngine,
//   RtcSurfaceView,
//   VideoSourceType,
// } from "react-native-agora";

// import CallChatModal from "../../../components/CallChatModal";
// import API from "../../../src/api/axiosConfig";
// import {
//   endCall as endCallApi,
//   getAgoraToken,
//   initiateCall as initiateCallApi,
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

// export default function PatientCallRoom() {
//   const router = useRouter();
//   const params = useLocalSearchParams<{
//     doctorId: string;
//     appointmentId: string;
//     callType: CallType;
//   }>();

//   const { token, user } = useContext(AuthContext) as any;

//   const doctorId = String(params.doctorId || "");
//   const appointmentId = String(params.appointmentId || "");
//   const callType: CallType = params.callType === "audio" ? "audio" : "video";
//   const isVideo = callType === "video";

//   const myId = useMemo(() => {
//     return (user as any)?.id || (user as any)?._id || decodeJwtUserId(token as any);
//   }, [user, token]);

//   const myName = String((user as any)?.username || "Patient");

//   const socketUrl = useMemo(() => getSocketUrlFromAxios(), []);
//   const socketRef = useRef<Socket | null>(null);

//   const engineRef = useRef<IRtcEngine | null>(null);
//   const callIdRef = useRef<string>("");
//   const startedRef = useRef<boolean>(false);
//   const endingRef = useRef<boolean>(false);

//   const [phase, setPhase] = useState<"starting" | "ringing" | "connected" | "ended">("starting");
//   const [statusText, setStatusText] = useState("");

//   const [remoteUid, setRemoteUid] = useState<number | null>(null);

//   const [micOn, setMicOn] = useState(true);
//   const [speakerOn, setSpeakerOn] = useState(true);
//   const [camOn, setCamOn] = useState(true);

//   const [chatOpen, setChatOpen] = useState(false);

//   const removeSocketListeners = () => {
//     const sock = socketRef.current;
//     if (!sock) return;

//     sock.off("connect");
//     sock.off("call-accepted");
//     sock.off("call-rejected");
//     sock.off("user-not-available");
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
//     callIdRef.current = "";
//     startedRef.current = false;
//     endingRef.current = false;
//     setRemoteUid(null);
//     setChatOpen(false);
//     setStatusText("");
//     setMicOn(true);
//     setSpeakerOn(true);
//     setCamOn(true);
//   };

//   const fullCleanup = () => {
//     cleanupSocket();
//     cleanupAgora();
//     resetUiState();
//   };

//   const endCall = async (silent?: boolean) => {
//     if (endingRef.current) return;
//     endingRef.current = true;

//     try {
//       const callId = callIdRef.current;
//       console.log("Ending call:", callId);

//       if (callId && token) {
//         try {
//           await endCallApi(token as string, { callId });
//         } catch (e) {
//           console.log("endCallApi failed:", e);
//         }

//         try {
//           socketRef.current?.emit("end-call", { callId, to: doctorId });
//         } catch (e) {
//           console.log("socket end-call emit failed:", e);
//         }
//       }
//     } catch (e) {
//       console.log("End call error:", e);
//     }

//     setPhase("ended");
//     setStatusText("");
//     fullCleanup();

//     if (!silent) {
//       router.replace("/main/patient/telemedicine" as any);
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

//   const startAgora = async (callId: string) => {
//     if (!token) throw new Error("Token missing");

//     const agora = await getAgoraToken(token as string, callId);

//     const engine = createAgoraRtcEngine();
//     engineRef.current = engine;

//     engine.initialize({ appId: agora.appId });

//     engine.registerEventHandler({
//       onJoinChannelSuccess: () => console.log("✅ Patient joined channel"),
//       onUserJoined: (_connection, uid) => {
//         console.log("👤 Doctor joined:", uid);
//         setRemoteUid(uid);
//       },
//       onUserOffline: (_connection, uid) => {
//         console.log("👋 Doctor left:", uid);
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

//     if (!doctorId || !appointmentId) {
//       Alert.alert("Missing", "doctorId / appointmentId missing");
//       router.replace("/main/patient/telemedicine" as any);
//       return;
//     }

//     if (!token) {
//       Alert.alert("Auth Error", "Token missing. Please login again.");
//       router.replace("/main/patient/telemedicine" as any);
//       return;
//     }

//     if (!myId) {
//       Alert.alert("Auth Error", "User ID missing. Please login again.");
//       router.replace("/main/patient/telemedicine" as any);
//       return;
//     }

//     setPhase("starting");
//     setStatusText("Initiating call...");

//     let callId = "";

//     try {
//       const call = await initiateCallApi(token as string, {
//         doctorId,
//         appointmentId,
//         callType,
//       });

//       callId = call.callId;
//       callIdRef.current = callId;
//       console.log("✅ New callId:", callId);
//     } catch (e: any) {
//       startedRef.current = false;
//       const msg = e?.response?.data?.message || e?.message || "Failed to initiate call";
//       Alert.alert("Call blocked", msg);
//       router.replace("/main/patient/telemedicine" as any);
//       return;
//     }

//     const sock = io(socketUrl, { transports: ["websocket", "polling"] });
//     socketRef.current = sock;

//     sock.on("connect", () => {
//       sock.emit("register", myId);

//       setPhase("ringing");
//       setStatusText("Calling doctor...");

//       sock.emit("call-user", {
//         callId,
//         userToCall: doctorId,
//         from: myId,
//         name: myName,
//         callType,
//         signalData: { provider: "agora" },
//       });
//     });

//     sock.on("call-accepted", async ({ callId: cid }: any) => {
//       if (cid !== callIdRef.current) return;

//       try {
//         setPhase("connected");
//         setStatusText("Connected");
//         await startAgora(callIdRef.current);
//       } catch (e: any) {
//         Alert.alert("Agora", e?.message || "Failed to join channel");
//         endCall(true);
//       }
//     });

//     sock.on("call-rejected", ({ callId: cid, message }: any) => {
//       if (cid !== callIdRef.current) return;
//       Alert.alert("Rejected", message || "Doctor rejected the call");
//       endCall(true);
//     });

//     sock.on("user-not-available", (d: any) => {
//       Alert.alert("Doctor Offline", d?.message || "Doctor is not online");
//       endCall(true);
//     });

//     sock.on("call-ended", ({ callId: cid, message }: any) => {
//       if (cid !== callIdRef.current) return;
//       Alert.alert("Ended", message || "Call has ended");
//       endCall(true);
//     });

//     sock.on("connect_error", () => {
//       Alert.alert("Socket Error", "Failed to connect. Check baseURL/IP.");
//     });
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
//         <Pressable onPress={() => endCall()} style={styles.iconBtn}>
//           <Ionicons name="close" size={20} color="#FFFFFF" />
//         </Pressable>

//         <View style={{ flex: 1 }}>
//           <Text style={styles.h1}>{isVideo ? "Video Call" : "Audio Call"}</Text>
//           <Text style={styles.sub}>
//             {phase.toUpperCase()} {statusText ? `• ${statusText}` : ""}
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
//               <Text style={styles.waitText}>Waiting for doctor...</Text>
//               <Text style={styles.smallText}>
//                 The call starts when the doctor accepts.
//               </Text>

//               <View style={styles.waitRow}>
//                 <ActivityIndicator />
//                 <Text style={styles.waitMeta}>{statusText || "Connecting..."}</Text>
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
//                     <Text style={styles.smallTextDark}>Waiting for doctor video...</Text>
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
//           <Ionicons
//             name={speakerOn ? "volume-high" : "volume-mute"}
//             size={20}
//             color="#111827"
//           />
//           <Text style={styles.ctrlText}>Speaker</Text>
//         </Pressable>

//         {isVideo ? (
//           <Pressable onPress={toggleCam} style={[styles.ctrlBtn, !camOn && styles.ctrlOff]}>
//             <Ionicons name={camOn ? "videocam" : "videocam-off"} size={20} color="#111827" />
//             <Text style={styles.ctrlText}>Camera</Text>
//           </Pressable>
//         ) : null}

//         <Pressable onPress={() => endCall()} style={[styles.ctrlBtn, styles.hangBtn]}>
//           <Ionicons name="call-outline" size={20} color="#fff" />
//           <Text style={[styles.ctrlText, { color: "#fff" }]}>End</Text>
//         </Pressable>
//       </View>

//       {!!token && !!callIdRef.current && !!myId ? (
//         <CallChatModal
//           visible={chatOpen}
//           onClose={() => setChatOpen(false)}
//           token={token as string}
//           callId={callIdRef.current}
//           myId={myId}
//           myName={myName}
//           peerId={doctorId}
//           peerName={"Doctor"}
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
//     borderBottomWidth: 1,
//     borderBottomColor: "rgba(255,255,255,0.18)",
//     backgroundColor: "#2B9FD8",
//   },
//   iconBtn: {
//     width: 42,
//     height: 42,
//     borderRadius: 14,
//     backgroundColor: "rgba(255,255,255,0.18)",
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
//   smallText: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: "#6B7280",
//     textAlign: "center",
//     lineHeight: 18,
//   },
//   waitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
//   waitMeta: { fontSize: 12, fontWeight: "800", color: "#1A7BAF" },

//   centerDark: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
//   smallTextDark: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: "#fff",
//     opacity: 0.75,
//     textAlign: "center",
//   },

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