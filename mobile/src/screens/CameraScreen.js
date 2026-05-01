import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { CameraAnalysisSkeleton, CameraPermissionSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { apiBaseUrl, mlApi } from '../api/api';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

const { width: SW } = Dimensions.get('window');


/* Phases: idle → scanning → selecting → selected → sticker → done */
const P = { IDLE: 0, SCAN: 1, SELECTING: 2, SELECTED: 3, STICKER: 4, DONE: 5 };
const MAX_CAMERA_BASE64_LENGTH = 7 * 1024 * 1024;
const TARGET_CAPTURE_MAX_EDGE = 1280;
const CAMERA_CAPTURE_QUALITY = 0.28;

function parsePictureSize(size) {
  const match = String(size || '').match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { size, width, height, maxEdge: Math.max(width, height) };
}

function chooseFastPictureSize(sizes) {
  if (!Array.isArray(sizes) || sizes.length === 0) return null;
  if (sizes.includes('1280x720')) return '1280x720';
  if (sizes.includes('Medium')) return 'Medium';

  const parsed = sizes.map(parsePictureSize).filter(Boolean);
  if (parsed.length === 0) return null;

  const atOrBelowTarget = parsed
    .filter((item) => item.maxEdge <= TARGET_CAPTURE_MAX_EDGE && item.maxEdge >= 640)
    .sort((a, b) => b.maxEdge - a.maxEdge);
  if (atOrBelowTarget[0]) return atOrBelowTarget[0].size;

  return parsed.sort((a, b) => a.maxEdge - b.maxEdge)[0].size;
}

function apiErrorMessage(err, fallback) {
  const serverError =
    typeof err.response?.data?.error === 'string' ? err.response.data.error : '';
  if (serverError) return serverError;
  if (err.code === 'ECONNABORTED') {
    return 'AI Camera is taking longer than usual. Please wait 1-2 minutes, then try again with a clearer photo.';
  }
  if (err.message === 'Network Error') {
    return `Cannot reach the CookMate API at ${apiBaseUrl}. Make sure the API server is running and your phone is on the same Wi-Fi network.`;
  }
  return err.message || fallback;
}


export default function CameraScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState('back');
  const [pictureSize, setPictureSize] = useState(null);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [phase, setPhase] = useState(P.IDLE);
  const [cutoutUri, setCutoutUri] = useState(null);
  const [bgRemovalDone, setBgRemovalDone] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState('');
  const cameraRef = useRef(null);
  const requestIdRef = useRef(0);
  const isInitialLoading = useInitialContentLoading();

  /* ── Animated values ── */
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

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const configurePictureSize = async () => {
    try {
      const sizes = await cameraRef.current?.getAvailablePictureSizesAsync?.();
      const nextPictureSize = chooseFastPictureSize(sizes);
      if (nextPictureSize) {
        setPictureSize(nextPictureSize);
      }
    } catch (err) {
      console.warn('[CameraScreen] picture size optimization skipped:', err?.message || err);
    }
  };

  const toggleCameraType = () => {
    setPictureSize(null);
    setType((current) => (current === 'back' ? 'front' : 'back'));
  };

  const reset = () => {
    scanY.value = -2; scanOpacity.value = 0; imgOpacity.value = 1;
    cornerOpacity.value = 0; cornerInset.value = 4;
    glowOpacity.value = 0; glowScale.value = 1.05;
    stickerScale.value = 0.4; stickerOpacity.value = 0; stickerRotate.value = -6;
    sparkle1.value = 0; sparkle2.value = 0; badgeOp.value = 0;
  };

  const goSel = () => setPhase(P.SELECTING);
  const goSeld = () => setPhase(P.SELECTED);
  const goStk = () => setPhase(P.STICKER);
  const goDone = () => setPhase(P.DONE);
  const isCurrentRequest = (requestId) => requestId === requestIdRef.current;

  /* ── Call backend API ── */
  const analyzeImage = async (base64, requestId) => {
    setLoading(true);
    try {
      const response = await mlApi.analyzeIngredients(base64);
      if (!isCurrentRequest(requestId)) return false;
      setAnalysisResult(response.data);
      setAnalysisError(null);
      return true;
    } catch (err) {
      if (!isCurrentRequest(requestId)) return false;
      console.warn('[CameraScreen] analyzeImage warning:', err);
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        setAnalysisError(serverMessage);
      } else {
        setAnalysisError(apiErrorMessage(err, 'Failed to analyze image.'));
      }
      setAnalysisResult(null);
      return false;
    } finally {
      if (isCurrentRequest(requestId)) setLoading(false);
    }
  };

  /* ── Call backend to remove background ── */
  const startBgRemoval = async (base64, requestId) => {
    setCutoutUri(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('Removing background...');

    try {
      const response = await mlApi.removeCameraBackground(base64);
      if (!isCurrentRequest(requestId)) return;
      const cutout =
        response.data?.cutout ||
        response.data?.cutoutUri ||
        response.data?.image ||
        null;

      if (cutout) {
        setCutoutUri(cutout);
      } else {
        console.warn('[CameraScreen] removeBackground returned no cutout.');
      }
    } catch (err) {
      if (!isCurrentRequest(requestId)) return;
      console.warn('[CameraScreen] removeBackground warning:', apiErrorMessage(err, 'Background removal is temporarily unavailable. The original photo will be used.'));
      // Keep the capture flow alive. The sticker stage will fall back to the framed photo.
    } finally {
      if (isCurrentRequest(requestId)) {
        setBgRemovalDone(true);
        setBgRemovalProgress('');
      }
    }
  };

  /* ── Phase animations ── */
  useEffect(() => {
    if (phase === P.SCAN) {
      scanOpacity.value = withTiming(1, { duration: 100 });
      badgeOp.value = withTiming(1, { duration: 200 });
      scanY.value = withTiming(102, { duration: 1100, easing: Easing.inOut(Easing.ease) },
        (f) => { if (f) { scanOpacity.value = withTiming(0, { duration: 150 }); runOnJS(goSel)(); } });
    }
    if (phase === P.SELECTING) {
      cornerOpacity.value = withTiming(1, { duration: 300 });
      cornerInset.value = withTiming(12, { duration: 800, easing: Easing.out(Easing.ease) });
      badgeOp.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => goSeld(), 1000);
      return () => clearTimeout(t);
    }
    if (phase === P.SELECTED) {
      imgOpacity.value = withTiming(0.15, { duration: 600 });
      glowOpacity.value = withTiming(1, { duration: 400 });
      glowScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
      cornerOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
      badgeOp.value = withTiming(1, { duration: 200 });
      const t = setTimeout(() => goStk(), bgRemovalDone ? 320 : 650);
      return () => clearTimeout(t);
    }
    if (phase === P.STICKER) {
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
      const t = setTimeout(() => goDone(), 1000);
      return () => clearTimeout(t);
    }
    if (phase === P.DONE) {
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
    transform: [{ scale: glowScale.value }],
    borderRadius: 22, overflow: 'hidden',
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

  /* ── Capture photo ── */
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setLoading(true);
        setAnalysisResult(null);
        setAnalysisError(null);
        setCutoutUri(null);
        setBgRemovalDone(false);
        setBgRemovalProgress('');
        reset();
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: CAMERA_CAPTURE_QUALITY,
          exif: false,
        });
        setCapturedImage(photo.uri);
        setPhase(P.SCAN);

        if (photo.base64) {
          if (photo.base64.length > MAX_CAMERA_BASE64_LENGTH) {
            setAnalysisError('Captured photo is too large. Move a little farther back or retake the photo in better light.');
            setBgRemovalDone(true);
            setBgRemovalProgress('');
            setLoading(false);
            return;
          }

          const b64 = `data:image/jpeg;base64,${photo.base64}`;
          await startBgRemoval(b64, requestId);
          if (isCurrentRequest(requestId)) {
            await analyzeImage(b64, requestId);
          }
        } else {
          setAnalysisError('Failed to capture image data. Please try again.');
          setBgRemovalDone(true);
          setBgRemovalProgress('');
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to take picture', e);
        setLoading(false);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    }
  };

  const handleRetake = () => {
    requestIdRef.current += 1;
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setCutoutUri(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('');
    setPhase(P.IDLE);
    reset();
  };

  if (isInitialLoading || hasPermission === null) return <CameraPermissionSkeleton colors={colors} />;
  if (hasPermission === false) return (
    <View style={st.permWrap}><Text style={st.permText}>No access to camera. Please enable permissions in settings.</Text></View>
  );

  const displayLabels = {
    [P.SCAN]: 'Scanning image...',
    [P.SELECTING]: 'Selecting object...',
    [P.SELECTED]: bgRemovalDone ? 'Object detected!' : bgRemovalProgress || 'Removing background...',
    [P.STICKER]: 'Sticker created!',
  };
  const labelBg = phase === P.SELECTED || phase === P.STICKER ? '#f97316' : 'rgba(0,0,0,0.6)';

  const showResults = phase === P.DONE && !loading;
  const detectedIngredients = analysisResult?.detectedIngredients || [];
  const hasDetectedIngredients = detectedIngredients.length > 0;
  const matchedRecipes = analysisResult?.matchedRecipes || [];
  const topRecipe = matchedRecipes[0] || null;
  const noFoodDetected = analysisResult?.success === false || !hasDetectedIngredients;

  return (
    <View style={st.root}>
      {capturedImage ? (
        <View style={st.flex1}>
          <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', backgroundColor: '#1c1917' }]}>

            {/* Original image — dims when selected */}
            <Animated.View style={[StyleSheet.absoluteFillObject, asImg]}>
              <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFillObject} />
            </Animated.View>

            {/* Scan line */}
            <Animated.View style={[asScanLine, st.scanLine]}>
              <View style={st.scanLineCore} />
            </Animated.View>

            {/* Corner brackets */}
            <Animated.View style={asCorner}>
              <View style={[st.cTL, st.corner]} />
              <View style={[st.cTR, st.corner]} />
              <View style={[st.cBL, st.corner]} />
              <View style={[st.cBR, st.corner]} />
            </Animated.View>

            {/* Object glow highlight */}
            <Animated.View style={asGlow}>
              <View style={st.glowBorder}>
                <Image source={{ uri: capturedImage }} style={st.glowImage} resizeMode="cover" />
              </View>
            </Animated.View>

            {/* Sticker — real cutout or fallback */}
            <Animated.View style={[st.stickerWrap, asSticker]}>
              <View style={st.stickerCard}>
                <View style={cutoutUri ? st.cutoutBorder : st.stickerBorder}>
                  <Image source={{ uri: cutoutUri || capturedImage }} style={cutoutUri ? st.cutoutImg : st.stickerImg} resizeMode={cutoutUri ? 'contain' : 'cover'} />
                </View>
              </View>
              <Animated.View style={[st.sp1, asSp1]}>
                <Ionicons name="sparkles" size={24} color="#f97316" />
              </Animated.View>
              <Animated.View style={[st.sp2, asSp2]}>
                <Ionicons name="sparkles" size={18} color="#fdba74" />
              </Animated.View>
            </Animated.View>

            {/* Phase badge */}
            {phase >= P.SCAN && phase <= P.STICKER && (
              <Animated.View style={[st.badgeWrap, asBadge]}>
                <View style={[st.badge, { backgroundColor: labelBg }]}>
                  <Ionicons name={phase <= P.SCAN ? 'scan-outline' : 'sparkles'} size={14}
                    color={phase >= P.SELECTED ? '#fff' : '#f97316'} />
                  <Text style={st.badgeText}>{displayLabels[phase] || ''}</Text>
                </View>
              </Animated.View>
            )}
          </View>

          {/* Loading overlay during AI analysis */}
          {loading && phase === P.DONE && (
            <View style={st.loadingOverlay}>
              <View style={st.loadingCardWrap}><CameraAnalysisSkeleton colors={colors} /></View>
            </View>
          )}

          {/* Error state */}
          {showResults && analysisError && (
            <SafeAreaView style={st.resultSafe} pointerEvents="box-none">
              <View style={[st.resultCard, { backgroundColor: colors.surface }]}>
                <View style={[st.resultHeader, { backgroundColor: '#b91c1c' }]}>
                  <View style={st.resultIconBox}>
                    <Ionicons name="alert-circle" size={16} color="#b91c1c" />
                  </View>
                  <View style={st.resultHeaderText}>
                    <Text style={st.resultTitle}>AI Camera Warning</Text>
                    <Text style={st.resultSub}>{analysisError}</Text>
                  </View>
                </View>
                <View style={st.resultActions}>
                  <TouchableOpacity onPress={handleRetake} style={[st.retakeBtn, { borderColor: colors.border }]}>
                    <Text style={[st.retakeBtnText, { color: colors.text }]}>TRY AGAIN</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          )}

          {/* Analysis result card — real data from backend */}
          {showResults && analysisResult && (
            <SafeAreaView style={st.resultSafe} pointerEvents="box-none">
              <View style={[st.resultCard, { backgroundColor: colors.surface }]}>
                <View style={st.resultHeader}>
                  <View style={st.resultIconBox}>
                    <Ionicons name="restaurant" size={16} color={colors.primary} />
                  </View>
                  <View style={st.resultHeaderText}>
                    <Text style={st.resultTitle}>Analysis Complete</Text>
                    <Text style={st.resultSub}>
                      {hasDetectedIngredients
                        ? `${detectedIngredients.length} ingredient${detectedIngredients.length !== 1 ? 's' : ''} detected`
                        : 'No ingredients detected'}
                    </Text>
                  </View>
                </View>

                {/* Detected ingredients with descriptions */}
                {detectedIngredients.length > 0 && (
                  <View style={st.ingredBadgeWrap}>
                    {detectedIngredients.map((ing) => (
                      <View key={ing.name} style={[st.ingredDetailBox, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4', borderColor: colors.border }]}>
                        <View style={st.ingredDetailRow}>
                          <Text style={[st.ingredDetailName, { color: colors.text }]}>{ing.name}</Text>
                          <Text style={[st.ingredDetailConf, { color: ing.confidence === 'high' ? '#059669' : ing.confidence === 'medium' ? '#d97706' : '#dc2626' }]}>{ing.confidence}</Text>
                        </View>
                        <Text style={[st.ingredDetailDesc, { color: colors.textMuted }]} numberOfLines={2}>{ing.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* No ingredients detected */}
                {detectedIngredients.length === 0 && (
                  <View style={{ padding: 16 }}>
                    <Text style={[st.resultSub, { color: colors.textMuted }]}>
                      {analysisResult.message || 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.'}
                    </Text>
                  </View>
                )}

                {topRecipe ? (
                  <View style={[st.recommendationBox, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed', borderColor: colors.border }]}>
                    <Text style={[st.recommendationLabel, { color: colors.textSubtle }]}>SUGGESTED RECIPES ({matchedRecipes.length})</Text>
                    <Text style={[st.recommendationTitle, { color: colors.text }]} numberOfLines={1}>{topRecipe.title}</Text>
                    {!!topRecipe.description && (
                      <Text style={[st.recommendationDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {topRecipe.description}
                      </Text>
                    )}
                    {topRecipe.matchedIngredients?.length > 0 && (
                      <Text style={[st.ingredMatchText, { color: colors.primary }]}>
                        Matched: {topRecipe.matchedIngredients.join(', ')}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={[st.recommendationBox, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4', borderColor: colors.border }]}>
                    <Text style={[st.recommendationLabel, { color: colors.textSubtle }]}>
                      {noFoodDetected ? 'NO FOOD ITEMS DETECTED' : 'NO DATABASE MATCH YET'}
                    </Text>
                    <Text style={[st.recommendationDesc, { color: colors.textMuted }]}>
                      {analysisResult.message || (noFoodDetected
                        ? 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.'
                        : 'CookMate found ingredients, but no published recipe in the database matches them yet.')}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View style={st.resultActions}>
                  <TouchableOpacity onPress={handleRetake} style={[st.retakeBtn, { borderColor: colors.border }]}>
                    <Text style={[st.retakeBtnText, { color: colors.text }]}>RETAKE</Text>
                  </TouchableOpacity>
                  {topRecipe ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('RecipeDetail', { id: topRecipe.id })}
                      style={[st.viewBtn, { backgroundColor: colors.primary }]}>
                      <Text style={st.viewBtnText}>VIEW RECIPE</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Search')}
                      style={[st.viewBtn, { backgroundColor: colors.primary }]}>
                      <Text style={st.viewBtnText}>BROWSE RECIPES</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SafeAreaView>
          )}
        </View>
      ) : (
        <View style={st.flex1}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing={type}
            pictureSize={pictureSize || undefined}
            onCameraReady={configurePictureSize}
            ref={cameraRef}
          />
          <SafeAreaView style={st.cameraSafe} pointerEvents="box-none">
            <View style={st.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={st.camBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleCameraType} style={st.camBtn}>
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={st.bottomBar}>
              <View style={st.hintPill}>
                <Text style={st.hintText}>Point at ingredients or a dish</Text>
              </View>
              <View style={st.captureRow}>
                <TouchableOpacity style={st.sideBtn}><Ionicons name="images-outline" size={20} color="#fff" /></TouchableOpacity>
                <TouchableOpacity onPress={takePicture} style={st.captureOuter}><View style={st.captureInner} /></TouchableOpacity>
                <TouchableOpacity style={st.sideBtn}><Ionicons name="flash-outline" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex1: { flex: 1 },
  permWrap: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 40 },
  permText: { fontFamily: 'Geist_400Regular', fontSize: 14, color: '#fff', textAlign: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  loadingCardWrap: { position: 'absolute', left: 12, right: 12, bottom: 100 },
  resultSafe: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 100 },
  resultCard: { overflow: 'hidden', borderRadius: 0 },
  resultHeader: { backgroundColor: '#24160f', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  resultIconBox: { width: 36, height: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  resultHeaderText: { flex: 1 },
  resultTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, color: '#fff' },
  resultSub: { fontFamily: 'Geist_400Regular', fontSize: 12, color: '#a8a29e', marginTop: 2 },
  ingredBadgeWrap: { flexDirection: 'column', gap: 6, padding: 16 },
  ingredBadge: { paddingHorizontal: 10, paddingVertical: 6 },
  ingredBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  ingredDetailBox: { width: '100%', padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 6 },
  ingredDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ingredDetailName: { fontFamily: 'Geist_700Bold', fontSize: 13, textTransform: 'capitalize' },
  ingredDetailConf: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  ingredDetailDesc: { fontFamily: 'Geist_400Regular', fontSize: 11, lineHeight: 16 },
  ingredMatchText: { fontFamily: 'Geist_400Regular', fontSize: 11, marginTop: 6, textTransform: 'capitalize' },
  recommendationBox: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderWidth: 1 },
  recommendationLabel: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.4, marginBottom: 6 },
  recommendationTitle: { fontFamily: 'Geist_700Bold', fontSize: 15, marginBottom: 4 },
  recommendationDesc: { fontFamily: 'Geist_400Regular', fontSize: 12, lineHeight: 17 },
  resultActions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
  retakeBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  retakeBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5 },
  viewBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  viewBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#fff' },
  cameraSafe: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  camBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  bottomBar: { alignItems: 'center', gap: 20 },
  hintPill: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  hintText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1, color: '#fff' },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  sideBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  captureOuter: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#f97316' },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f97316' },
  // ── Scan
  scanLine: { backgroundColor: 'rgba(249,115,22,0.9)', justifyContent: 'center', shadowColor: '#f97316', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
  scanLineCore: { height: 1, marginHorizontal: 42, backgroundColor: '#fff7ed', opacity: 0.95 },
  // ── Corners
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#f97316' },
  cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  // ── Glow
  glowBorder: {
    flex: 1, borderRadius: 20, overflow: 'hidden',
    borderWidth: 3, borderColor: '#f97316',
    shadowColor: '#f97316', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },
  glowImage: { width: '100%', height: '100%' },
  // ── Sticker
  stickerWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stickerCard: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 36, elevation: 24,
  },
  stickerBorder: { padding: 6, backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(249,115,22,0.3)',
  },
  stickerImg: { width: SW * 0.62, height: SW * 0.82, borderRadius: 17 },
  // Cutout-specific styles (transparent PNG with outline)
  cutoutBorder: { padding: 0, backgroundColor: 'transparent' },
  cutoutImg: { width: SW * 0.72, height: SW * 0.92 },
  sp1: { position: 'absolute', top: '10%', right: '8%' },
  sp2: { position: 'absolute', bottom: '10%', left: '10%' },
  // ── Badge
  badgeWrap: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 13, color: '#fff', letterSpacing: 0.5 },
});
