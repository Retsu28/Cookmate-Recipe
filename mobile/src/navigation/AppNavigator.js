import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import BottomTabNavigator from './BottomTabNavigator';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

// Protected stack screens
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CookingModeScreen from '../screens/CookingModeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Public auth-stack screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
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
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CookingMode" component={CookingModeScreen} options={{ headerShown: false }} />
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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return isAuthenticated ? <AppStack colors={colors} /> : <AuthStack />;
}
