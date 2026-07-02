import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStorage } from '../utils/auth'; // Imported to fetch your JWT token cleanly

interface NotificationItem {
  id: string;
  type: 'feel' | 'comment';
  entityType: 'vent' | 'comment';
  entityId: string; 
  isRead: boolean;
  createdAt: string;
  senderLocation: string | null;
  senderAvatarId: number | string | null; // Supports number based on your payload sample
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.12:5000';

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Optimistically mark as read on the UI layer instantly
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    // 2. Fire the network request asynchronously in the background
    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_URL}/api/notifications/${item.id}/read`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '' 
        }
      });
      console.log(response)
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    // 3. Navigate away immediately using both required segment variables
    router.push({
      pathname: 'profile/[id]',
      params: { 
        id: item.senderAvatarId?.toString() || 'user', 
        ventId: item.entityId 
      },
    });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const timeAgo = new Date(item.createdAt).toLocaleDateString();
    const actionText = item.type === 'feel' ? 'shared a like on your TONA' : 'commented on your TONA';
    const seedName = encodeURIComponent(item.senderAvatarId?.toString() || 'Anonymous');

    return (
      <TouchableOpacity 
        style={[styles.glassCard, !item.isRead && styles.unreadRow]} 
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarGlow}>
          <Image
            source={{
              uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${seedName}`,
            }}
            style={styles.avatarImage}
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.bodyText}>
            <Text style={styles.boldText}>Someone</Text> from{' '}
            <Text style={styles.locationText}>{item.senderLocation || 'Nearby'}</Text>{' '}
            {actionText}.
          </Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerStrip}>
        <Pressable 
          style={styles.headerIconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Alerts</Text>
        <View style={{ width: 44 }} />
      </View>
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor="#6C5CE7"
            colors={['#6C5CE7']}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
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
  feedContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  unreadRow: {
    backgroundColor: 'rgba(108, 92, 231, 0.06)',
    borderColor: 'rgba(108, 92, 231, 0.2)',
  },
  avatarGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
  },
  bodyText: {
    fontSize: 15,
    color: '#F5F6FA',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFF',
  },
  locationText: {
    fontWeight: '600',
    color: '#B3A9FF',
  },
  timeText: {
    fontSize: 12,
    color: '#63697B',
    marginTop: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B81',
    marginLeft: 8,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 15,
    marginTop: 40,
  },
});