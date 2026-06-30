// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This ensures the root index.tsx loads as a clean full screen */}
      <Stack.Screen name="index" /> 
      {/* This holds your tab navigation sub-structure */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}