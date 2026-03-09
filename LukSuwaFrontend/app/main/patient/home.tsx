import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

type Tip = {
  _id: string;
  title: string;
  body: string;
  category?: string;
  isActive: boolean;
  createdAt?: string;
};

export default function PatientHome() {
  const { user } = useContext(AuthContext) as any;

  const username = user?.username || "User";

  const initial = useMemo(() => {
    const name = (username || "").trim();
    return name ? name[0].toUpperCase() : "U";
  }, [username]);

  // Notification count
  const [notifCount, setNotifCount] = useState<number>(0);

  const fetchNotifCount = async () => {
    try {
      const res = await API.get("/notifications/mine");
      const listRaw = res?.data?.notifications || [];
      const unread = listRaw.filter((n: any) => !Boolean(n.isRead ?? n.read ?? false)).length;
      setNotifCount(unread);
    } catch (e: any) {
      console.log("notif count error:", e?.message || e);
      setNotifCount(0);
    }
  };

  // Health tips preview (top 3)
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsPreview, setTipsPreview] = useState<Tip[]>([]);

  const fetchTipsPreview = async () => {
    try {
      setTipsLoading(true);
      const res = await API.get("/health-tips/public");
      const list: Tip[] = res?.data?.tips || [];
      setTipsPreview(list.slice(0, 3));
    } catch (e: any) {
      console.log("tips preview error:", e?.message || e);
      setTipsPreview([]);
    } finally {
      setTipsLoading(false);
    }
  };

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchNotifCount();
      fetchTipsPreview();
    }, [])
  );

  const [banners] = useState([
    {
      id: 1,
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
      title: "Symptoms Checker",
      subtitle: "Check your symptoms instantly",
      gradient: ["rgba(99, 102, 241, 0.95)", "rgba(139, 92, 246, 0.85)"],
      onPress: () => router.push("/main/patient/symptoms"),
    },
    {
      id: 2,
      imageUrl: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800",
      title: "Scan Prescription",
      subtitle: "Upload & manage prescriptions",
      gradient: ["rgba(245, 158, 11, 0.95)", "rgba(217, 119, 6, 0.85)"],
      onPress: () => router.push("/main/patient/prescriptions"),
    },
    {
      id: 3,
      imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800",
      title: "Medicinal Uses",
      subtitle: "Discover medicine information",
      gradient: ["rgba(16, 185, 129, 0.95)", "rgba(5, 150, 105, 0.85)"],
      onPress: () => router.push("/main/patient/medicinaluses"),
    },
  ]);

  const [currentBanner, setCurrentBanner] = useState(0);
  const [showAllServices, setShowAllServices] = useState(false);

  const services = [
    {
      key: "symptoms",
      title: "Symptoms Checker",
      icon: "medical-outline" as const,
      onPress: () => router.push("/main/patient/symptoms"),
      available: true,
      color: "#6366F1",
      bgColor: "#EEF2FF",
    },
    {
      key: "meduse",
      title: "Medicinal Uses",
      icon: "leaf-outline" as const,
      onPress: () => router.push("/main/patient/medicinaluses"),
      available: true,
      color: "#10B981",
      bgColor: "#ECFDF5",
    },
    {
      key: "ocr",
      title: "Scan Prescription",
      icon: "scan-outline" as const,
      onPress: () => router.push("/main/patient/prescriptions"),
      available: true,
      color: "#F59E0B",
      bgColor: "#FFFBEB",
    },
    {
      key: "history",
      title: "My Prescriptions",
      icon: "document-text-outline" as const,
      onPress: () => router.push("/main/patient/prescriptions"),
      available: true,
      color: "#EF4444",
      bgColor: "#FEF2F2",
    },
    {
      key: "profile",
      title: "My Profile",
      icon: "person-outline" as const,
      onPress: () => router.push("/main/patient/profile"),
      available: true,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
    },
    {
      key: "tips",
      title: "Health Tips",
      icon: "bulb-outline" as const,
      onPress: () => router.push("/main/patient/healthTips"),
      color: "#0EA5E9",
      bgColor: "#ECFEFF",
    },
  ];

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.username}>{username}</Text>
          </View>

          <View style={styles.headerRight}>
            {/* ✅ Notifications Button + Count badge */}
            <TouchableOpacity
              style={styles.notificationBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/main/patient/notifications")}
            >
              <Ionicons name="notifications-outline" size={24} color="#ffffff" />
              {notifCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notifCount > 99 ? "99+" : String(notifCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push("/main/patient/profile")}
              activeOpacity={0.8}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / (width - 40)
              );
              setCurrentBanner(index);
            }}
            scrollEventThrottle={16}
          >
            {banners.map((banner) => (
              <TouchableOpacity
                key={banner.id}
                style={styles.banner}
                activeOpacity={0.95}
                onPress={banner.onPress}
              >
                <Image
                  source={{ uri: banner.imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={banner.gradient as [string, string, ...string[]]}
                  style={styles.bannerOverlay}
                >
                  <View style={styles.bannerTopBar}>
                    <View style={styles.bannerBadge}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.bannerBadgeText}>Featured</Text>
                    </View>
                    <View style={styles.bannerArrow}>
                      <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </View>
                  </View>

                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                    <View style={styles.bannerCTA}>
                      <Text style={styles.bannerCTAText}>Learn More</Text>
                      <Ionicons name="chevron-forward" size={14} color="#FFF" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pagination */}
          <View style={styles.pagination}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentBanner && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Healthcare Services</Text>
            <Text style={styles.sectionSub}>Quick access to care</Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => setShowAllServices(!showAllServices)}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>
              {showAllServices ? "Show Less" : "See All"}
            </Text>
            <Ionicons
              name={showAllServices ? "chevron-up" : "chevron-down"}
              size={16}
              color="#2B9FD8"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {services
            .slice(0, showAllServices ? services.length : 3)
            .map((service) => (
              <TouchableOpacity
                key={service.key}
                style={styles.card}
                onPress={service.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.cardIcon, { backgroundColor: service.bgColor }]}>
                  <Ionicons name={service.icon} size={26} color={service.color} />
                </View>
                <Text style={styles.cardText}>{service.title}</Text>
              </TouchableOpacity>
            ))}
        </View>

        {/* Health Tips Preview */}
        <View style={styles.tipsWrap}>
          <View style={styles.tipsHeader}>
            <View>
              <Text style={styles.tipsTitle}>Health Tips</Text>
              <Text style={styles.tipsSub}>Quick tips to stay healthy</Text>
            </View>

            <TouchableOpacity
              style={styles.tipsMoreBtn}
              onPress={() => router.push("/main/patient/healthTips")}
              activeOpacity={0.8}
            >
              <Text style={styles.tipsMoreText}>View More</Text>
              <Ionicons name="chevron-forward" size={16} color="#2B9FD8" />
            </TouchableOpacity>
          </View>

          {tipsLoading ? (
            <View style={styles.tipsLoading}>
              <ActivityIndicator color="#2B9FD8" />
              <Text style={styles.tipsLoadingText}>Loading tips...</Text>
            </View>
          ) : tipsPreview.length === 0 ? (
            <View style={styles.tipsEmpty}>
              <Ionicons name="bulb-outline" size={28} color="#9CA3AF" />
              <Text style={styles.tipsEmptyText}>No tips available right now.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {tipsPreview.map((t) => (
                <TouchableOpacity
                  key={t._id}
                  style={styles.tipCard}
                  activeOpacity={0.9}
                  onPress={() => router.push("/main/patient/healthTips")}
                >
                  <View style={styles.tipTop}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="sparkles-outline" size={18} color="#2B9FD8" />
                    </View>
                    <View style={styles.tipCatPill}>
                      <Text style={styles.tipCatText}>
                        {(t.category || "general").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.tipTitleText} numberOfLines={2}>{t.title}</Text>
                  <Text style={styles.tipBodyText} numberOfLines={3}>{t.body}</Text>

                  <View style={styles.tipFooter}>
                    <Text style={styles.tipFooterText}>Read</Text>
                    <Ionicons name="arrow-forward" size={14} color="#2B9FD8" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const CARD_GAP = 16;
const CARD_W = (width - 20 * 2 - CARD_GAP * 2) / 3;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F3F9FD",
  },

  /* Header — blue, same paddingTop/paddingBottom as original */
  header: {
    backgroundColor: "#2B9FD8",
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1A8EC4",
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
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2B9FD8",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
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
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
  },

  scrollView: { flex: 1 },
  content: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  bannerContainer: { marginBottom: 32 },
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
    backgroundColor: "rgba(255,255,255,0.30)",
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
    flexDirection: "row", justifyContent: "center",
    alignItems: "center", marginTop: 18, gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { width: 32, height: 6, backgroundColor: "#2B9FD8" },

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
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E0F3FB",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  seeAllText: { fontSize: 13, fontWeight: "700", color: "#2B9FD8" },

  grid: {
    flexDirection: "row", flexWrap: "wrap",
    gap: CARD_GAP, marginBottom: 32,
  },
  card: {
    width: CARD_W,
    paddingVertical: 18, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: "#FFFFFF",
    shadowColor: "#2B9FD8", shadowOpacity: 0.08,
    shadowRadius: 12, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1, borderColor: "#D0EAFB",
    alignItems: "center",
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  cardText: {
    fontSize: 12, fontWeight: "700",
    color: "#374151", textAlign: "center", lineHeight: 16,
  },

  tipsWrap: { marginTop: 6, marginBottom: 8 },
  tipsHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 20, fontWeight: "900", color: "#111827", letterSpacing: -0.3,
  },
  tipsSub: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tipsMoreBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E0F3FB",
    borderWidth: 1, borderColor: "#D0EAFB",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
  },
  tipsMoreText: { fontSize: 13, fontWeight: "800", color: "#2B9FD8" },

  tipsLoading: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D0EAFB",
    borderRadius: 18, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  tipsLoadingText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  tipsEmpty: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D0EAFB",
    borderRadius: 18, padding: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  tipsEmptyText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  tipCard: {
    width: 260, marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#D0EAFB",
    borderRadius: 22, padding: 14,
    shadowColor: "#2B9FD8", shadowOpacity: 0.08,
    shadowRadius: 12, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tipTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 10,
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: "#E0F3FB",
    alignItems: "center", justifyContent: "center",
  },
  tipCatPill: {
    backgroundColor: "#E0F3FB",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  tipCatText: { fontSize: 11, fontWeight: "900", color: "#2B9FD8" },
  tipTitleText: { fontSize: 14, fontWeight: "900", color: "#111827" },
  tipBodyText: {
    marginTop: 8, fontSize: 12, fontWeight: "700",
    color: "#374151", lineHeight: 18,
  },
  tipFooter: {
    marginTop: 12, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10, borderTopWidth: 1, borderTopColor: "#D0EAFB",
  },
  tipFooterText: { fontSize: 12, fontWeight: "900", color: "#2B9FD8" },
});