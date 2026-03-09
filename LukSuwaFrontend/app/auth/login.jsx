import { router } from "expo-router";
import { useContext, useState } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loginUser } from "../../src/api/authApi";
import { AuthContext } from "../../src/context/AuthContext";

import logo from "../../assets/images/luksuwa-adaptive-foreground.png";

export default function Login() {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      setError(null);
      const data = await loginUser(email, password);
      login(data);
      const u = data.user;

      if (u.type === "SuperUser") {
        if (u.role === "pharmacy" && u.isProfileComplete === false) {
          router.replace("/main/pharmacy/completeProfile");
          return;
        }
        if (u.role === "doctor") { router.replace("/main/doctor"); return; }
        if (u.role === "pharmacy") { router.replace("/main/pharmacy"); return; }
      }

      const role = u.role;
      if (role === "patient") router.replace("/main/patient/home");
      else if (role === "admin") router.replace("/main/admin");
      else router.replace("/main/patient/home");
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 403 && msg?.toLowerCase()?.includes("pending")) {
        setError("⏳ Your account is pending admin approval. Please wait.");
        return;
      }
      setError(msg || err?.message || "Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2B9FD8" />

      {/* header section */}
      <View style={styles.header}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobTopRight} />

        {/* Logo */}
        <Image source={logo} style={styles.logoImage} resizeMode="contain" />

        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to access your care</Text>
      </View>

      {/* White card form */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        {/* Register link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/auth/userRegister")}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor / Pharmacy */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Are you a doctor or pharmacy? </Text>
          <TouchableOpacity onPress={() => router.push("/auth/superuserRegister")}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Back */}
        {/* <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity> */}
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
  <Text style={styles.backText}>← Back</Text>
</TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2B9FD8",
  },

  /* Blue header */
  header: {
    backgroundColor: "#2B9FD8",
    paddingTop: 64,
    paddingBottom: 36,
    alignItems: "center",
    overflow: "hidden",
  },

  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  blobTopRight: {
    position: "absolute",
    top: -40,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  logoImage: {
    width: 130,
    height: 130,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "400",
  },

  /* White card */
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
    shadowColor: "#1A7AAF",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 10,
  },

  input: {
    backgroundColor: "#F3F9FD",
    padding: 16,
    borderRadius: 14,
    fontSize: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    color: "#1F2937",
  },

  button: {
    backgroundColor: "#2B9FD8",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 6,
    alignItems: "center",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    fontSize: 14,
    color: "#6B7280",
  },
  link: {
    fontSize: 14,
    color: "#2B9FD8",
    fontWeight: "700",
  },

  backButton: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    color: "#2B9FD8",
    fontSize: 15,
    fontWeight: "500",
  },

  error: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 14,
  },
})