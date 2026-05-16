import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function formatRlCountdown(secs) {
  if (secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${s}s`;
}

const AI_CAMERA_RATE_LIMIT = 3;

export default function CameraResultCard({
  colors,
  isDark,
  analysisResult,
  analysisError,
  rateLimitInfo,
  rlCountdown,
  cooldown,
  queueStatus,
  showMoreRecipes,
  toggleMoreRecipes,
  handleRetake,
  navigation,
}) {
  const rlRemaining = rateLimitInfo?.remaining ?? null;
  const rlColor = rlRemaining === 0 ? '#dc2626' : rlRemaining === 1 ? '#d97706' : '#f97316';
  const rlBg = rlRemaining === 0 ? 'rgba(220,38,38,0.15)' : rlRemaining === 1 ? 'rgba(217,119,6,0.15)' : 'rgba(249,115,22,0.12)';
  const rlBorder = rlRemaining === 0 ? 'rgba(220,38,38,0.4)' : rlRemaining === 1 ? 'rgba(217,119,6,0.4)' : 'rgba(249,115,22,0.3)';

  if (analysisError) {
    return (
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
          <TouchableOpacity
            onPress={handleRetake}
            disabled={cooldown > 0 || rlRemaining === 0}
            style={[st.retakeBtn, { borderColor: colors.border }, (cooldown > 0 || rlRemaining === 0) && { opacity: 0.5 }]}
          >
            <Text style={[st.retakeBtnText, { color: colors.text }]}>
              {cooldown > 0 ? `WAIT ${cooldown}s` : rlRemaining === 0 ? 'LIMIT REACHED' : 'TRY AGAIN'}
            </Text>
          </TouchableOpacity>
        </View>
        <SwipeHint colors={colors} />
      </View>
    );
  }

  if (!analysisResult) return null;

  const detectedIngredients = analysisResult.detectedIngredients || [];
  const hasDetectedIngredients = detectedIngredients.length > 0;
  const matchedRecipes = analysisResult.matchedRecipes || [];
  const topRecipe = matchedRecipes[0] || null;
  const otherRecipes = matchedRecipes.slice(1, 5);
  const noFoodDetected = analysisResult.success === false || !hasDetectedIngredients;

  return (
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
            {queueStatus?.queueLabel ? ` · ${queueStatus.queueLabel}` : ''}
          </Text>
        </View>
      </View>

      {rateLimitInfo !== null && (
        <View style={[st.resultRlPill, { backgroundColor: rlBg, borderColor: rlBorder }]}>
          <View style={[st.rlDot, { backgroundColor: rlColor }]} />
          <Text style={[st.resultRlText, { color: rlColor }]}>
            {rlRemaining === 0
              ? rlCountdown > 0 ? `Daily limit reached — resets in ${formatRlCountdown(rlCountdown)}` : 'Daily limit reached — resets tomorrow'
              : `${rlRemaining} / ${AI_CAMERA_RATE_LIMIT} AI analyses remaining today`}
          </Text>
          <View style={st.rlBars}>
            {Array.from({ length: AI_CAMERA_RATE_LIMIT }).map((_, i) => (
              <View
                key={i}
                style={[st.rlBar, { backgroundColor: i < (AI_CAMERA_RATE_LIMIT - rlRemaining) ? rlColor : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') }]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Detected ingredients */}
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

      {/* No ingredients */}
      {detectedIngredients.length === 0 && (
        <View style={{ padding: 16 }}>
          <Text style={[st.resultSub, { color: colors.textMuted }]}>
            {analysisResult.message || 'No recognizable cooking ingredient was detected. Please retake or upload a clearer ingredient photo.'}
          </Text>
        </View>
      )}

      {/* Suggested recipe or empty state */}
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
                <Ionicons name={showMoreRecipes ? 'chevron-down' : 'chevron-up'} size={18} color={colors.primary} />
                <Text style={[st.moreRecipesToggleText, { color: colors.primary }]}>
                  {showMoreRecipes ? 'Hide' : `More Recipes (${otherRecipes.length})`}
                </Text>
                <Ionicons name={showMoreRecipes ? 'chevron-down' : 'chevron-up'} size={18} color={colors.primary} />
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
        <TouchableOpacity onPress={handleRetake} disabled={cooldown > 0 || rlRemaining === 0} style={[st.retakeBtn, { borderColor: colors.border }, (cooldown > 0 || rlRemaining === 0) && { opacity: 0.5 }]}>
          <Text style={[st.retakeBtnText, { color: colors.text }]}>{cooldown > 0 ? `WAIT ${cooldown}s` : rlRemaining === 0 ? 'LIMIT REACHED' : 'RETAKE'}</Text>
        </TouchableOpacity>
        {topRecipe ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('RecipeDetail', { id: topRecipe.id })}
            style={[st.viewBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={st.viewBtnText}>VIEW RECIPE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            style={[st.viewBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={st.viewBtnText}>BROWSE RECIPES</Text>
          </TouchableOpacity>
        )}
      </View>

      <SwipeHint colors={colors} />
    </View>
  );
}

function SwipeHint({ colors }) {
  return (
    <View style={st.swipeHint}>
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      <Text style={[st.swipeHintText, { color: colors.textMuted }]}>Swipe down to hide</Text>
      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
    </View>
  );
}

const st = StyleSheet.create({
  resultCard: { overflow: 'hidden', borderRadius: 0 },
  resultHeader: { backgroundColor: '#24160f', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  resultIconBox: { width: 36, height: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  resultHeaderText: { flex: 1 },
  resultTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, color: '#fff' },
  resultSub: { fontFamily: 'Geist_400Regular', fontSize: 12, color: '#a8a29e', marginTop: 2 },
  ingredBadgeWrap: { flexDirection: 'column', gap: 6, padding: 16 },
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
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  swipeHintText: { fontFamily: 'Geist_500Medium', fontSize: 11, letterSpacing: 0.3 },
  resultRlPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 10 },
  resultRlText: { flex: 1, fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 0.3 },
  rlDot: { width: 6, height: 6, borderRadius: 3 },
  rlBars: { flexDirection: 'row', gap: 3, marginLeft: 2 },
  rlBar: { width: 14, height: 4, borderRadius: 2 },
  moreRecipesToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginHorizontal: 16 },
  moreRecipesToggleText: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 1 },
  moreRecipesScroll: { maxHeight: 200, marginHorizontal: 16, marginBottom: 8 },
  moreRecipeItem: { padding: 10, borderWidth: 1, marginBottom: 8 },
  recipeRowWithImage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recipeRowDetails: { flex: 1 },
  recipeThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#e7e5e4' },
  recipeThumbSmall: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e7e5e4' },
  recipeThumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
