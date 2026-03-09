import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import API from "../src/api/axiosConfig";
import TelemediPrescriptionFormModal from "./TelemediPrescriptionFormModal";

type Msg = {
  _id?: string;
  senderId: string;
  senderModel?: string;
  message: string;
  type?: "text" | "image" | "file" | "prescription";
  prescriptionId?: string;
  pdfUrl?: string;
  timestamp?: string | Date;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  token: string;
  callId: string;
  myId: string;
  myName: string;
  peerId: string;
  peerName: string;
  socket?: any;
  myRole: "doctor" | "patient"; // ✅ added
};

export default function CallChatModal({
  visible,
  onClose,
  token,
  callId,
  myId,
  myName,
  peerId,
  peerName,
  socket,
  myRole,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [rxOpen, setRxOpen] = useState(false);

  const isDoctor = myRole === "doctor";

  const listRef = useRef<FlatList<Msg>>(null);

  const scrollToEnd = () => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/calls/chat/${callId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMsgs(res.data?.chatMessages ?? []);
      scrollToEnd();
    } catch (e) {
      // backend may restrict access depending on call state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    fetchHistory();
  }, [visible, callId]);

  useEffect(() => {
    if (!socket) return;

    const onReceive = (payload: any) => {
      if (payload?.callId !== callId) return;

      const incoming: Msg = {
        senderId: payload.senderId || peerId,
        message: payload.message || "Prescription",
        timestamp: payload.timestamp || new Date(),
        type: payload.type || "text",
        prescriptionId: payload.prescriptionId,
        pdfUrl: payload.pdfUrl,
      };

      setMsgs((prev) => [...prev, incoming]);
      scrollToEnd();
    };

    socket.on("receive-message", onReceive);

    return () => {
      socket.off("receive-message", onReceive);
    };
  }, [socket, callId, peerId]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const localMsg: Msg = {
      senderId: myId,
      message: trimmed,
      timestamp: new Date(),
      type: "text",
    };

    setMsgs((prev) => [...prev, localMsg]);
    setText("");
    scrollToEnd();

    try {
      socket?.emit("send-message", {
        callId,
        to: peerId,
        message: trimmed,
        senderId: myId,
        senderName: myName,
        type: "text",
        timestamp: localMsg.timestamp,
      });
    } catch (e) {
      // socket failure ignored to keep UI responsive
    }

    try {
      await API.post(
        "/calls/chat",
        { callId, message: trimmed, type: "text" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      // API failure ignored because local message already shown
    }
  };

  const sendPrescriptionMessage = async (
    prescriptionId: string,
    pdfUrl: string
  ) => {
    const localMsg: Msg = {
      senderId: myId,
      message: "Prescription",
      type: "prescription",
      prescriptionId,
      pdfUrl,
      timestamp: new Date(),
    };

    setMsgs((prev) => [...prev, localMsg]);
    scrollToEnd();

    try {
      socket?.emit("send-message", {
        callId,
        to: peerId,
        senderId: myId,
        senderName: myName,
        type: "prescription",
        message: "Prescription",
        prescriptionId,
        pdfUrl,
        timestamp: localMsg.timestamp,
      });
    } catch (e) {
      // ignore socket error
    }

    try {
      await API.post(
        "/calls/chat",
        {
          callId,
          message: "Prescription",
          type: "prescription",
          prescriptionId,
          pdfUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) {
      // ignore API error
    }
  };

  const renderMessage = ({ item }: { item: Msg }) => {
    const mine = String(item.senderId) === String(myId);

    if (item.type === "prescription") {
      return (
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text style={[styles.bubbleText, mine && styles.mineText]}>
            Prescription
          </Text>

          {!!item.pdfUrl && (
            <Pressable
              onPress={() => Linking.openURL(item.pdfUrl!)}
              style={[
                styles.downloadBtn,
                mine ? styles.downloadMine : styles.downloadTheirs,
              ]}
            >
              <Ionicons
                name="download-outline"
                size={16}
                color={mine ? "#FFFFFF" : "#2B9FD8"}
              />
              <Text style={[styles.downloadText, mine && styles.downloadTextMine]}>
                Download Prescription (PDF)
              </Text>
            </Pressable>
          )}

          <Text style={[styles.time, mine && styles.mineTime]}>
            {new Date(item.timestamp || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.bubbleText, mine && styles.mineText]}>
          {item.message}
        </Text>
        <Text style={[styles.time, mine && styles.mineTime]}>
          {new Date(item.timestamp || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.topBar}>
            <View style={styles.topLeft}>
              <View style={styles.topIconCircle}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Chat</Text>
                <Text style={styles.sub}>With {peerName || peerId}</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.muted}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={msgs}
              keyExtractor={(item, index) =>
                item._id ? String(item._id) : `${item.senderId}-${index}`
              }
              contentContainerStyle={styles.listContent}
              onContentSizeChange={scrollToEnd}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={renderMessage}
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={80}
          >
            <View style={styles.inputRow}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="Type a message..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  multiline
                />
              </View>

              {isDoctor && (
                <Pressable onPress={() => setRxOpen(true)} style={styles.rxBtn}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color="#2B9FD8"
                  />
                </Pressable>
              )}

              <Pressable
                onPress={send}
                disabled={!text.trim()}
                style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>

        {isDoctor && (
          <TelemediPrescriptionFormModal
            visible={rxOpen}
            onClose={() => setRxOpen(false)}
            token={token}
            callId={callId}
            patientNameDefault={peerName}
            doctorNameDefault={myName}
            onCreated={({ prescriptionId, pdfUrl }) =>
              sendPrescriptionMessage(prescriptionId, pdfUrl)
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    marginBottom: 100,
  },

  card: {
    height: "70%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },

  topBar: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2B9FD8",
  },

  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  topIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  sub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.82)",
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  muted: {
    color: "#6B7280",
    fontWeight: "700",
  },

  list: {
    flex: 1,
    backgroundColor: "#F3F9FD",
  },

  listContent: {
    padding: 12,
    paddingBottom: 10,
    gap: 10,
  },

  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },

  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },

  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#D0EAFB",
  },

  bubbleText: {
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    fontSize: 13,
  },

  mineText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  time: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
  },

  mineTime: {
    color: "rgba(255,255,255,0.8)",
  },

  downloadBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },

  downloadMine: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.25)",
  },

  downloadTheirs: {
    backgroundColor: "#E6F4FF",
    borderColor: "#D0EAFB",
  },

  downloadText: {
    fontWeight: "900",
    fontSize: 12,
    color: "#2B9FD8",
  },

  downloadTextMine: {
    color: "#FFFFFF",
  },

  inputRow: {
    borderTopWidth: 1,
    borderTopColor: "#D0EAFB",
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
  },

  inputWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderRadius: 14,
    backgroundColor: "#F3F9FD",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },

  input: {
    minHeight: 24,
    maxHeight: 110,
    fontWeight: "700",
    color: "#111827",
    fontSize: 14,
    padding: 0,
  },

  rxBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E6F4FF",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#2B9FD8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  sendBtnDisabled: {
    opacity: 0.55,
  },
});