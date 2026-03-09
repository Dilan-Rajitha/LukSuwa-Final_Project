import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

type Msg = {
  id: string;
  role: "user" | "bot";
  text: string;
};

export default function ChatbotModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: "seed-1", role: "bot", text: "Hi! Ask about symptoms or medicines." },
  ]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [visible]);

  const typingItem: Msg | null = useMemo(() => {
    if (!loading) return null;
    return { id: "typing", role: "bot", text: "Typing..." };
  }, [loading]);

  const dataToRender = useMemo(
    () => (typingItem ? [...messages, typingItem] : messages),
    [messages, typingItem]
  );

  const pickReplyText = (data: any) =>
    data?.reply ||
    data?.response ||
    data?.message ||
    data?.answer ||
    (typeof data === "string" ? data : JSON.stringify(data));

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((p) => [...p, { id: String(Date.now()), role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await API.post("/ai/chatbot/message", { message: text });
      const botText = pickReplyText(res.data);

      setMessages((p) => [
        ...p,
        { id: String(Date.now() + 1), role: "bot", text: botText },
      ]);

      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      const errText = e?.response?.data?.error || e?.message || "Failed to get response.";
      setMessages((p) => [
        ...p,
        { id: String(Date.now() + 2), role: "bot", text: `Error: ${errText}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Msg }) => {
    const isUser = item.role === "user";
    const isTyping = item.id === "typing";

    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {isTyping ? (
          <View style={styles.typingRow}>
            <ActivityIndicator />
            <Text style={styles.typingText}>{item.text}</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isUser && styles.userText]}>{item.text}</Text>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        {/* backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* centered window */}
        <View style={styles.card}>
          {/* header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>AI Assistant</Text>
                <Text style={styles.subTitle}>Health support chatbot</Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* body */}
          <FlatList
            ref={listRef}
            data={dataToRender}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />

          {/* input */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                multiline
                editable={!loading}
              />
            </View>

            <Pressable
              onPress={send}
              disabled={!input.trim() || loading}
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },

  card: {
    width: "92%",
    maxWidth: 420,
    height: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D0EAFB",
    elevation: 12,
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },

  header: {
    height: 64,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#D0EAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2B9FD8",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 16, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.2 },
  subTitle: { marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.82)", fontWeight: "600" },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  list: { flex: 1, backgroundColor: "#F3F9FD" },
  listContent: { padding: 12, gap: 10 },

  bubble: {
    maxWidth: "84%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#D0EAFB",
  },
  bubbleText: { fontSize: 14, color: "#111827", lineHeight: 20, fontWeight: "600" },
  userText: { color: "#FFFFFF", fontWeight: "700" },

  typingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  typingText: { fontSize: 13, color: "#374151", fontWeight: "700" },

  inputRow: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#D0EAFB",
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
    maxHeight: 120,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    padding: 0,
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
  sendBtnDisabled: { opacity: 0.55 },
});