import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatbotFloating from "../../../components/ChatbotFloating";
import ChatbotModal from "../../../components/ChatbotModal";

import { StatusBar } from "expo-status-bar"; //  add

export default function PatientTabsLayout() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>

      {/* new add */}
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
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
            borderTopColor: "#D0EAFB",
            backgroundColor: "#FFFFFF",
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 4 },
          tabBarIconStyle: { marginTop: 4 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="symptoms"
          options={{
            title: "Symptoms",
            tabBarIcon: ({ color }) => <Ionicons name="medkit-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="prescriptions"
          options={{
            title: "OCR",
            tabBarIcon: ({ color }) => <Ionicons name="scan-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="telemedicine"
          options={{
            title: "Video",
            tabBarIcon: ({ color }) => <Ionicons name="videocam-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen
          name="pharmacy"
          options={{
            title: "Pharmacy",
            tabBarIcon: ({ color }) => <Ionicons name="location-outline" size={24} color={color} />,
          }}
        />

        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="medicinaluses" options={{ href: null }} />
        <Tabs.Screen name="telemedicineHistory" options={{ href: null }} />
        <Tabs.Screen name="bookAppointment" options={{ href: null }} />
        <Tabs.Screen name="callRoom" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="healthTips" options={{ href: null }} />
      </Tabs>

      <ChatbotFloating onPress={() => setChatOpen(true)} />
      <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}

