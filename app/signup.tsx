// app/signup.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { authStorage } from '../utils/auth';

const ADJECTIVES = ['anon', 'viber', 'matrix', 'shadow', 'cyber', 'ghost', 'echo', 'crypto', 'prime', 'nodal'];
const NOUNS = ['hunter', 'weaver', 'rider', 'runner', 'walker', 'ghost', 'beacon', 'spark', 'vector', 'pixel'];

export default function SignupScreen() {
  const router = useRouter();
  
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom Toast States
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const toastY = useSharedValue(-150); // Hidden off-screen by default

  // Auto-generate identity on mount
  useEffect(() => {
    const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    setUsername(`${randomAdj}_${randomNoun}_${randomNumber}`);
  }, []);

  // Premium Custom Notification Trigger
  const triggerNotification = (message: string, type: 'success' | 'error', callback?: () => void) => {
    setToastMessage(message);
    setToastType(type);
    
    // Smooth entry sequence, hold for 2.5 seconds, then slip back up
    toastY.value = withSequence(
      withTiming(50, { duration: 350 }), 
      withDelay(2500, withTiming(-150, { duration: 300 }, (finished) => {
        if (finished && callback) {
          callback();
        }
      }))
    );
  };

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    backgroundColor: toastType === 'success' ? '#00CEC9' : '#FF7675'
  }));

  const handleSignup = async () => {
    if (!username.trim() || !password) {
      triggerNotification('Username and password are required!', 'error');
      return;
    }

    setLoading(true);

    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
      
      const response = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password,
          ...(email.trim() && { email: email.trim().toLowerCase() }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong during signup.');
      }

      if (data.token) {
        await authStorage.saveToken(data.token);
      }

      // Smoothly alert success, then navigate once the notification slides out
      triggerNotification('Account verification complete! 🎉', 'success', () => {
        router.replace('/(tabs)');
      });

    } catch (error: any) {
      triggerNotification(error.message || 'Could not reach backend infrastructure.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🔮 PREMIUM ACCENTED SLIDE NOTIFICATION TOAST */}
      <Animated.View style={[styles.toastContainer, animatedToastStyle]}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.innerContainer}>
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Tona. We've set up a burner identity for you, feel free to edit it.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <TextInput 
              style={styles.input}
              placeholder="yourname@domain.com"
              placeholderTextColor="#A0AEC0"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#A0AEC0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0F0C20" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </Pressable>

            <Pressable style={styles.loginLink} onPress={() => router.push('/login')}>
              <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C20',
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    color: '#0F0C20',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  headerBlock: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#A0AEC0',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  optionalBadge: {
    color: '#6C5CE7',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1A103C',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2D1F5C',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0F0C20',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#6C5CE7',
    fontSize: 14,
    fontWeight: '600',
  },
});