import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Easing, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SPLASH_DURATION = 2400;
const FLOATER_COUNT = 4;

const FOOD_ICONS = [
  'restaurant',
  'flame',
  'nutrition',
  'leaf',
  'cafe',
  'pizza',
];

function buildFloaters() {
  return Array.from({ length: FLOATER_COUNT }, (_, i) => ({
    id: i,
    icon: FOOD_ICONS[i % FOOD_ICONS.length],
    x: ((10 + ((i * 43) % 76)) / 100) * SCREEN_W,
    y: ((12 + ((i * 53) % 66)) / 100) * SCREEN_H,
    size: 24 + (i % 3) * 8,
    delay: i * 280,
  }));
}

export default function SplashScreen({
  colors,
  isDark,
  onFinished,
  message = 'Cooking up something delicious...',
  duration = SPLASH_DURATION,
  isReady = true,
  blocksTouches = false,
}) {
  // ── One-shot entrance values ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(14)).current;
  const msgFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;

  // ── Looping values ──
  const wiggle = useRef(new Animated.Value(0)).current;
  const logoBreathe = useRef(new Animated.Value(1)).current;
  const msgShimmer = useRef(new Animated.Value(1)).current;

  const dotAnims = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  // ── Pre-computed composite nodes (stable refs, never recreated) ──
  const dotScales = useRef(
    dotAnims.map((d) =>
      d.interpolate({ inputRange: [0.35, 1], outputRange: [1, 1.5] })
    )
  ).current;
  const logoScaleCombined = useRef(Animated.multiply(logoScale, logoBreathe)).current;
  const msgOpacity = useRef(Animated.multiply(msgFade, msgShimmer)).current;

  const floaterAnims = useRef(
    Array.from({ length: FLOATER_COUNT }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const floaters = useMemo(() => buildFloaters(), []);

  // ── Shared ref so the exit effect can stop every loop ──
  const hasExited = useRef(false);
  const loopsRef = useRef([]);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  const stopAllLoops = () => {
    loopsRef.current.forEach((l) => { try { l.stop(); } catch {} });
    loopsRef.current = [];
    floaterAnims.forEach((a) => { a.y.stopAnimation(); a.opacity.stopAnimation(); });
    dotAnims.forEach((d) => d.stopAnimation());
    logoBreathe.setValue(1);
    wiggle.setValue(0);
    msgShimmer.setValue(1);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      // — Logo entrance: spring fade + scale —
      Animated.parallel([
        Animated.spring(fadeIn, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();

      // — Title entrance —
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(titleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(titleSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]).start();

      // — Message entrance —
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(msgFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();

      // — Logo breathe: gentle scale pulse —
      const breatheLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(logoBreathe, { toValue: 1.06, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(logoBreathe, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      breatheLoop.start();

      // — Message shimmer: opacity pulse (starts after message appears) —
      const shimmerLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(msgShimmer, { toValue: 0.5, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(msgShimmer, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      shimmerLoop.start();

      // — Chef hat wiggle —
      const wiggleLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(wiggle, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: -1, duration: 120, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: 0.6, duration: 90, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: -0.4, duration: 90, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: 0, duration: 70, useNativeDriver: true }),
          Animated.delay(3000),
        ])
      );
      wiggleLoop.start();

      // Store all loops so exit + cleanup can stop them
      loopsRef.current = [breatheLoop, shimmerLoop, wiggleLoop];

      // — Floating food icons: fade in once, then loop float —
      floaterAnims.forEach((anim, i) => {
        const period = 2200 + i * 400;
        Animated.sequence([
          Animated.delay(floaters[i].delay),
          Animated.timing(anim.opacity, {
            toValue: isDark ? 0.18 : 0.12,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim.y, { toValue: -12, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(anim.y, { toValue: 6, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
          ),
        ]).start();
      });

      // — Loading dots —
      dotAnims.forEach((dotAnim, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 150),
            Animated.timing(dotAnim, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(dotAnim, { toValue: 0.35, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      stopAllLoops();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  // — Exit: stop every loop FIRST so values reset, then fade out —
  useEffect(() => {
    if (!minimumElapsed || !isReady || hasExited.current) return;
    hasExited.current = true;

    stopAllLoops();

    Animated.timing(exitFade, {
      toValue: 0,
      duration: 420,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onFinished) onFinished();
    });
  }, [isReady, minimumElapsed, onFinished]);

  const wiggleRotate = wiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const bgColor = colors.background;
  const brandTextColor = colors.text;
  const messageTextColor = colors.textMuted;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: exitFade, backgroundColor: bgColor }]}
      pointerEvents={blocksTouches ? 'auto' : 'none'}
    >
      {/* Floating food icons */}
      {floaters.map((f, i) => (
        <Animated.View
          key={f.id}
          style={[
            styles.floater,
            {
              left: f.x,
              top: f.y,
              opacity: floaterAnims[i].opacity,
              transform: [{ translateY: floaterAnims[i].y }],
            },
          ]}
        >
          <Ionicons name={f.icon} size={f.size} color={colors.primary} />
        </Animated.View>
      ))}

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo with breathe + wiggle */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: fadeIn,
              transform: [{ scale: logoScaleCombined }, { rotate: wiggleRotate }],
            },
          ]}
        >
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[
            styles.brandText,
            {
              opacity: titleFade,
              transform: [{ translateY: titleSlide }],
            },
          ]}
        >
          <Text style={{ color: brandTextColor }}>Cook</Text><Text style={{ color: colors.primary }}>Mate</Text>
        </Animated.Text>

        {/* Loading message with shimmer */}
        <Animated.Text
          style={[
            styles.message,
            {
              color: messageTextColor,
              opacity: msgOpacity,
            },
          ]}
        >
          {message}
        </Animated.Text>

        {/* Animated loading dots */}
        <Animated.View style={[styles.dots, { opacity: msgFade }]}>
          {dotAnims.map((dotAnim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.primary,
                  opacity: dotAnim,
                  transform: [{ scale: dotScales[i] }],
                },
              ]}
            />
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floater: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
  },
  logoWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  brandText: {
    fontFamily: 'PlayfairDisplay_800ExtraBold_Italic',
    fontSize: 36,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  message: {
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
