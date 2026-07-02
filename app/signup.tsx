// app/signup.tsx
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { authStorage } from '../utils/auth';

const ADJECTIVES = ['anon', 'viber', 'matrix', 'shadow', 'cyber', 'ghost', 'echo', 'crypto', 'prime', 'nodal'];
const NOUNS = ['hunter', 'weaver', 'rider', 'runner', 'walker', 'ghost', 'beacon', 'spark', 'vector', 'pixel'];

const ETHIOPIAN_CITIES = [
  'Addis Ababa', 'Adama', 'Gondar', 'Mekele', 'Hawassa', 
  'Bahir Dar', 'Dire Dawa', 'Dessie', 'Jimma', 'Jijiga', 
  'Shashamane', 'Bishoftu'
];

const BIOS = [
  "Just tracking local waves.",
  "Anonymously observing.",
  "Here for the nested raw feeds.",
  "Vibing on the dark side of the network."
];

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Payload Registration States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [area, setArea] = useState('Addis Ababa'); 
  const [avatarId, setAvatarId] = useState(1);
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);

  // Custom Toast States
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');
  const toastY = useSharedValue(-150);

  useEffect(() => {
    const randomAdj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    
    setUsername(`${randomAdj}_${randomNoun}_${randomNumber}`);
    setBio(BIOS[Math.floor(Math.random() * BIOS.length)]);
    setAvatarId(Math.floor(1 + Math.random() * 8));
  }, []);

  const triggerNotification = (message: string, type: 'success' | 'error', callback?: () => void) => {
    setToastMessage(message);
    setToastType(type);
    
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

  const handleNextStep = () => {
    if (!username.trim() || !password) {
      triggerNotification('Set up your username and password first!', 'error');
      return;
    }
    setStep(2);
  };

  const handleSignup = async () => {
    if (!age.trim()) {
      triggerNotification('Please provide your age to complete setup.', 'error');
      return;
    }

    setLoading(true);

    try {
      const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
      
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password: password,
          age: parseInt(age.trim(), 10) || 0,
          gender: gender,
          area: area,
          avatarId: avatarId,
          bio: bio.trim()
        }),
      });

      const contentType = response.headers.get('content-type');
      let data: any = {};
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        if (data.token) {
        await authStorage.saveToken(data.token);
      }

      // 1. Fire the visual notice instantly
      triggerNotification('Identity established! 🚀', 'success');

      // 2. Route immediately without waiting 2.5+ seconds for animations
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);


      } else {
        throw new Error(`Endpoint response mismatch. Verify your network target: ${BASE_URL}`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Required payload keys are missing or invalid.');
      }

    //   if (data.token) {
    //     await authStorage.saveToken(data.token);
    //   }

    //   triggerNotification('Identity established! 🚀', 'success', () => {
    //     router.replace('/(tabs)');
    //   });
    

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

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Secure Identity</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? "Confirm your secret access keys." : "Tailor your network presentation metrics."}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.label}>Burner Handle</Text>
              <TextInput 
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
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

              <Pressable style={styles.button} onPress={handleNextStep}>
                <Text style={styles.buttonText}>Continue Setup</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.label}>Age</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="21"
                    placeholderTextColor="#A0AEC0"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Location Area</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={area}
                      onValueChange={(itemValue) => setArea(itemValue)}
                      dropdownIconColor="#FFFFFF"
                      style={styles.picker}
                    >
                      {ETHIOPIAN_CITIES.map((city) => (
                        <Picker.Item key={city} label={city} value={city} color={Platform.OS === 'ios' ? '#FFFFFF' : '#0F0C20'} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Gender Metric</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <Pressable 
                    key={g} 
                    style={[styles.genderButton, gender === g && styles.genderActive]} 
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.textActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Profile Bio</Text>
              <TextInput 
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
              />

              <View style={styles.buttonActionGroup}>
                <Pressable style={styles.backButton} onPress={() => setStep(1)}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>

                <Pressable 
                  style={[styles.submitButton, loading && styles.buttonDisabled]} 
                  onPress={handleSignup}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#0F0C20" /> : <Text style={styles.buttonText}>Submit</Text>}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C20',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
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
  },
  toastText: {
    color: '#0F0C20',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerBlock: {
    marginBottom: 28,
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
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  pickerContainer: {
    backgroundColor: '#1A103C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D1F5C',
    justifyContent: 'center',
    height: 52,
  },
  picker: {
    color: '#FFFFFF',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#1A103C',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#2D1F5C',
  },
  genderActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  genderText: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  textActive: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  buttonActionGroup: {
    flexDirection: 'row',
    marginTop: 32,
    alignItems: 'center',
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0F0C20',
    fontSize: 16,
    fontWeight: '700',
  },
});