import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChatbotFloating from "../../../components/ChatbotFloating";
import ChatbotModal from "../../../components/ChatbotModal";

export default function AdminTabsLayout() {
  const insets = useSafeAreaInsets();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#111827", 
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
        {/* ✅ Admin Home / Dashboard */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid-outline" size={24} color={color} />
            ),
          }}
        />

       
        <Tabs.Screen
          name="approvals"
          options={{
            title: "Approvals",
            tabBarIcon: ({ color }) => (
              <Ionicons name="checkmark-done-outline" size={24} color={color} />
            ),
          }}
        />

   
        <Tabs.Screen
          name="users"
          options={{
            title: "Users",
            tabBarIcon: ({ color }) => (
              <Ionicons name="people-outline" size={24} color={color} />
            ),
          }}
        />

   
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Analytics",
            tabBarIcon: ({ color }) => (
              <Ionicons name="bar-chart-outline" size={24} color={color} />
            ),
          }}
        />

     
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={24} color={color} />
            ),
          }}
        />

        {/* Hidden routes (add later if needed) */}
        {/* <Tabs.Screen name="userDetails" options={{ href: null }} /> */}
        {/* <Tabs.Screen name="doctorDetails" options={{ href: null }} /> */}
        {/* <Tabs.Screen name="pharmacyDetails" options={{ href: null }} /> */}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="healthTips" options={{ href: null }} />

      </Tabs>

      {/* Optional chatbot like doctor side */}
      <ChatbotFloating onPress={() => setChatOpen(true)} />
      <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />
    </View>
  );
}





// import { Ionicons } from "@expo/vector-icons";
// import { Tabs } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import React, { useState } from "react";
// import { View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import ChatbotFloating from "../../../components/ChatbotFloating";
// import ChatbotModal from "../../../components/ChatbotModal";

// export default function AdminTabsLayout() {
//   const insets = useSafeAreaInsets();
//   const [chatOpen, setChatOpen] = useState(false);

//   return (
//     <View style={{ flex: 1, backgroundColor: "#2B9FD8" }}>

//       <StatusBar style="light" backgroundColor="#2B9FD8" />

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
//             borderTopColor: "#D0EAFB",
//             backgroundColor: "#FFFFFF",
//           },
//           tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 4 },
//           tabBarIconStyle: { marginTop: 4 },
//         }}
//       >
//         <Tabs.Screen
//           name="index"
//           options={{
//             title: "Dashboard",
//             tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={24} color={color} />,
//           }}
//         />
//         <Tabs.Screen
//           name="approvals"
//           options={{
//             title: "Approvals",
//             tabBarIcon: ({ color }) => <Ionicons name="checkmark-done-outline" size={24} color={color} />,
//           }}
//         />
//         <Tabs.Screen
//           name="users"
//           options={{
//             title: "Users",
//             tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={24} color={color} />,
//           }}
//         />
//         <Tabs.Screen
//           name="analytics"
//           options={{
//             title: "Analytics",
//             tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={24} color={color} />,
//           }}
//         />
//         <Tabs.Screen
//           name="settings"
//           options={{
//             title: "Settings",
//             tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
//           }}
//         />

//         <Tabs.Screen name="profile" options={{ href: null }} />
//         <Tabs.Screen name="healthTips" options={{ href: null }} />
//       </Tabs>

//       <ChatbotFloating onPress={() => setChatOpen(true)} />
//       <ChatbotModal visible={chatOpen} onClose={() => setChatOpen(false)} />
//     </View>
//   );
// }