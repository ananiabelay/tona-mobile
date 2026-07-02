import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

export default function FancyLoader() {
  const logoOpacity = useSharedValue(0.4);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Pulse animation
    logoOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.ease }),
        withTiming(0.4, { duration: 1000, easing: Easing.ease })
      ),
      -1,
      true
    );

    // Smooth looping progress (0 → 1 instead of 0 → 100)
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    const scale = 0.95 + (logoOpacity.value - 0.4) * (0.05 / 0.6);

    return {
      opacity: logoOpacity.value,
      transform: [{ scale }],
    };
  });

  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: progress.value, // ✅ more stable than width %
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerBlock}>
        <Animated.Text style={[styles.logoText, animatedLogoStyle]}>
          ቶና
        </Animated.Text>

        <View style={styles.trackBackground}>
          <Animated.View style={[styles.trackFill, animatedProgressStyle]} />
        </View>

        <Text style={styles.subText}>ህመምህን ያልተናገርክ መድኃኒት አይገኝልህም......</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    width: '100%',
  },
  logoText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#6C5CE7',
    letterSpacing: 2,
    marginBottom: 32,
    textShadowColor: 'rgba(108, 92, 231, 0.3)',
    textShadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
  },
  trackBackground: {
    width: 140,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 2,
    transformOrigin: 'left', // important for scaleX
  },
  subText: {
    color: '#A0AEC0',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    opacity: 0.4,
  },
});