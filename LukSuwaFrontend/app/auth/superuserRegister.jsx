import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../src/api/axiosConfig";

export default function SuperuserRegister() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [certificateId, setCertificateId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseId, setLicenseId] = useState("");
  const [certificateImage, setCertificateImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setError("Gallery permission is required."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCertificateImage(result.assets[0].uri);
      setError(null);
    }
  };

  const handleRegister = async () => {
    try {
      if (!username || !email || !password || !certificateId) {
        setError("Please fill in all required fields."); return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match."); return;
      }
      if (!certificateImage) {
        setError("Please select a certificate image."); return;
      }
      setUploading(true); setError(null); setSuccessMessage(null);
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("role", role);
      formData.append("certificate_id", certificateId);
      if (role === "doctor") formData.append("specialization", specialization);
      else if (role === "pharmacy") formData.append("license_id", licenseId);
      const uriParts = certificateImage.split(".");
      const ext = uriParts[uriParts.length - 1];
      formData.append("certificate_image", {
        uri: certificateImage,
        name: `certificate_${Date.now()}.${ext}`,
        type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      });
      const res = await API.post("/superusers", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccessMessage(res.data.message || "Registration successful!");
      setError(null);
      setUsername(""); setEmail(""); setPassword(""); setConfirmPassword("");
      setCertificateId(""); setSpecialization(""); setLicenseId("");
      setCertificateImage(null); setRole("doctor");
      setTimeout(() => { router.replace("/auth/login"); }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Registration failed. Please try again.");
      setSuccessMessage(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <StatusBar barStyle="light-content" backgroundColor="#2B9FD8" />

      {/* Blue header */}
      <View style={styles.header}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobTopRight} />
        <Text style={styles.title}>Professional Registration</Text>
        <Text style={styles.subtitle}>Register as a healthcare provider</Text>
      </View>

      {/* White card */}
      <View style={styles.card}>

        {/* Role Selector */}
        <Text style={styles.label}>Account Type</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleButton, role === "doctor" && styles.activeButton]}
            onPress={() => setRole("doctor")}
          >
            <Text style={[styles.roleButtonText, role === "doctor" && styles.activeButtonText]}>
              Doctor
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === "pharmacy" && styles.activeButton]}
            onPress={() => setRole("pharmacy")}
          >
            <Text style={[styles.roleButtonText, role === "pharmacy" && styles.activeButtonText]}>
              Pharmacy
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
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
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Certificate ID"
          placeholderTextColor="#9CA3AF"
          value={certificateId}
          onChangeText={setCertificateId}
        />

        {role === "doctor" && (
          <TextInput
            style={styles.input}
            placeholder="Specialization (e.g., Cardiology)"
            placeholderTextColor="#9CA3AF"
            value={specialization}
            onChangeText={setSpecialization}
          />
        )}
        {role === "pharmacy" && (
          <TextInput
            style={styles.input}
            placeholder="Pharmacy License ID"
            placeholderTextColor="#9CA3AF"
            value={licenseId}
            onChangeText={setLicenseId}
          />
        )}

        {/* Certificate Image */}
        <Text style={styles.label}>Certificate Image</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
          <Text style={styles.imagePickerText}>
            {certificateImage ? "✓ Certificate Selected" : "📁 Upload Certificate"}
          </Text>
        </TouchableOpacity>

        {certificateImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: certificateImage }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setCertificateImage(null)}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {successMessage && <Text style={styles.success}>{successMessage}</Text>}

        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Register as {role === "doctor" ? "Doctor" : "Pharmacy"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>

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
  title: {
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 40,
    shadowColor: "#1A7AAF",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 10,
    marginTop: 4,
  },

  roleSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    backgroundColor: "#F3F9FD",
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#2B9FD8",
    borderColor: "#2B9FD8",
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeButtonText: {
    color: "#FFFFFF",
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

  imagePicker: {
    padding: 16,
    backgroundColor: "#F3F9FD",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D0EAFB",
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 14,
  },
  imagePickerText: {
    color: "#2B9FD8",
    fontWeight: "600",
    fontSize: 15,
  },
  imagePreviewContainer: {
    position: "relative",
    alignItems: "center",
    marginBottom: 14,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#EF4444",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
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
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
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