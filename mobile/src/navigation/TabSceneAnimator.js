import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';

// Tab order for directional slide detection
const TAB_ORDER = ['Home', 'Search', 'Recipes', 'Planner', 'Camera', 'Profile'];

// Module-level: tracks the last focused tab index across all instances
let lastFocusedTabIndex = 0;

/**
 * Wraps a tab screen with smooth directional horizontal slide animation.
 * Slides from RIGHT when navigating to a higher-index tab (forward).
 * Slides from LEFT when navigating to a lower-index tab (backward).
 * Animates only: opacity, translateX, scale (all native-driver safe).
 */
export default function TabSceneAnimator({ children }) {
  const progress = useRef(new Animated.Value(0)).current;
  const directionRef = useRef(1);
  const route = useRoute();
  const myIndex = TAB_ORDER.indexOf(route.name);

  // Initial mount animation
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
  }, [progress]);

  useFocusEffect(
    useCallback(() => {
      // Determine direction based on previous tab position
      const prevIndex = lastFocusedTabIndex;
      const currentIndex = myIndex >= 0 ? myIndex : prevIndex;
      directionRef.current = currentIndex >= prevIndex ? 1 : -1;
      lastFocusedTabIndex = currentIndex;

      // Animate in (start from current value, not 0, to avoid flash)
      const animation = Animated.timing(progress, {
        toValue: 1,
        duration: 260,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      });
      animation.start();
      return () => animation.stop();
    }, [progress, myIndex]),
  );

  const animatedStyle = {
    opacity: 1,
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [directionRef.current * 60, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  return <Animated.View style={[st.flex1, animatedStyle]}>{children}</Animated.View>;
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
});
