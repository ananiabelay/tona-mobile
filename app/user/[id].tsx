// app/[userId].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStorage } from '../../utils/auth'; // Adjust path if it's nested deeper

interface TargetProfile {
  id: string;
  username: string;
  bio?: string;
  area?: string;
  isFollowing?: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000';

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  const [profile, setProfile] = useState<TargetProfile | null>(null);
  const [userVents, setUserVents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'vents' | 'liked'>('vents');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchTargetProfile();
    }
  }, [userId]);

  const fetchTargetProfile = async () => {
    try {
      setIsLoading(true);
      const token = await authStorage.getToken();

      console.log("Fetching user profile for:", userId);
      
      const response = await fetch(`${API_URL}/api/user/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      const json = await response.json();
      
      if (response.ok && json.success) {
        const userData = json.profile;
        setProfile({
          id: userData.id || userId,
          username: userData.username,
          bio: userData.bio || "No biography provided yet.",
          area: userData.area || "Nearby",
        });
        setIsFollowing(userData.isFollowing || false);
        
        setUserVents(userData.vents || []);
      }
    } catch (error) {
      console.error("Error building target profile container view:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessagePress = () => {
    router.push({
      pathname: '/messages',
      params: { chatId: userId, title: profile?.username || 'Chat' }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerSpinner}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  const seedName = encodeURIComponent(profile?.username || 'Anonymous');

  return (
    // 🌟 Edges array updated to dynamic top safe area tracking
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.headerStrip}>
        <Pressable onPress={() => router.back()} style={styles.headerIconButton}>
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile Explorer</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={activeTab === 'vents' ? userVents : []}
        keyExtractor={(item, index) => item.id || index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            <View style={styles.profileHero}>
              <View style={styles.avatarGlowOuter}>
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${seedName}` }} 
                    style={styles.avatarImage} 
                  />
                </View>
              </View>
              
              <Text style={styles.heroUserTag}>@{profile?.username}</Text>
              
              <View style={styles.heroLocationBadge}>
                <Ionicons name="location-sharp" size={12} color="#818CF8" style={{ marginRight: 4 }} />
                <Text style={styles.heroLocationText}>{profile?.area}</Text>
              </View>

              <Text style={styles.bioText}>{profile?.bio}</Text>

              <View style={styles.actionRowGrid}>
                {/* 🔒 Follow Button Locked & Disabled */}
                <Pressable 
                  style={[styles.primaryActionBtn, styles.disabledBtnLayout]} 
                  disabled={true}
                >
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={16} 
                    color="#94A3B8" 
                    style={{ marginRight: 6 }} 
                  />
                  <Text style={[styles.actionBtnText, { color: '#94A3B8' }]}>
                    Follow Locked
                  </Text>
                </Pressable>

                <Pressable style={styles.secondaryActionBtn} onPress={handleMessagePress}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#B3A9FF" style={{ marginRight: 6 }} />
                  <Text style={[styles.actionBtnText, { color: '#B3A9FF' }]}>Message</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.tabsContainerHeaderRow}>
              <Pressable 
                style={[styles.tabButtonElement, activeTab === 'vents' && styles.tabButtonElementActive]}
                onPress={() => setActiveTab('vents')}
              >
                <Text style={[styles.tabButtonTitleText, activeTab === 'vents' && styles.tabButtonTitleTextActive]}>
                  RECENT ቶና
                </Text>
              </Pressable>

              <Pressable 
                style={[styles.tabButtonElement, activeTab === 'liked' && styles.tabButtonElementActive]}
                onPress={() => setActiveTab('liked')}
              >
                <Text style={[styles.tabButtonTitleText, activeTab === 'liked' && styles.tabButtonTitleTextActive]}>
                  LIKED POSTS
                </Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.ventItemContainer}>
            <Text style={styles.ventItemText}>{item.content || "Empty thread text content."}</Text>
            <View style={styles.ventFooterRow}>
              <View style={styles.ventStatBadge}>
                <Ionicons name="heart-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.ventStatText}>{item.feelsCount || 0}</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyStateCentering}>
            <Ionicons 
              name={activeTab === 'vents' ? "chatbubbles-outline" : "heart-dislike-outline"} 
              size={36} 
              color="#334155" 
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyFeedPlaceholderText}>
              {activeTab === 'vents' 
                ? "No shared posts inside this index feed zone." 
                : "This user has hidden their liked posts."
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* -------------------- STYLE SHEETS -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A071E', 
  },
  centerSpinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A071E',
  },
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,       // Elegant clearance from the hardware curve
    paddingBottom: 12,
    // ❌ Removed borderBottomWidth and borderColor lines completely
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#130F35',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#221A52',
  },
  avatarGlowOuter: {
    padding: 6,
    borderRadius: 100,
    backgroundColor: '#1D174D',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0A071E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroUserTag: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  heroLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A071E',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#312E81',
    marginBottom: 14,
  },
  heroLocationText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '600',
  },
  bioText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionRowGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtnLayout: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#312E81',
    opacity: 0.7,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabsContainerHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#130F35',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#221A52',
    marginBottom: 16,
  },
  tabButtonElement: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonElementActive: {
    backgroundColor: '#0A071E',
    borderWidth: 1,
    borderColor: '#221A52',
  },
  tabButtonTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tabButtonTitleTextActive: {
    color: '#F8FAFC',
  },
  ventItemContainer: {
    backgroundColor: '#130F35',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#221A52',
  },
  ventItemText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  ventFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#0A071E',
    paddingTop: 8,
  },
  ventStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0A071E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ventStatText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateCentering: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyFeedPlaceholderText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
});