import { useRouter } from "expo-router";
import {
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const CARDS = [
  {
    title: "Vibe Anonymously",
    description: "Share what's raw and real without your name attached.",
    color: "#0F0C20",
    accent: "#6C5CE7",
  },
  {
    title: "Find Your Niche",
    description: "Localized tags connect you with your circle instantly.",
    color: "#1A103C",
    accent: "#00CEC9",
  },
  {
    title: "Real Interactions",
    description: "Support vents safely and join deeply nested conversations.",
    color: "#0A192F",
    accent: "#FF7675",
  },
];

const AnimatedView = Animated.createAnimatedComponent(View);

// Extracted Card Component to handle individual animation hooks safely
function OnboardingCard({ item, index, scrollX }) {
  const titleStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];

    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, input, [80, 0, -80], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const descStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];

    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(scrollX.value, input, [120, 0, -120], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];

    return {
      transform: [
        {
          scale: interpolate(scrollX.value, input, [0.8, 1.1, 0.8], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={styles.cardContainer}>
      <Animated.View style={[styles.pill, { backgroundColor: item.accent + "20" }, pillStyle]}>
        <Text style={[styles.pillText, { color: item.accent }]}>ቶና</Text>
      </Animated.View>

      <Animated.Text style={[styles.title, titleStyle]}>
        {item.title}
      </Animated.Text>

      <Animated.Text style={[styles.description, descStyle]}>
        {item.description}
      </Animated.Text>
    </View>
  );
}

// Extracted Dot Component to handle individual animation hooks safely
function PaginationDot({ index, scrollX }) {
  const dotStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];

    return {
      width: interpolate(scrollX.value, input, [8, 22, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Animated Background
  const backgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        scrollX.value,
        CARDS.map((_, i) => i * width),
        CARDS.map((c) => c.color)
      ),
    };
  });

  return (
    <AnimatedView style={[styles.container, backgroundStyle]}>
      <StatusBar barStyle="light-content" />

      {/* Floating Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>ቶና</Text>
      </View>

      {/* Scroll Controller */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={StyleSheet.absoluteFill}
      >
        {CARDS.map((item, index) => (
          <OnboardingCard 
            key={index} 
            item={item} 
            index={index} 
            scrollX={scrollX} 
          />
        ))}
      </Animated.ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        {/* DOT INDICATOR */}
        <View style={styles.dotsRow}>
          {CARDS.map((_, i) => (
            <PaginationDot 
              key={i} 
              index={i} 
              scrollX={scrollX} 
            />
          ))}
        </View>

        {/* BUTTON */}
        <Pressable
          onPress={() => router.replace("/signup")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>

        {/* LOGIN LINK */}
        <Pressable 
          onPress={() => router.replace("/login")}
          style={styles.loginButton}
        >
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text style={styles.loginHighlight}>Log in</Text>
          </Text>
        </Pressable>

        {/* SMALL BRAND */}
        <Text style={styles.brand}>
          engineered by <Text style={styles.brandName}>Ani</Text>
        </Text>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    width,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "absolute",
    top: 70,
    alignSelf: "center",
    zIndex: 10,
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: "#C7C7C7",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginHorizontal: 5,
  },
  button: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
  loginButton: {
    paddingVertical: 8,
    width: "100%",
    alignItems: "center",
  },
  loginText: {
    color: "#B0B0B0",
    fontSize: 13,
  },
  loginHighlight: {
    color: "#fff",
    fontWeight: "700",
  },
  brand: {
    marginTop: 18,
    fontSize: 11,
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  brandName: {
    color: "#fff",
    fontWeight: "700",
  },
});