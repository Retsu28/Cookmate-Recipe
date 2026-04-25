import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SPLASH_DURATION = 2400;

const FOOD_ICONS = [
  'restaurant',
  'flame',
  'nutrition',
  'leaf',
  'cafe',
  'pizza',
  'ice-cream',
  'fish',
];

function buildFloaters() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    icon: FOOD_ICONS[i % FOOD_ICONS.length],
    x: ((8 + ((i * 37) % 80)) / 100) * SCREEN_W,
    y: ((10 + ((i * 47) % 70)) / 100) * SCREEN_H,
    size: 22 + (i % 4) * 6,
    delay: i * 220,
  }));
}

export default function SplashScreen({ colors, isDark, onFinished }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(14)).current;
  const msgFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;
  const wiggle = useRef(new Animated.Value(0)).current;

  const dotAnims = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  const floaterAnims = useRef(
    Array.from({ length: 10 }, () => ({
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  const floaters = useMemo(() => buildFloaters(), []);

  useEffect(() => {
    // — Logo entrance: spring fade + scale —
    Animated.parallel([
      Animated.spring(fadeIn, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // — Title entrance —
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // — Message entrance —
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(msgFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // — Chef hat wiggle loop —
    const runWiggle = () => {
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(wiggle, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 120, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0.6, duration: 90, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -0.4, duration: 90, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(3000),
      ]).start(({ finished }) => {
        if (finished) runWiggle();
      });
    };
    runWiggle();

    // — Floating food icons —
    floaterAnims.forEach((anim, i) => {
      Animated.sequence([
        Animated.delay(floaters[i].delay),
        Animated.timing(anim.opacity, {
          toValue: isDark ? 0.18 : 0.12,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      const floatLoop = () => {
        Animated.sequence([
          Animated.timing(anim.y, {
            toValue: -12,
            duration: 1800 + i * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: 8,
            duration: 1600 + i * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim.y, {
            toValue: 0,
            duration: 1400 + i * 200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) floatLoop();
        });
      };
      const t = setTimeout(() => floatLoop(), floaters[i].delay);
      return () => clearTimeout(t);
    });

    // — Loading dots —
    dotAnims.forEach((dotAnim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0.35,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // — Auto-dismiss after duration —
    const exitTimer = setTimeout(() => {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && onFinished) onFinished();
      });
    }, SPLASH_DURATION);

    return () => clearTimeout(exitTimer);
  }, []);

  const wiggleRotate = wiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const bgColor = isDark ? colors.background : '#fff7ed';
  const brandTextColor = isDark ? '#fafaf9' : colors.text;
  const messageTextColor = isDark ? '#e7e5e4' : colors.textMuted;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: exitFade, backgroundColor: bgColor }]}
      pointerEvents="none"
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
        {/* Logo box — matches Login branding */}
        <Animated.View
          style={[
            styles.logoBox,
            {
              backgroundColor: colors.primary,
              opacity: fadeIn,
              transform: [{ scale: logoScale }, { rotate: wiggleRotate }],
            },
          ]}
        >
          <Ionicons name="restaurant" size={40} color="#fff" />
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[
            styles.brandText,
            {
              color: brandTextColor,
              opacity: titleFade,
              transform: [{ translateY: titleSlide }],
            },
          ]}
        >
          CookMate
        </Animated.Text>

        {/* Loading message */}
        <Animated.Text
          style={[styles.message, { color: messageTextColor, opacity: msgFade }]}
        >
          Cooking up something delicious…
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
                  transform: [
                    {
                      scale: dotAnim.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [1, 1.5],
                      }),
                    },
                  ],
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
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brandText: {
    fontFamily: 'Geist_800ExtraBold',
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
