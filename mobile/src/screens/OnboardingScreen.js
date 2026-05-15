import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { profileApi } from '../api/api';

/* ── Step definitions (mirrors web Onboarding.tsx) ─────────────────── */
const STEPS = [
  {
    id: 'welcome',
    emoji: '👨‍🍳',
    emojiLabel: 'Chef',
    gradientStart: '#fb923c',
    gradientEnd:   '#fbbf24',
    title: 'Welcome to CookMate',
    description: 'Your personal AI-powered sous-chef. Discover, cook, and master Filipino and world recipes with ease.',
    cta: 'Get Started',
    skippable: true,
  },
  {
    id: 'discover',
    emoji: '🔍',
    emojiLabel: 'Search',
    gradientStart: '#fbbf24',
    gradientEnd:   '#facc15',
    title: 'Find Your Next Meal',
    description: 'Browse hundreds of recipes or search for exactly what you are craving — filtered by category, difficulty, and time.',
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'planner',
    emoji: '📅',
    emojiLabel: 'Planner',
    gradientStart: '#f97316',
    gradientEnd:   '#fb7185',
    title: 'Plan Your Week',
    description: "Add recipes to your weekly meal planner, generate a grocery list, and never wonder \"what's for dinner?\" again.",
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'ai-camera',
    emoji: '📷',
    emojiLabel: 'Camera',
    gradientStart: '#a78bfa',
    gradientEnd:   '#a855f7',
    title: 'Scan Your Ingredients',
    description: 'Point your camera at your fridge — our AI identifies ingredients and instantly suggests recipes you can make right now.',
    cta: 'Next',
    skippable: true,
  },
  {
    id: 'skill',
    emoji: '🎓',
    emojiLabel: 'Skill',
    gradientStart: '#34d399',
    gradientEnd:   '#14b8a6',
    title: "What's Your Cooking Level?",
    description: "We'll personalise your recipe recommendations based on your skill. You can always change this in your profile.",
    cta: 'Finish',
    skippable: false,
    isSkill: true,
  },
];

const SKILL_OPTIONS = [
  { level: 'Beginner',     emoji: '🌱', desc: "I'm just starting out — keep it simple!" },
  { level: 'Intermediate', emoji: '🍳', desc: 'I can follow most recipes confidently.' },
  { level: 'Advanced',     emoji: '⭐', desc: 'I love complex techniques and challenges.' },
];

