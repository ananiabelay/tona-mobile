import { MessageCircle } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

export default function MessagesScreen() {
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // Smooth, slow breathing pulse effect for the background glow
    glowScale.value = withRepeat(
      withTiming(1.2, { duration: 2500 }),
      -1, // Infinite loops
      true // Reverse direction automatically
    );
  }, []);

  const animatedGlow = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Subtle Background Radial Glow */}
      <Animated.View style={[styles.glowRing, animatedGlow]} />

      {/* Main Content Card */}
      <View style={styles.contentCard}>
        <View style={styles.iconCircle}>
          <MessageCircle size={32} color="#A78BFA" strokeWidth={2} />
        </View>

        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>
          We are currently building an ultra-fast chat experience. Stay tuned, direct messaging is coming soon!
        </Text>
        
        <View style={styles.badge}>
          <Text style={styles.badgeText}>In Development</Text>
        </View>
      </View>
    </View>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161420", // Deep dark background
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  glowRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(167, 139, 250, 0.04)", // Very subtle ambient purple light
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 60,
    elevation: 2,
  },
  contentCard: {
    alignItems: "center",
    backgroundColor: "#1E1B29", // Matches TabBar and UI components
    borderRadius: 24,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    width: "100%",
  },
  iconCircle: {
    backgroundColor: "rgba(167, 139, 250, 0.08)",
    padding: 18,
    borderRadius: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subtitle: {
    color: "#6B6680",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  badgeText: {
    color: "#9E9AA7",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});