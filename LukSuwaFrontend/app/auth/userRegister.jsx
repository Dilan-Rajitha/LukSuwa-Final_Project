import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../src/api/axiosConfig";

export default function UserRegister() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // ✅ Generic error handler (NO E11000 hard-coding)
  const getNiceRegisterError = (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;

    // Combine likely message fields (your backend returns { message, error })
    const combined =
      [
        data?.error,
        data?.message,
        data?.msg,
        typeof data === "string" ? data : null,
        err?.message,
      ]
        .filter(Boolean)
        .join(" | ") || "Registration failed";

    const lower = combined.toLowerCase();

    // ✅ Duplicate detection (generic patterns)
    const looksLikeDuplicate =
      status === 409 ||
      lower.includes("duplicate key") ||
      lower.includes("dup key") ||
      lower.includes("duplicate") ||
      lower.includes("already exists") ||
      lower.includes("already registered") ||
      lower.includes("unique constraint") ||
      lower.includes("unique index");

    if (looksLikeDuplicate) {
      // Try to identify the field (index names or keywords)
      const isPhone =
        lower.includes("phone_1") || lower.includes("phone") || lower.includes("mobile");
      const isEmail = lower.includes("email_1") || lower.includes("email");
      const isUsername = lower.includes("username_1") || lower.includes("username");

      if (isPhone)
        return "This phone number is already registered. Please use another number or sign in.";
      if (isEmail)
        return "This email is already registered. Please use another email or sign in.";
      if (isUsername)
        return "This username is already taken. Please try a different username.";

      return "Account already exists. Please sign in or use different details.";
    }

    // Validation errors
    if (status === 400 || lower.includes("validation")) return combined;

    // Server errors
    if (status >= 500)
      return "Server error while creating account. Please try again in a moment.";

    // Network issues
    if (lower.includes("network") || lower.includes("timeout"))
      return "Network issue. Check your internet connection and try again.";

    // Fallback
    return data?.message || combined;
  };

  const handleRegister = async () => {
    // ✅ Validation (SAME as your 1st code)
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!gender) {
      setError("Please select a gender");
      return;
    }

    try {
      const userData = {
        username,
        email,
        password,
        gender,
        age: parseInt(age),
        phone,
        role: "patient", // Always patient by default
      };

      const response = await API.post("/users", userData);

      setSuccessMessage("Registration successful! Redirecting to login...");
      console.log(response.data);

      // ✅ Clear form (SAME as your 1st code)
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setGender("");
      setAge("");
      setPhone("");
      setError(null);

      // ✅ Redirect (SAME as your 1st code)
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } catch (err) {
      console.log("REGISTER ERROR:", err?.response?.data || err);
      setError(getNiceRegisterError(err));
      setSuccessMessage(null);
    }
  };

  const isDuplicate =
    error &&
    (error.toLowerCase().includes("already") ||
      error.toLowerCase().includes("registered") ||
      error.toLowerCase().includes("exists"));

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="light-content" backgroundColor="#2B9FD8" />

      {/* ✅ Blue header theme */}
      <View style={styles.header}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobTopRight} />



        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>
      </View>

      {/* ✅ White card theme */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
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

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* Gender */}
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[styles.genderButton, gender === "male" && styles.genderButtonSelected]}
            onPress={() => setGender("male")}
          >
            <Text style={[styles.genderButtonText, gender === "male" && styles.genderButtonTextSelected]}>
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.genderButton, gender === "female" && styles.genderButtonSelected]}
            onPress={() => setGender("female")}
          >
            <Text style={[styles.genderButtonText, gender === "female" && styles.genderButtonTextSelected]}>
              Female
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {successMessage && <Text style={styles.success}>{successMessage}</Text>}

        {/* ✅ Duplicate quick CTA */}
        {isDuplicate && (
          <TouchableOpacity onPress={() => router.push("/auth/login")} style={{ marginBottom: 12 }}>
            <Text style={styles.duplicateCta}>Go to Sign In</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#2B9FD8",
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* Header */
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

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    shadowColor: "#1A7AAF",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
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

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 10,
    marginTop: 2,
  },

  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#F3F9FD",
    alignItems: "center",
    marginHorizontal: 6,
  },
  genderButtonSelected: {
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  genderButtonTextSelected: {
    color: "#FFFFFF",
  },

  button: {
    backgroundColor: "#2B9FD8",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 6,
    alignItems: "center",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
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

  duplicateCta: {
    textAlign: "center",
    color: "#2B9FD8",
    fontWeight: "800",
    marginTop: 4,
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
    marginBottom: 12,
    fontSize: 14,
  },
  success: {
    color: "#10B981",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
  },
});