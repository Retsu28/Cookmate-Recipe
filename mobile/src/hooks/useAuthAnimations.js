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
export function useAuthAnimations(fieldCount = 4, direction = 1) {
  // Mount animation
  const mount = useRef(new Animated.Value(0)).current;
  const fields = useRef(
    Array.from({ length: fieldCount }, () => new Animated.Value(0))
  ).current;

  // Button press
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Error shake
  const shakeX = useRef(new Animated.Value(0)).current;
  const entryDirection = direction >= 0 ? 1 : -1;

  useEffect(() => {
    mount.stopAnimation();
    shakeX.stopAnimation();
    fields.forEach((value) => value.stopAnimation());

    mount.setValue(0);
    shakeX.setValue(0);
    fields.forEach((value) => value.setValue(0));

    Animated.parallel([
      Animated.timing(mount, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.poly(4)),
        useNativeDriver: true,
      }),
      Animated.stagger(
        42,
        fields.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      ),
    ]).start();

    return () => {
      mount.stopAnimation();
      shakeX.stopAnimation();
      fields.forEach((value) => value.stopAnimation());
    };
  }, [fields, mount, shakeX]);

  const entranceTranslateX = mount.interpolate({
    inputRange: [0, 1],
    outputRange: [entryDirection * 18, 0],
  });

  const cardStyle = {
    opacity: mount,
    transform: [
      {
        translateX: Animated.add(entranceTranslateX, shakeX),
      },
      {
        translateY: mount.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
      },
      {
        scale: mount.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }),
      },
    ],
  };

  const fieldStyle = (i) => ({
    opacity: fields[i] ?? mount,
    transform: [
      {
        translateY: (fields[i] ?? mount).interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
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
