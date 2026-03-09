import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useContext, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import API from "../../../src/api/axiosConfig";
import { AuthContext } from "../../../src/context/AuthContext";

const { width } = Dimensions.get("window");

export default function AdminHome() {
  const { user, token } = useContext(AuthContext) as any;

  const username = user?.username || "Admin";

  const initial = useMemo(() => {
    const name = (username || "").trim();
    return name ? name[0].toUpperCase() : "A";
  }, [username]);

  const [notifCount, setNotifCount] = useState<number>(0);

  const fetchNotifCount = async () => {
    try {
      if (!token) return;
      const res = await API.get("/notifications/count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifCount(res?.data?.count ?? 0);
    } catch (e: any) {
      console.log("LOG admin notif count error:", e?.response?.status, e?.response?.data || e?.message);
      setNotifCount(0);
    }
  };

  useFocusEffect(useCallback(() => { fetchNotifCount(); }, [token]));

  const [banners] = useState([
    {
      id: 1,
      imageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800",
      title: "Approvals",
      subtitle: "Approve doctors & pharmacies",
      gradient: ["rgba(17, 24, 39, 0.95)", "rgba(75, 85, 99, 0.85)"],
      onPress: () => router.push("/main/admin/approvals"),
    },
    {
      id: 2,
      imageUrl: "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=800",
      title: "User Management",
      subtitle: "Manage patients, doctors, pharmacies",
      gradient: ["rgba(59, 130, 246, 0.95)", "rgba(37, 99, 235, 0.85)"],
      onPress: () => router.push("/main/admin/users"),
    },
    {
      id: 3,
      imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800",
      title: "Analytics",
      subtitle: "Track platform usage & stats",
      gradient: ["rgba(16, 185, 129, 0.95)", "rgba(5, 150, 105, 0.85)"],
      onPress: () => router.push("/main/admin/analytics"),
    },
  ]);

  const [currentBanner, setCurrentBanner] = useState(0);
  const [showAllServices, setShowAllServices] = useState(false);

  const services = [
    { key: "approvals", title: "Approvals", icon: "checkmark-done-outline" as const, onPress: () => router.push("/main/admin/approvals"), color: "#2B9FD8", bgColor: "#E0F3FB" },
    { key: "users", title: "Users", icon: "people-outline" as const, onPress: () => router.push("/main/admin/users"), color: "#2563EB", bgColor: "#EFF6FF" },
    { key: "tips", title: "Health Tips", icon: "bulb-outline" as const, onPress: () => router.push("/main/admin/healthTips"), color: "#0EA5E9", bgColor: "#ECFEFF" },
    { key: "analytics", title: "Analytics", icon: "bar-chart-outline" as const, onPress: () => router.push("/main/admin/analytics"), color: "#10B981", bgColor: "#ECFDF5" },
    { key: "settings", title: "Settings", icon: "settings-outline" as const, onPress: () => router.push("/main/admin/settings"), color: "#7C3AED", bgColor: "#F5F3FF" },
    { key: "createAdmin", title: "Create Admin", icon: "person-add-outline" as const, onPress: () => router.push("/main/admin/settings"), color: "#374151", bgColor: "#F3F4F6" },
    { key: "coming_soon_1", title: "Coming Soon", icon: "time-outline" as const, onPress: () => {}, color: "#9CA3AF", bgColor: "#F3F4F6", disabled: true },
    { key: "coming_soon_2", title: "Coming Soon", icon: "time-outline" as const, onPress: () => {}, color: "#9CA3AF", bgColor: "#F3F4F6", disabled: true },
  ];

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.username}>{username}</Text>
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark" size={12} color="#2B9FD8" />
              <Text style={styles.roleText}>Admin Dashboard</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notificationBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/main/admin/settings")}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {notifCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifCount > 99 ? "99+" : String(notifCount)}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push("/main/admin/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Summary strip */}
        {/* <View style={styles.summaryRow}>
          {[
            { title: "Approvals", sub: "Doctors / Pharmacies" },
            { title: "Users", sub: "Manage accounts" },
            { title: "Analytics", sub: "Reports & stats" },
          ].map((s) => (
            <View key={s.title} style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{s.title}</Text>
              <Text style={styles.summarySub}>{s.sub}</Text>
            </View>
          ))}
        </View> */}

        {/* Banner */}
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
              setCurrentBanner(index);
            }}
            scrollEventThrottle={16}
          >
            {banners.map((banner) => (
              <TouchableOpacity key={banner.id} style={styles.banner} activeOpacity={0.95} onPress={banner.onPress}>
                <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                <LinearGradient colors={banner.gradient as [string, string, ...string[]]} style={styles.bannerOverlay}>
                  <View style={styles.bannerTopBar}>
                    <View style={styles.bannerBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                      <Text style={styles.bannerBadgeText}>Admin Tools</Text>
                    </View>
                    <View style={styles.bannerArrow}>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                  </View>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                    <View style={styles.bannerCTA}>
                      <Text style={styles.bannerCTAText}>Open</Text>
                      <Ionicons name="chevron-forward" size={14} color="#FFF" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.pagination}>
            {banners.map((_, index) => (
              <View key={index} style={[styles.dot, index === currentBanner && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Workspace</Text>
            <Text style={styles.sectionSub}>Monitor & control the platform</Text>
          </View>
          <TouchableOpacity style={styles.seeAllBtn} onPress={() => setShowAllServices(!showAllServices)} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>{showAllServices ? "Show Less" : "See All"}</Text>
            <Ionicons name={showAllServices ? "chevron-up" : "chevron-down"} size={16} color="#2B9FD8" />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {services.slice(0, showAllServices ? services.length : 6).map((service) => (
            <TouchableOpacity
              key={service.key}
              style={[styles.card, (service as any).disabled && styles.cardDisabled]}
              onPress={service.onPress}
              activeOpacity={(service as any).disabled ? 1 : 0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: service.bgColor }]}>
                <Ionicons name={service.icon} size={26} color={service.color} />
              </View>
              <Text style={[styles.cardText, (service as any).disabled && { color: "#9CA3AF" }]}>
                {service.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const CARD_GAP = 16;
const CARD_W = (width - 20 * 2 - CARD_GAP * 2) / 3;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F3F9FD" },

  /* ── Header ── */
  header: {
    backgroundColor: "#2B9FD8",
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  welcomeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.80)",
    fontWeight: "500",
    marginBottom: 4,
  },
  username: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  rolePill: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.20)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2B9FD8",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.50)",
  },
  avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 18 },

  scrollView: { flex: 1 },
  content: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 30 },

  /* ── Summary strip ── */
  // summaryRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  // summaryCard: {
  //   flex: 1,
  //   backgroundColor: "#FFFFFF",
  //   borderRadius: 16,
  //   padding: 12,
  //   borderWidth: 1,
  //   borderColor: "#D0EAFB",
  //   shadowColor: "#2B9FD8",
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 6,
  //   elevation: 2,
  // },
  // summaryTitle: { fontSize: 13, fontWeight: "900", color: "#111827" },
  // summarySub: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "#6B7280" },

  /* ── Banner ── */
  bannerContainer: { marginBottom: 26 },
  banner: {
    width: width - 40,
    height: 200,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerOverlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0, top: 0,
    padding: 24,
    justifyContent: "space-between",
  },
  bannerTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerContent: { flex: 1, justifyContent: "flex-end" },
  bannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  bannerBadgeText: { fontSize: 11, fontWeight: "800", color: "#FFF" },
  bannerTitle: {
    fontSize: 26, fontWeight: "900", color: "#FFFFFF",
    marginBottom: 6, letterSpacing: -0.5,
  },
  bannerSubtitle: {
    fontSize: 15, fontWeight: "600",
    color: "rgba(255,255,255,0.9)", marginBottom: 12,
  },
  bannerCTA: { flexDirection: "row", alignItems: "center", gap: 4 },
  bannerCTAText: { fontSize: 13, fontWeight: "800", color: "#FFF" },
  bannerArrow: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center", alignItems: "center",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { width: 32, height: 6, backgroundColor: "#2B9FD8" },

  /* ── Section header ── */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24, fontWeight: "900", color: "#111827",
    marginBottom: 4, letterSpacing: -0.5,
  },
  sectionSub: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D0EAFB",
  },
  seeAllText: { fontSize: 13, fontWeight: "700", color: "#2B9FD8" },

  /* ── Grid cards ── */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP, marginBottom: 32 },
  card: {
    width: CARD_W,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#2B9FD8",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#D0EAFB",
    alignItems: "center",
  },
  cardDisabled: { opacity: 0.5 },
  cardIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  cardText: {
    fontSize: 12, fontWeight: "700", color: "#374151",
    textAlign: "center", lineHeight: 16,
  },
});