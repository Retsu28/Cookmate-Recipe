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
 *  - shakeStyle       : applied to the card, shakes when triggerShake is called
 *  - buttonScale      : Animated.Value bound to the submit button tap feedback
 *  - onPressIn / Out  : handlers for the submit button
 *  - triggerShake()   : call on validation error
 */
export function useAuthAnimations(fieldCount = 4) {
  // Mount animation
  const mount = useRef(new Animated.Value(0)).current;
  const fields = useRef(
    Array.from({ length: fieldCount }, () => new Animated.Value(0))
  ).current;

  // Button press
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Error shake
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mount, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      60,
      fields.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [mount, fields]);

  const cardStyle = {
    opacity: mount,
    transform: [
      {
        translateY: mount.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
      },
      {
        scale: mount.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
      },
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

  const shakeStyle = { transform: [{ translateX: shakeX }] };

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
    shakeStyle,
    buttonStyle,
    onPressIn,
    onPressOut,
    triggerShake,
  };
}

export default useAuthAnimations;
