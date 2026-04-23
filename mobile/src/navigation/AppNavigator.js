import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import BottomTabNavigator from './BottomTabNavigator';

// Placeholder screens for stack
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CookingModeScreen from '../screens/CookingModeScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e7e5e4',
        },
        headerTintColor: '#1c1917',
        headerBackImage: ({ tintColor }) => (
          <Ionicons name="chevron-back" size={28} color={tintColor || '#1c1917'} />
        ),
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Main" 
        component={BottomTabNavigator} 
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen 
        name="RecipeDetail" 
        component={RecipeDetailScreen} 
        options={{ title: 'Recipe Details' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="CookingMode" 
        component={CookingModeScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
