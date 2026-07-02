import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { authStorage } from '../../utils/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Adama',
  'Awasa',
  'Bahir Dar',
  'Dire Dawa',
  'Gondar',
  'Mekelle',
  'Jimma',
  'Dessie',
  'Bishoftu',
  'Sodo'
];

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  
  const [user, setUser] = useState<{
    username: string;
    location: string;
    bio: string;
    avatarId: number;
  } | null>(null);

  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({
    username: false,
    location: false,
    bio: false,
  });
  const [pendingValues, setPendingValues] = useState({
    username: '',
    location: '',
    bio: '',
  });

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  
  // Tab State for the new feed sections
  const [activeTab, setActiveTab] = useState<'my' | 'liked'>('my');

  // New States for your Tonas data
  const [myTonas, setMyTonas] = useState<any[]>([]);
  const [loadingTonas, setLoadingTonas] = useState(false);
  
  // States for Liked Tonas
  const [likedTonas, setLikedTonas] = useState<any[]>([]);
  const [loadingLikedTonas, setLoadingLikedTonas] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  // Fetch data depending on active tab selection
  useEffect(() => {
    if (activeTab === 'my') {
      loadMyTonas();
    } else if (activeTab === 'liked') {
      loadLikedTonas();
    }
  }, [activeTab]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const token = await authStorage.getToken();
      
      if (!token) {
        Alert.alert("Session Expired", "Please log in again.");
        navigation.replace('Login');
        return;
      }

      const profileRes = await fetch(`${API_BASE_URL}/api/user/mine`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const profileData = await profileRes.json();

      if (profileData.success) {
        const profileObj = profileData.user || profileData.debugData?.userObjectFromMiddleware;
        const initialProfile = {
          username: profileObj?.username || 'johndoe',
          location: profileObj?.area || 'Addis Ababa',
          bio: profileObj?.bio || 'No status update bio written yet.',
          avatarId: profileObj?.avatarId || 1
        };
        setUser(initialProfile);
        setPendingValues({
          username: initialProfile.username,
          location: initialProfile.location,
          bio: initialProfile.bio,
        });
      }
    } catch (error) {
      console.error("Profile Dashboard Pipeline Error:", error);
      Alert.alert("Network Failure", "Could not synchronize with profile services.");
    } finally {
      setLoading(false);
    }
  };

  const loadMyTonas = async () => {
    try {
      setLoadingTonas(true);
      const token = await authStorage.getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/vents/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setMyTonas(data.vents || []);
      }
    } catch (error) {
      console.error("Error fetching my tonas:", error);
    } finally {
      setLoadingTonas(false);
    }
  };

  const loadLikedTonas = async () => {
    try {
      setLoadingLikedTonas(true);
      const token = await authStorage.getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/vents/liked`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      const data = await response.json();

      // Maps data safely whether it falls back inside 'timeline' array or directly root 'vents'
      if (response.ok || data.success) {
        setLikedTonas(data.timeline || data.vents || []);
      }
    } catch (error) {
      console.error("Error fetching liked tonas:", error);
    } finally {
      setLoadingLikedTonas(false);
    }
  };

  const handleSaveField = async (fieldKey: 'username' | 'location' | 'bio') => {
    try {
      setSavingField(fieldKey);
      const token = await authStorage.getToken();
      const updatedValue = pendingValues[fieldKey];

      const payloadKey = fieldKey === 'location' ? 'location' : fieldKey;

      const response = await fetch(`${API_BASE_URL}/api/user/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [payloadKey]: updatedValue })
      });

      const resData = await response.json();

      if (response.ok || resData.success) {
        setUser(prev => prev ? { ...prev, [fieldKey]: updatedValue } : null);
        setEditMode(prev => ({ ...prev, [fieldKey]: false }));
        if (fieldKey === 'location') setShowCityDropdown(false);
      } else {
        Alert.alert("Update Failed", resData.message || "Could not commit profile changes data.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Network Error", "Failed connection to server updates update framework.");
    } finally {
      setSavingField(null);
    }
  };

  const startEditing = (fieldKey: 'username' | 'location' | 'bio') => {
    if (!user) return;
    setPendingValues(prev => ({ ...prev, [fieldKey]: user[fieldKey] }));
    setEditMode(prev => ({ ...prev, [fieldKey]: true }));
    if (fieldKey === 'location') {
      setShowCityDropdown(true);
    }
  };

  const cancelEditing = (fieldKey: 'username' | 'location' | 'bio') => {
    setEditMode(prev => ({ ...prev, [fieldKey]: false }));
    if (fieldKey === 'location') setShowCityDropdown(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to exit your active application session?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('userToken');
              navigation.replace('Login');
            } catch (err) {
              Alert.alert("Error", "Failed to clear authentication tokens securely.");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Determine current active rendering variables based on tab selection
  const currentLoading = activeTab === 'my' ? loadingTonas : loadingLikedTonas;
  const currentFeedData = activeTab === 'my' ? myTonas : likedTonas;

  // Safe encoding handler for Dicebear profile URI generation
  const seedName = encodeURIComponent(user?.username || 'Anania');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Header Title Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Identity</Text>
          <TouchableOpacity style={styles.logoutIconButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Hero Identity Avatar Presentation */}
        <View style={styles.profileHero}>
          <View style={styles.avatarGlowOuter}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${seedName}` }} 
                style={styles.avatarImage} 
              />
            </View>
          </View>
          <Text style={styles.heroUserTag}>@{user?.username}</Text>
          <View style={styles.heroLocationBadge}>
            <Ionicons name="location-sharp" size={12} color="#818CF8" style={{ marginRight: 4 }} />
            <Text style={styles.heroLocationText}>{user?.location}</Text>
          </View>
        </View>

        {/* Interactive Identity Management List */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Account Profiles</Text>
          
          {/* Username Field Row */}
          <View style={styles.detailCard}>
            <View style={styles.detailLeftContent}>
              <Text style={styles.detailLabel}>Handle Name</Text>
              {editMode.username ? (
                <TextInput
                  style={styles.textInputInline}
                  value={pendingValues.username}
                  onChangeText={(val) => setPendingValues(prev => ({ ...prev, username: val }))}
                  autoFocus
                  autoCapitalize="none"
                  placeholderTextColor="#475569"
                />
              ) : (
                <Text style={styles.detailValueText}>@{user?.username}</Text>
              )}
            </View>
            
            <View style={styles.actionButtonContainer}>
              {editMode.username ? (
                <View style={styles.editActionsRow}>
                  <TouchableOpacity onPress={() => cancelEditing('username')} style={styles.actionIconBtnClose}>
                    <Ionicons name="close" size={18} color="#F1F5F9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSaveField('username')} disabled={savingField === 'username'} style={styles.actionIconBtnCheck}>
                    {savingField === 'username' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pencilCircleIcon} onPress={() => startEditing('username')}>
                  <Ionicons name="pencil" size={12} color="#818CF8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Location Field Row */}
          <View style={styles.detailCard}>
            <View style={styles.detailLeftContent}>
              <Text style={styles.detailLabel}>Current Coordinates</Text>
              {editMode.location ? (
                <View style={styles.dropdownActiveContainer}>
                  <Text style={styles.selectedCityPreviewText}>Selected: {pendingValues.location}</Text>
                  {showCityDropdown && (
                    <View style={styles.citiesListContainer}>
                      {ETHIOPIAN_CITIES.map((city) => (
                        <TouchableOpacity 
                          key={city} 
                          style={[
                            styles.cityOptionRow,
                            pendingValues.location === city && styles.activeCityRowSelection
                          ]}
                          onPress={() => setPendingValues(prev => ({ ...prev, location: city }))}
                        >
                          <Text style={[
                            styles.cityOptionText,
                            pendingValues.location === city && styles.activeCityTextSelection
                          ]}>
                            {city}
                          </Text>
                          {pendingValues.location === city && (
                            <Ionicons name="checkmark" size={14} color="#6366F1" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.locationContainerRow}>
                  <Text style={styles.detailValueText}>{user?.location}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.actionButtonContainer}>
              {editMode.location ? (
                <View style={styles.editActionsRow}>
                  <TouchableOpacity onPress={() => cancelEditing('location')} style={styles.actionIconBtnClose}>
                    <Ionicons name="close" size={18} color="#F1F5F9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSaveField('location')} disabled={savingField === 'location'} style={styles.actionIconBtnCheck}>
                    {savingField === 'location' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pencilCircleIcon} onPress={() => startEditing('location')}>
                  <Ionicons name="pencil" size={12} color="#818CF8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bio Field Row */}
          <View style={styles.detailCard}>
            <View style={styles.detailLeftContent}>
              <Text style={styles.detailLabel}>Personal Bio Biography</Text>
              {editMode.bio ? (
                <TextInput
                  style={[styles.textInputInline, styles.textAreaInline]}
                  value={pendingValues.bio}
                  onChangeText={(val) => setPendingValues(prev => ({ ...prev, bio: val }))}
                  multiline
                  numberOfLines={3}
                  autoFocus
                  placeholderTextColor="#475569"
                />
              ) : (
                <Text style={styles.detailValueText} numberOfLines={3}>{user?.bio}</Text>
              )}
            </View>
            
            <View style={styles.actionButtonContainer}>
              {editMode.bio ? (
                <View style={styles.editActionsRow}>
                  <TouchableOpacity onPress={() => cancelEditing('bio')} style={styles.actionIconBtnClose}>
                    <Ionicons name="close" size={18} color="#F1F5F9" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleSaveField('bio')} disabled={savingField === 'bio'} style={styles.actionIconBtnCheck}>
                    {savingField === 'bio' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pencilCircleIcon} onPress={() => startEditing('bio')}>
                  <Ionicons name="pencil" size={12} color="#818CF8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Dynamic Navigation Tabs Segment Component */}
        <View style={styles.tabComponentWrapper}>
          <View style={styles.tabsContainerHeaderRow}>
            <TouchableOpacity 
              style={[styles.tabButtonElement, activeTab === 'my' && styles.tabButtonElementActive]}
              onPress={() => setActiveTab('my')}
            >
              <Ionicons 
                name="layers-outline" 
                size={16} 
                color={activeTab === 'my' ? '#6366F1' : '#64748B'} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.tabButtonTitleText, activeTab === 'my' && styles.tabButtonTitleTextActive]}>
                MY TONAS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButtonElement, activeTab === 'liked' && styles.tabButtonElementActive]}
              onPress={() => setActiveTab('liked')}
            >
              <Ionicons 
                name="heart-outline" 
                size={16} 
                color={activeTab === 'liked' ? '#EC4899' : '#64748B'} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.tabButtonTitleText, activeTab === 'liked' && styles.tabButtonTitleTextActive]}>
                LIKED TONAS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic List Feed Shell Container */}
          <View style={styles.tabContentPresenterContainer}>
            {currentLoading ? (
              <ActivityIndicator size="small" color="#6366F1" style={{ paddingVertical: 20 }} />
            ) : currentFeedData.length > 0 ? (
              currentFeedData.map((vent: any, index: number) => (
                <View key={vent._id || vent.id || index} style={styles.ventItemContainer}>
                  
                  {/* Card Header decoration */}
                  <View style={styles.ventHeaderRow}>
                    <View style={styles.ventLeftHeader}>
                      <Ionicons 
                        name={activeTab === 'my' ? "megaphone-sharp" : "heart-sharp"} 
                        size={14} 
                        color={activeTab === 'my' ? "#818CF8" : "#EC4899"} 
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.ventAuthorText}>
                        {activeTab === 'my' ? 'You published' : 'Liked post'}
                      </Text>
                    </View>
                    <Text style={styles.ventTimeText}>Just now</Text>
                  </View>

                  {/* Main Content Body */}
                  <Text style={styles.ventItemText}>
                    {vent.content || vent.title || vent.text || "Untitled Tona thread"}
                  </Text>
                  
                  {/* Footer for dynamic metrics depth */}
                  <View style={styles.ventFooterRow}>
                    <View style={styles.ventStatBadge}>
                      <Ionicons name="chatbubble-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.ventStatText}>{vent.commentsCount || 0}</Text>
                    </View>
                    <View style={styles.ventStatBadge}>
                      <Ionicons name="heart-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.ventStatText}>{vent.likesCount || 0}</Text>
                    </View>
                  </View>

                </View>
              ))
            ) : (
              <View style={styles.emptyStateCentering}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons 
                    name={activeTab === 'my' ? "chatbubbles-outline" : "heart-dislike-outline"} 
                    size={28} 
                    color={activeTab === 'my' ? "#6366F1" : "#EC4899"} 
                  />
                </View>
                <Text style={styles.emptyFeedPlaceholderText}>
                  {activeTab === 'my' ? 'Your published threads will line up here.' : 'Threads you like will be pinned here.'}
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A071E', 
    paddingTop: Platform.OS === 'android' ? 44 : 0,
  },
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#0A071E'
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 80,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  logoutIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#31102F',
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: '#130F35',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
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
    borderColor: '#4338CA',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroUserTag: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  heroLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  heroLocationText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '600',
  },
  detailsSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  detailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#130F35',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#221A52',
  },
  detailLeftContent: {
    flex: 1,
    paddingRight: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValueText: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '500',
    lineHeight: 22,
  },
  textInputInline: {
    backgroundColor: '#0A071E',
    borderColor: '#4338CA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 15,
    marginTop: 4,
  },
  textAreaInline: {
    textAlignVertical: 'top',
    minHeight: 70,
  },
  dropdownActiveContainer: {
    marginTop: 4,
  },
  selectedCityPreviewText: {
    color: '#818CF8',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  citiesListContainer: {
    backgroundColor: '#0A071E',
    borderColor: '#221A52',
    borderWidth: 1,
    borderRadius: 10,
    maxHeight: 180,
  },
  cityOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#130F35',
  },
  activeCityRowSelection: {
    backgroundColor: '#130F35',
  },
  cityOptionText: {
    color: '#64748B',
    fontSize: 14,
  },
  activeCityTextSelection: {
    color: '#6366F1',
    fontWeight: '700',
  },
  locationContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonContainer: {
    alignSelf: 'center',
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtnClose: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  actionIconBtnCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pencilCircleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1B4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#312E81',
  },
  tabComponentWrapper: {
    marginTop: 8,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
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
  tabContentPresenterContainer: {
    width: '100%',
  },
  emptyStateCentering: {
    backgroundColor: '#130F35',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#221A52',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0A071E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#221A52',
  },
  emptyFeedPlaceholderText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  ventItemContainer: {
    width: '100%',
    backgroundColor: '#130F35',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#221A52',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  ventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ventLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ventAuthorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  ventTimeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  ventItemText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 14,
  },
  ventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#0A071E',
    paddingTop: 10,
  },
  ventStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
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
});