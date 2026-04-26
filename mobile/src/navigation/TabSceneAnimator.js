import React, { useCallback, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Wraps a tab screen so that it fades + slides up smoothly every time the user
 * focuses on it (via tab press or back navigation). Mirrors the web Layout's
 * page transition (`<motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>`,
 * 240ms, cubic-bezier(0.22, 1, 0.36, 1)).
 */
export default function TabSceneAnimator({ children }) {
  const fade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fade.setValue(0);
      const animation = Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      });
      animation.start();
      return () => {
        animation.stop();
      };
    }, [fade]),
  );

  const animatedStyle = {
    opacity: fade,
    transform: [
      {
        translateY: fade.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return <Animated.View style={[st.flex1, animatedStyle]}>{children}</Animated.View>;
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
});
