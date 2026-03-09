// import { Stack } from "expo-router";
// import { AuthProvider } from "../src/context/AuthContext";

// export default function RootLayout() {
//   return (
//     <AuthProvider>
//       <Stack screenOptions={{ headerShown: false }} />
//     </AuthProvider>
//   );
// }



// new version auto login 
import { Stack, router } from "expo-router";
import React, { useContext, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthContext, AuthProvider } from "../src/context/AuthContext";

type AuthCtx = {
  token: string | null;
  user: any;
  loading: boolean;
};

function AuthGate() {
  // cast to avoid "type null" TS error
  const { token, user, loading } = useContext(AuthContext) as unknown as AuthCtx;

  useEffect(() => {
    if (loading) return;

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const u = user || {};

    // Same routing logic as your login.tsx
    if (u.type === "SuperUser") {
      if (u.role === "pharmacy" && u.isProfileComplete === false) {
        router.replace("/main/pharmacy/completeProfile");
        return;
      }
      if (u.role === "doctor") {
        router.replace("/main/doctor");
        return;
      }
      if (u.role === "pharmacy") {
        router.replace("/main/pharmacy");
        return;
      }
    }

    if (u.role === "patient") router.replace("/main/patient/home");
    else if (u.role === "admin") router.replace("/main/admin");
    else router.replace("/main/patient/home");
  }, [loading, token, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}