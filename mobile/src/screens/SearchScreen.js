import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mlApi, recipeApi } from '../api/api';
import IngredientTag from '../components/IngredientTag';
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

export default function SearchScreen({ navigation, route }) {
  const { colors, isDark } = useAppTheme();
  const categoryParam = route?.params?.category?.trim?.() || '';
  const [ingredient, setIngredient] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const isInitialLoading = useInitialContentLoading();

  // When the user lands here with a category param (e.g. tapping a category
  // chip on the homepage), hydrate the results grid using the existing
  // /api/recipes endpoint without disturbing the ingredient-based flow.
  useEffect(() => {
    if (!categoryParam) return;
    let cancelled = false;
    setActiveCategory(categoryParam);
    setIngredients([]);
    setLoading(true);
    recipeApi
      .byCategory(categoryParam)
      .then((res) => {
        if (cancelled) return;
        const recipes = res?.data?.recipes || [];
        const mapped = recipes.map((r) => ({
          recipe: {
            ...r,
            time:
              r.total_time_minutes
                ? `${r.total_time_minutes} MIN`
                : `${(r.prep_time_minutes || 0) + (r.cook_time_minutes || 0)} MIN`,
            image: r.image_url,
          },
          matchPercentage: 100,
          score: 1,
        }));
        setResults(mapped);
      })
      .catch((err) => {
        console.error('Failed to load category recipes', err);
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryParam]);

  const addIngredient = () => {
    if (ingredient.trim() && !ingredients.includes(ingredient.trim())) {
      setIngredients([...ingredients, ingredient.trim()]);
      setIngredient('');
    }
  };

  const removeIngredient = (tag) => {
    setIngredients(ingredients.filter(i => i !== tag));
  };

  const handleSearch = async () => {
    if (ingredients.length === 0) return;
    setLoading(true);
    try {
      const response = await mlApi.recommendByIngredients(ingredients);
      setResults(response.data.recommendations || []);
    } catch (error) {
      console.error('Search failed', error);
      setResults(mockResults.map(r => ({ recipe: { ...r, image: `https://picsum.photos/seed/r${r.id}/400/400` } })));
    } finally {
      setLoading(false);
    }
  };

  const clearCategoryFilter = () => {
    setActiveCategory('');
    setResults([]);
    if (route?.params?.category) {
      navigation.setParams({ category: undefined });
    }
  };

  const renderHeader = () => (
    <View style={st.headerWrap}>
      {/* Big heading — matches web */}
      <Text style={[st.pageTitle, { color: colors.text }]}>
        {activeCategory ? `Browse${'\n'}${activeCategory}` : `Search by${'\n'}Ingredients`}
      </Text>
      <Text style={[st.pageDesc, { color: colors.textMuted }]}>
        {activeCategory
          ? `Every published recipe filed under ${activeCategory}. Tap a card to view the full step-by-step.`
          : "Enter the items currently in your pantry and we'll find the perfect recipe for your next meal."}
      </Text>

      {activeCategory ? (
        <TouchableOpacity
          onPress={clearCategoryFilter}
          style={[st.clearCategoryBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="close" size={12} color={colors.primary} />
          <Text style={[st.clearCategoryText, { color: colors.primary }]}>CLEAR CATEGORY</Text>
        </TouchableOpacity>
      ) : null}

      {/* Input */}
      <View style={st.inputSection}>
        <Text style={[st.inputLabel, { color: colors.textSubtle }]}>INGREDIENT INPUT STACK</Text>
        <View style={[st.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[st.input, { color: colors.text }]}
            placeholder="Chicken, Garlic, Rosemary, Lemon..."
            placeholderTextColor={colors.textSubtle}
            value={ingredient}
            onChangeText={setIngredient}
            onSubmitEditing={addIngredient}
            returnKeyType="done"
          />
        </View>
        <TouchableOpacity
          onPress={ingredients.length > 0 ? handleSearch : addIngredient}
          disabled={loading}
          style={[
            st.processBtn,
            { backgroundColor: ingredients.length === 0 ? colors.border : colors.primary },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={st.processBtnText}>{ingredients.length > 0 ? 'PROCESS' : 'ADD'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {ingredients.length > 0 && (
        <View style={st.tagRow}>
          {ingredients.map((tag) => (
            <IngredientTag key={tag} name={tag} onRemove={() => removeIngredient(tag)} />
          ))}
        </View>
      )}

      {/* Suggested Combinations — matches web */}
      {results.length === 0 && (
        <View style={st.combosSection}>
          <Text style={[st.comboLabel, { color: colors.textSubtle, borderBottomColor: colors.border }]}>SUGGESTED COMBINATIONS</Text>
          {suggestedCombinations.map((combo, i) => (
            <TouchableOpacity
              key={i}
              style={[st.comboCard, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}
              onPress={() => {
                const items = combo.items.split(', ');
                setIngredients(items);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={combo.icon} size={28} color={colors.primaryLight || colors.primary} style={{ marginBottom: 16 }} />
              <Text style={[st.comboTitle, { color: colors.text }]}>{combo.title}</Text>
              <Text style={[st.comboItems, { color: colors.textMuted }]}>{combo.items}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results header */}
      {results.length > 0 && (
        <View style={[st.resultsHeader, { borderBottomColor: colors.border }]}>
          <Text style={[st.resultsLabel, { color: colors.textSubtle }]}>RECIPE BLUEPRINTS ({results.length} RESULTS)</Text>
          <View style={st.filterRow}>
            <TouchableOpacity style={[st.filterBtn, { borderColor: colors.primary }]}>
              <Text style={[st.filterBtnText, { color: colors.primary }]}>SORT: RELEVANCE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.filterBtn, { borderColor: colors.border }]}>
              <Text style={[st.filterBtnText, { color: colors.textMuted }]}>FILTER: TIME</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={{ paddingHorizontal: 16 }}>
          <SearchResultsSkeleton colors={colors} />
        </View>
      );
    }

    if (results.length > 0) return null;
    return null;
  };

  if (isInitialLoading) {
    return <SearchContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <FlatList
        data={loading ? [] : results}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        numColumns={2}
        columnWrapperStyle={st.colWrapper}
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item.recipe || item}
            onPress={() => navigation.navigate('RecipeDetail', { id: (item.recipe || item).id || 1 })}
          />
        )}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  headerWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 16 },
  pageTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 34, letterSpacing: -0.8, lineHeight: 38 },
  pageDesc: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 21, maxWidth: 320 },
  inputSection: { gap: 8 },
  inputLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  inputRow: { borderWidth: 1, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  input: { fontFamily: 'Geist_400Regular', fontSize: 15 },
  processBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  processBtnText: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 2, color: '#fff' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  // Combos
  combosSection: { gap: 12 },
  comboLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, paddingBottom: 8, borderBottomWidth: 1 },
  comboCard: { padding: 22, minHeight: 120 },
  comboTitle: { fontFamily: 'Geist_700Bold', fontSize: 17, marginBottom: 6 },
  comboItems: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  // Results
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
});
