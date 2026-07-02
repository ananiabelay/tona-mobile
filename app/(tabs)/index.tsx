// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStorage } from '../../utils/auth';

const CURRENT_APP_VERSION = '1.0.0'; 
const TELEGRAM_LINK = 'https://t.me/tonaethio';

interface Vent {
  id: string;
  content: string;
  userId: string;
  username: string;
  avatarId?: number;
  location?: string;
  feelsCount: number;
  commentCount: number;
  tags: string[];
  createdAt: string;
  isEdited: boolean;
  hasFelt: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000';

const formatRelativeTime = (dateString: string) => {
  try {
    const now = new Date();
    const past = new Date(dateString);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;

    const elapsed = now.getTime() - past.getTime();

    if (elapsed < msPerMinute) {
      return 'Just now';
    } else if (elapsed < msPerHour) {
      return `${Math.round(elapsed / msPerMinute)}m ago`;
    } else if (elapsed < msPerDay) {
      return `${Math.round(elapsed / msPerHour)}h ago`;
    } else {
      return `${Math.round(elapsed / msPerDay)}d ago`;
    }
  } catch (error) {
    return 'Just now';
  }
};

export default function FeedScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'tona' | 'following'>('tona');
  const [vents, setVents] = useState<Vent[]>([]);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  
  // Track expanded vent IDs for the "See More" feature
  const [expandedVents, setExpandedVents] = useState<Record<string, boolean>>({});
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  const isFetchingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const handleOpenTelegram = async () => {
    try {
      const supported = await Linking.canOpenURL(TELEGRAM_LINK);
      if (supported) {
        await Linking.openURL(TELEGRAM_LINK);
      } else {
        Alert.alert("Error", "Couldn't open Telegram link directly.");
      }
    } catch (error) {
      console.error("Failed to route to Telegram:", error);
    }
  };

