import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Reusable animation helpers for the Login/Signup screens.
 * Uses React Native's built-in Animated API so it works in Expo Go
 * without needing the Reanimated Babel plugin.
 *
 * Returns:
 *  - cardStyle        : transform/opacity for the card mount animation
 *  - fieldStyle(i)    : per-index staggered field animation
 *  - buttonStyle      : transform style for submit button tap feedback
 *  - onPressIn / Out  : handlers for the submit button
 *  - triggerShake()   : call on validation error
 */
export function useAuthAnimations(fieldCount = 4) {
  // Card mount — spring pop-in matching web: y:24→0, scale:0.96→1
  const mount = useRef(new Animated.Value(0)).current;
  const fields = useRef(
    Array.from({ length: fieldCount }, () => new Animated.Value(0))
  ).current;

  // Button press
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Error shake
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        // Card: fast spring-like ease matching web stiffness 260 / damping 26
        Animated.timing(mount, {
          toValue: 1,
          duration: 360,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        // Fields: stagger 50ms each, 80ms base delay — mirrors web 0.08+i*0.05s
        Animated.stagger(
          50,
          fields.map((value) =>
            Animated.timing(value, {
              toValue: 1,
              duration: 350,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            })
          )
        ),
      ]).start();
    }, 80);

    return () => {
      clearTimeout(timer);
      mount.stopAnimation();
      shakeX.stopAnimation();
      fields.forEach((value) => value.stopAnimation());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = {
    opacity: mount,
    transform: [
      // y: 24 → 0  matching web `initial={{ y: 24 }}`
      { translateY: mount.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      // scale: 0.96 → 1  matching web `initial={{ scale: 0.96 }}`
      { scale: mount.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
      // shake on error — separate so it doesn't fight the entrance
      { translateX: shakeX },
    ],
  };

  const fieldStyle = (i) => ({
    opacity: fields[i] ?? mount,
    transform: [
      {
        translateY: (fields[i] ?? mount).interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  });

  const triggerShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const onPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const buttonStyle = { transform: [{ scale: buttonScale }] };

  return {
    cardStyle,
    fieldStyle,
    buttonStyle,
    onPressIn,
    onPressOut,
    triggerShake,
  };
}

export default useAuthAnimations;
