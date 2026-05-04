import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, View } from 'react-native';
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
import OnboardingScreen from '../screens/OnboardingScreen';
import AllRecipesScreen from '../screens/AllRecipesScreen';

// Public auth-stack screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createStackNavigator();

const authTransitionSpec = {
  animation: 'timing',
  config: {
    duration: 360,
    easing: Easing.out(Easing.cubic),
  },
};

function authCardStyleInterpolator({ current, next, inverted, layouts }) {
  const foregroundTranslate = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [layouts.screen.width * 0.12, 0],
  });
  const backgroundTranslate = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -layouts.screen.width * 0.04],
      })
    : current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
      });
  const scale = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.985],
      })
    : current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1],
      });

  return {
    cardStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1],
      }),
      transform: [
        {
          translateX: Animated.multiply(
            Animated.add(foregroundTranslate, backgroundTranslate),
            inverted
          ),
        },
        { scale },
      ],
    },
  };
}

function AuthStack() {
  const { colors, isDark } = useAppTheme();
  const authBackgroundColor = isDark ? colors.background : colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: authBackgroundColor }}>
      <AuthVideoBackground />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          gestureDirection: 'horizontal',
          cardShadowEnabled: false,
          cardStyle: { backgroundColor: 'transparent' },
          transitionSpec: {
            open: authTransitionSpec,
            close: authTransitionSpec,
          },
          cardStyleInterpolator: authCardStyleInterpolator,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
      </Stack.Navigator>
    </View>
  );
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

  return (
    <Stack.Navigator initialRouteName="Onboarding" screenOptions={headerScreenOptions}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false, gestureEnabled: false }} />

      <Stack.Screen
        name="AllRecipes"
        component={AllRecipesScreen}
        options={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.25, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.25, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.25, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.25, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="CookingMode"
        component={CookingModeScreen}
        options={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.25, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
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
