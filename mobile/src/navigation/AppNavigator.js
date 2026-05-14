import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import BottomTabNavigator from './BottomTabNavigator';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { ContentSkeleton } from '../components/SkeletonPlaceholder';
import AuthVideoBackground from '../components/AuthVideoBackground';

// Protected stack screens
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import CookingModeScreen from '../screens/CookingModeScreen';
import StartCookingSplashScreen from '../screens/StartCookingSplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AllRecipesScreen from '../screens/AllRecipesScreen';
import SavedRecipesScreen from '../screens/SavedRecipesScreen';

// Public auth-stack screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MFAVerificationScreen from '../screens/MFAVerificationScreen';
import MFASetupScreen from '../screens/MFASetupScreen';

const Stack = createStackNavigator();

const authTransitionSpec = {
  animation: 'timing',
  config: {
    duration: 320,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
};

function authCardStyleInterpolator({ current, next, layouts }) {
  const screenWidth = layouts?.screen?.width || 400;

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 1],
  });

  // Determine direction: next exists and moving means going back (slide from left)
  const isGoingBack = next && next.progress.__getValue() > 0;

  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [isGoingBack ? -screenWidth * 0.35 : screenWidth * 0.35, 0],
  });

  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return {
    cardStyle: {
      opacity,
      transform: [{ translateX }, { scale }],
    },
  };
}

function AuthStack() {
  return (
    <View style={styles.authRoot}>
      <AuthVideoBackground />
      <View style={styles.authNavigatorLayer}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            animationEnabled: true,
            headerShown: false,
            gestureEnabled: false,
            cardShadowEnabled: false,
            cardOverlayEnabled: false,
            cardStyle: styles.authCard,
            transitionSpec: {
              open: authTransitionSpec,
              close: authTransitionSpec,
            },
            cardStyleInterpolator: authCardStyleInterpolator,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MFAVerification" component={MFAVerificationScreen} />
        </Stack.Navigator>
      </View>
    </View>
  );
}

const sharedTransitionSpec = {
  animation: 'timing',
  config: {
    duration: 320,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
};

function sharedCardStyleInterpolator({ current, next, layouts }) {
  const screenWidth = layouts?.screen?.width || 400;

  // Incoming screen: slides from right + fades in
  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 1],
  });

  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.3, 0],
  });

  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  // When this screen is being covered by the next (pop direction),
  // push it slightly left and fade it out
  if (next) {
    const nextOpacity = next.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.85],
    });
    const nextTranslateX = next.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -screenWidth * 0.15],
    });
    return {
      cardStyle: {
        opacity: Animated.multiply(opacity, nextOpacity),
        transform: [
          { translateX: Animated.add(translateX, nextTranslateX) },
          { scale },
        ],
      },
    };
  }

  return {
    cardStyle: {
      opacity,
      transform: [{ translateX }, { scale }],
    },
  };
}

function AppStack({ colors }) {
  const headerScreenOptions = {
    headerStyle: {
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
      elevation: 0,
      shadowOpacity: 0,
    },
    headerTintColor: colors.text,
    headerBackImage: ({ tintColor }) => (
      <Ionicons name="chevron-back" size={28} color={tintColor || colors.text} />
    ),
    headerTitleStyle: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 18,
      letterSpacing: -0.3,
    },
  };

  const sharedOptions = {
    headerShown: false,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    transitionSpec: {
      open: sharedTransitionSpec,
      close: sharedTransitionSpec,
    },
    cardStyleInterpolator: sharedCardStyleInterpolator,
  };

  return (
    <Stack.Navigator initialRouteName="Onboarding" screenOptions={{ ...headerScreenOptions, animationEnabled: true }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={sharedOptions} />
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false, gestureEnabled: false }} />

      <Stack.Screen name="AllRecipes" component={AllRecipesScreen} options={sharedOptions} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={sharedOptions} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={sharedOptions} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={sharedOptions} />
      <Stack.Screen name="StartCookingSplash" component={StartCookingSplashScreen} options={sharedOptions} />
      <Stack.Screen name="CookingMode" component={CookingModeScreen} options={sharedOptions} />
      <Stack.Screen name="SavedRecipes" component={SavedRecipesScreen} options={sharedOptions} />
      <Stack.Screen name="MFASetup" component={MFASetupScreen} options={sharedOptions} />
    </Stack.Navigator>
  );
}

/**
 * Root navigator — acts as the mobile AuthGate.
 *
 * - While the stored token is being read from SecureStore, shows a splash.
 * - When `isAuthenticated` is false, renders only the AuthStack
 *   (Login + Signup) so the existing protected screens are unreachable.
 * - When `isAuthenticated` flips to true (after login/signup), React
 *   swaps the whole stack to AppStack, matching the previous behavior.
 *
 * TODO: Replace the placeholder auth service with real backend auth.
 * This navigator itself does not need to change.
 */
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useAppTheme();

  if (isLoading) {
    return <ContentSkeleton colors={colors} />;
  }

  return isAuthenticated ? <AppStack colors={colors} /> : <AuthStack />;
}

const styles = StyleSheet.create({
  authRoot: {
    flex: 1,
    backgroundColor: '#0c0a09',
    overflow: 'hidden',
    position: 'relative',
  },
  authBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
  },
  authNavigatorLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    elevation: 1,
    backgroundColor: 'transparent',
  },
  authCard: {
    backgroundColor: 'transparent',
  },
});
