import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import { useAppTheme } from '../context/ThemeContext';

const fallbackRecipes = {
  1: {
    id: 1,
    title: 'Creamy Tuscan Chicken',
    description: 'A rich and savory Italian-inspired dish with sun-dried tomatoes and fresh spinach.',
    image: 'https://picsum.photos/seed/tuscan/600/400',
    time: '35 min',
    prepTime: '15 min',
    difficulty: 'Medium',
    servings: 4,
    rating: 4.8,
    category: 'Italian',
    ingredients: [
      { name: 'Chicken Breast', amount: '2', unit: 'pcs' },
      { name: 'Heavy Cream', amount: '1', unit: 'cup' },
      { name: 'Sun-dried Tomatoes', amount: '1/2', unit: 'cup' },
      { name: 'Spinach', amount: '2', unit: 'cups' },
      { name: 'Garlic (minced)', amount: '3', unit: 'cloves' },
      { name: 'Parmesan Cheese', amount: '1/3', unit: 'cup' },
    ],
    steps: [
      { number: 1, text: 'Season chicken with salt and pepper. In a large skillet, heat olive oil over medium-high heat.', time: '5:00' },
      { number: 2, text: 'Cook chicken until golden brown and cooked through, about 5-7 minutes per side. Remove and set aside.', time: '12:00' },
      { number: 3, text: 'In the same skillet, saute minced garlic until fragrant. Add sun-dried tomatoes and spinach. Cook until wilted.', time: '3:00' },
    ],
    nutrition: { calories: 450, protein: '42g', carbs: '12g', fat: '26g' },
  },
  2: { id: 2, title: 'Spicy Miso Ramen', image: 'https://picsum.photos/seed/ramen/600/400', time: '45 min', prepTime: '20 min', difficulty: 'Hard', servings: 2, rating: 4.9, category: 'Japanese', ingredients: ['Ramen noodles', 'Miso paste', 'Chili oil', 'Soft boiled eggs'], nutrition: { calories: 520, protein: '28g', carbs: '58g', fat: '20g' } },
  3: { id: 3, title: 'Honey Garlic Salmon', image: 'https://picsum.photos/seed/salmon/600/400', time: '20 min', prepTime: '10 min', difficulty: 'Easy', servings: 2, rating: 4.7, category: 'Seafood', ingredients: ['Salmon fillets', 'Honey', 'Garlic', 'Soy sauce'], nutrition: { calories: 380, protein: '36g', carbs: '18g', fat: '14g' } },
};

