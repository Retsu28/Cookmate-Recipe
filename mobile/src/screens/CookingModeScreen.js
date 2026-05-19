import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  PanResponder,
  Linking,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setIsAudioActiveAsync } from 'expo-audio';
import { reviewApi } from '../api/api';
import { getLocalVideoPath, getLocalTimestamps, getLocalInstructions } from '../offline/recipeDownload';
import { isOnlineNow } from '../offline/network';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// Use expo-video (same as AuthVideoBackground) for consistency in standalone builds
let VideoView = null;
let useVideoPlayer = null;
try {
  const mod = require('expo-video');
  VideoView = mod.VideoView;
  useVideoPlayer = mod.useVideoPlayer;
} catch {
  // Native module not available
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function CookingVideoSection({ videoUrl, videoLoading, videoError, isPlaying, setVideoLoading, setVideoError, setIsPlaying, currentTimestamp, intervalTimeLeft, showIntervalComplete }) {
  // Always call hook unconditionally — Rules of Hooks.
  const player = useVideoPlayer(videoUrl, (p) => {
    try {
      p.loop = false;
      p.muted = false;
      p.play();
    } catch (err) {
      console.error('[CookingVideo] setup error:', err);
      setVideoError(true);
      setVideoLoading(false);
    }
  });

  // Seek to the start of this step's timestamp when the step changes
  useEffect(() => {
    if (!player || !currentTimestamp) return;
    try {
      const seekTo = currentTimestamp.start ?? 0;
      player.currentTime = seekTo;
      player.play();
    } catch (e) {
      console.log('[CookingVideo] Seek error (ignored):', e);
    }
  }, [currentTimestamp]);

  // Monitor player status
  useEffect(() => {
    if (!player) return;
    let statusListener;
    try {
      statusListener = player.addListener('statusChange', ({ status, error }) => {
        try {
          if (status === 'readyToPlay' || status === 'playing' || status === 'paused') {
            setVideoLoading(false);
            setVideoError(false);
            setIsPlaying(status === 'playing');
          } else if (status === 'error') {
            console.error('[CookingVideo] Player error:', error);
            setVideoError(true);
            setVideoLoading(false);
          } else if (status === 'idle') {
            if ((player.duration || 0) <= 0) setVideoLoading(true);
          }
        } catch (e) {
          console.error('[CookingVideo] Status handler error:', e);
        }
      });
    } catch (e) {
      console.error('[CookingVideo] Listener error:', e);
    }

    if ((player.duration || 0) > 0) setVideoLoading(false);

    const timeoutId = setTimeout(() => {
      setVideoLoading((c) => {
        if (c) {
          if ((player.duration || 0) <= 0) setVideoError(true);
          return false;
        }
        return c;
      });
    }, 10000);

    return () => {
      try { statusListener?.remove(); } catch (e) { /* ignore */ }
      clearTimeout(timeoutId);
    };
  }, [player]);

  if (videoError) {
    return (
      <View style={[st.videoContainer, st.noVideo]}>
        <Ionicons name="alert-circle" size={48} color="#57534e" />
        <Text style={st.noVideoText}>Video failed to load</Text>
      </View>
    );
  }

  return (
    <View style={st.videoContainer}>
      {videoLoading && (
        <View style={st.videoLoading}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      )}
      <VideoView
        player={player}
        style={st.video}
        nativeControls={false}
        contentFit="cover"
        allowsPictureInPicture={false}
        allowsFullscreen={true}
        renderMode="texture"
      />
      <TouchableOpacity
        style={st.videoOverlay}
        activeOpacity={1}
        onPress={() => {
          try {
            if (isPlaying) { player.pause(); } else { player.play(); }
            setIsPlaying(!isPlaying);
          } catch (e) { /* ignore */ }
        }}
      >
        {!isPlaying && !videoLoading && (
          <View style={st.playPauseBtn}>
            <Ionicons name="play" size={48} color="#fff" />
          </View>
        )}
        {isPlaying && !videoLoading && (
          <View style={[st.playPauseBtn, st.playPauseBtnHidden]}>
            <Ionicons name="pause" size={48} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
      {currentTimestamp && (
        <View style={st.timerCircleWrap}>
          <View style={[
            st.timerCircle,
            showIntervalComplete && st.timerCircleComplete
          ]}>
            <Text style={[st.timerCircleTime, showIntervalComplete && st.timerCircleTimeComplete]}>
              {Math.floor(intervalTimeLeft / 60)}:{String(intervalTimeLeft % 60).padStart(2, '0')}
            </Text>
            <Text style={[st.timerCircleLabel, showIntervalComplete && st.timerCircleLabelComplete]}>
              {showIntervalComplete ? 'Done!' : 'Interval'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

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
  const { recipe } = route.params || {};
  
  // Guard against invalid recipe data
  if (!recipe || !recipe.id) {
    console.error('[CookingMode] Invalid recipe data:', recipe);
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, color: '#dc2626' }}>Error: Recipe not found</Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20, padding: 12, backgroundColor: '#f97316', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [celebRating, setCelebRating] = useState(0);
  const [celebComment, setCelebComment] = useState('');
  const [celebSubmitting, setCelebSubmitting] = useState(false);
  const [celebSubmitted, setCelebSubmitted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // Interval timer state (like web)
  const [intervalTimeLeft, setIntervalTimeLeft] = useState(0);
  const [showIntervalComplete, setShowIntervalComplete] = useState(false);
  const [addedTime, setAddedTime] = useState(0);

  // Offline video path for offline cooking mode
  const [offlineVideoPath, setOfflineVideoPath] = useState(null);

  // Completion celebration animation values
  const completionScale = useSharedValue(0);
  const completionOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);

  // Fallback timestamps/instructions loaded from offline_meta.json if recipe object is incomplete
  const [metaTimestamps, setMetaTimestamps] = useState(null);
  const [metaInstructions, setMetaInstructions] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!recipe.instruction_timestamps?.length || !recipe.instructions?.length) {
      Promise.all([
        getLocalTimestamps(recipe.id).catch(() => null),
        getLocalInstructions(recipe.id).catch(() => null),
      ]).then(([ts, ins]) => {
        if (cancelled) return;
        if (ts?.length) setMetaTimestamps(ts);
        if (ins?.length) setMetaInstructions(ins);
      });
    }
    return () => { cancelled = true; };
  }, [recipe.id]);

  // Use normalized steps from RecipeDetail, or parse raw instructions, or empty
  const effectiveInstructions = recipe.instructions?.length ? recipe.instructions : (metaInstructions || []);
  const parsedSteps = recipe.steps?.length > 0
    ? recipe.steps
    : parseInstructions(effectiveInstructions);
  const hasInstructions = parsedSteps !== null && parsedSteps.length > 0;
  const steps = parsedSteps || [];
  const timestamps = recipe.instruction_timestamps?.length
    ? recipe.instruction_timestamps
    : (metaTimestamps || []);
  const progress = hasInstructions ? ((currentStep + 1) / steps.length) * 100 : 0;

  // Capture network state once on mount — avoids stale snapshot from isOnlineNow()
  // which may read true on cold start in airplane mode before NetInfo.fetch() resolves.
  const [isOffline, setIsOffline] = useState(() => !isOnlineNow());
  useEffect(() => {
    let cancelled = false;
    import('@react-native-community/netinfo').then(({ default: NetInfo }) => {
      NetInfo.fetch().then((state) => {
        if (cancelled) return;
        const online = state.isConnected === true && state.isInternetReachable !== false;
        setIsOffline(!online);
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Get video URL - recipe.video_filename is already a local file:// path when downloaded
  // (RecipeDetailScreen replaces it before navigating).
  // Only fall back to async-loaded offlineVideoPath as secondary.
  const passedLocalVideo = recipe.video_filename?.startsWith('file://') ? recipe.video_filename : null;
  const resolvedOfflinePath = offlineVideoPath
    ? (offlineVideoPath.startsWith('file://') ? offlineVideoPath : `file://${offlineVideoPath}`)
    : null;
  const videoUrl = isOffline
    ? (passedLocalVideo || resolvedOfflinePath || null)
    : (recipe.video_filename || null);

  // Parse video credits: stored as "AuthorName|URL"
  const videoCreditsParts = (recipe.video_credits || '').split('|');
  const creditAuthor = videoCreditsParts[0]?.trim() || '';
  const creditUrl = videoCreditsParts[1]?.trim() || '';

  // Bell sound refs
  const bellSoundRef = useRef(null);
  const bellIntervalRef = useRef(null);
  const bellFinishedRef = useRef(true);

  const stopBellSound = useCallback(async () => {
    if (bellIntervalRef.current) {
      clearInterval(bellIntervalRef.current);
      bellIntervalRef.current = null;
    }
    bellFinishedRef.current = true;
    if (bellSoundRef.current) {
      try {
        bellSoundRef.current.remove();
      } catch (e) {
        // ignore
      }
      bellSoundRef.current = null;
    }
  }, []);

  // Interval timer based on timestamps: (end - start) + interval (like web)
  useEffect(() => {
    if (!timestamps || !timestamps[currentStep]) {
      setIntervalTimeLeft(0);
      setShowIntervalComplete(false);
      return;
    }

    const timestamp = timestamps[currentStep];
    const start = timestamp.start || 0;
    const end = timestamp.end || start;
    const videoDuration = Math.max(0, end - start);
    const additionalInterval = timestamp.interval || 0;
    const totalIntervalSeconds = videoDuration + additionalInterval + addedTime;

    setIntervalTimeLeft(totalIntervalSeconds);
    setShowIntervalComplete(false);

    if (totalIntervalSeconds <= 0) return;

    const timer = setInterval(() => {
      setIntervalTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowIntervalComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStep, timestamps, addedTime]);

  // Load offline video path on mount (secondary fallback if RecipeDetailScreen didn't pass it)
  useEffect(() => {
    let cancelled = false;
    getLocalVideoPath(recipe.id).then((videoPath) => {
      if (!cancelled && videoPath) {
        setOfflineVideoPath(videoPath);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [recipe.id]);

  // Play bell sound once when interval completes — same as web useEffect on showIntervalComplete
  useEffect(() => {
    if (!showIntervalComplete) return;
    playBellSound();
  }, [showIntervalComplete]);

  // Play bell sound using expo-audio — always use bundled asset (works online and offline).
  // The bundled require() is resolved at build time and never needs network access.
  const playBellSound = useCallback(async () => {
    await stopBellSound();
    try {
      await setIsAudioActiveAsync(true);
      const soundSource = require('../../sound/custom_sound.wav');
      const player = createAudioPlayer(soundSource);
      bellSoundRef.current = player;
      bellFinishedRef.current = false;
      player.play();
      setTimeout(() => { stopBellSound(); }, 5000);
    } catch (err) {
      console.log('[CookingMode] Bell sound error:', err);
    }
  }, [stopBellSound]);

  // Text-to-speech — wrapped in try/catch; some Android TTS engines try network offline.
  const speak = useCallback((text) => {
    try {
      Speech.stop();
      Speech.speak(text, { rate: 0.92, pitch: 1.05, language: 'en-US' });
    } catch (e) {
      console.log('[CookingMode] Speech error (ignored):', e);
    }
  }, []);

  useEffect(() => {
    if (steps[currentStep]?.text) {
      speak(steps[currentStep].text);
    }
    return () => {
      try { Speech.stop(); } catch (e) { /* ignore */ }
    };
  }, [currentStep, steps, speak]);

  const safeGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('RecipeDetail', { id: recipe.id });
    }
  }, [navigation, recipe.id]);

  // Show alert if no instructions available
  useEffect(() => {
    if (!hasInstructions) {
      Alert.alert(
        'No Cooking Instructions',
        'This recipe doesn\'t have detailed step-by-step instructions yet.',
        [
          { text: 'Go Back', onPress: () => safeGoBack(), style: 'cancel' },
          { text: 'Stay Anyway', onPress: () => {} },
        ]
      );
    }
  }, [hasInstructions, safeGoBack]);

  const handlePrevious = () => {
    if (currentStep > 0) {
      stopBellSound();
      setAddedTime(0);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setAddedTime(0);
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = useCallback(() => {
    stopBellSound();
    setCelebRating(0);
    setCelebComment('');
    setCelebSubmitted(false);
    setIsCompleted(true);
    Speech.stop();
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

  const handleCelebSubmit = useCallback(async () => {
    if (celebRating < 1) return;
    setCelebSubmitting(true);
    try {
      if (isOnlineNow()) {
        await reviewApi.submitReview(recipe.id, { rating: celebRating, comment: celebComment.trim() || undefined });
      }
      setCelebSubmitted(true);
    } catch {
      setCelebSubmitted(true); // still dismiss — user can review from recipe page later
    } finally {
      setCelebSubmitting(false);
    }
  }, [celebRating, celebComment, recipe.id]);

  const handleCompleteAndExit = useCallback(async () => {
    stopBellSound();
    try { Speech.stop(); } catch (e) { /* ignore */ }
    if (isOnlineNow()) {
      try { await reviewApi.markCooked(recipe.id); } catch { /* ignore */ }
    }
    safeGoBack();
  }, [navigation, stopBellSound, recipe.id, safeGoBack]);

  // Swipe navigation (like web touch swipe)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe right - previous
          handlePrevious();
        } else if (gestureState.dx < -50) {
          // Swipe left - next
          if (currentStep < steps.length - 1 && (intervalTimeLeft === 0 || showIntervalComplete)) {
            handleNext();
          }
        }
      },
    })
  ).current;

  const currentTimestamp = timestamps[currentStep];
  const canGoNext = intervalTimeLeft === 0 || showIntervalComplete || !currentTimestamp;

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={st.flex1}>
        {/* Exit Confirmation Dialog */}
        {showExitConfirm && (
          <View style={st.exitOverlay}>
            <View style={st.exitDialog}>
              <Text style={st.exitTitle}>Exit Cooking Mode?</Text>
              <Text style={st.exitSubtitle}>Your progress will be lost. Are you sure you want to exit?</Text>
              <View style={st.exitButtons}>
                <TouchableOpacity
                  onPress={() => setShowExitConfirm(false)}
                  style={[st.exitBtn, st.exitBtnSecondary]}
                >
                  <Text style={st.exitBtnSecondaryText}>Keep Cooking</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { stopBellSound(); try { Speech.stop(); } catch(e){} safeGoBack(); }}
                  style={[st.exitBtn, st.exitBtnDanger]}
                >
                  <Text style={st.exitBtnDangerText}>Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => setShowExitConfirm(true)} style={st.closeBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle} numberOfLines={1}>{recipe.title}</Text>
            <Text style={st.headerSub}>Step {currentStep + 1} of {steps.length}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress bar */}
        <View style={st.progressBarRow}>
          <View style={st.progressBg}>
            <View style={[st.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Main Content - Video top half + Step bottom half */}
        <View style={st.mainContent} {...panResponder.panHandlers}>
          {/* Video Section - only mount CookingVideoSection when expo-video is available AND we have a url */}
          <View style={st.videoSection}>
            {videoUrl && useVideoPlayer && VideoView ? (
              <CookingVideoSection
                videoUrl={videoUrl}
                videoLoading={videoLoading}
                videoError={videoError}
                isPlaying={isPlaying}
                setVideoLoading={setVideoLoading}
                setVideoError={setVideoError}
                setIsPlaying={setIsPlaying}
                currentTimestamp={currentTimestamp}
                intervalTimeLeft={intervalTimeLeft}
                showIntervalComplete={showIntervalComplete}
              />
            ) : (
              <View style={[st.videoContainer, st.noVideo]}>
                <Ionicons name={videoError ? "alert-circle" : "videocam-off"} size={48} color="#57534e" />
                <Text style={st.noVideoText}>
                  {videoError ? 'Video failed to load' : isOffline ? 'Video not available offline' : 'No video available'}
                </Text>
              </View>
            )}
          </View>

          {/* Video Credits */}
          {videoUrl && creditAuthor ? (
            <View style={st.creditsRow}>
              <View style={st.creditsYtIcon}>
                <Text style={st.creditsYtIconText}>▶</Text>
              </View>
              <Text style={st.creditsLabel}>Subscribe to </Text>
              <TouchableOpacity
                onPress={() => creditUrl ? Linking.openURL(creditUrl) : null}
                activeOpacity={creditUrl ? 0.6 : 1}
              >
                <Text style={[st.creditsName, creditUrl && st.creditsNameLink]}>
                  "{creditAuthor}"
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Step Text Section - Bottom half */}
          <View style={st.stepSection}>
            <View style={st.stepHeader}>
              <View style={st.stepBadge}>
                <Text style={st.stepBadgeText}>{steps[currentStep].number}</Text>
              </View>
              <View style={st.stepHeaderText}>
                <Text style={st.stepLabel}>CURRENT STEP</Text>
                {currentTimestamp && (
                  <Text style={st.timestampText}>
                    {formatTime(currentTimestamp.start)} - {formatTime(currentTimestamp.end)}
                  </Text>
                )}
              </View>
              {/* TTS Button */}
              <TouchableOpacity
                onPress={() => speak(steps[currentStep].text)}
                style={st.ttsBtn}
              >
                <Ionicons name="volume-high" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={st.stepText}>{steps[currentStep].text}</Text>
          </View>
        </View>

        {/* Interval Complete Banner */}
        {currentTimestamp && showIntervalComplete && (
          <View style={st.intervalBanner}>
            <Text style={st.intervalBannerText}>Interval Complete! Proceed to Next Step?</Text>
          </View>
        )}

        {/* Add Time Buttons - only when timestamps exist */}
        {currentTimestamp && (
          <View style={st.addTimeRow}>
            <TouchableOpacity
              onPress={() => { stopBellSound(); setAddedTime(prev => prev + 60); }}
              style={st.addTimeBtn}
            >
              <Text style={st.addTimeBtnText}>+1 min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { stopBellSound(); setAddedTime(prev => prev + 300); }}
              style={st.addTimeBtn}
            >
              <Text style={st.addTimeBtnText}>+5 min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { stopBellSound(); setAddedTime(0); }}
              style={st.resetTimeBtn}
            >
              <Text style={st.resetTimeBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>
        )}

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
            <TouchableOpacity
              onPress={handleFinish}
              disabled={!canGoNext}
              style={[st.nextBtn, { backgroundColor: '#22c55e' }, !canGoNext && { opacity: 0.4 }]}
            >
              <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={st.nextBtnText}>Finish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canGoNext}
              style={[st.nextBtn, !canGoNext && { opacity: 0.4 }]}
            >
              <Text style={st.nextBtnText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
      {/* Completion Celebration Overlay */}
      {isCompleted && (
        <Animated.View style={[st.completionOverlay, completionContainerStyle]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }} keyboardShouldPersistTaps="handled">
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

                {/* Inline quick review */}
                <View style={st.celebReviewCard}>
                  {celebSubmitted ? (
                    <View style={{ alignItems: 'center', paddingVertical: 12, gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
                      <Text style={{ fontFamily: 'Geist_600SemiBold', color: '#22c55e', fontSize: 14 }}>Review submitted!</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={st.celebReviewLabel}>How was this recipe? <Text style={{ color: '#78716c' }}>(optional)</Text></Text>
                      {/* Star row */}
                      <View style={st.celebStarRow}>
                        {[1,2,3,4,5].map(i => (
                          <TouchableOpacity key={i} onPress={() => setCelebRating(i)} activeOpacity={0.7}>
                            <Ionicons
                              name={i <= celebRating ? 'star' : 'star-outline'}
                              size={32}
                              color={i <= celebRating ? '#f97316' : '#57534e'}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      {/* Comment input */}
                      <TextInput
                        value={celebComment}
                        onChangeText={t => setCelebComment(t.slice(0, 500))}
                        placeholder="Add a comment... (optional)"
                        placeholderTextColor="#57534e"
                        multiline
                        numberOfLines={3}
                        style={st.celebCommentInput}
                      />
                      {/* Buttons */}
                      <View style={st.celebBtnRow}>
                        <TouchableOpacity
                          onPress={handleCelebSubmit}
                          disabled={celebRating < 1 || celebSubmitting}
                          style={[st.celebSubmitBtn, (celebRating < 1 || celebSubmitting) && { opacity: 0.4 }]}
                        >
                          {celebSubmitting
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={st.celebSubmitBtnText}>Submit Review</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCompleteAndExit} style={st.celebSkipBtn}>
                          <Text style={st.celebSkipBtnText}>Skip</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>

                {celebSubmitted && (
                  <TouchableOpacity onPress={handleCompleteAndExit} style={st.completionButton}>
                    <Text style={st.completionButtonText}>Back to Recipe</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  flex1: { flex: 1 },
  // Exit Dialog
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitDialog: {
    backgroundColor: '#1c1917',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  exitTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, color: '#fff', marginBottom: 8 },
  exitSubtitle: { fontFamily: 'Geist_400Regular', fontSize: 14, color: '#a8a29e', textAlign: 'center', marginBottom: 20 },
  exitButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  exitBtn: { flex: 1, paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  exitBtnSecondary: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  exitBtnSecondaryText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff' },
  exitBtnDanger: { backgroundColor: '#ef4444' },
  exitBtnDangerText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontFamily: 'Geist_700Bold', fontSize: 15, color: '#fff' },
  headerSub: { fontFamily: 'Geist_400Regular', fontSize: 11, color: '#a8a29e', marginTop: 2 },
  // Progress bar (slim, below header)
  progressBarRow: { paddingHorizontal: 0, backgroundColor: 'transparent' },
  progressBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#f97316' },
  // Circular Timer - absolute on video top-right
  timerCircleWrap: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
  },
  timerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(12,10,9,0.75)',
    borderWidth: 3,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircleComplete: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  timerCircleTime: { fontFamily: 'Geist_800ExtraBold', fontSize: 20, color: '#f97316' },
  timerCircleTimeComplete: { color: '#fff' },
  timerCircleLabel: { fontFamily: 'Geist_500Medium', fontSize: 10, color: '#78716c' },
  timerCircleLabelComplete: { color: 'rgba(255,255,255,0.8)' },
  // Main Content
  mainContent: { flex: 1, flexDirection: 'column' },
  // Video Section - top half, fixed height, edge-to-edge
  videoSection: { height: SCREEN_HEIGHT * 0.42, width: '100%' },
  videoContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  videoLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 1,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  playPauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseBtnHidden: { opacity: 0.3 },
  noVideo: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c1917' },
  noVideoText: { color: '#57534e', marginTop: 8, fontFamily: 'Geist_400Regular', fontSize: 14 },
  // Video Credits
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    paddingTop: 2,
  },
  creditsYtIcon: {
    width: 16,
    height: 12,
    backgroundColor: '#f97316',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  creditsYtIconText: { color: '#fff', fontSize: 7, lineHeight: 12 },
  creditsLabel: { fontFamily: 'Geist_400Regular', fontSize: 11, color: '#57534e' },
  creditsName: { fontFamily: 'Geist_600SemiBold', fontSize: 11, color: '#78716c' },
  creditsNameLink: { color: '#f97316', textDecorationLine: 'underline' },
  // Step Section
  stepSection: { padding: 16, paddingTop: 8 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepHeaderText: { flex: 1 },
  stepBadge: { 
    width: 56, 
    height: 56, 
    backgroundColor: '#f97316', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 28 
  },
  stepBadgeText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, color: '#fff' },
  stepLabel: { fontFamily: 'Geist_600SemiBold', fontSize: 10, color: '#78716c', letterSpacing: 0.5 },
  timestampText: { fontFamily: 'Geist_500Medium', fontSize: 12, color: '#fb923c', marginTop: 2 },
  stepText: { fontFamily: 'Geist_500Medium', fontSize: 22, color: '#fff', lineHeight: 30 },
  ttsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Interval Banner
  intervalBanner: {
    backgroundColor: 'rgba(249,115,22,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  intervalBannerText: { fontFamily: 'Geist_700Bold', fontSize: 12, color: '#fb923c' },
  // Add Time Buttons
  addTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  addTimeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
  },
  addTimeBtnText: { fontFamily: 'Geist_600SemiBold', fontSize: 12, color: '#fff' },
  resetTimeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 999,
  },
  resetTimeBtnText: { fontFamily: 'Geist_600SemiBold', fontSize: 12, color: '#fff' },
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
    paddingHorizontal: 24,
    width: '100%',
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
    marginBottom: 20,
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
  celebReviewCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  celebReviewLabel: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#d6d3d1',
    textAlign: 'center',
    marginBottom: 14,
  },
  celebStarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  celebCommentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e7e5e4',
    fontFamily: 'Geist_400Regular',
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 72,
    marginBottom: 14,
  },
  celebBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  celebSubmitBtn: {
    flex: 1,
    backgroundColor: '#f97316',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebSubmitBtnText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  celebSkipBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebSkipBtnText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 14,
    color: '#a8a29e',
  },
});
