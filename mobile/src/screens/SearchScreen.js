import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api, { mlApi, recipeApi } from '../api/api';
import OptimizedImage from '../components/OptimizedImage';
import RecipeCard from '../components/RecipeCard';
import { useAppTheme } from '../context/ThemeContext';
import { SearchContentSkeleton, SearchResultsSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const suggestedCombinations = [
  { title: 'Filipino Adobo', items: 'Chicken, Soy Sauce, Vinegar, Garlic', icon: 'restaurant' },
  { title: 'Sinigang Essentials', items: 'Pork, Tamarind, Tomato, Kangkong', icon: 'flame' },
  { title: 'Pancit Basics', items: 'Noodles, Soy Sauce, Garlic, Vegetables', icon: 'cafe' },
];

const mockResults = [
  { id: 1, title: 'Herbed Lemon Chicken Roast', match: '92%', time: '45 MIN' },
  { id: 2, title: 'Garlic Butter Pasta Strings', match: '85%', time: '20 MIN' },
  { id: 3, title: 'Slow Simmered Tomato Ragu', match: '78%', time: '60 MIN' },
  { id: 4, title: 'Crispy Garlic Smashed Taters', match: '74%', time: '15 MIN' },
];

const PAGE_SIZE = 30;

function sortResultsByTitle(items) {
  return [...items].sort((a, b) => {
    const aTitle = (a.recipe || a).title || '';
    const bTitle = (b.recipe || b).title || '';
    return aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
  });
}

function mapRecipeToResult(recipe) {
  const totalMinutes =
    recipe.total_time_minutes ?? ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
  const time = totalMinutes > 0 ? `${totalMinutes} MIN` : recipe.time || null;
  return {
    recipe: { ...recipe, time, image: recipe.image_url || recipe.image },
    matchPercentage: 100,
    score: 1,
  };
}

async function fetchRecipeLibrary(category, retryCount = 2) {
  try {
    const firstResponse = await recipeApi.getAllRecipesAz({
      limit: PAGE_SIZE,
      offset: 0,
      ...(category ? { category } : {}),
    });
    const firstPayload = firstResponse?.data || {};
    const recipes = Array.isArray(firstPayload.recipes) ? [...firstPayload.recipes] : [];
    const expectedTotal = firstPayload.total || recipes.length;
    while (recipes.length < expectedTotal) {
      const nextResponse = await recipeApi.getAllRecipesAz({
        limit: PAGE_SIZE,
        offset: recipes.length,
        ...(category ? { category } : {}),
      });
      const nextRecipes = Array.isArray(nextResponse?.data?.recipes) ? nextResponse.data.recipes : [];
      if (nextRecipes.length === 0) break;
      recipes.push(...nextRecipes);
    }
    return sortResultsByTitle(recipes.map(mapRecipeToResult));
  } catch (err) {
    if (retryCount > 0 && !err.response) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchRecipeLibrary(category, retryCount - 1);
    }
    throw err;
  }
}

const SearchResultCard = memo(function SearchResultCard({ item, navigation }) {
  const recipe = item.recipe || item;
  const recipeId = recipe.id || 1;
  const handlePress = useCallback(() => {
    navigation.navigate('RecipeDetail', { id: recipeId });
  }, [navigation, recipeId]);
  return <RecipeCard recipe={recipe} onPress={handlePress} />;
});