/* ── Component ──────────────────────────────────────────────────────── */
export default function OnboardingScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { user, refreshUser } = useAuth();
  const { width } = useWindowDimensions();

  const [stepIndex, setStepIndex]     = useState(0);
  const [direction, setDirection]     = useState(1);   // 1 = forward, -1 = back
  const [skillLevel, setSkillLevel]   = useState(null);
  const [saving, setSaving]           = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((v) => {
      if (v === 'true') navigation.replace('Main');
    });
  }, [navigation]);

  const animateTransition = useCallback((nextIndex, dir) => {
    const outX = dir * -width * 0.45;
    const inX  = dir *  width * 0.45;

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: outX, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStepIndex(nextIndex);
      slideAnim.setValue(inX);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [slideAnim, fadeAnim, width]);

  const step     = STEPS[stepIndex];
  const isLast   = stepIndex === STEPS.length - 1;
  const isSkill  = Boolean(step.isSkill);
  const canGo    = !isSkill || skillLevel !== null;

  const finish = useCallback(async () => {
    setSaving(true);
    try {
      if (skillLevel && user?.id) {
        await profileApi.updateProfile(user.id, { cooking_skill_level: skillLevel });
        await refreshUser?.();
        await AsyncStorage.setItem('userSkillLevel', skillLevel);
      }
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Main');
  }, [skillLevel, user, navigation, refreshUser]);

  const goNext = useCallback(async () => {
    if (isLast) { await finish(); return; }
    setDirection(1);
    animateTransition(stepIndex + 1, 1);
  }, [isLast, stepIndex, animateTransition, finish]);

  const goBack = useCallback(() => {
    if (stepIndex === 0) return;
    setDirection(-1);
    animateTransition(stepIndex - 1, -1);
  }, [stepIndex, animateTransition]);

  const skip = useCallback(async () => {
    await finish();
  }, [finish]);

  const styles = useMemo(() => createStyles(colors, isDark, width), [colors, isDark, width]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: isDark ? '#0c0a09' : '#fafaf9' }]}>

      {/* ── Card ─────────────────────────────────────────────────── */}
      <View style={styles.wrapper}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1c1917' : '#ffffff' }]}>

          {/* Illustration area */}
          <View style={[styles.illus, { backgroundColor: step.gradientStart }]}>
            {/* Decorative blobs */}
            <View style={styles.blob1} />
            <View style={styles.blob2} />

            {/* Back button */}
            {stepIndex > 0 && (
              <Pressable
                onPress={goBack}
                style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={18} color="#fff" />
              </Pressable>
            )}

            {/* Step counter */}
            <View style={styles.stepCounter}>
              <Text style={styles.stepCounterText}>{stepIndex + 1} / {STEPS.length}</Text>
            </View>

            {/* Animated emoji */}
            <Animated.Text
              style={[styles.emoji, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
              accessibilityLabel={step.emojiLabel}
            >
              {step.emoji}
            </Animated.Text>
          </View>

          {/* Content area */}
          <View style={styles.body}>

            {/* Progress dots */}
            <View style={styles.dots}>
              {STEPS.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === stepIndex   && styles.dotActive,
                    idx < stepIndex     && styles.dotPast,
                  ]}
                />
              ))}
            </View>

            {/* Slide-animated text */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.desc}>{step.description}</Text>

              {/* Skill picker */}
              {isSkill && (
                <View style={styles.skillList}>
                  {SKILL_OPTIONS.map(({ level, emoji, desc }) => {
                    const sel = skillLevel === level;
                    return (
                      <Pressable
                        key={level}
                        onPress={() => setSkillLevel(level)}
                        style={({ pressed }) => [
                          styles.skillRow,
                          sel && styles.skillRowActive,
                          { opacity: pressed ? 0.85 : 1,
                            borderColor: sel
                              ? '#f97316'
                              : isDark ? '#44403c' : '#e7e5e4' },
                        ]}
                      >
                        <Text style={styles.skillEmoji}>{emoji}</Text>
                        <View style={styles.skillInfo}>
                          <Text style={[styles.skillLabel,
                            { color: sel ? (isDark ? '#fdba74' : '#c2410c') : (isDark ? '#e7e5e4' : '#1c1917') }]}>
                            {level}
                          </Text>
                          <Text style={styles.skillDesc}>{desc}</Text>
                        </View>
                        <View style={[styles.radio,
                          { borderColor: sel ? '#f97316' : isDark ? '#57534e' : '#d6d3d1',
                            backgroundColor: sel ? '#f97316' : 'transparent' }]}>
                          {sel && <Ionicons name="checkmark" size={11} color="#fff" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={goNext}
                disabled={!canGo || saving}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  canGo && !saving
                    ? { backgroundColor: '#f97316', opacity: pressed ? 0.88 : 1 }
                    : styles.primaryBtnDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>{step.cta}</Text>
                    <Ionicons name="chevron-forward" size={17} color="#fff" style={{ marginLeft: 6 }} />
                  </>
                )}
              </Pressable>

              {step.skippable && (
                <Pressable
                  onPress={skip}
                  disabled={saving}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={styles.skipText}>Skip for now</Text>
                </Pressable>
              )}
            </View>

          </View>
        </View>

        {/* Brand footer */}
        <Text style={styles.brand}>CookMate · Your AI Kitchen Companion</Text>
      </View>
    </SafeAreaView>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */
function createStyles(colors, isDark, screenWidth) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wrapper: {
      width: Math.min(screenWidth - 32, 420),
      alignItems: 'center',
    },
    card: {
      width: '100%',
      borderRadius: 28,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: isDark ? 0.45 : 0.12,
      shadowRadius: 24,
      elevation: 10,
    },

    /* Illustration */
    illus: {
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    blob1: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.10)',
      top: -30,
      right: -30,
    },
    blob2: {
      position: 'absolute',
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.10)',
      bottom: -20,
      left: -20,
    },
    backBtn: {
      position: 'absolute',
      top: 14,
      left: 14,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCounter: {
      position: 'absolute',
      top: 14,
      right: 14,
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    stepCounterText: {
      color: '#fff',
      fontFamily: 'Geist_700Bold',
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    emoji: {
      fontSize: 90,
    },

    /* Content */
    body: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
    },

    /* Dots */
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 20,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? '#44403c' : '#e7e5e4',
    },
    dotActive: {
      width: 24,
      backgroundColor: '#f97316',
    },
    dotPast: {
      backgroundColor: isDark ? '#92400e' : '#fdba74',
    },

    /* Text */
    title: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 22,
      letterSpacing: -0.4,
      color: isDark ? '#fafaf9' : '#1c1917',
      textAlign: 'center',
      marginBottom: 8,
    },
    desc: {
      fontFamily: 'Geist_400Regular',
      fontSize: 14,
      lineHeight: 21,
      color: isDark ? '#a8a29e' : '#78716c',
      textAlign: 'center',
    },

    /* Skill picker */
    skillList: {
      marginTop: 20,
      gap: 10,
    },
    skillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: 'transparent',
    },
    skillRowActive: {
      backgroundColor: isDark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
    },
    skillEmoji: {
      fontSize: 26,
      marginRight: 12,
    },
    skillInfo: {
      flex: 1,
    },
    skillLabel: {
      fontFamily: 'Geist_700Bold',
      fontSize: 14,
    },
    skillDesc: {
      fontFamily: 'Geist_400Regular',
      fontSize: 11,
      color: isDark ? '#78716c' : '#a8a29e',
      marginTop: 1,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Actions */
    actions: {
      marginTop: 22,
      gap: 8,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 18,
    },
    primaryBtnDisabled: {
      backgroundColor: isDark ? '#292524' : '#e7e5e4',
    },
    primaryBtnText: {
      fontFamily: 'Geist_800ExtraBold',
      fontSize: 14,
      color: '#fff',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    skipText: {
      fontFamily: 'Geist_500Medium',
      fontSize: 13,
      color: isDark ? '#57534e' : '#a8a29e',
      textAlign: 'center',
      paddingVertical: 6,
    },

    /* Brand footer */
    brand: {
      marginTop: 20,
      fontFamily: 'Geist_700Bold',
      fontSize: 9,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: isDark ? '#44403c' : '#d6d3d1',
      textAlign: 'center',
    },
  });
}
