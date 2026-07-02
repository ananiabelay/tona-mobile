import { Tabs } from "expo-router";
import {
  Home,
  MessageCircle,
  Plus,
  Search,
  User
} from "lucide-react-native";
import { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import Animated, {
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

/* -------------------- GLOBAL ANIMATION STATE -------------------- */
export const tabBarTranslateY = makeMutable(0);

/* -------------------- TAB ICON -------------------- */
function TabIcon({
  focused,
  color,
  Icon,
}: {
  focused: boolean;
  color: any; 
  Icon: any;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, {
      damping: 14,
      stiffness: 220,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, styles.iconContainer]}>
      <Icon
        size={22}
        color={color as string} 
        strokeWidth={focused ? 2.6 : 2}
      />
    </Animated.View>
  );
}

/* -------------------- CREATE BUTTON -------------------- */
function CreateButton(props: any) {
  return (
    <Pressable
      {...props}
      style={({ pressed }: { pressed: boolean }) => [
        styles.plusBtn,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.plusInner}>
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

/* -------------------- MAIN LAYOUT -------------------- */
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const TAB_WIDTH = Math.min(width * 0.92, 390);
  const BOTTOM_SPACING = Platform.OS === "ios" ? 24 : 12;

  const animatedTabBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tabBarTranslateY.value }],
  }));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#A78BFA",
        tabBarInactiveTintColor: "#6B6680",
        
        /* 1. FORCE NO SAFE AREA BOTTOM INSETS */
        tabBarSafeAreaInsets: { bottom: 0 },

        /* 2. THE SECRET FIX: Let the navigation tab bar span 100% of the screen width */
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          left: 0,
          right: 0,
          bottom: BOTTOM_SPACING,
          height: 68,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          // Add horizontal margins to the root container to perfectly center the internal button items
          paddingHorizontal: (width - TAB_WIDTH) / 2, 
        },

        /* 3. RESET DEFAULT ICON MARGINS/ALIGNMENT */
        tabBarIconStyle: {
          margin: 0,
          padding: 0,
          justifyContent: "center",
          alignItems: "center",
          flex: 1, 
        },

        /* 4. ENSURE EACH TAB CONSUMES FULL HEIGHT COMFORTABLY */
        tabBarItemStyle: {
          height: '100%', 
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 0,
        },

        /* BACKGROUND: Centered perfectly using native absolute math relative to the screen width */
        tabBarBackground: () => (
          <Animated.View
            style={[
              styles.tabBar,
              {
                width: TAB_WIDTH,
                left: (width - TAB_WIDTH) / 2,
              },
              animatedTabBarStyle,
            ]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Home} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={Search} />
          ),
        }}
      />

      <Tabs.Screen        
        name="create"
        options={{
          tabBarButton: (props) => <CreateButton {...props} />,
        }}
      />

       <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={MessageCircle} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} Icon={User} />
          ),
        }}
      />
    </Tabs>
  );
}

/* -------------------- STYLES -------------------- */
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#1E1B29", 
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%', 
  },
  plusBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%', 
  },
  plusInner: {
    backgroundColor: '#A78BFA',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    width: 48,
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});