import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Floating food icons ─────────────────────────────────────────────
const ICON_NAMES = [
  'restaurant-outline',
  'flame-outline',
  'nutrition-outline',
  'leaf-outline',
  'pizza-outline',
  'cafe-outline',
  'ice-cream-outline',
  'fish-outline',
];

function buildFloaters(count = 10) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: i,
      icon: ICON_NAMES[i % ICON_NAMES.length],
      left: `${8 + ((i * 37) % 80)}%`,
      top: `${8 + ((i * 53) % 78)}%`,
      size: 18 + (i % 4) * 5,
      delay: i * 350,
      duration: 4000 + (i % 5) * 1200,
      opacity: 0.12 + (i % 4) * 0.04,
    });
  }
  return items;
}

const FLOATERS = buildFloaters();

// ── Animated floating icon ──────────────────────────────────────────
function FloatingIcon({ icon, size, left, top, delay, duration, opacity, color }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay, duration]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
  const rotate = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '8deg', '-8deg'] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 0.95] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        opacity,
        transform: [{ translateY }, { rotate }, { scale }],
      }}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Animated.View>
  );
}

// ── Animated gradient blob (simple pulsing circle) ──────────────────
function GradientBlob({ color, size, top, left, delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 15, -10] });
  const translateY = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -12, 8] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top,
        left,
        transform: [{ scale }, { translateX }, { translateY }],
      }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function AuthVisualPanel({
  collapsed = false,
  onToggle,
  heading = 'Cook smarter.',
  subheading = 'Plan meals, discover recipes, and let AI be your sous-chef.',
}) {
  const { colors, isDark } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(collapsed ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: collapsed ? 0 : 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [collapsed, fadeAnim]);

  const panelHeight = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  const panelOpacity = fadeAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.5, 1],
  });

  const panelBg = isDark ? 'rgba(28, 25, 23, 0.58)' : 'rgba(255, 255, 255, 0.46)';
  const blobColor1 = isDark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.15)';
  const blobColor2 = isDark ? 'rgba(251,146,60,0.10)' : 'rgba(251,146,60,0.12)';
  const iconColor = isDark ? '#fb923c' : '#f97316';

  return (
    <View>
      {/* Toggle button */}
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle?.();
        }}
        style={({ pressed }) => [
          styles.toggleBtn,
          {
            backgroundColor: isDark ? colors.surfaceAlt : '#fff',
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        accessibilityLabel={collapsed ? 'Expand visual panel' : 'Collapse visual panel'}
      >
        <Ionicons
          name={collapsed ? 'chevron-down-outline' : 'chevron-up-outline'}
          size={16}
          color={colors.textMuted}
        />
        <Text style={[styles.toggleText, { color: colors.textMuted }]}>
          {collapsed ? 'Show' : 'Hide'}
        </Text>
      </Pressable>

      {/* Animated panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            height: panelHeight,
            opacity: panelOpacity,
            backgroundColor: panelBg,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
            overflow: 'hidden',
          },
        ]}
      >
        {/* Gradient blobs */}
        <GradientBlob color={blobColor1} size={140} top="-10%" left="5%" delay={0} />
        <GradientBlob color={blobColor2} size={110} top="40%" left="60%" delay={1500} />

        {/* Floating icons */}
        {FLOATERS.map((f) => (
          <FloatingIcon key={f.id} {...f} color={iconColor} />
        ))}

        {/* Center content */}
        <View style={styles.content}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Ionicons name="restaurant" size={22} color="#fff" />
          </View>
          <Text style={[styles.heading, { color: isDark ? colors.text : '#1c1917' }]}>
            {heading}
          </Text>
          <Text style={[styles.subheading, { color: isDark ? colors.textMuted : '#78716c' }]}>
            {subheading}
          </Text>

          {/* Feature pills */}
          <View style={styles.pillRow}>
            {['AI Recipes', 'Meal Plans', 'Smart Pantry'].map((tag) => (
              <View
                key={tag}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)',
                    borderColor: isDark ? 'rgba(251,146,60,0.25)' : 'rgba(253,186,116,0.5)',
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: isDark ? colors.textMuted : '#44403c' }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  toggleText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  panel: {
    borderRadius: 20,
    marginHorizontal: 4,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heading: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subheading: {
    fontFamily: 'Geist_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    paddingHorizontal: 16,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 10,
  },
});