export default function RecipeDetailScreen({ route, navigation }) {
  const { colors, isDark } = useAppTheme();
  const { id } = route.params;
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const response = await recipeApi.getById(id);
        setRecipe(response.data);
        setServings(response.data.servings || 4);
      } catch (error) {
        console.error('Failed to fetch recipe', error);
        const fallback = fallbackRecipes[id] || fallbackRecipes[1];
        setRecipe(fallback);
        setServings(fallback.servings || 4);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [id]);

  const toggleIngredient = (i) => {
    setCheckedIngredients(prev => ({ ...prev, [i]: !prev[i] }));
  };

  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!recipe) return null;

  const ings = recipe.ingredients || [];
  const steps = recipe.steps || fallbackRecipes[1].steps;
  const nutr = recipe.nutrition || fallbackRecipes[1].nutrition;

  return (
    <View style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        <View style={st.heroWrap}>
          <Image source={{ uri: recipe.image }} style={st.heroImg} resizeMode="cover" />
          <View style={st.heroOverlay} />
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[st.backBtn, { backgroundColor: isDark ? 'rgba(28,25,23,0.8)' : 'rgba(255,255,255,0.85)' }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.heartBtn, { backgroundColor: isDark ? 'rgba(28,25,23,0.8)' : 'rgba(255,255,255,0.85)' }]}
          >
            <Ionicons name="heart-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          {/* Floating category badge */}
          <View style={st.heroBadge}>
            <Text style={st.heroBadgeText}>{recipe.category || 'CHEF PICK'}</Text>
          </View>
        </View>

        <View style={[st.body, { backgroundColor: colors.background }]}>
          {/* Title + Rating */}
          <View style={st.titleRow}>
            <Text style={[st.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
            <View style={st.ratingBox}>
              <Ionicons name="star" size={14} color={colors.amber} />
              <Text style={[st.ratingText, { color: colors.text }]}>{recipe.rating || '4.8'}</Text>
            </View>
          </View>

          {recipe.description && (
            <Text style={[st.desc, { color: colors.textMuted }]}>{recipe.description}</Text>
          )}

          {/* Info grid — matches web */}
          <View style={st.infoGrid}>
            {[
              { label: 'PREP TIME', value: recipe.prepTime || '15 min' },
              { label: 'COOK TIME', value: recipe.time || '35 min' },
              { label: 'DIFFICULTY', value: recipe.difficulty || 'Medium' },
              { label: 'SERVINGS', value: `${servings}`, adjust: true },
            ].map((item, i) => (
              <View key={i} style={[st.infoCell, { borderColor: colors.border }]}>
                <Text style={[st.infoCellLabel, { color: colors.textSubtle }]}>{item.label}</Text>
                {item.adjust ? (
                  <View style={st.servingsRow}>
                    <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))}>
                      <Ionicons name="remove-circle-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[st.infoCellValue, { color: colors.text }]}>{servings}</Text>
                    <TouchableOpacity onPress={() => setServings(servings + 1)}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[st.infoCellValue, { color: colors.text }]}>{item.value}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Ingredients — checkable list matching web */}
          <View style={st.section}>
            <View style={[st.sectionHeader, { borderBottomColor: colors.border }]}>
              <Text style={[st.sectionLabel, { color: colors.textSubtle }]}>INGREDIENTS ({ings.length})</Text>
              <Text style={[st.sectionLabel, { color: colors.textSubtle }]}>AMOUNT</Text>
            </View>
            {ings.map((ing, i) => {
              const name = ing.name || ing;
              const amount = ing.amount ? `${ing.amount} ${ing.unit || ''}` : '';
              const checked = !!checkedIngredients[i];
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleIngredient(i)}
                  style={[st.ingRow, { borderBottomColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={st.ingLeft}>
                    <View style={[st.checkbox, { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' }]}>
                      {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={[st.ingName, { color: checked ? colors.textSubtle : colors.text, textDecorationLine: checked ? 'line-through' : 'none' }]}>{name}</Text>
                  </View>
                  {amount ? <Text style={[st.ingAmount, { color: colors.textMuted }]}>{amount}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step-by-step Instructions */}
          <View style={st.section}>
            <Text style={[st.sectionLabel, { color: colors.textSubtle, marginBottom: 14 }]}>STEP-BY-STEP INSTRUCTIONS</Text>
            {steps.map((step, i) => (
              <View key={i} style={[st.stepRow, i < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[st.stepNum, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}>
                  <Text style={[st.stepNumText, { color: colors.text }]}>{step.number}</Text>
                </View>
                <View style={st.stepContent}>
                  <Text style={[st.stepText, { color: colors.text }]}>{step.text}</Text>
                  {step.time && (
                    <View style={st.stepTimeRow}>
                      <Ionicons name="timer-outline" size={12} color={colors.textSubtle} />
                      <Text style={[st.stepTimeText, { color: colors.textSubtle }]}>{step.time}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Nutrition Facts — matches web sidebar */}
          <View style={[st.nutritionCard, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}>
            <Text style={[st.sectionLabel, { color: colors.textSubtle, marginBottom: 14 }]}>NUTRITION FACTS (PER SERVING)</Text>
            {[
              { label: 'Calories', value: `${nutr.calories} kcal`, pct: 70 },
              { label: 'Protein', value: nutr.protein, pct: 85 },
              { label: 'Carbs', value: nutr.carbs, pct: 25 },
              { label: 'Fat', value: nutr.fat, pct: 55 },
            ].map((n, i) => (
              <View key={i} style={st.nutrRow}>
                <View style={st.nutrLabel}>
                  <Text style={[st.nutrName, { color: colors.text }]}>{n.label}</Text>
                  <Text style={[st.nutrValue, { color: colors.textMuted }]}>{n.value}</Text>
                </View>
                <View style={[st.nutrBar, { backgroundColor: isDark ? colors.border : '#e7e5e4' }]}>
                  <View style={[st.nutrBarFill, { width: `${n.pct}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>

          {/* Ask AI Assistant */}
          <View style={st.aiCard}>
            <View style={st.aiRow}>
              <View style={st.aiIcon}><Ionicons name="restaurant" size={14} color="#0a0a0a" /></View>
              <Text style={st.aiTitle}>Ask AI Assistant</Text>
            </View>
            <Text style={st.aiDesc}>Get substitution ideas, scaling tips, or wine pairings for this recipe.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar — matches web */}
      <View style={[st.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[st.saveBtn, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="bookmark-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CookingMode', { recipe })}
          style={st.cookBtn}
        >
          <Text style={st.cookBtnText}>START COOKING</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { width: '100%', height: 320, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
  backBtn: { position: 'absolute', top: 48, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heartBtn: { position: 'absolute', top: 48, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', bottom: 20, left: 20, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6 },
  heroBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5, color: '#1c1917', textTransform: 'uppercase' },
  body: { padding: 20, gap: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recipeTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 28, letterSpacing: -0.5, flex: 1, paddingRight: 12, lineHeight: 32 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  desc: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 22 },
  // Info grid
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', paddingVertical: 16, paddingHorizontal: 4, borderWidth: 0.5, alignItems: 'center' },
  infoCellLabel: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5, marginBottom: 6 },
  infoCellValue: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Section
  section: { gap: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 0 },
  sectionLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2 },
  // Ingredients
  ingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  ingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkbox: { width: 20, height: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ingName: { fontFamily: 'Geist_500Medium', fontSize: 14 },
  ingAmount: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  // Steps
  stepRow: { flexDirection: 'row', paddingVertical: 16, gap: 14 },
  stepNum: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: 'Geist_800ExtraBold', fontSize: 14 },
  stepContent: { flex: 1, gap: 6 },
  stepText: { fontFamily: 'Geist_400Regular', fontSize: 14, lineHeight: 22 },
  stepTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepTimeText: { fontFamily: 'Geist_500Medium', fontSize: 11 },
  // Nutrition
  nutritionCard: { padding: 20 },
  nutrRow: { marginBottom: 14 },
  nutrLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nutrName: { fontFamily: 'Geist_700Bold', fontSize: 12 },
  nutrValue: { fontFamily: 'Geist_400Regular', fontSize: 12 },
  nutrBar: { height: 6, width: '100%' },
  nutrBarFill: { height: '100%' },
  // AI
  aiCard: { backgroundColor: '#0a0a0a', padding: 20, gap: 8 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiIcon: { width: 28, height: 28, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff' },
  aiDesc: { fontFamily: 'Geist_400Regular', fontSize: 12, color: '#a8a29e', lineHeight: 18 },
  // Bottom bar
  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  saveBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  cookBtn: { flex: 1, height: 52, backgroundColor: '#1c1917', alignItems: 'center', justifyContent: 'center' },
  cookBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 2, color: '#fff' },
});
