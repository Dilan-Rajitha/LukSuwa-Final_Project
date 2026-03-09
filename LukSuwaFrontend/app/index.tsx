

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// Floating icon pill with vector icon
function FloatingIcon({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style: object;
  delay?: number;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }, delay);

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2200,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingPill,
        style,
        { transform: [{ translateY: floatAnim }], opacity: opacityAnim },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// Pulse ring
function PulseRing({
  style,
  delay = 0,
  size = 50,
}: {
  style: object;
  delay?: number;
  size?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.8,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.45, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(255,255,255,0.25)",
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2B9FD8" />

      {/* Decorative Blobs */}
      <View style={styles.blobTopLeft} />
      <View style={styles.blobBottomRight} />

      {/* Pulse rings */}
      <PulseRing style={{ top: height * 0.11, right: 34 }} size={48} delay={0} />
      <PulseRing style={{ top: height * 0.11, right: 34 }} size={48} delay={900} />
      <PulseRing style={{ top: height * 0.27, left: 20 }} size={44} delay={300} />
      <PulseRing style={{ top: height * 0.27, left: 20 }} size={44} delay={1100} />
      <PulseRing style={{ top: height * 0.42, right: 26 }} size={44} delay={150} />
      <PulseRing style={{ top: height * 0.42, right: 26 }} size={44} delay={1000} />
      <PulseRing style={{ top: height * 0.54, left: 16 }} size={42} delay={500} />
      <PulseRing style={{ top: height * 0.54, left: 16 }} size={42} delay={1300} />

      {/* Floating vector icons */}
      {/* <FloatingIcon style={{ position: "absolute", top: height * 0.09, right: 26 }} delay={0}>
        <Ionicons name="heart" size={22} color="#ff6b8a" />
      </FloatingIcon> */}

      {/* <FloatingIcon style={{ position: "absolute", top: height * 0.25, left: 14 }} delay={500}>
        <MaterialCommunityIcons name="pill" size={22} color="#ffffff" />
      </FloatingIcon> */}

      <FloatingIcon style={{ position: "absolute", top: height * 0.40, right: 20 }} delay={250}>
        <MaterialCommunityIcons name="stethoscope" size={22} color="#b3e5fc" />
      </FloatingIcon>

      <FloatingIcon style={{ position: "absolute", top: height * 0.52, left: 10 }} delay={750}>
        <MaterialCommunityIcons name="hospital-box" size={22} color="#ffffff" />
      </FloatingIcon>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>LukSuwa</Text>
          <Text style={styles.subtitle}>
            AI-Based e-Health{"\n"}& Medicine{"\n"}Management
          </Text>
        </View>

        {/* Doctor Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={require("../assets/images/doctor-cartoon-02.png")}
            style={styles.doctorImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("./auth/login")}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.footer}>© 2025 LukSuwa Health</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2B9FD8",
  },

  blobTopLeft: {
    position: "absolute",
    top: -70,
    left: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: 130,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.07)",
  },

  floatingPill: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 9,
    zIndex: 6,
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 70,
    zIndex: 5,
  },
  titleBlock: {
    marginBottom: 12,
  },
  title: {
    fontSize: 44,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.90)",
    fontWeight: "500",
    lineHeight: 28,
  },

  imageWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  doctorImage: {
    width: width * 0.88,
    height: height * 0.46,
  },

  bottomCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 30,
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#1A7AAF",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  button: {
    backgroundColor: "#2B9FD8",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    shadowColor: "#2B9FD8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: "#AAA",
    letterSpacing: 0.2,
  },
});