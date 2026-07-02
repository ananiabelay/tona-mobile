import { useRouter } from "expo-router";
import { Search, Users, X } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { authStorage } from "../../utils/auth";

interface SearchedUser {
  id: string;
  username: string;
  area?: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const focusProgress = useSharedValue(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  };

  // Modern UI interpolation synced seamlessly with your theme palette
  const animatedInputWrapper = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ["rgba(255, 255, 255, 0.08)", "#A78BFA"]
    );
    const backgroundColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ["#1E1B29", "#151221"]
    );

    return { borderColor, backgroundColor };
  });

  const triggerSearchApi = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const token = await authStorage.getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/user/search?q=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) throw new Error();

      const json = await response.json();
      if (json.success) {
        setUsers(json.users || []);
      }
    } catch (error) {
      console.error("Error connecting to database profile indexing search:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text: string) => {
    setQuery(text);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      triggerSearchApi(text);
    }, 400);
  };

  const handleClear = () => {
    setQuery("");
    setUsers([]);
    setLoading(false);
  };

  const handleNavigateToUser = (userId: string) => {
    router.push({
      pathname: "/user/[id]",
      params: { userId }     
    });
  };

  return (
    <View style={styles.container}>
      {/* -------------------- SEARCH BAR HEADER -------------------- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Animated.View style={[styles.searchWrapper, animatedInputWrapper]}>
          <Search size={18} color={isFocused ? "#A78BFA" : "#6B6680"} style={styles.searchIcon} />
          
          <TextInput
            style={styles.input}
            placeholder="Search users by name or @username..."
            placeholderTextColor="#6B6680"
            value={query}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardAppearance="dark"
            returnKeyType="search"
            autoCapitalize="none"
          />

          {loading && (
            <ActivityIndicator size="small" color="#A78BFA" style={styles.spinnerSpacing} />
          )}

          {query.length > 0 && !loading && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <X size={14} color="#6B6680" />
            </Pressable>
          )}
        </Animated.View>
      </View>

      {/* -------------------- RENDER RESULTS LIST -------------------- */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {users.length > 0 ? (
          users.map((user) => {
            const seedName = encodeURIComponent(user.username || 'Anonymous');
            return (
              <Pressable 
                key={user.id} 
                style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
                onPress={() => handleNavigateToUser(user.id)}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${seedName}` }} 
                    style={styles.avatar} 
                  />
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    @{user.username || 'anonymous'}
                  </Text>
                  <Text style={styles.usernameText} numberOfLines={1}>
                    {user.area ? `📍 ${user.area}` : '⚡ Nearby'}
                  </Text>
                </View>

                <View style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          // Beautiful Empty State Illustration placeholder when no results match
          !loading && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Users size={32} color="#6B6680" />
              </View>
              <Text style={styles.emptyTitle}>
                {query.trim().length > 0 ? "No results found" : "Find your community"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query.trim().length > 0 
                  ? `We couldn't find anyone matching "${query}"` 
                  : "Search for friends by entering their unique handling names."
                }
              </Text>
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#13111C", // Unified dark base canvas
  },
  header: {
    paddingTop: Platform.OS === "ios" ? 64 : 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#13111C",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    height: "100%",
  },
  spinnerSpacing: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 50,
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120, // Clean clearance space for your custom floating tab bar
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1B29", // Matches exactly with tab bar color tokens
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  userCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 14, // Squircle profile style looks clean and modern
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 8,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  usernameText: {
    color: "#6B6680",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: "#A78BFA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewBtnText: {
    color: "#13111C",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1E1B29",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#6B6680",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 240,
  },
});