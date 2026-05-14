import { useRef, useEffect, useCallback } from 'react';
import { Animated as RNAnimated, PanResponder } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

/* Phases: idle → scanning → selecting → selected → sticker → done */
export const PHASES = { IDLE: 0, SCAN: 1, SELECTING: 2, SELECTED: 3, STICKER: 4, DONE: 5 };

export function useCameraScanAnimation({ phase, bgRemovalDone, onGoSelecting, onGoSelected, onGoSticker, onGoDone }) {
  /* ── Reanimated shared values ── */
  const scanY = useSharedValue(-2);
  const scanOpacity = useSharedValue(0);
  const imgOpacity = useSharedValue(1);
  const cornerOpacity = useSharedValue(0);
  const cornerInset = useSharedValue(4);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1.05);
  const stickerScale = useSharedValue(0.4);
  const stickerOpacity = useSharedValue(0);
  const stickerRotate = useSharedValue(-6);
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const badgeOp = useSharedValue(0);

  /* ── RN Animated values for result panel ── */
  const resultSlideY = useRef(new RNAnimated.Value(0)).current;
  const resultOpacity = useRef(new RNAnimated.Value(1)).current;
  const resultScale = useRef(new RNAnimated.Value(1)).current;

  const reset = useCallback(() => {
    scanY.value = -2; scanOpacity.value = 0; imgOpacity.value = 1;
    cornerOpacity.value = 0; cornerInset.value = 4;
    glowOpacity.value = 0; glowScale.value = 1.05;
    stickerScale.value = 0.4; stickerOpacity.value = 0; stickerRotate.value = -6;
    sparkle1.value = 0; sparkle2.value = 0; badgeOp.value = 0;
  }, []);

  const setRestoredDoneState = useCallback(() => {
    scanY.value = -2; scanOpacity.value = 0; imgOpacity.value = 0.15;
    cornerOpacity.value = 0; cornerInset.value = 12;
    glowOpacity.value = 0; glowScale.value = 1;
    stickerScale.value = 1; stickerOpacity.value = 1; stickerRotate.value = 0;
    sparkle1.value = 1; sparkle2.value = 1; badgeOp.value = 0;
  }, []);

  /* ── Phase-driven animations ── */
  useEffect(() => {
    if (phase === PHASES.SCAN) {
      scanOpacity.value = withTiming(1, { duration: 100 });
      badgeOp.value = withTiming(1, { duration: 200 });
      scanY.value = withTiming(102, { duration: 1100, easing: Easing.inOut(Easing.ease) }, (f) => {
        if (f) { scanOpacity.value = withTiming(0, { duration: 150 }); runOnJS(onGoSelecting)(); }
      });
    }
    if (phase === PHASES.SELECTING) {
      cornerOpacity.value = withTiming(1, { duration: 300 });
      cornerInset.value = withTiming(12, { duration: 800, easing: Easing.out(Easing.ease) });
      badgeOp.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => onGoSelected(), 1000);
      return () => clearTimeout(t);
    }
    if (phase === PHASES.SELECTED) {
      imgOpacity.value = withTiming(0.15, { duration: 600 });
      glowOpacity.value = withTiming(1, { duration: 400 });
      glowScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      cornerOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
      badgeOp.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => onGoSticker(), bgRemovalDone ? 320 : 650);
      return () => clearTimeout(t);
    }
    if (phase === PHASES.STICKER) {
      glowOpacity.value = withTiming(0, { duration: 300 });
      stickerOpacity.value = withTiming(1, { duration: 200 });
      stickerScale.value = withSequence(
        withTiming(1.1, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(0.96, { duration: 140 }), withTiming(1.02, { duration: 100 }), withTiming(1, { duration: 80 }));
      stickerRotate.value = withSequence(
        withTiming(3, { duration: 300 }), withTiming(-1.5, { duration: 140 }),
        withTiming(0.5, { duration: 100 }), withTiming(0, { duration: 80 }));
      sparkle1.value = withDelay(300, withSequence(withTiming(1.3, { duration: 180 }), withTiming(1, { duration: 130 })));
      sparkle2.value = withDelay(400, withSequence(withTiming(1.2, { duration: 180 }), withTiming(1, { duration: 130 })));
      badgeOp.value = withDelay(150, withTiming(1, { duration: 200 }));
      const t = setTimeout(() => onGoDone(), 1000);
      return () => clearTimeout(t);
    }
    if (phase === PHASES.DONE) {
      badgeOp.value = withDelay(200, withTiming(0, { duration: 300 }));
    }
  }, [phase, bgRemovalDone]);

  /* ── Animated styles ── */
  const asScanLine = useAnimatedStyle(() => ({
    position: 'absolute', left: 0, right: 0, height: 5,
    top: `${scanY.value}%`, opacity: scanOpacity.value, zIndex: 20,
  }));
  const asImg = useAnimatedStyle(() => ({ opacity: imgOpacity.value }));
  const asCorner = useAnimatedStyle(() => ({
    position: 'absolute', opacity: cornerOpacity.value, zIndex: 18,
    top: `${cornerInset.value}%`, left: `${cornerInset.value}%`,
    right: `${cornerInset.value}%`, bottom: `${cornerInset.value}%`,
  }));
  const asGlow = useAnimatedStyle(() => ({
    position: 'absolute', opacity: glowOpacity.value, zIndex: 16,
    top: '14%', left: '14%', right: '14%', bottom: '14%',
    transform: [{ scale: glowScale.value }], borderRadius: 22, overflow: 'hidden',
  }));
  const asSticker = useAnimatedStyle(() => ({
    opacity: stickerOpacity.value, zIndex: 22,
    transform: [{ scale: stickerScale.value }, { rotate: `${stickerRotate.value}deg` }],
  }));
  const asSp1 = useAnimatedStyle(() => ({ transform: [{ scale: sparkle1.value }], opacity: sparkle1.value > 0 ? 1 : 0 }));
  const asSp2 = useAnimatedStyle(() => ({ transform: [{ scale: sparkle2.value }], opacity: sparkle2.value > 0 ? 1 : 0 }));
  const asBadge = useAnimatedStyle(() => ({
    opacity: badgeOp.value, zIndex: 30,
    transform: [{ translateY: interpolate(badgeOp.value, [0, 1], [-10, 0]) }],
  }));

  /* ── Result panel slide animations ── */
  const hideResult = useCallback(() => {
    RNAnimated.parallel([
      RNAnimated.timing(resultSlideY, { toValue: 300, duration: 320, useNativeDriver: true }),
      RNAnimated.timing(resultOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      RNAnimated.timing(resultScale, { toValue: 0.95, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [resultSlideY, resultOpacity, resultScale]);

  const showResult = useCallback(() => {
    RNAnimated.parallel([
      RNAnimated.timing(resultSlideY, { toValue: 0, duration: 320, useNativeDriver: true }),
      RNAnimated.timing(resultOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      RNAnimated.timing(resultScale, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [resultSlideY, resultOpacity, resultScale]);

  /* ── Swipe-to-hide pan responder ── */
  const resultPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dx) < Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          resultSlideY.setValue(g.dy);
          resultOpacity.setValue(1 - Math.min(g.dy / 200, 0.8));
          resultScale.setValue(1 - Math.min(g.dy / 1000, 0.05));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) hideResult();
        else showResult();
      },
    })
  ).current;

  return {
    asScanLine, asImg, asCorner, asGlow, asSticker, asSp1, asSp2, asBadge,
    resultSlideY, resultOpacity, resultScale,
    resultPanResponder,
    hideResult, showResult,
    reset, setRestoredDoneState,
  };
}
