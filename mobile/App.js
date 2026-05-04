import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from '@expo-google-fonts/geist';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import {
  AccountSettingsSkeleton,
  CameraPermissionSkeleton,
  ContentSkeleton,
  HomeContentSkeleton,
  MealPlannerContentSkeleton,
  NotificationsContentSkeleton,
  ProfileContentSkeleton,
  RecipeDetailSkeleton,
  SearchContentSkeleton,
} from './src/components/SkeletonPlaceholder';

const navigationRef = createNavigationContainerRef();
const TRANSITION_SKELETON_MS = 450;

// Bottom-tab routes get a smooth focus-fade via TabSceneAnimator instead of the
// full-screen transition skeleton, so we exclude them here. Stack pushes (e.g.,
// RecipeDetail, Notifications, AccountSettings) still get the skeleton overlay.
const TAB_ROUTE_NAMES = new Set(['Home', 'Search', 'Recipes', 'Planner', 'Camera', 'Profile', 'Main']);
const AUTH_ROUTE_NAMES = new Set(['Login', 'Signup']);

const transitionSkeletons = {
  AccountSettings: AccountSettingsSkeleton,
  Camera: CameraPermissionSkeleton,
  Home: HomeContentSkeleton,
  Main: HomeContentSkeleton,
  Notifications: NotificationsContentSkeleton,
  Planner: MealPlannerContentSkeleton,
  Profile: ProfileContentSkeleton,
  RecipeDetail: RecipeDetailSkeleton,
  Search: SearchContentSkeleton,
};

function PostLoginSplash({ colors, isDark }) {
  const { showPostLoginSplash, finishPostLoginSplash } = useAuth();

  if (!showPostLoginSplash) return null;

  return (
    <SplashScreen
      colors={colors}
      isDark={isDark}
      onFinished={finishPostLoginSplash}
    />
  );
}

function SignOutSplash({ colors, isDark }) {
  const { showLogoutSplash, isLoggingOut, finishLogoutSplash } = useAuth();

  if (!showLogoutSplash) return null;

  return (
    <SplashScreen
      colors={colors}
      isDark={isDark}
      onFinished={finishLogoutSplash}
      message="Signing you out..."
      duration={1200}
      isReady={!isLoggingOut}
      blocksTouches
    />
  );
}

function NavigationTransitionSkeleton({ colors, routeName }) {
  const Skeleton = transitionSkeletons[routeName] || ContentSkeleton;

  return (
    <View style={styles.transitionSkeleton} pointerEvents="auto">
      <Skeleton colors={colors} />
    </View>
  );
}

function AppContent({ fontsLoaded }) {
  const { colors, navigationTheme, isDark, isReady } = useAppTheme();
  const [splashDone, setSplashDone] = useState(false);
  const [transitionRouteName, setTransitionRouteName] = useState(null);
  const previousRouteKey = useRef(null);
  const transitionTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  const showTransitionSkeleton = (route) => {
    if (!route?.name) {
      return;
    }

    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
    }

    setTransitionRouteName(route.name);
    transitionTimer.current = setTimeout(() => {
      setTransitionRouteName(null);
      transitionTimer.current = null;
    }, TRANSITION_SKELETON_MS);
  };

  const handleNavigationReady = () => {
    const route = navigationRef.getCurrentRoute();
    previousRouteKey.current = route?.key || null;
  };

  const handleNavigationStateChange = () => {
    const route = navigationRef.getCurrentRoute();

    if (route?.key && previousRouteKey.current && route.key !== previousRouteKey.current) {
      // Tab switches are handled by TabSceneAnimator's focus-triggered fade —
      // skip the full-screen skeleton overlay so the transition stays smooth.
      if (!TAB_ROUTE_NAMES.has(route.name) && !AUTH_ROUTE_NAMES.has(route.name)) {
        showTransitionSkeleton(route);
      }
    }

    previousRouteKey.current = route?.key || null;
  };

  if (!fontsLoaded || !isReady) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ContentSkeleton colors={colors} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaProvider style={styles.safeArea}>
        <AuthProvider>
          <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            onReady={handleNavigationReady}
            onStateChange={handleNavigationStateChange}
          >
            <AppNavigator />
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </NavigationContainer>
          {transitionRouteName && splashDone && (
            <NavigationTransitionSkeleton colors={colors} routeName={transitionRouteName} />
          )}
          <PostLoginSplash colors={colors} isDark={isDark} />
          <SignOutSplash colors={colors} isDark={isDark} />
        </AuthProvider>
      </SafeAreaProvider>
      {!splashDone && (
        <SplashScreen
          colors={colors}
          isDark={isDark}
          onFinished={() => setSplashDone(true)}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
  });

  return (
    <ThemeProvider>
      <AppContent fontsLoaded={fontsLoaded} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  transitionSkeleton: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