export default function SearchScreen({ navigation, route }) {
  const { colors, isDark } = useAppTheme();
  const categoryParam = route?.params?.category?.trim?.() || '';
  const [inputValue, setInputValue] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [resultsMode, setResultsMode] = useState(categoryParam ? 'category' : 'all');
  const [allIngredients, setAllIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const isInitialLoading = useInitialContentLoading();
  const inputRef = useRef(null);
  const resultsRequestIdRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const brandOrange = colors.primary || '#f97316';

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight || 1],
    outputRange: [0, -(headerHeight || 1)],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, (headerHeight || 1) * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    api.get('/api/ingredients')
      .then(res => setAllIngredients(res.data.ingredients || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const parts = inputValue.split(',');
    const currentPart = parts[parts.length - 1].trim().toLowerCase();
    if (currentPart.length > 0 && showSuggestions) {
      setSuggestions(
        allIngredients.filter(ing => ing.name.toLowerCase().includes(currentPart)).slice(0, 6)
      );
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allIngredients, showSuggestions]);

  const loadRecipeResults = useCallback(async (category = '') => {
    const requestId = resultsRequestIdRef.current + 1;
    resultsRequestIdRef.current = requestId;
    const nextCategory = category?.trim?.() || '';
    setActiveCategory(nextCategory);
    setResultsMode(nextCategory ? 'category' : 'all');
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setNetworkError(null);
    setLoading(true);
    try {
      const mapped = await fetchRecipeLibrary(nextCategory || undefined);
      if (resultsRequestIdRef.current === requestId) {
        setResults(mapped);
        setNetworkError(null);
      }
    } catch (err) {
      if (resultsRequestIdRef.current === requestId) {
        setResults([]);
        setNetworkError(err?.message || 'Network error. Please check your connection.');
      }
    } finally {
      if (resultsRequestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipeResults(categoryParam || '');
    return () => { resultsRequestIdRef.current += 1; };
  }, [categoryParam, loadRecipeResults]);

  const handleSelectSuggestion = (name) => {
    const parts = inputValue.split(',');
    parts.pop();
    setInputValue([...parts, name].map(p => p.trim()).join(', ') + ', ');
    setSuggestions([]);
    setShowSuggestions(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleProcess = async () => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    if (!inputValue.trim()) {
      await loadRecipeResults('');
      return;
    }
    const requestId = resultsRequestIdRef.current + 1;
    resultsRequestIdRef.current = requestId;
    setActiveCategory('');
    setResultsMode('recommendations');
    setLoading(true);
    try {
      const ingredients = inputValue.split(',').map(s => s.trim()).filter(Boolean);
      const response = await mlApi.recommendByIngredients(ingredients);
      if (resultsRequestIdRef.current === requestId) {
        setResults(sortResultsByTitle(response.data.recommendations || []));
      }
    } catch {
      if (resultsRequestIdRef.current === requestId) {
        setResults(sortResultsByTitle(mockResults.map(r => ({ recipe: { ...r, image: `https://picsum.photos/seed/r${r.id}/400/400` } }))));
      }
    } finally {
      if (resultsRequestIdRef.current === requestId) setLoading(false);
    }
  };

  const handleShowAllRecipes = async () => {
    Keyboard.dismiss();
    if (route?.params?.category) {
      navigation.setParams({ category: undefined });
      return;
    }
    await loadRecipeResults('');
  };

  const clearCategoryFilter = () => {
    if (route?.params?.category) {
      navigation.setParams({ category: undefined });
      return;
    }
    void loadRecipeResults('');
  };

  const resultsLabel =
    resultsMode === 'all'
      ? `ALL RECIPES (${results.length} RESULTS)`
      : resultsMode === 'category'
        ? `${activeCategory.toUpperCase()} RECIPES (${results.length} RESULTS)`
        : `RECIPE BLUEPRINTS (${results.length} RESULTS)`;
  const sortLabel = resultsMode === 'recommendations' ? 'SORT: RELEVANCE' : 'SORT: NAME A-Z';

  const keyExtractor = useCallback((item, index) => {
    const recipe = item.recipe || item;
    return recipe.id != null ? String(recipe.id) : `result-${index}`;
  }, []);

  const renderResult = useCallback(({ item }) => (
    <SearchResultCard item={item} navigation={navigation} />
  ), [navigation]);

  const renderListHeader = useCallback(() => (
    <View style={[st.listHeaderWrap, { paddingHorizontal: 16 }]}>
      <View style={st.combosSection}>
        <Text style={[st.comboLabel, { color: colors.textSubtle, borderBottomColor: colors.border }]}>SUGGESTED COMBINATIONS</Text>
        {suggestedCombinations.map((combo, i) => (
          <TouchableOpacity
            key={i}
            style={[st.comboCard, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}
            onPress={() => setInputValue(combo.items)}
            activeOpacity={0.7}
          >
            <Ionicons name={combo.icon} size={28} color={brandOrange} style={{ marginBottom: 16 }} />
            <Text style={[st.comboTitle, { color: colors.text }]}>{combo.title}</Text>
            <Text style={[st.comboItems, { color: colors.textMuted }]}>{combo.items}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {results.length > 0 && (
        <View style={[st.resultsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[st.resultsLabel, { color: colors.textSubtle }]}>{resultsLabel}</Text>
          <View style={st.filterRow}>
            <TouchableOpacity style={[st.filterBtn, { borderColor: brandOrange }]}>
              <Text style={[st.filterBtnText, { color: brandOrange }]}>{sortLabel}</Text>
            </TouchableOpacity>
            {resultsMode === 'recommendations' && (
              <TouchableOpacity style={[st.filterBtn, { borderColor: colors.border }]}>
                <Text style={[st.filterBtnText, { color: colors.textMuted }]}>FILTER: TIME</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  ), [results.length, resultsLabel, sortLabel, resultsMode, colors, isDark, brandOrange]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <SearchResultsSkeleton colors={colors} />
        </View>
      );
    }
    if (networkError) {
      return (
        <View style={[st.errorBox, { marginHorizontal: 16, marginTop: 20 }]}>
          <Ionicons name="cloud-offline-outline" size={24} color="#b91c1c" style={{ marginBottom: 8 }} />
          <Text style={st.errorTitle}>Connection Error</Text>
          <Text style={st.errorMessage}>{networkError}</Text>
          <TouchableOpacity onPress={() => loadRecipeResults(activeCategory)} style={[st.retryBtn, { backgroundColor: brandOrange }]}>
            <Text style={st.retryBtnText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  if (isInitialLoading) {
    return <SearchContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      {/* Collapsible header — slides up as user scrolls */}
      <Animated.View
        style={[
          st.stickyHeader,
          { backgroundColor: colors.background, transform: [{ translateY: headerTranslateY }], opacity: headerOpacity },
        ]}
      >
        <View
          style={st.headerInner}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <Text style={[st.pageTitle, { color: colors.text }]}>
            {activeCategory ? `Browse\n${activeCategory}` : `Search by\nIngredients`}
          </Text>
          <Text style={[st.pageDesc, { color: colors.textMuted }]}>
            {activeCategory
              ? `Every published recipe filed under ${activeCategory}. Tap a card to view the full step-by-step.`
              : 'Enter the items currently in your pantry, or browse the full A-Z recipe library below.'}
          </Text>
          {activeCategory ? (
            <TouchableOpacity onPress={clearCategoryFilter} style={[st.clearCategoryBtn, { borderColor: colors.border }]}>
              <Ionicons name="close" size={12} color={brandOrange} />
              <Text style={[st.clearCategoryText, { color: brandOrange }]}>CLEAR CATEGORY</Text>
            </TouchableOpacity>
          ) : null}

          {/* Input row — same as web: single comma-separated text field */}
          <View style={st.inputSection}>
            <Text style={[st.inputLabel, { color: colors.textSubtle }]}>INGREDIENT INPUT STACK</Text>
            <View style={st.inputAndBtn}>
              <View style={[st.inputRow, { backgroundColor: colors.surface, borderColor: colors.border, flex: 1 }]}>
                <Ionicons name="search" size={18} color={brandOrange} />
                <TextInput
                  ref={inputRef}
                  style={[st.input, { color: colors.text, flex: 1 }]}
                  placeholder="Chicken, Garlic, Rosemary..."
                  placeholderTextColor={colors.textSubtle}
                  value={inputValue}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onChangeText={(text) => {
                    setInputValue(text);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onSubmitEditing={handleProcess}
                />
              </View>
              <TouchableOpacity
                onPress={handleProcess}
                disabled={loading}
                style={[st.processBtn, { backgroundColor: brandOrange }]}
              >
                {loading
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={st.processBtnText}>PROCESS</Text>}
              </TouchableOpacity>
            </View>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <View style={[st.suggestionsDropdown, { backgroundColor: isDark ? colors.surfaceAlt : '#fff', borderColor: colors.border }]}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 210 }}>
                  {suggestions.map((sugg, i) => (
                    <TouchableOpacity
                      key={sugg.id || i}
                      style={[st.suggestionItem, i < suggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                      activeOpacity={0.65}
                      onPress={() => handleSelectSuggestion(sugg.name)}
                    >
                      <View style={st.suggLeft}>
                        <View style={[st.suggImageWrap, { backgroundColor: isDark ? colors.surface : '#fff7ed' }]}>
                          {sugg.image_url
                            ? <OptimizedImage source={{ uri: sugg.image_url }} style={st.suggImage} />
                            : <Text style={[st.suggImageFallback, { color: brandOrange }]}>{sugg.name.charAt(0).toUpperCase()}</Text>}
                        </View>
                        <Text style={[st.suggestionText, { color: colors.text }]}>{sugg.name}</Text>
                      </View>
                      <View style={st.suggRight}>
                        <Text style={[st.suggestionAdd, { color: brandOrange }]}>ADD</Text>
                        <Ionicons name="add-circle" size={18} color={brandOrange} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              onPress={handleShowAllRecipes}
              disabled={loading}
              style={[st.allRecipesBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.75}
            >
              <Ionicons name="book-outline" size={16} color={brandOrange} />
              <Text style={[st.allRecipesBtnText, { color: brandOrange }]}>ALL RECIPES A-Z</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Scrollable content — combos + results grid */}
      <Animated.FlatList
        data={loading ? [] : results}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={st.colWrapper}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={renderResult}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: headerHeight > 0 ? headerHeight : 320, paddingBottom: 120, flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  headerInner: { paddingHorizontal: 16, paddingTop: 50, paddingBottom: 0, gap: 10 },
  pageTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 32, letterSpacing: -0.8, lineHeight: 37 },
  pageDesc: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 20, maxWidth: 320 },
  inputSection: { gap: 8 },
  inputLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  inputAndBtn: { flexDirection: 'row', gap: 0 },
  inputRow: { borderWidth: 1, borderRightWidth: 0, paddingHorizontal: 14, height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  input: { fontFamily: 'Geist_400Regular', fontSize: 14 },
  processBtn: { height: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  processBtnText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.8, color: '#fff' },
  allRecipesBtn: { height: 42, borderWidth: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  allRecipesBtnText: { fontFamily: 'Geist_800ExtraBold', fontSize: 10, letterSpacing: 1.7 },
  listHeaderWrap: { gap: 16, paddingTop: 0 },
  combosSection: { gap: 12 },
  comboLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, paddingBottom: 8, borderBottomWidth: 1 },
  comboCard: { padding: 22, minHeight: 120 },
  comboTitle: { fontFamily: 'Geist_700Bold', fontSize: 17, marginBottom: 6 },
  comboItems: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  resultsHeader: { borderBottomWidth: 1, paddingBottom: 10, gap: 10 },
  resultsLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  filterBtnText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  colWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 },
  clearCategoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  clearCategoryText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  suggestionsDropdown: {
    borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginTop: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 11,
  },
  suggLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  suggImageWrap: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  suggImage: { width: '100%', height: '100%' },
  suggImageFallback: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  suggestionText: { fontFamily: 'Geist_600SemiBold', fontSize: 14 },
  suggRight: { flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
  suggestionAdd: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 16, padding: 20, alignItems: 'center' },
  errorTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, color: '#b91c1c', marginBottom: 4 },
  errorMessage: { fontFamily: 'Geist_400Regular', fontSize: 13, color: '#b91c1c', textAlign: 'center', marginBottom: 16 },
  retryBtn: { height: 40, borderRadius: 20, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 1, color: '#fff' },
});
