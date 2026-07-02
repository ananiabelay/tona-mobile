import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import FancyLoader from "../components/loading";
import { authStorage } from "../utils/auth";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // 1. AUTH CHECK (runs once on app start)
  useEffect(() => {
    (async () => {
      try {
        const token = await authStorage.getToken();
        setIsAuthenticated(!!token);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 2. ROUTE GUARD (runs after auth is known)
  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];

    const isAuthRoute =
      currentRoute === "login" ||
      currentRoute === "signup";

    const isRoot = !currentRoute;

    const isPublicRoute = isAuthRoute || isRoot;

    // 🚨 NOT LOGGED IN → FORCE AUTH SCREENS ONLY
    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    // 🚨 LOGGED IN → BLOCK AUTH PAGES
    if (isAuthenticated && isPublicRoute) {
      router.replace("/(tabs)");
      return;
    }

    // ✅ SAFE TO RENDER APP
    setIsReady(true);
  }, [isLoading, isAuthenticated, segments]);

  // 3. HARD BLOCK RENDER (prevents UI flash completely)
  if (isLoading || !isReady) {
    return <FancyLoader />;
  }

  // 4. NORMAL APP RENDER
  return <Slot />;
}