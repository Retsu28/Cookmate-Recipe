// Small absolute-positioned connection indicator.
// - Green solid dot when online.
// - Red breathing dot when offline.
// Placed as an overlay so it does NOT modify any existing screen layout.

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useNetwork } from './network';

export default function OfflineIndicator({ top, right, bottom, left, size = 16 }) {
  const { isOnline } = useNetwork();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOnline) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isOnline, pulse]);

  const color = isOnline ? '#22c55e' : '#ef4444';
  const ringColor = isOnline ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.30)';

  // Default to a top-right overlay if no explicit position is provided.
  const hasPosition =
    top !== undefined || right !== undefined || bottom !== undefined || left !== undefined;
  const position = hasPosition
    ? { top, right, bottom, left }
    : { top: 8, right: 10 };

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: size, height: size, ...position }]}
      accessibilityRole="image"
      accessibilityLabel={isOnline ? 'Online' : 'Offline'}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            opacity: isOnline ? 0.7 : pulse,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size / 2,
            height: size / 2,
            borderRadius: size / 4,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  dot: {},
});
