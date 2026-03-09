

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatbotFloating from "../../../components/ChatbotFloating";
import ChatbotModal from "../../../components/ChatbotModal";

export default function PharmacyTabsLayout() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2563EB",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            height: 44 + insets.bottom,
            paddingBottom: 2 + insets.bottom * 0.05,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
            backgroundColor: "#FFFFFF",
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginTop: 3,
          },
          tabBarIconStyle: { marginTop: 2 },
        }}
      >
        {/* Home */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={22} color={color} />
            ),
          }}
        />

        {/* Inventory */}
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Inventory",
            tabBarIcon: ({ color }) => (
              <Ionicons name="cube-outline" size={22} color={color} />
            ),
          }}
        />

        {/* Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={22} color={color} />
            ),
          }}
        />

        {/* Hidden screens (still accessible by router.push) */}
        <Tabs.Screen name="completeProfile" options={{ href: null }} />
        <Tabs.Screen name="csvUpload" options={{ href: null }} />
      </Tabs>

      {/* Floating Chatbot */}
      <ChatbotFloating onPress={() => setChatOpen(true)} />
      <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}
