import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from './FloatingTabBar';
import TabSceneAnimator from './TabSceneAnimator';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import MealPlannerScreen from '../screens/MealPlannerScreen';
import CameraScreen from '../screens/CameraScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Wrap each tab screen with the focus-triggered fade animator so every tab
// switch plays a smooth fade-up entrance (mirrors the web Layout's
// AnimatePresence motion.div page transition).
const withTabFade = (Component) => {
  const Wrapped = (props) => (
    <TabSceneAnimator>
      <Component {...props} />
    </TabSceneAnimator>
  );
  Wrapped.displayName = `WithTabFade(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
};

const HomeTab = withTabFade(HomeScreen);
const SearchTab = withTabFade(SearchScreen);
const PlannerTab = withTabFade(MealPlannerScreen);
const CameraTab = withTabFade(CameraScreen);
const ProfileTab = withTabFade(ProfileScreen);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // The custom FloatingTabBar handles all visuals; suppress the default bar.
        tabBarStyle: { display: 'none', height: 0, borderTopWidth: 0 },
      }}
    >
      <Tab.Screen name="Home" component={HomeTab} />
      <Tab.Screen name="Search" component={SearchTab} />
      <Tab.Screen name="Planner" component={PlannerTab} />
      <Tab.Screen name="Camera" component={CameraTab} />
      <Tab.Screen name="Profile" component={ProfileTab} />
    </Tab.Navigator>
  );
}
