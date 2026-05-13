import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { apiBaseUrl } from '../api/api';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Parse recipe instructions into steps format
function parseInstructions(instructions) {
  if (!instructions || !Array.isArray(instructions) || instructions.length === 0) {
    return null;
  }
  return instructions.map((text, idx) => ({
    number: idx + 1,
    text: String(text).trim(),
    time: null,
  }));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export default function CookingModeScreen({ route, navigation }) {
  const { recipe } = route.params;
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoRef = useRef(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Completion celebration animation values
  const completionScale = useSharedValue(0);
  const completionOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);

  // Use normalized steps from RecipeDetail, or parse raw instructions, or empty
  const parsedSteps = recipe.steps?.length > 0
    ? recipe.steps
    : parseInstructions(recipe.instructions);
  const hasInstructions = parsedSteps !== null && parsedSteps.length > 0;
  const steps = parsedSteps || [];
  const timestamps = recipe.instruction_timestamps || [];
  const progress = hasInstructions ? ((currentStep + 1) / steps.length) * 100 : 0;

  // Get video URL from recipe
  const videoUrl = recipe.video_filename
    ? `${apiBaseUrl}/uploads/mp4/${recipe.video_filename}`
    : null;

  // Seek to timestamp when step changes
  useEffect(() => {
    if (videoRef.current && timestamps[currentStep] && !videoError) {
      const startTime = timestamps[currentStep].start || 0;
      videoRef.current.setPositionAsync(startTime * 1000).catch(() => {}); // ms
      videoRef.current.playAsync().catch(() => {});
    }
  }, [currentStep, timestamps, videoError]);

  // Show alert if no instructions available
  useEffect(() => {
    if (!hasInstructions) {
      Alert.alert(
        'No Cooking Instructions',
        'This recipe doesn\'t have detailed step-by-step instructions yet.',
        [
          { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' },
          { text: 'Stay Anyway', onPress: () => {} },
        ]
      );
    }
  }, [hasInstructions, navigation]);

  // Timer countdown
  useEffect(() => {
    if (!showTimer || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setShowTimer(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer, timerSeconds]);

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = useCallback(() => {
    setIsCompleted(true);
    // Trigger celebration animations
    completionScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    completionOpacity.value = withTiming(1, { duration: 300 });
    iconScale.value = withSequence(
      withDelay(200, withSpring(1, { damping: 12, stiffness: 300 })),
      withDelay(100, withSpring(1.1, { damping: 8, stiffness: 200 })),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    iconRotate.value = withDelay(300, withTiming(360, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, []);

  // Animated styles for completion celebration
  const completionContainerStyle = useAnimatedStyle(() => ({
    opacity: completionOpacity.value,
  }));

  const completionContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completionScale.value }],
  }));

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const handleCompleteAndExit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const currentTimestamp = timestamps[currentStep];
  const segmentDuration = currentTimestamp
    ? (currentTimestamp.end - currentTimestamp.start)
    : 0;

  const startTimer = () => {
    setTimerSeconds(segmentDuration > 0 ? segmentDuration : 300); // default 5 min
    setShowTimer(true);
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={st.flex1}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle} numberOfLines={1}>{recipe.title}</Text>
            <Text style={st.headerSub}>Step {currentStep + 1} of {steps.length}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress bar */}
        <View style={st.progressWrap}>
          <View style={st.progressBg}>
            <View style={[st.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Main Content - Video + Step Layout */}
        <View style={st.mainContent}>
          {/* Video Section - Top half on mobile */}
          <View style={st.videoSection}>
            {videoUrl && !videoError ? (
              <View style={st.videoContainer}>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={st.video}
                  useNativeControls
                  resizeMode="contain"
                  isLooping={false}
                  onError={handleVideoError}
                />
              </View>
            ) : (
              <View style={[st.videoContainer, st.noVideo]}>
                <Ionicons name="videocam-off" size={48} color="#57534e" />
                <Text style={st.noVideoText}>No video available</Text>
              </View>
            )}

            {/* Timer Button - Below video */}
            {currentTimestamp && (
              <TouchableOpacity style={st.timerBtn} onPress={startTimer}>
                <Ionicons name="timer" size={18} color="#fff" />
                <Text style={st.timerBtnText}>
                  {showTimer ? formatTime(timerSeconds) : 'Timer'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step Text Section - Bottom half */}
          <View style={st.stepSection}>
            <View style={st.stepHeader}>
              <View style={st.stepBadge}>
                <Text style={st.stepBadgeText}>{steps[currentStep].number}</Text>
              </View>
              <View>
                <Text style={st.stepLabel}>CURRENT STEP</Text>
                {currentTimestamp && (
                  <Text style={st.timestampText}>
                    {formatTime(currentTimestamp.start)} - {formatTime(currentTimestamp.end)}
                  </Text>
                )}
              </View>
            </View>

            <Text style={st.stepText}>{steps[currentStep].text}</Text>
          </View>
        </View>

        {/* Footer - Previous / Next */}
        <View style={st.footer}>
          <TouchableOpacity
            onPress={handlePrevious}
            disabled={currentStep === 0}
            style={[st.prevBtn, currentStep === 0 && { opacity: 0.3 }]}
          >
            <Text style={st.prevBtnText}>Previous</Text>
          </TouchableOpacity>

          <View>
            <Text style={st.stepCount}>{currentStep + 1} / {steps.length}</Text>
          </View>

          {currentStep === steps.length - 1 ? (
            <TouchableOpacity onPress={handleFinish} style={[st.nextBtn, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={st.nextBtnText}>Finish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleNext} style={st.nextBtn}>
              <Text style={st.nextBtnText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
      {/* Completion Celebration Overlay */}
      {isCompleted && (
        <Animated.View style={[st.completionOverlay, completionContainerStyle]}>
          <Animated.View style={[st.completionContent, completionContentStyle]}>
            <Animated.View style={[st.completionIconCircle, iconContainerStyle]}>
              <Ionicons name="checkmark" size={64} color="#22c55e" />
            </Animated.View>
            <Text style={st.completionTitle}>Delicious!</Text>
            <Text style={st.completionSubtitle}>
              You've completed cooking{'\n'}
              <Text style={st.completionRecipeName}>{recipe.title}</Text>
            </Text>
            <View style={st.completionStats}>
              <View style={st.statItem}>
                <Ionicons name="list" size={20} color="#a8a29e" />
                <Text style={st.statText}>{steps.length} steps</Text>
              </View>
              <View style={st.statItem}>
                <Ionicons name="time" size={20} color="#a8a29e" />
                <Text style={st.statText}>{recipe.total_time_minutes || recipe.time || '--'} min</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleCompleteAndExit} style={st.completionButton}>
              <Text style={st.completionButtonText}>Back to Recipe</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  flex1: { flex: 1 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontFamily: 'Geist_700Bold', fontSize: 15, color: '#fff' },
  headerSub: { fontFamily: 'Geist_400Regular', fontSize: 11, color: '#a8a29e', marginTop: 2 },
  // Progress
  progressWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#f97316', borderRadius: 2 },
  // Main Content
  mainContent: { flex: 1, flexDirection: 'column' },
  // Video Section
  videoSection: { flex: 1, padding: 12, alignItems: 'center' },
  videoContainer: { 
    flex: 1, 
    width: '100%', 
    backgroundColor: '#000', 
    borderRadius: 16, 
    overflow: 'hidden',
    justifyContent: 'center'
  },
  video: { width: '100%', height: '100%' },
  noVideo: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c1917' },
  noVideoText: { color: '#57534e', marginTop: 8, fontFamily: 'Geist_400Regular', fontSize: 14 },
  timerBtn: { 
    marginTop: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: '#f97316', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 999,
    alignSelf: 'center'
  },
  timerBtnText: { fontFamily: 'Geist_700Bold', fontSize: 13, color: '#fff' },
  // Step Section
  stepSection: { padding: 16, paddingTop: 8 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepBadge: { 
    width: 48, 
    height: 48, 
    backgroundColor: '#f97316', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 24 
  },
  stepBadgeText: { fontFamily: 'Geist_800ExtraBold', fontSize: 20, color: '#fff' },
  stepLabel: { fontFamily: 'Geist_600SemiBold', fontSize: 10, color: '#78716c', letterSpacing: 0.5 },
  timestampText: { fontFamily: 'Geist_500Medium', fontSize: 12, color: '#fb923c', marginTop: 2 },
  stepText: { fontFamily: 'Geist_500Medium', fontSize: 22, color: '#fff', lineHeight: 30 },
  // Footer
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(255,255,255,0.1)', 
    backgroundColor: '#0c0a09' 
  },
  prevBtn: { 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 999 
  },
  prevBtnText: { fontFamily: 'Geist_700Bold', fontSize: 13, color: '#fff' },
  stepCount: { fontFamily: 'Geist_500Medium', fontSize: 13, color: '#78716c' },
  nextBtn: { 
    backgroundColor: '#f97316', 
    paddingHorizontal: 28, 
    paddingVertical: 12, 
    borderRadius: 999 
  },
  nextBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff' },
  // Completion Overlay
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completionIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  completionTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 36,
    color: '#fff',
    marginBottom: 12,
  },
  completionSubtitle: {
    fontFamily: 'Geist_400Regular',
    fontSize: 16,
    color: '#a8a29e',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  completionRecipeName: {
    fontFamily: 'Geist_600SemiBold',
    color: '#fff',
  },
  completionStats: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 40,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
    color: '#a8a29e',
  },
  completionButton: {
    backgroundColor: '#f97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 999,
  },
  completionButtonText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
