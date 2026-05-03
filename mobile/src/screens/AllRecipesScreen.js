import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import { useAppTheme } from '../context/ThemeContext';
import { AllRecipesContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 200;

async function fetchAllRecipesAz() {
  const firstResponse = await recipeApi.getAllRecipesAz({ limit: PAGE_SIZE, offset: 0 });
  const firstPayload = firstResponse?.data || {};
  const allRecipes = Array.isArray(firstPayload.recipes) ? [...firstPayload.recipes] : [];
  const expectedTotal = firstPayload.total || allRecipes.length;

  while (allRecipes.length < expectedTotal) {
    const nextResponse = await recipeApi.getAllRecipesAz({ limit: PAGE_SIZE, offset: allRecipes.length });
    const nextPayload = nextResponse?.data || {};
    const nextRecipes = Array.isArray(nextPayload.recipes) ? nextPayload.recipes : [];

    if (nextRecipes.length === 0) break;
    allRecipes.push(...nextRecipes);
  }

  return { recipes: allRecipes, total: expectedTotal };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AllRecipesScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Active category filter — null = show all
  const [activeCategory, setActiveCategory] = useState(null);
  const isInitialLoading = useInitialContentLoading();

  const loadCategories = async () => {
    try {
      const response = await recipeApi.getCategories();
      const payload = response?.data || {};
      setCategories(Array.isArray(payload.categories) ? payload.categories : []);
    } catch (err) {
      console.error('Failed to load recipe categories', err);
      setCategories([]);
    }
  };

  const loadRecipes = async ({ refresh = false } = {}) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const payload = await fetchAllRecipesAz();
      setRecipes(payload.recipes);
      setTotal(payload.total);
    } catch (err) {
      console.error('Failed to load all recipes', err);
      setRecipes([]);
      setTotal(0);
      setError('Could not load all recipes. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecipes();
    loadCategories();
  }, []);

  const handleRefresh = () => {
    loadRecipes({ refresh: true });
    loadCategories();
  };

  /* ---- Derived filtered list ---- */
  const filteredRecipes = useMemo(() => {
    if (!activeCategory) return recipes;
    return recipes.filter(
      (r) => (r.category || '').toLowerCase() === activeCategory.toLowerCase()
    );
  }, [recipes, activeCategory]);

  const filteredCount = filteredRecipes.length;

  /* ---- Category chip (inline) ---- */
  const renderCategoryChip = (item, isAllChip = false) => {
    const isActive = isAllChip ? activeCategory === null : activeCategory === item.category;
    const label = isAllChip ? 'All' : item.category;
    const count = isAllChip ? total : Number(item.count);
    const imageUrl = isAllChip ? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop' : (item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=200&auto=format&fit=crop');

    return (
      <TouchableOpacity
        key={isAllChip ? '__all__' : item.category}
        activeOpacity={0.8}
        onPress={() => setActiveCategory(isAllChip ? null : (isActive ? null : item.category))}
        style={[
          st.chip,
          {
            backgroundColor: isActive ? colors.primary : colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
            shadowColor: colors.brandShadow,
          },
        ]}
      >
        <View
          style={[
            st.iconBox,
            {
              backgroundColor: isActive
                ? 'rgba(255,255,255,0.2)'
                : isDark ? colors.surfaceAlt : colors.primarySoft,
              overflow: 'hidden',
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={st.chipImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name={isAllChip ? 'grid' : 'restaurant'}
              size={18}
              color={isActive ? '#fff' : colors.primary}
            />
          )}
        </View>
        <View style={st.chipBody}>
          <Text
            style={[
              st.chipTitle,
              { color: isActive ? '#fff' : colors.text },
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={[
              st.chipCount,
              { color: isActive ? 'rgba(255,255,255,0.7)' : colors.textSubtle },
            ]}
          >
            {count} {count === 1 ? 'RECIPE' : 'RECIPES'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* ---- Header ---- */
  const renderHeader = () => (
    <View style={st.headerWrap}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[st.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={15} color={colors.primary} />
        <Text style={[st.backText, { color: colors.primary }]}>BACK HOME</Text>
      </TouchableOpacity>

      <Text style={[st.eyebrow, { color: colors.primary }]}>FRESH FROM THE DATABASE</Text>
      <View style={[st.titleBlock, { borderBottomColor: colors.border }]}> 
        <View style={{ flex: 1 }}>
          <Text style={[st.pageTitle, { color: colors.text }]}>All{`\n`}Recipes</Text>
          <Text style={[st.pageDesc, { color: colors.textMuted }]}>
            {activeCategory
              ? `Showing "${activeCategory}" — ${filteredCount} found.`
              : 'Browse every published CookMate recipe, sorted alphabetically from A to Z.'}
          </Text>
        </View>
        <View style={[st.sortPill, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[st.sortLabel, { color: colors.textSubtle }]}>
            {activeCategory ? 'FILTERED BY' : 'SORT'}
          </Text>
          <Text style={[st.sortValue, { color: colors.primary }]}>
            {activeCategory ? activeCategory.toUpperCase() : 'NAME A-Z'}
          </Text>
        </View>
      </View>

      {/* Category Sort Chips — Scrollable */}
      {categories.length > 0 ? (
        <View style={[st.categorySection, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft, borderColor: colors.border }]}>
          <View style={st.categorySectionHeader}>
            <View>
              <View style={st.categoryLabelRow}>
                <Ionicons name="options" size={14} color={colors.primary} />
                <Text style={[st.categoryEyebrow, { color: colors.primary }]}>SORT BY CATEGORY</Text>
              </View>
              <Text style={[st.categoryTitle, { color: colors.text }]}>Filter Recipes</Text>
            </View>
            {activeCategory && (
              <TouchableOpacity
                onPress={() => setActiveCategory(null)}
                style={[st.clearBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={12} color={colors.primary} />
                <Text style={[st.clearBtnText, { color: colors.primary }]}>CLEAR</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.categoryRow}
            decelerationRate="fast"
            snapToInterval={0}
          >
            {renderCategoryChip(null, true)}
            {categories.map((item) => renderCategoryChip(item, false))}
          </ScrollView>
        </View>
      ) : null}

      {error ? (
        <View style={[st.errorBox, { backgroundColor: isDark ? colors.surfaceAlt : '#fef2f2', borderColor: colors.border }]}> 
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[st.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && filteredRecipes.length > 0 ? (
        <View style={[st.resultsHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[st.resultsLabel, { color: colors.textSubtle }]}>
            {activeCategory
              ? `${activeCategory.toUpperCase()} (${filteredCount} RECIPES)`
              : `RECIPE LIBRARY (${total} RECIPES)`}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderRecipe = ({ item }) => {
    const computedTime =
      item.total_time_minutes ??
      ((item.prep_time_minutes || 0) + (item.cook_time_minutes || 0));
    const time = computedTime > 0 ? `${computedTime} MIN` : null;
    const meta = item.category || item.region_or_origin || 'Philippine Cuisine';
    const imageUri = item.image_url || item.image;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
        style={st.recipeCard}
        activeOpacity={0.85}
      >
        <View style={[st.imageWrap, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft, borderColor: colors.border }]}> 
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={st.recipeImage} resizeMode="cover" />
          ) : (
            <View style={st.imageFallback}>
              <Ionicons name="restaurant-outline" size={30} color={colors.primary} />
            </View>
          )}
          {time ? (
            <View style={[st.timePill, { backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : '#fff' }]}> 
              <Ionicons name="time-outline" size={10} color={colors.primary} />
              <Text style={[st.timeText, { color: colors.primary }]}>{time}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[st.recipeTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[st.recipeMeta, { color: colors.textMuted }]} numberOfLines={1}>{meta} · {item.difficulty || 'Any level'}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={st.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (error) return null;

    return (
      <View style={[st.emptyBox, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft, borderColor: colors.border }]}> 
        <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
        <Text style={[st.emptyText, { color: colors.textMuted }]}>
          {activeCategory
            ? `No recipes found in "${activeCategory}". Try another category.`
            : 'No published recipes are available yet.'}
        </Text>
      </View>
    );
  };

  if (isInitialLoading) {
    return <AllRecipesContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}> 
      <FlatList
        data={loading ? [] : filteredRecipes}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={filteredRecipes.length > 0 ? st.columnWrapper : null}
        renderItem={renderRecipe}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={st.content}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 120 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 14 },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  eyebrow: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  titleBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderBottomWidth: 1, paddingBottom: 18 },
  pageTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 38, letterSpacing: -1, lineHeight: 40 },
  pageDesc: { marginTop: 10, fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 21, maxWidth: 250 },
  sortPill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  sortLabel: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  sortValue: { fontFamily: 'Geist_800ExtraBold', fontSize: 10, letterSpacing: 1.5 },
  // Category filter section
  categorySection: { borderWidth: 1, borderRadius: 24, padding: 14, gap: 8 },
  categorySectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  categoryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryEyebrow: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.8 },
  categoryTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, marginTop: 2 },
  categoryRow: { gap: 10, paddingTop: 4, paddingRight: 12 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearBtnText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.4 },
  // Category chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  chipImage: {
    width: 36, height: 36, borderRadius: 12,
  },
  chipBody: { gap: 2, paddingRight: 4 },
  chipTitle: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  chipCount: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  // Other
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 12 },
  errorText: { flex: 1, fontFamily: 'Geist_500Medium', fontSize: 12, lineHeight: 17 },
  resultsHeader: { borderBottomWidth: 1, paddingBottom: 10 },
  resultsLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 },
  recipeCard: { width: '48%', marginBottom: 22 },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 1, borderWidth: 1, borderRadius: 24, overflow: 'hidden', marginBottom: 10 },
  recipeImage: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timePill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.2 },
  recipeTitle: { fontFamily: 'Geist_700Bold', fontSize: 14, lineHeight: 18, textTransform: 'uppercase', marginBottom: 5 },
  recipeMeta: { fontFamily: 'Geist_400Regular', fontSize: 11, lineHeight: 15 },
  loadingWrap: { paddingVertical: 40 },
  emptyBox: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
  },
  emptyText: { flex: 1, fontFamily: 'Geist_400Regular', fontSize: 13 },
});
