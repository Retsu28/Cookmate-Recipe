import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '../context/ThemeContext';
import OptimizedImage from '../components/OptimizedImage';

export default function StartCookingSplashScreen({ route, navigation }) {
  const { recipe } = route.params;
  const { colors } = useAppTheme();

  // Animation values
  const fadeIn = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const slideUp = useSharedValue(30);
  const iconRotate = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Entrance animations
    fadeIn.value = withTiming(1, { duration: 600, easing: Easing.ease });
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) });
    slideUp.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1.2)) });

    // Icon rotation
    iconRotate.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(360, { duration: 800, easing: Easing.out(Easing.cubic) })
    );

    // Pulse animation for the cooking icon
    pulse.value = withSequence(
      withDelay(800, withTiming(1.2, { duration: 400 })),
      withTiming(1, { duration: 400 }),
      withDelay(200, withTiming(1.1, { duration: 300 })),
      withTiming(1, { duration: 300 })
    );

    // Navigate to cooking mode after delay
    const timer = setTimeout(() => {
      navigation.replace('CookingMode', { recipe });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${iconRotate.value}deg` },
      { scale: pulse.value },
    ],
  }));

  const getImageUrl = () => {
    if (recipe.image_url) return recipe.image_url;
    if (recipe.image) return recipe.image;
    return null;
  };

  // Calculate step count for display
  const stepCount = recipe.steps?.length
    || (recipe.instructions?.length || 0);
  const hasInstructions = stepCount > 0;

  return (
    <View style={[styles.root, { backgroundColor: '#0a0a0a' }]}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Recipe Image with gradient overlay */}
          <View style={styles.imageContainer}>
            {getImageUrl() ? (
              <OptimizedImage
                source={{ uri: getImageUrl() }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholderImage, { backgroundColor: colors.primary }]}>
                <Ionicons name="restaurant" size={64} color="#fff" />
              </View>
            )}
            {/* Dark gradient overlay */}
            <View style={styles.gradientOverlay} />
          </View>

          {/* Content overlay */}
          <View style={styles.contentOverlay}>
            {/* Cooking Icon */}
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="flame" size={40} color="#fff" />
              </View>
            </Animated.View>

            {/* Text Content */}
            <Animated.View style={[styles.textContainer, textStyle]}>
              <Text style={styles.readyText}>Ready to cook?</Text>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {recipe.title}
              </Text>
              <Text style={styles.subtitle}>
                {recipe.total_time_minutes
                  ? `${recipe.total_time_minutes} min • `
                  : recipe.time
                    ? `${recipe.time} • `
                    : ''}
                {recipe.difficulty || 'Medium'} • {recipe.servings || 4} servings • {stepCount} {stepCount === 1 ? 'step' : 'steps'}
              </Text>
              {!hasInstructions && (
                <View style={styles.warningBadge}>
                  <Ionicons name="warning" size={12} color="#f59e0b" />
                  <Text style={styles.warningText}>No instructions available</Text>
                </View>
              )}
            </Animated.View>

            {/* Bottom section with progress indicator */}
            <View style={styles.bottomSection}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: '100%',
                    },
                  ]}
                />
              </View>
              <Text style={styles.loadingText}>Starting cooking mode...</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  readyText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 18,
    color: '#a8a29e',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  recipeTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'Geist_400Regular',
    fontSize: 14,
    color: '#d6d3d1',
    textAlign: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 60,
    left: 48,
    right: 48,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#a8a29e',
    letterSpacing: 0.5,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 12,
  },
  warningText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
    color: '#f59e0b',
  },
});
