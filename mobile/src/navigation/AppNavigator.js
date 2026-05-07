import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import BottomTabNavigator from './BottomTabNavigator';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { ContentSkeleton } from '../components/SkeletonPlaceholder';

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
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();

const authTransitionSpec = {
  animation: 'timing',
  config: {
    duration: 280,
    easing: Easing.inOut(Easing.ease),
  },
};

function authCardStyleInterpolator({ current, next }) {
  const incomingOpacity = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const outgoingOpacity = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      })
    : 1;
  const opacity = next ? Animated.multiply(incomingOpacity, outgoingOpacity) : incomingOpacity;

  return {
    cardStyle: { opacity },
  };
}

function AuthStack() {
  return (
    <View style={styles.authRoot}>
      <View style={styles.authNavigatorLayer}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
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
        </Stack.Navigator>
      </View>
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
