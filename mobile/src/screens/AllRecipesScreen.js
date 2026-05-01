import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import { useAppTheme } from '../context/ThemeContext';

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

export default function AllRecipesScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [recipes, setRecipes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
  }, []);

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
          <Text style={[st.pageDesc, { color: colors.textMuted }]}>Browse every published CookMate recipe, sorted alphabetically from A to Z.</Text>
        </View>
        <View style={[st.sortPill, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[st.sortLabel, { color: colors.textSubtle }]}>SORT</Text>
          <Text style={[st.sortValue, { color: colors.primary }]}>NAME A-Z</Text>
        </View>
      </View>

      {error ? (
        <View style={[st.errorBox, { backgroundColor: isDark ? colors.surfaceAlt : '#fef2f2', borderColor: colors.border }]}> 
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[st.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && recipes.length > 0 ? (
        <View style={[st.resultsHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[st.resultsLabel, { color: colors.textSubtle }]}>RECIPE LIBRARY ({total} RECIPES)</Text>
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
        <Text style={[st.emptyText, { color: colors.textMuted }]}>No published recipes are available yet.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}> 
      <FlatList
        data={loading ? [] : recipes}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={recipes.length > 0 ? st.columnWrapper : null}
        renderItem={renderRecipe}
        refreshing={refreshing}
        onRefresh={() => loadRecipes({ refresh: true })}
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