  const checkGlobalAppStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success) {
        if (data.isMaintenance) {
          Alert.alert(
            "Under Maintenance",
            "Tona is currently getting upgraded. Please try again later!",
            [{ text: "Close App", onPress: () => BackHandler.exitApp() }],
            { cancelable: false }
          );
          return;
        }

        if (data.hasUpdate) {
          Alert.alert(
            "Update Available",
            "A new version of Tona is available! Please update to continue enjoying the app.",
            [
              { text: "Update Now", onPress: () => Linking.openURL('https://your-store-link.com') },
              { text: "Later", style: "cancel" }
            ]
          );
        }
      }
    } catch (error) {
      console.error("Critical error while handling startup app configurations:", error);
    }
  }, []);

  const fetchVents = useCallback(async (targetPage: number, clearCurrentData = false) => {
    if (isFetchingRef.current) return;
    if (targetPage > 1 && !hasMore) return;

    isFetchingRef.current = true;
    if (targetPage === 1 && !clearCurrentData) setIsLoading(true);
    if (targetPage > 1) setIsMoreLoading(true);

    try {
      const token = await authStorage.getToken();
      const LIMIT = 10;
      
      const response = await fetch(
        `${API_URL}/api/vents?page=${targetPage}&limit=${LIMIT}&tab=${activeTab}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
        }
      );

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

      const json = await response.json();
      const newVents: Vent[] = json.timeline || [];

      setVents(prev => clearCurrentData ? newVents : [...prev, ...newVents]);
      setHasMore(newVents.length === LIMIT);
      setPage(targetPage);
    } catch (error) {
      console.error("Error executing network payload for /api/vents:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsMoreLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeTab, hasMore]);

  const checkNotifications = useCallback(async () => {
    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const json = await response.json();
        setHasNotifications(json.count > 0);
      }
    } catch (error) {
      console.error("Failed fetching notification payload:", error);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'tona') return;
    
    const interval = setInterval(() => {
      if (vents.length > 0 && !isLoading && !isRefreshing && !hasNewPosts) {
         setHasNewPosts(true);
      }
    }, 15000); 

    return () => clearInterval(interval);
  }, [vents, isLoading, isRefreshing, activeTab, hasNewPosts]);

  useEffect(() => {
    checkGlobalAppStatus();

    if (activeTab === 'tona') {
      setHasMore(true);
      setPage(1);
      fetchVents(1, true);
    }
    checkNotifications();
  }, [activeTab, checkNotifications, checkGlobalAppStatus]);

  const handleRefresh = () => {
    if (activeTab === 'following') {
      setIsRefreshing(false);
      return;
    }
    setIsRefreshing(true);
    setHasNewPosts(false);
    setExpandedVents({}); // Reset expanded states on refresh
    checkGlobalAppStatus();
    fetchVents(1, true);
    checkNotifications();
  };

  const handleNewPostsTap = () => {
    setHasNewPosts(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    handleRefresh();
  };

  const handleLoadMore = () => {
    if (activeTab === 'tona' && hasMore && !isMoreLoading && !isLoading && !isRefreshing) {
      fetchVents(page + 1, false);
    }
  };

  const handleNavigateToVent = (vent: Vent) => {
    router.push({
       pathname: 'profile/[id]',
        params: { ventId: vent.id },
    });
  };

  const toggleExpandVent = (ventId: string) => {
    setExpandedVents(prev => ({
      ...prev,
      [ventId]: !prev[ventId]
    }));
  };

  const handleToggleFeel = async (ventId: string) => {
    let rollbackVent: Vent | null = null;

    setVents(prevVents =>
      prevVents.map(vent => {
        if (vent.id === ventId) {
          rollbackVent = { ...vent };
          const updatedHasFelt = !vent.hasFelt;
          return {
            ...vent,
            hasFelt: updatedHasFelt,
            feelsCount: updatedHasFelt ? vent.feelsCount + 1 : Math.max(0, vent.feelsCount - 1),
          };
        }
        return vent;
      })
    );

    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_URL}/api/vents/${ventId}/feel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) throw new Error();
      
      const json = await response.json();
      setVents(prevVents =>
        prevVents.map(vent =>
          vent.id === ventId
            ? { ...vent, feelsCount: json.feelsCount, hasFelt: json.hasFelt }
            : vent
        )
      );
    } catch (error) {
      console.error("Failed handling feel toggle interaction:", error);
      if (rollbackVent) {
        setVents(prevVents =>
          prevVents.map(vent => (vent.id === ventId ? rollbackVent! : vent))
        );
      }
    }
  };

  const handleNavigateToUser = (userId: string) => {
    router.push({
      pathname: `/user/[id]`,
      params: { userId }
    });
  };

  const renderItem = ({ item }: { item: Vent }) => {
    const MAX_LENGTH = 1100;
    const isLongText = item.content.length > MAX_LENGTH;
    const isExpanded = expandedVents[item.id];
    const seedName = encodeURIComponent(item.username || 'Anonymous');

    return (
      <View style={styles.glassCard}>
        <View style={styles.cardHeader}>
          <Pressable style={styles.authorMeta} onPress={() => handleNavigateToUser(item.userId)}>
            <View style={styles.avatarGlow}>
              <Image
                source={{ uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${seedName}` }}
                style={styles.avatarImage}
              />
            </View>
            <View>
              <Text style={styles.authorName}>{item.username || 'Anonymous'}</Text>
              <Text style={styles.authorHandle}>
                {item.location ? `📍 ${item.location}` : 'Nearby'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.headerRightBlock}>
            {item.isEdited && <Text style={styles.editedIndicatorText}>edited</Text>}
            <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
          </View>
        </View>
        
        <Pressable onPress={() => handleNavigateToVent(item)} style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}>
          <Text style={styles.cardBody}>
            {isLongText && !isExpanded ? (
              <>
                {item.content.substring(0, MAX_LENGTH)}... 
                <Text 
                  style={styles.seeMoreText} 
                  onPress={(e) => {
                    e.stopPropagation(); // Prevents navigating to details when clicking see more
                    toggleExpandVent(item.id);
                  }}
                >
                  {" "}See more
                </Text>
              </>
            ) : (
              item.content
            )}
          </Text>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagWrapperGrid}>
              {item.tags.map((tag, idx) => (
                <View key={`${item.id}-tag-${idx}`} style={styles.tagCapsule}>
                  <Text style={styles.tagLabelText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>
        
        <View style={styles.cardFooter}>
          <Pressable style={styles.actionButton} onPress={() => handleNavigateToVent(item)}>
            <View style={styles.iconCircle}>
              <Ionicons name="chatbubble-outline" size={15} color="#B8C1EC" />
            </View>
            <Text style={styles.actionText}>{item.commentCount ?? 0}</Text>
          </Pressable>
          
          <Pressable style={styles.actionButton} onPress={() => handleToggleFeel(item.id)}>
            <View style={[styles.iconCircle, item.hasFelt && styles.likedIconCircle]}>
              <Ionicons 
                name={item.hasFelt ? "heart" : "heart-outline"} 
                size={16} 
                color={item.hasFelt ? "#FF6B81" : "#B8C1EC"} 
              />
            </View>
            <Text style={[styles.actionText, item.hasFelt && styles.likedActionText]}>
              {item.feelsCount ?? 0}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerStrip}>
        <View style={styles.logoGroup}>
          <Text style={styles.headerTitle}>ቶና(TONA)</Text>
          <View style={styles.liveIndicator} />
        </View>
        <Pressable style={styles.headerIconButton} onPress={() => router.push('/notis')}>
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
          {hasNotifications && <View style={styles.notificationDotAlert} />}
        </Pressable>
      </View>

      <View style={styles.topTabsContainer}>
        <Pressable 
          style={[styles.topTabButton, activeTab === 'tona' && styles.activeTopTab]}
          onPress={() => setActiveTab('tona')}
        >
          <Text style={[styles.topTabText, activeTab === 'tona' && styles.activeTopTabText]}>ቶና</Text>
        </Pressable>

        <Pressable 
          style={[styles.topTabButton, activeTab === 'following' && styles.activeTopTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.topTabText, activeTab === 'following' && styles.activeTopTabText]}>Following</Text>
        </Pressable>
      </View>

      {/* Updated Community & Dev Banner */}
      <View style={styles.promoContainer}>
        <Pressable 
          style={({ pressed }) => [styles.telegramBanner, pressed && styles.telegramBannerPressed]}
          onPress={handleOpenTelegram}
        >
          <View style={styles.promoLeft}>
            <View style={styles.telegramIconCircle}>
              <Ionicons name="paper-plane" size={16} color="#FFF" />
            </View>
            <View>
              <Text style={styles.promoTitle}>Join Our Community</Text>
              <Text style={styles.promoSub}>Meet the dev on Telegram</Text>
            </View>
          </View>
          <View style={styles.promoRight}>
            <Text style={styles.promoHandle}>@cypher_me</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
          </View>
        </Pressable>
      </View>

      <View style={styles.listContainerZone}>
        {hasNewPosts && activeTab === 'tona' && (
          <Pressable 
            style={({ pressed }) => [styles.newPostsFloatingPill, pressed && styles.newPostsFloatingPillPressed]}
            onPress={handleNewPostsTap}
          >
            <Ionicons name="arrow-up" size={13} color="#FFF" />
            <Text style={styles.newPostsPillText}>New ቶና's
               Available</Text>
          </Pressable>
        )}

        {activeTab === 'following' ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={48} color="#6C5CE7" style={styles.comingSoonIcon} />
            <Text style={styles.comingSoonTitle}>Following Feed</Text>
            <Text style={styles.comingSoonSub}>Coming Soon! We're tuning this algorithm just for you.</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centerSpinner}>
            <ActivityIndicator size="large" color="#6C5CE7" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={vents}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={handleRefresh} 
                tintColor="#6C5CE7"
                colors={['#6C5CE7']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={44} color="rgba(255,255,255,0.15)" />
                <Text style={styles.emptyText}>No vents here yet.</Text>
              </View>
            }
            ListFooterComponent={
              isMoreLoading ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#6C5CE7" />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A071E', 
  },
  headerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFCC', 
    marginLeft: 6,
    marginTop: -10,
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
    position: 'relative',
  },
  notificationDotAlert: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30', 
    borderWidth: 1.5,
    borderColor: '#0A071E',
  },
  topTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  topTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTopTab: {
    borderColor: '#6C5CE7',
  },
  topTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.3,
  },
  activeTopTabText: {
    color: '#FFF',
    fontWeight: '700',
  },
  promoContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  telegramBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.08)', 
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.2)',
  },
  telegramBannerPressed: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  telegramIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0088cc', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  promoSub: {
    color: '#8A8F9F',
    fontSize: 11,
    marginTop: 1,
  },
  promoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promoHandle: {
    color: '#B3A9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainerZone: {
    flex: 1,
    position: 'relative',
  },
  newPostsFloatingPill: {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: [{ translateX: -70 }], 
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  newPostsFloatingPillPressed: {
    opacity: 0.85,
    backgroundColor: '#5b4cc4',
  },
  newPostsPillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  feedContent: {
    padding: 16,
    paddingBottom: 40, 
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGlow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6C5CE7',
    marginRight: 12,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden', 
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  authorName: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  authorHandle: {
    color: '#8A8F9F',
    fontSize: 12,
    marginTop: 2,
  },
  headerRightBlock: {
    alignItems: 'flex-end',
  },
  editedIndicatorText: {
    color: 'rgba(108, 92, 231, 0.8)',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeText: {
    color: '#63697B',
    fontSize: 12,
  },
  cardBody: {
    color: '#F5F6FA',
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 14,
    paddingLeft: 2,
  },
  seeMoreText: {
    color: '#6C5CE7',
    fontWeight: '700',
    fontSize: 14,
  },
  tagWrapperGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    paddingLeft: 2,
  },
  tagCapsule: {
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.15)',
  },
  tagLabelText: {
    color: '#B3A9FF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  likedIconCircle: {
    backgroundColor: 'rgba(255, 107, 129, 0.1)',
    borderColor: 'rgba(255, 107, 129, 0.2)',
  },
  actionText: {
    color: '#A5B2E6',
    fontSize: 13,
    marginLeft: 10,
    fontWeight: '600',
  },
  likedActionText: {
    color: '#FF6B81',
  },
  centerSpinner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 12,
    fontSize: 15,
  },
  comingSoonIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  comingSoonTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  comingSoonSub: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }, 
});