// app/login.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { authStorage } from '../utils/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Notification Toast States
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const toastY = useSharedValue(-150);

  const triggerNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    toastY.value = withSequence(
      withTiming(50, { duration: 350 }),
      withDelay(2000, withTiming(-150, { duration: 300 }))
    );
  };

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    backgroundColor: toastType === 'success' ? '#00CEC9' : '#FF7675'
  }));

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      triggerNotification('Please provide your identity handles.', 'error');
      return;
    }

    setLoading(true);

    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password,
        }),
      });

      const contentType = response.headers.get('content-type');
      let data: any = {};

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Endpoint connection failure.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Invalid keys or credentials.');
      }

      if (data.token) {
        await authStorage.saveToken(data.token);
      }

      triggerNotification('Access granted. Welcome back 🚀', 'success');
      
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);

    } catch (error: any) {
      triggerNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.toastContainer, animatedToastStyle]}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Provide your secret access keys to enter the network.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Burner Handle</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="username"
              placeholderTextColor="#A0AEC0"
            />

            <Text style={styles.label}>Access Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#0F0C20" /> : <Text style={styles.buttonText}>Authorize Session</Text>}
            </Pressable>

            <Pressable style={styles.switchButton} onPress={() => router.replace('/signup')}>
              <Text style={styles.switchText}>Need a clean profile? <Text style={styles.highlightText}>Create Identity</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0C20' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  toastContainer: { position: 'absolute', top: 0, left: 20, right: 20, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, zIndex: 999 },
  toastText: { color: '#0F0C20', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  headerBlock: { marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#A0AEC0', lineHeight: 22 },
  form: { width: '100%' },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1A103C', color: '#FFFFFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, borderWidth: 1, borderColor: '#2D1F5C' },
  button: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0F0C20', fontSize: 16, fontWeight: '700' },
  switchButton: { marginTop: 24, alignItems: 'center' },
  switchText: { color: '#A0AEC0', fontSize: 14 },
  highlightText: { color: '#6C5CE7', fontWeight: '700' }
});