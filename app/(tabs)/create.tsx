import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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

const AVAILABLE_TAGS = [
  { id: 'general', label: 'General', icon: 'chatbubbles-outline' },
  { id: 'relationships', label: 'Relationships', icon: 'heart-outline' },
  { id: 'family', label: 'Family', icon: 'home-outline' },
  { id: 'health', label: 'Health', icon: 'medkit-outline' }, 
  { id: 'career', label: 'Career', icon: 'briefcase-outline' }, 
  { id: 'finance', label: 'Finance', icon: 'cash-outline' }, 
  { id: 'education', label: 'Education', icon: 'school-outline' },
  { id: 'technology', label: 'Technology', icon: 'hardware-chip-outline' },
  { id: 'religion', label: 'Religion', icon: 'book-outline' }, 
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline' }, 
  { id: 'sports', label: 'Sports', icon: 'football-outline' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'sunny-outline' }, 
  { id: 'news', label: 'News & Politics', icon: 'newspaper-outline' },
  { id: 'advice', label: 'Advice', icon: 'help-circle-outline' },
  { id: 'confessions', label: 'Confessions', icon: 'lock-closed-outline' },
];

const MAX_CHARS = 3000;

export default function CreateVentScreen() {
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Beautiful Alert Modal State ---
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'warning'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    setModalConfig({ visible: true, title, message, type });
  };

  const handlePublishVent = async () => {
    if (!content.trim()) {
      showAlert("Empty Canvas", "Speak your mind before attempting to submit a tona stream.", "warning");
      return;
    }
    if (!selectedTag) {
      showAlert("Tag Required", "Please select a matching context category for your post.", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await authStorage.getToken();

      if (!token) {
        showAlert("Session Expired", "Please log in again.", "error");
        return;
      }

      const activeTagObj = AVAILABLE_TAGS.find(tag => tag.id === selectedTag);
      const tagLabel = activeTagObj ? activeTagObj.id : selectedTag;

      const payload = {
        content: content.trim(),
        tags: [tagLabel] 
      };

      console.log(payload);

      const response = await fetch(`${API_BASE_URL}/api/vents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok || resData.success) {
        showAlert("Very Nice!", "Sent for review.", "success");
        setContent('');
        setSelectedTag(null);
      } else {
        showAlert("Pipeline Failure", resData.message || "Failed to commit node parameters to api database.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network Exception", "Could not link to backend processing infrastructure.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getModalIconConfig = () => {
    switch (modalConfig.type) {
      case 'success':
        return { name: 'checkmark-circle-outline' as const, color: '#10B981' };
      case 'error':
        return { name: 'alert-circle-outline' as const, color: '#EF4444' };
      default:
        return { name: 'warning-outline' as const, color: '#F59E0B' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Segment - Upgraded to modern left-aligned spacing */}
          <View style={styles.headerBar}>
            <Text style={styles.headerTitle}>Cast Your Tona</Text>
          </View>

          {/* Textarea Entry Shell */}
          <View style={styles.inputWrapperFrame}>
            <TextInput
              style={styles.textAreaField}
              value={content}
              onChangeText={(val) => val.length <= MAX_CHARS && setContent(val)}
              placeholder="What's weighing on your mind? Cast it into anonymity anonymously..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={MAX_CHARS}
            />
            
            <View style={styles.inputFooterRow}>
              <Text style={styles.warningHintText}>Be respectful of others</Text>
              <Text style={[
                styles.charCounterText, 
                content.length >= MAX_CHARS - 20 && { color: '#EF4444' }
              ]}>
                {content.length}/{MAX_CHARS}
              </Text>
            </View>
          </View>

          {/* Horizontal Tag Drawer Context */}
          <Text style={styles.sectionLabel}>Context Blueprint Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tagsHorizontalScroller}
            contentContainerStyle={styles.tagsScrollPadding}
          >
            {AVAILABLE_TAGS.map((tag) => {
              const isSelected = selectedTag === tag.id;
              return (
                <TouchableOpacity
                  key={tag.id}
                  activeOpacity={0.8}
                  style={[styles.tagBadgePill, isSelected && styles.tagBadgePillActive]}
                  onPress={() => setSelectedTag(tag.id)}
                >
                  <Ionicons 
                    name={tag.icon as any} 
                    size={15} 
                    color={isSelected ? '#FFFFFF' : '#818CF8'} 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.tagLabelText, isSelected && styles.tagLabelTextActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Submit Trigger */}
          <TouchableOpacity 
            style={[styles.publishActionButton, !content.trim() || !selectedTag ? styles.publishActionDisabled : {}]} 
            onPress={handlePublishVent}
            disabled={isSubmitting || !content.trim() || !selectedTag}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.publishActionText}>Send  ቶና</Text>
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- Beautiful Custom Modern Alert Modal --- */}
      <Modal
        visible={modalConfig.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalIconContainer}>
              <Ionicons 
                name={getModalIconConfig().name} 
                size={44} 
                color={getModalIconConfig().color} 
              />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            
            <TouchableOpacity 
              activeOpacity={0.8}
              style={styles.modalButton} 
              onPress={() => setModalConfig(prev => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalButtonText}>Acknowledge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A071E',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 130, // Clears the layout for your custom scrolling floating bottom tab bar
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Left align matches modern app standard dashboards
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28, // Matches the high end font size of the Explore Screen
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.3,
  },
  inputWrapperFrame: {
    backgroundColor: '#130F35',
    borderRadius: 24, // Smoother rounded corner values
    padding: 18,
    borderWidth: 1,
    borderColor: '#221A52',
    marginBottom: 28,
  },
  textAreaField: {
    minHeight: 180,
    color: '#F8FAFC',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  inputFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 26, 82, 0.6)', // Clean transparent border blend
    paddingTop: 14,
    marginTop: 14,
  },
  warningHintText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  charCounterText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tagsHorizontalScroller: {
    flexGrow: 0,
    marginBottom: 36,
    marginHorizontal: -20, 
  },
  tagsScrollPadding: {
    paddingHorizontal: 20,
    paddingBottom: 4, // Prevents custom shadows clips if expanded later
  },
  tagBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14, // Matches layout language
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  tagBadgePillActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  tagLabelText: {
    fontSize: 13,
    color: '#A5B4FC',
    fontWeight: '600',
  },
  tagLabelTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  publishActionButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 4,
  },
  publishActionDisabled: {
    backgroundColor: '#1E1B4B',
    borderColor: '#221A52',
    borderWidth: 1,
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  publishActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  /* --- Modern Modal Styles --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 15, 0.8)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentCard: {
    backgroundColor: '#130F35',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    maxWidth: 340, // Standardizes modal layouts gracefully on wide screens
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#221A52',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  modalMessage: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
    paddingHorizontal: 4,
  },
  modalButton: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#312E81',
    borderRadius: 16,
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});