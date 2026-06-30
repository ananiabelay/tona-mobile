import { useRouter } from 'expo-router';
import { Dimensions, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARDS = [
  {
    title: "Vibe Anonymously",
    description: "Share what's raw and real without your name attached.",
    bgColor: "#0F0C20",
    accent: "#6C5CE7"
  },
  {
    title: "Find Your Niche",
    description: "Localized tags connect you with your circle instantly.",
    bgColor: "#1A103C",
    accent: "#00CEC9"
  },
  {
    title: "Real Interactions",
    description: "Support vents safely and join deeply nested conversations.",
    bgColor: "#0A192F",
    accent: "#FF7675"
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollX = useSharedValue(0);

  // Smoothly track scroll coordinates completely on the UI thread
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Horizontal Page Slider */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={StyleSheet.absoluteFill}
      >
        {CARDS.map((item, index) => {
          // Individual text transitions on swipe
          const animatedTextStyle = useAnimatedStyle(() => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];
            
            const opacity = interpolate(
              scrollX.value,
              inputRange,
              [0, 1, 0],
              Extrapolation.CLAMP
            );

            const scale = interpolate(
              scrollX.value,
              inputRange,
              [0.9, 1, 0.9],
              Extrapolation.CLAMP
            );

            return {
              opacity,
              transform: [{ scale }],
            };
          });

          return (
            <View key={index} style={[styles.page, { backgroundColor: item.bgColor }]}>
              <Animated.View style={[styles.textBlock, animatedTextStyle]}>
                <View style={[styles.pill, { backgroundColor: item.accent + '20' }]}>
                  <Text style={[styles.pillText, { color: item.accent,fontSize:25 }]}>ቶና</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Persistent Navigation Footer */}
      <View style={styles.footer}>
        {/* Expanding Pagination Dots */}
        <View style={styles.indicatorContainer}>
          {CARDS.map((_, i) => {
            const animatedDotStyle = useAnimatedStyle(() => {
              const inputRange = [
                (i - 1) * SCREEN_WIDTH,
                i * SCREEN_WIDTH,
                (i + 1) * SCREEN_WIDTH,
              ];

              // Active dot expands horizontally into a premium pill shape
              const dotWidth = interpolate(
                scrollX.value,
                inputRange,
                [8, 24, 8],
                Extrapolation.CLAMP
              );

              const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.4, 1, 0.4],
                Extrapolation.CLAMP
              );

              return {
                width: dotWidth,
                opacity,
              };
            });

            return <Animated.View key={i} style={[styles.dot, animatedDotStyle]} />;
          })}
        </View>

        {/* Enter Application Action */}
        <Pressable 
          style={styles.button} 
          onPress={() => router.replace('/signup')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0C20',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  textBlock: {
    alignItems: 'center',
    marginTop: -40,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#0F0C20',
    fontSize: 15,
    fontWeight: '700',
  },
});