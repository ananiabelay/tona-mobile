import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authStorage } from '../../utils/auth';

interface Comment {
  id: string;
  user_id: string;
  username?: string; 
  avatarId: number;
  content: string;
  createdAt: string;
  parentId?: string | null;
  replies?: Comment[];
  likesCount: number;
  hasLiked?: boolean;
}

interface VentDetail {
  id: string;
  userId?: string; 
  username?: string; 
  user_id?: string;
  authorId?: string;     
  authorName?: string;   
  content: string;
  createdAt: string;
  commentCount: number;
  feelsCount: number;
  hasFelt: boolean;
  location?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getDisplayInitial = (username?: string): string => {
  if (!username || username === 'User' || username === 'Anonymous') return 'V';
  const clean = username.replace(/[^a-zA-Z0-9]/g, '');
  return clean ? clean.charAt(0).toUpperCase() : 'V';
};

export default function VentDetailScreen() {
  const { ventId } = useLocalSearchParams<{ ventId: string }>();
  const router = useRouter();

  const [vent, setVent] = useState<VentDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const isLikingRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  const fetchVentDetails = useCallback(async (showLoader = true) => {
    if (!ventId) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    
    if (showLoader) setIsLoading(true);
    try {
      const token = await authStorage.getToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      };

      const [ventResponse, commentsResponse] = await Promise.all([
        fetch(`${API_URL}/api/vents/${ventId}`, { method: 'GET', headers }),
        fetch(`${API_URL}/api/${ventId}/comments`, { method: 'GET', headers })
      ]);

      if (!ventResponse.ok) throw new Error(`Vent HTTP Error Status: ${ventResponse.status}`);
      if (!commentsResponse.ok) throw new Error(`Comments HTTP Error Status: ${commentsResponse.status}`);

      const ventJson = await ventResponse.json();
      const commentsJson = await commentsResponse.json();
      
      setVent(ventJson.vent || ventJson || null);
      setComments(commentsJson.comments || commentsJson || []);
      
    } catch (error) {
      console.error("Error executing single-vent dual network request:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [ventId]);

  useEffect(() => {
    fetchVentDetails(true);
  }, [ventId, fetchVentDetails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchVentDetails(false);
  };

  const toggleLike = async () => {
    if (!vent || !ventId || isLikingRef.current) return;
    isLikingRef.current = true;

    const previouslyFelt = vent.hasFelt;
    const previousCount = vent.feelsCount;

    setVent({
      ...vent,
      hasFelt: !previouslyFelt,
      feelsCount: previouslyFelt ? previousCount - 1 : previousCount + 1,
    });

    try {
      const token = await authStorage.getToken();
      const response = await fetch(`${API_URL}/api/vents/${ventId}/feel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) throw new Error('Failed to toggle like on server');
      
      const json = await response.json();
      if (json.feelsCount !== undefined && json.hasFelt !== undefined) {
        setVent(prev => prev ? { ...prev, feelsCount: json.feelsCount, hasFelt: json.hasFelt } : null);
      }
    } catch (error) {
      console.error("Like tracking failed, rolling back UI state:", error);
      setVent(prev => prev ? { ...prev, hasFelt: previouslyFelt, feelsCount: previousCount } : null);
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleOriginalInitiateReply = (comment: Comment) => {
    setReplyingToComment(comment);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const toggleRepliesVisibility = (commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const navigateToUserProfile = (userId?: string) => {
    if (!userId) return;
    router.push(`/user/${userId}`);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSending || !ventId) return;
    setIsSending(true);

    const targetUrl = `${API_URL}/api/${ventId}/comments`;

    try {
      const token = await authStorage.getToken();
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ 
          content: newComment.trim(),
          ...(replyingToComment ? { parentId: replyingToComment.id } : {})
        }),
      });

      if (!response.ok) throw new Error('Failed to submit comment node');
      const json = await response.json();
      
      const rawComment = json.comment || json;
      
      if (rawComment) {
        const savedComment: Comment = {
          ...rawComment,
          username: rawComment.username || 'me',
          replies: rawComment.replies || []
        };

        if (replyingToComment) {
          setComments(prevComments => 
            prevComments.map(c => {
              if (c.id === replyingToComment.id) {
                return { ...c, replies: [...(c.replies ?? []), savedComment] };
              }
              return c;
            })
          );
          setExpandedReplies(prev => ({ ...prev, [replyingToComment.id]: true }));
        } else {
          setComments(prev => [savedComment, ...prev]);
        }
      }
      
      if (vent) {
        setVent({ ...vent, commentCount: (vent.commentCount ?? 0) + 1 });
      }
      
      setNewComment('');
      setReplyingToComment(null);
    } catch (error) {
      console.error("Error committing comment payload:", error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerSpinnerContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (!vent) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.navBarStrip}>
          <Pressable style={styles.navBarIconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={styles.navBarTitleText}>Thread Error</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyCommentsCenterBlock}>
          <Ionicons name="alert-circle-outline" size={44} color="#FF6B81" />
          <Text style={[styles.emptyCommentsFallbackText, { color: '#FFF', marginTop: 12, fontWeight: '700', fontSize: 15 }]}>
            Thread Data Retrieval Failed
          </Text>
          <Pressable 
            style={[styles.inlineReplyActionButton, { marginTop: 24, paddingHorizontal: 16, paddingVertical: 8 }]} 
            onPress={() => fetchVentDetails(true)}
          >
            <Text style={styles.inlineReplyActionText}>Retry Loading Network</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const resolvedVentUsername = vent.authorName || vent.username || 'Anonymous';
  const resolvedVentUserId = vent.authorId || vent.userId || vent.user_id;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.navBarStrip}>
        <Pressable style={styles.navBarIconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={styles.navBarTitleText}>ቶና(TONA) Thread</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingViewContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentScrollTrack}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#6C5CE7" />
          }
          
          ListHeaderComponent={
            <View style={styles.heroSectionTrack}>
              <Pressable style={styles.premiumGlassCard} onPress={() => navigateToUserProfile(resolvedVentUserId)}>
                <View style={styles.cardHeader}>
                  <View style={styles.authorMeta}>
                    {/* Hero Vent Author Avatar */}
                    <View style={styles.avatarGlow}>
                      <Image
                        source={{
                          uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${resolvedVentUsername}`,
                        }}
                        style={styles.avatarImage}
                      />
                    </View>
                    <View>
                      <Text style={styles.authorNameText}>{resolvedVentUsername}</Text>
                    </View>
                  </View>
                  <Text style={styles.timeStampText}>{formatTime(vent.createdAt)}</Text>
                </View>
                
                <Text style={styles.cardBodyContentText}>{vent.content}</Text>
                
                <View style={styles.cardFooterMetricsBar}>
                  <View style={styles.metricItemBadge}>
                    <Ionicons name="chatbubble-outline" size={16} color="#B8C1EC" />
                    <Text style={styles.metricNumberText}>{vent.commentCount ?? 0}</Text>
                  </View>
                  
                  <Pressable 
                    style={[styles.metricItemBadge, vent.hasFelt && styles.likedBadgeActive]} 
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleLike();
                    }}
                  >
                    <Ionicons 
                      name={vent.hasFelt ? "heart" : "heart-outline"} 
                      size={16} 
                      color={vent.hasFelt ? "#FF6B81" : "#B8C1EC"} 
                    />
                    <Text style={[styles.metricNumberText, vent.hasFelt && styles.likedTextActive]}>
                      {vent.feelsCount ?? 0}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
              
              <Text style={styles.repliesSectionDividerTitle}>Comments</Text>
            </View>
          }

          renderItem={({ item }) => {
            const hasReplies = (item.replies ?? []).length > 0;
            const isRepliesVisible = !!expandedReplies[item.id];
            const resolvedCommentUsername = item.username || 'Anonymous'; 

            return (
              <View style={styles.commentBranchWrapper}>
                {/* Parent Comment Row */}
                <View style={styles.cleanCommentRow}>
                  <View style={styles.commentLeftLineTrack}>
                    <Pressable 
                      onPress={() => navigateToUserProfile(item.user_id)}
                    >
                      {/* Integrated Dicebear Avatar for Main Commenter */}
                      <View style={[styles.avatarGlow, { width: 32, height: 32, borderRadius: 16 }]}>
                        <Image
                          source={{
                            uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${resolvedCommentUsername}`,
                          }}
                          style={[styles.avatarImage, { borderRadius: 16 }]}
                        />
                      </View>
                    </Pressable>
                    <View style={[styles.verticalThreadLine, (!hasReplies || !isRepliesVisible) && { backgroundColor: 'transparent' }]} />
                  </View>

                  <View style={styles.commentMainContentBox}>
                    <View style={styles.commentHeaderTrack}>
                      <Pressable onPress={() => navigateToUserProfile(item.user_id)}>
                        <Text style={styles.commentAuthorNameText}>{resolvedCommentUsername}</Text>
                      </Pressable>
                      <Text style={styles.commentTimeText}>{formatTime(item.createdAt)}</Text>
                    </View>
                    
                    <Text style={styles.commentBodyText}>{item.content}</Text>
                    
                    <View style={styles.commentActionRow}>
                      <Pressable style={styles.inlineReplyActionButton} onPress={() => handleOriginalInitiateReply(item)}>
                        <Ionicons name="arrow-undo" size={12} color="#6C5CE7" />
                        <Text style={styles.inlineReplyActionText}>Reply</Text>
                      </Pressable>

                      {hasReplies && (
                        <Pressable 
                          style={[styles.inlineReplyActionButton, { backgroundColor: 'rgba(255,255,255,0.03)', marginLeft: 8 }]} 
                          onPress={() => toggleRepliesVisibility(item.id)}
                        >
                          <Ionicons 
                            name={isRepliesVisible ? "chevron-up" : "chevron-down"} 
                            size={12} 
                            color="#B8C1EC" 
                          />
                          <Text style={[styles.inlineReplyActionText, { color: '#B8C1EC' }]}>
                            {isRepliesVisible ? "Hide replies" : `See replies (${item.replies?.length})`}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>

                {/* Indented Sub-Replies Area */}
                {hasReplies && isRepliesVisible && (
                  <View style={styles.repliesIndentedContainer}>
                    <View style={styles.repliesLeftConnectorTrack} />
                    
                    <View style={styles.repliesListWrapper}>
                      {item.replies!.map((reply) => {
                        const resolvedReplyUsername = reply.username || 'Anonymous'; 
                        
                        return (
                          <View key={reply.id} style={styles.cleanNestedReplyRow}>
                            <Pressable 
                              onPress={() => navigateToUserProfile(reply.user_id)}
                            >
                              {/* Integrated Dicebear Avatar for Nested Repliers */}
                              <View style={[styles.avatarGlow, { width: 24, height: 24, borderRadius: 12, marginRight: 10, backgroundColor: '#4834d4' }]}>
                                <Image
                                  source={{
                                    uri: `https://api.dicebear.com/10.x/thumbs/png?seed=${resolvedReplyUsername}`,
                                  }}
                                  style={[styles.avatarImage, { borderRadius: 12 }]}
                                />
                              </View>
                            </Pressable>

                            <View style={styles.nestedReplyContentBox}>
                              <View style={styles.commentHeaderTrack}>
                                <Pressable onPress={() => navigateToUserProfile(reply.user_id)}>
                                  <Text style={styles.nestedAuthorNameText}>{resolvedReplyUsername}</Text>
                                </Pressable>
                                <Text style={styles.commentTimeText}>{formatTime(reply.createdAt)}</Text>
                              </View>
                              <Text style={styles.nestedBodyText}>{reply.content}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            );
          }}

          ListEmptyComponent={
            <View style={styles.emptyCommentsCenterBlock}>
              <Ionicons name="chatbubbles-outline" size={38} color="rgba(255,255,255,0.12)" />
              <Text style={styles.emptyCommentsFallbackText}>No comments written yet. Start the conversation.</Text>
            </View>
          }
        />

        <View style={styles.floatingInteractiveInputTray}>
          {replyingToComment && (
            <View style={styles.replyingToIndicatorBar}>
              <Text style={styles.replyingToIndicatorText} numberOfLines={1}>
                Replying to {replyingToComment.username || 'Anonymous'}...
              </Text>
              <Pressable onPress={() => setReplyingToComment(null)} style={styles.cancelReplyActionButton}>
                <Ionicons name="close-circle" size={16} color="#FF6B81" />
              </Pressable>
            </View>
          )}
          <View style={styles.inputInnerGlassBoundaryBox}>
            <TextInput
              ref={inputRef}
              style={styles.textInputBarElement}
              placeholder={replyingToComment ? `Write a reply to ${replyingToComment.username || 'Anonymous'}...` : "Write a comment..."}
              placeholderTextColor="rgba(255, 255, 255, 0.3)"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={300}
            />
            <Pressable 
              style={[styles.sendActionIconButton, !newComment.trim() && styles.sendButtonDisabledState]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFF" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090514',
  },
  keyboardAvoidingViewContainer: {
    flex: 1,
  },
  centerSpinnerContainer: {
    flex: 1,
    backgroundColor: '#090514',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  navBarIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navBarTitleText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  listContentScrollTrack: {
    paddingBottom: 24,
  },
  heroSectionTrack: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  premiumGlassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#6C5CE7',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* Added specific glow container style to handle neon/glow borders */
  avatarGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#6C5CE7',
    shadowRadius: 8,
    shadowOpacity: 0.4,
    overflow: 'hidden', // Ensures avatar image follows borders
  },
  /* Added targeted inner image style */
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    resizeMode: 'cover',
  },
  authorNameText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  timeStampText: {
    color: '#70788F',
    fontSize: 12,
  },
  cardBodyContentText: {
    color: '#F5F6FA',
    fontSize: 17,
    lineHeight: 27,
    marginBottom: 20,
    letterSpacing: 0.1,
  },
  cardFooterMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 14,
    gap: 12,
  },
  metricItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  likedBadgeActive: {
    backgroundColor: 'rgba(255, 107, 129, 0.1)',
    borderColor: 'rgba(255, 107, 129, 0.2)',
  },
  metricNumberText: {
    color: '#B8C1EC',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 13,
  },
  likedTextActive: {
    color: '#FF6B81',
  },
  repliesSectionDividerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 16,
    paddingLeft: 4,
    letterSpacing: 0.2,
  },
  commentBranchWrapper: {
    marginBottom: 12,
  },
  cleanCommentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  commentLeftLineTrack: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  verticalThreadLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 6,
    borderRadius: 1,
  },
  commentMainContentBox: {
    flex: 1,
    paddingBottom: 6,
  },
  commentHeaderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthorNameText: {
    color: '#6C5CE7',
    fontSize: 13,
    fontWeight: '700',
  },
  commentTimeText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 11,
  },
  commentBodyText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  commentActionRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  inlineReplyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(108, 92, 231, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inlineReplyActionText: {
    color: '#9D93EF',
    fontSize: 11,
    fontWeight: '600',
  },
  repliesIndentedContainer: {
    flexDirection: 'row',
    paddingLeft: 16,
  },
  repliesLeftConnectorTrack: {
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginLeft: 15, 
    marginRight: 15,
  },
  repliesListWrapper: {
    flex: 1,
    paddingRight: 16,
  },
  cleanNestedReplyRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  nestedReplyContentBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  nestedAuthorNameText: {
    color: '#9D93EF',
    fontSize: 12,
    fontWeight: '700',
  },
  nestedBodyText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCommentsCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyCommentsFallbackText: {
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  floatingInteractiveInputTray: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 12 : 16,
    backgroundColor: '#090514',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  replyingToIndicatorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.15)',
  },
  replyingToIndicatorText: {
    color: '#B8C1EC',
    fontSize: 12,
    flex: 1,
  },
  cancelReplyActionButton: {
    paddingLeft: 8,
  },
  inputInnerGlassBoundaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  textInputBarElement: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    maxHeight: 80,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sendActionIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C5CE7',
    shadowRadius: 4,
    shadowOpacity: 0.3,
  },
  sendButtonDisabledState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    shadowOpacity: 0,
  },
});