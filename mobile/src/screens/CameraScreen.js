import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  LayoutAnimation,
  Animated as RNAnimated,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { CameraAnalysisSkeleton, CameraPermissionSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { useNetwork, OFFLINE_MESSAGE } from '../offline/network';
import Animated from 'react-native-reanimated';
import { useCamera } from '../hooks/useCamera';
import { useCameraAnalysis } from '../hooks/useCameraAnalysis';
import { useCameraScanAnimation, PHASES as P } from '../hooks/useCameraScanAnimation';

const { width: SW } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { isOnline } = useNetwork();
  const isInitialLoading = useInitialContentLoading();

  /* ── Phase state ── */
  const [phase, setPhase] = useState(P.IDLE);
  const [capturedImage, setCapturedImage] = useState(null);
  const [currentOriginalImageData, setCurrentOriginalImageData] = useState(null);
  const [showMoreRecipes, setShowMoreRecipes] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [isResultHidden, setIsResultHidden] = useState(false);

  /* ── Hooks ── */
  const {
    hasPermission, type, pictureSize, cameraRef,
    configurePictureSize, toggleCameraType, takePicture: capturePhoto,
  } = useCamera();

  const {
    loading, setLoading,
    analysisResult, setAnalysisResult,
    analysisError, setAnalysisError,
    cutoutUri, setCutoutUri,
    bgRemovalDone, setBgRemovalDone,
    bgRemovalProgress, setBgRemovalProgress,
    queueStatus, setQueueStatus,
    cooldown,
    saves, setSaves,
    savesLoading, savesError, setSavesError,
    restoringSaveId,
    requestIdRef, savedRequestIdRef, savingRequestIdRef,
    isCurrentRequest,
    loadCameraSaves, analyzeImage, startBgRemoval,
    autoSaveResult, restoreSave: restoreSaveBase,
    deleteSave, clearAllSaves, newRequestId, stopQueuePolling,
  } = useCameraAnalysis();

  const {
    asScanLine, asImg, asCorner, asGlow, asSticker, asSp1, asSp2, asBadge,
    resultSlideY, resultOpacity, resultScale,
    resultPanResponder,
    hideResult: hideResultAnim, showResult: showResultAnim,
    reset, setRestoredDoneState,
  } = useCameraScanAnimation({
    phase, bgRemovalDone,
    onGoSelecting: () => setPhase(P.SELECTING),
    onGoSelected: () => setPhase(P.SELECTED),
    onGoSticker: () => setPhase(P.STICKER),
    onGoDone: () => setPhase(P.DONE),
  });

  /* ── Initial load ── */
  useEffect(() => {
    loadCameraSaves();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-save when capture reaches DONE phase ── */
  useEffect(() => {
    if (phase !== P.DONE || !capturedImage || !analysisResult || !bgRemovalDone || loading || !currentOriginalImageData) return;
    autoSaveResult({ capturedImage, cutoutUri, analysisResult, currentOriginalImageData, phase });
  }, [phase, capturedImage, cutoutUri, analysisResult, bgRemovalDone, loading, currentOriginalImageData]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Capture + analyze ── */
  const takePicture = async () => {
    if (cooldown > 0) return;
    const photo = await capturePhoto();
    if (!photo) return;

    const requestId = newRequestId();
    setLoading(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setCutoutUri(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('');
    setQueueStatus(null);
    setCurrentOriginalImageData(null);
    reset();
    setCapturedImage(photo.uri);
    setPhase(P.SCAN);

    if (photo.error === 'too_large') {
      setAnalysisError('Captured photo is too large. Move a little farther back or retake the photo in better light.');
      setBgRemovalDone(true); setBgRemovalProgress(''); setLoading(false);
      return;
    }
    if (!photo.base64) {
      setAnalysisError('Failed to capture image data. Please try again.');
      setBgRemovalDone(true); setBgRemovalProgress(''); setLoading(false);
      return;
    }

    setCurrentOriginalImageData(photo.base64);
    await startBgRemoval(photo.base64, requestId);
    if (isCurrentRequest(requestId)) await analyzeImage(photo.base64, requestId);
  };

  const handleRetake = () => {
    newRequestId();
    setCapturedImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setCutoutUri(null);
    setBgRemovalDone(false);
    setBgRemovalProgress('');
    setQueueStatus(null);
    setShowMoreRecipes(false);
    setCurrentOriginalImageData(null);
    setIsResultHidden(false);
    reset();
    setPhase(P.IDLE);
  };

  const hideResult = useCallback(() => {
    setIsResultHidden(true);
    hideResultAnim();
  }, [hideResultAnim]);

  const showResult = useCallback(() => {
    setIsResultHidden(false);
    showResultAnim();
  }, [showResultAnim]);

  const restoreSave = async (id) => {
    await restoreSaveBase(id, {
      onRestored: (saved, requestId) => {
        setCapturedImage(saved.originalImageData);
        setShowMoreRecipes(false);
        setCurrentOriginalImageData(null);
        setRestoredDoneState();
        setPhase(P.DONE);
        setShowSaves(false);
      },
    });
  };

  if (isInitialLoading || hasPermission === null) return <CameraPermissionSkeleton colors={colors} />;
  if (hasPermission === false) return (
    <View style={st.permWrap}><Text style={st.permText}>No access to camera. Please enable permissions in settings.</Text></View>
  );
  // Offline gate — AI Camera needs the server; block entry without touching camera logic.
  if (!isOnline) return (
    <View style={st.permWrap}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
      <Text style={[st.permText, { color: colors.text }]}>{OFFLINE_MESSAGE}</Text>
      <Text style={[st.permText, { color: colors.textMuted, marginTop: 8, fontSize: 12 }]}>
        Reconnect to the internet to use the AI Camera.
      </Text>
    </View>
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
  const otherRecipes = matchedRecipes.slice(1, 5);
  const noFoodDetected = analysisResult?.success === false || !hasDetectedIngredients;

  const toggleMoreRecipes = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMoreRecipes((prev) => !prev);
  };

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
              <View style={st.loadingCardWrap}>
                {queueStatus && (
                  <View style={st.queueBadge}>
                    <Text style={st.queueBadgeText}>
                      {queueStatus.queueLabel}
                      {queueStatus.queuePosition ? ` - Position ${queueStatus.queuePosition}` : ''}
                    </Text>
                  </View>
                )}
                <CameraAnalysisSkeleton colors={colors} />
              </View>
            </View>
          )}

          {/* Error state */}
          {showResults && analysisError && (
            <>
            <RNAnimated.View
              style={[
                st.resultSafe,
                {
                  transform: [{ translateY: resultSlideY }],
                  opacity: resultOpacity,
                },
              ]}
              pointerEvents={isResultHidden ? 'none' : 'box-none'}
              {...resultPanResponder.panHandlers}
            >
              <RNAnimated.View style={[st.resultCard, { backgroundColor: colors.surface }, { transform: [{ scale: resultScale }] }]}>
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
                  <TouchableOpacity onPress={handleRetake} disabled={cooldown > 0} style={[st.retakeBtn, { borderColor: colors.border }, cooldown > 0 && { opacity: 0.5 }]}>
                    <Text style={[st.retakeBtnText, { color: colors.text }]}>{cooldown > 0 ? `WAIT ${cooldown}s` : 'TRY AGAIN'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Swipe hint */}
                <View style={st.swipeHint}>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  <Text style={[st.swipeHintText, { color: colors.textMuted }]}>Swipe down to hide</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </View>
              </RNAnimated.View>
            </RNAnimated.View>

            {/* Floating restore button when hidden */}
            {isResultHidden && (
              <TouchableOpacity
                style={[st.restoreBtn, { backgroundColor: colors.surface }]}
                onPress={showResult}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-up" size={18} color={colors.primary} />
                <Text style={[st.restoreBtnText, { color: colors.text }]}>Show Results</Text>
                <Ionicons name="chevron-up" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            </>
          )}

          {/* Analysis result card — real data from backend */}
          {showResults && analysisResult && (
            <>
            <RNAnimated.View
              style={[
                st.resultSafe,
                {
                  transform: [{ translateY: resultSlideY }],
                  opacity: resultOpacity,
                },
              ]}
              pointerEvents={isResultHidden ? 'none' : 'box-none'}
              {...resultPanResponder.panHandlers}
            >
              <RNAnimated.View style={[st.resultCard, { backgroundColor: colors.surface }, { transform: [{ scale: resultScale }] }]}>
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
                      {queueStatus?.queueLabel ? ` - ${queueStatus.queueLabel}` : ''}
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
                  <View>
                    <View style={[st.recommendationBox, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed', borderColor: colors.border }]}>
                      <Text style={[st.recommendationLabel, { color: colors.textSubtle }]}>SUGGESTED RECIPE</Text>
                      <View style={st.recipeRowWithImage}>
                        {topRecipe.image_url ? (
                          <Image source={{ uri: topRecipe.image_url }} style={st.recipeThumb} resizeMode="cover" />
                        ) : (
                          <View style={[st.recipeThumb, st.recipeThumbPlaceholder]}><Ionicons name="restaurant" size={20} color={colors.textMuted} /></View>
                        )}
                        <View style={st.recipeRowDetails}>
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
                      </View>
                    </View>
                    {otherRecipes.length > 0 && (
                      <View>
                        <TouchableOpacity onPress={toggleMoreRecipes} style={st.moreRecipesToggle}>
                          <Ionicons
                            name={showMoreRecipes ? 'chevron-down' : 'chevron-up'}
                            size={18}
                            color={colors.primary}
                          />
                          <Text style={[st.moreRecipesToggleText, { color: colors.primary }]}>
                            {showMoreRecipes ? 'Hide' : `More Recipes (${otherRecipes.length})`}
                          </Text>
                          <Ionicons
                            name={showMoreRecipes ? 'chevron-down' : 'chevron-up'}
                            size={18}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        {showMoreRecipes && (
                          <ScrollView style={st.moreRecipesScroll} nestedScrollEnabled>
                            {otherRecipes.map((recipe) => (
                              <TouchableOpacity
                                key={recipe.id}
                                onPress={() => navigation.navigate('RecipeDetail', { id: recipe.id })}
                                style={[st.moreRecipeItem, { backgroundColor: isDark ? colors.surfaceAlt : '#fff7ed', borderColor: colors.border }]}
                              >
                                <View style={st.recipeRowWithImage}>
                                  {recipe.image_url ? (
                                    <Image source={{ uri: recipe.image_url }} style={st.recipeThumbSmall} resizeMode="cover" />
                                  ) : (
                                    <View style={[st.recipeThumbSmall, st.recipeThumbPlaceholder]}><Ionicons name="restaurant" size={16} color={colors.textMuted} /></View>
                                  )}
                                  <View style={st.recipeRowDetails}>
                                    <Text style={[st.recommendationTitle, { color: colors.text }]} numberOfLines={1}>{recipe.title}</Text>
                                    {!!recipe.description && (
                                      <Text style={[st.recommendationDesc, { color: colors.textMuted }]} numberOfLines={1}>
                                        {recipe.description}
                                      </Text>
                                    )}
                                    {recipe.matchedIngredients?.length > 0 && (
                                      <Text style={[st.ingredMatchText, { color: colors.primary }]}>
                                        Matched: {recipe.matchedIngredients.join(', ')}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
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
                  <TouchableOpacity onPress={handleRetake} disabled={cooldown > 0} style={[st.retakeBtn, { borderColor: colors.border }, cooldown > 0 && { opacity: 0.5 }]}>
                    <Text style={[st.retakeBtnText, { color: colors.text }]}>{cooldown > 0 ? `WAIT ${cooldown}s` : 'RETAKE'}</Text>
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

                {/* Swipe hint */}
                <View style={st.swipeHint}>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                  <Text style={[st.swipeHintText, { color: colors.textMuted }]}>Swipe down to hide</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </View>
              </RNAnimated.View>
            </RNAnimated.View>

            {/* Floating restore button when hidden */}
            {isResultHidden && (
              <TouchableOpacity
                style={[st.restoreBtn, { backgroundColor: colors.surface }]}
                onPress={showResult}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-up" size={18} color={colors.primary} />
                <Text style={[st.restoreBtnText, { color: colors.text }]}>Show Results</Text>
                <Ionicons name="chevron-up" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
            </>
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
                <Text style={st.hintText}>{cooldown > 0 ? `Please wait ${cooldown}s` : 'Point at ingredients or a dish'}</Text>
              </View>
              <View style={st.captureRow}>
                <TouchableOpacity style={st.sideBtn} onPress={() => { setShowSaves(true); loadCameraSaves(); }}>
                  <Ionicons name="images-outline" size={20} color="#fff" />
                  {saves.length > 0 && (
                    <View style={st.savesBadgeCount}>
                      <Text style={st.savesBadgeCountText}>{saves.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={takePicture} disabled={cooldown > 0} style={[st.captureOuter, cooldown > 0 && { opacity: 0.4 }]}><View style={st.captureInner} /></TouchableOpacity>
                <TouchableOpacity style={st.sideBtn}><Ionicons name="flash-outline" size={20} color="#fff" /></TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      )}
      {showSaves && (
        <View style={st.savesOverlay}>
          <SafeAreaView style={st.savesSafe}>
            <View style={st.savesHeader}>
              <Text style={st.savesTitle}>My Saves ({saves.length})</Text>
              <View style={st.savesHeaderRight}>
                {saves.length > 0 && (
                  <TouchableOpacity onPress={clearAllSaves}>
                    <Text style={st.savesClearText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowSaves(false)} style={st.savesCloseBtn}>
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            {savesLoading ? (
              <View style={st.savesEmpty}>
                <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={st.savesEmptyText}>Loading saved AI camera results...</Text>
              </View>
            ) : savesError ? (
              <View style={st.savesEmpty}>
                <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={st.savesEmptyText}>{savesError}</Text>
                <TouchableOpacity onPress={loadCameraSaves}>
                  <Text style={st.savesClearText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : saves.length > 0 ? (
              <ScrollView contentContainerStyle={st.savesGrid}>
                {saves.map(save => (
                  <View key={save.id} style={st.saveItem}>
                    <TouchableOpacity onPress={() => restoreSave(save.id)} disabled={restoringSaveId !== null} style={st.saveOpenBtn}>
                      {save.thumbnailImageData ? (
                        <Image source={{ uri: save.thumbnailImageData }} style={st.saveThumb} />
                      ) : (
                        <View style={st.saveThumbFallback}>
                          <Ionicons name="restaurant" size={22} color="rgba(255,255,255,0.55)" />
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSave(save.id)} style={st.saveDeleteBtn}>
                      <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.85)" />
                    </TouchableOpacity>
                    <View style={st.saveDateWrap}>
                      <Text style={st.saveDateText}>{new Date(save.createdAt).toLocaleDateString()}</Text>
                    </View>
                    {restoringSaveId === save.id && (
                      <View style={st.saveLoadingOverlay}>
                        <Text style={st.saveLoadingText}>Loading</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={st.savesEmpty}>
                <Ionicons name="images-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={st.savesEmptyText}>No saved AI camera results yet.</Text>
              </View>
            )}
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
  queueBadge: { marginBottom: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  queueBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 12, color: '#c2410c', textAlign: 'center' },
  loadingCardWrap: { position: 'absolute', left: 12, right: 12, bottom: 100 },
  resultSafe: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 150 },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  swipeHintText: { fontFamily: 'Geist_500Medium', fontSize: 11, letterSpacing: 0.3 },
  restoreBtn: {
    position: 'absolute',
    bottom: 140,
    left: '50%',
    marginLeft: -80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  restoreBtnText: { fontFamily: 'Geist_600SemiBold', fontSize: 13 },
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
  // ── More Recipes expandable
  moreRecipesToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: 16 },
  moreRecipesToggleText: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 1 },
  moreRecipesScroll: { maxHeight: 200, marginHorizontal: 16, marginBottom: 8 },
  moreRecipeItem: { padding: 10, borderWidth: 1, marginBottom: 8 },
  recipeRowWithImage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recipeRowDetails: { flex: 1 },
  recipeThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#e7e5e4' },
  recipeThumbSmall: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e7e5e4' },
  recipeThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  // ── My Saves
  savesBadgeCount: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  savesBadgeCountText: { fontFamily: 'Geist_700Bold', fontSize: 9, color: '#fff' },
  savesOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 50 },
  savesSafe: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  savesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8 },
  savesTitle: { fontFamily: 'Geist_700Bold', fontSize: 18, color: '#fff' },
  savesHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  savesClearText: { fontFamily: 'Geist_700Bold', fontSize: 11, color: '#f97316', letterSpacing: 0.5 },
  savesCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  savesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 100 },
  saveItem: { width: (SW - 56) / 3, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#292524' },
  saveOpenBtn: { width: '100%', height: '100%' },
  saveThumb: { width: '100%', height: '100%' },
  saveThumbFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#292524' },
  saveDeleteBtn: { position: 'absolute', top: 4, right: 4 },
  saveDateWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, backgroundColor: 'rgba(0,0,0,0.5)' },
  saveDateText: { fontFamily: 'Geist_400Regular', fontSize: 8, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  saveLoadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  saveLoadingText: { fontFamily: 'Geist_700Bold', fontSize: 9, color: '#fff', letterSpacing: 1 },
  savesEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  savesEmptyText: { fontFamily: 'Geist_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});
