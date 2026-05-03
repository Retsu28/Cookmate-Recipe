import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../api/api';
import RecipeCard from '../components/RecipeCard';
import HomeRecipeCard from '../components/HomeRecipeCard';
import HomeSection from '../components/HomeSection';
import CategoryChip from '../components/CategoryChip';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { HomeContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const { width: SCREEN_W } = Dimensions.get('window');

const fallbackFeatured = [
  {
    id: 1,
    title: 'Creamy Tuscan Chicken',
    time: '35 min',
    difficulty: 'Medium',
    rating: 4.8,
    image: 'https://picsum.photos/seed/tuscan/600/400',
    category: 'Italian',
  },
  {
    id: 2,
    title: 'Spicy Miso Ramen',
    time: '45 min',
    difficulty: 'Hard',
    rating: 4.9,
    image: 'https://picsum.photos/seed/ramen/600/400',
    category: 'Japanese',
  },
  {
    id: 3,
    title: 'Honey Garlic Salmon',
    time: '20 min',
    difficulty: 'Easy',
    rating: 4.7,
    image: 'https://picsum.photos/seed/salmon/600/400',
    category: 'Seafood',
  },
];

const fallbackRecent = [
  { id: 1, title: 'Mediterranean Quinoa Bowl', date: '15 mins ago', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
  { id: 2, title: 'Classic Basil Pesto Pasta', date: '2 hours ago', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80' },
];

const dailyPlan = [
  { slot: 'Breakfast', recipe: 'Avocado Toast with Poached Egg', time: '10 min', dotColor: '#fdba74' },
  { slot: 'Lunch', recipe: 'Harvest Grain Salad', time: '15 min', dotColor: '#fb923c' },
  { slot: 'Dinner', recipe: 'Pan-Seared Salmon & Greens', time: '25 min', dotColor: '#f97316' },
];

const seasonalIngredients = [
  { name: 'Asparagus', status: 'Peak Season', image: 'https://picsum.photos/seed/asparagus/100/100' },
  { name: 'Strawberries', status: 'Just In', image: 'https://picsum.photos/seed/strawberry/100/100' },
  { name: 'Rhubarb', status: 'Limited Time', image: 'https://picsum.photos/seed/rhubarb/100/100' },
];

const withFallback = (items, fallback) => {
  if (Array.isArray(items) && items.length > 0) {
    return items;
  }
  return fallback;
};

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { user } = useAuth();
  const [featuredRecipes, setFeaturedRecipes] = useState(fallbackFeatured);
  const [recentRecipes, setRecentRecipes] = useState(fallbackRecent);
  const [homeSections, setHomeSections] = useState({
    categories: [],
    popularFilipinoRecipes: [],
    recentlyAddedRecipes: [],
    recentlyViewedRecipes: [],
  });
  const [homeSectionsLoading, setHomeSectionsLoading] = useState(true);
  const [homeSectionsError, setHomeSectionsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const isInitialLoading = useInitialContentLoading();
  const introAnim = useRef(new Animated.Value(0)).current;
  const aiChatRef = useRef(null);
  const hasRecentlyViewed = homeSections.recentlyViewedRecipes.length > 0;
  const recentlyViewedLoading = homeSectionsLoading && Boolean(user?.id);

  const profileInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  const cardStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    shadowColor: colors.brandShadow || colors.primary,
    shadowOpacity: isDark ? 0.18 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 0 : 2,
  };

  const fetchData = async () => {
    setHomeSectionsLoading(true);
    setHomeSectionsError(null);
    try {
      const [featuredRes, recentRes, sectionsRes] = await Promise.all([
        recipeApi.getFeatured(),
        recipeApi.getRecent(),
        recipeApi.getHomeSections(),
      ]);
      setFeaturedRecipes(withFallback(featuredRes?.data?.recipes, fallbackFeatured));
      setRecentRecipes(withFallback(recentRes?.data?.recipes, fallbackRecent));
      const payload = sectionsRes?.data || {};
      setHomeSections({
        categories: Array.isArray(payload.categories) ? payload.categories : [],
        popularFilipinoRecipes: Array.isArray(payload.popularFilipinoRecipes) ? payload.popularFilipinoRecipes : [],
        recentlyAddedRecipes: Array.isArray(payload.recentlyAddedRecipes) ? payload.recentlyAddedRecipes : [],
        recentlyViewedRecipes: Array.isArray(payload.recentlyViewedRecipes) ? payload.recentlyViewedRecipes : [],
      });
    } catch (error) {
      console.error('Failed to fetch home data', error);
      setFeaturedRecipes(fallbackFeatured);
      setRecentRecipes(fallbackRecent);
      setHomeSections((prev) => ({ ...prev, recentlyViewedRecipes: [] }));
      setHomeSectionsError('Could not load homepage sections. Pull to refresh.');
    } finally {
      setRefreshing(false);
      setHomeSectionsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [user?.id]);

  const introStyle = {
    opacity: introAnim,
    transform: [
      {
        translateY: introAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isInitialLoading) {
    return <HomeContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: colors.background }]}>
      {/* Header — matches web topbar */}
      <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <View style={[s.logoBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="restaurant" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[s.brandName, { color: colors.text }]}>CookMate</Text>
            <Text style={[s.brandSub, { color: colors.textMuted }]}>KITCHEN ASSISTANT</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={[s.iconBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
            <View style={[s.notifDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: colors.primary }]}>
              <Text style={s.avatarText}>{profileInitial}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.flex1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <Animated.View style={[s.content, introStyle]}>
          {/* Featured Hero Card — matches web center column */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('RecipeDetail', { id: featuredRecipes[0]?.id || 1 })}
            style={s.heroWrap}
          >
            <Image
              source={{ uri: featuredRecipes[0]?.image_url || featuredRecipes[0]?.image || 'https://picsum.photos/seed/chicken/800/800' }}
              style={s.heroImage}
            />
            <View style={s.heroOverlay} />
            <View style={s.heroContent}>
              <View style={s.heroBadge}>
                <Text style={s.heroBadgeText}>FEATURED TONIGHT</Text>
              </View>
              <Text style={s.heroTitle}>{featuredRecipes[0]?.title || 'Discover New Recipes'}</Text>
              <Text style={s.heroDesc}>{featuredRecipes[0]?.description || 'A masterclass in texture and aroma.'}</Text>
              <View style={s.heroBtn}>
                <Text style={s.heroBtnText}>View Step-by-Step</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick Start — matches web left column */}
          <View style={s.section}>
            <Text style={[s.sectionLabel, { color: colors.textMuted }]}>QUICK START</Text>
            <View style={s.quickRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('AllRecipes')}
                style={[s.quickCard, cardStyle]}
              >
                <Text style={[s.quickCardText, { color: colors.text }]}>View All Recipes</Text>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Camera')}
                style={[s.quickCard, cardStyle]}
              >
                <Text style={[s.quickCardText, { color: colors.text }]}>Scan Pantry</Text>
                <Ionicons name="barcode-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Featured Recipes Horizontal */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Featured Recipes</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredRecipes}
              keyExtractor={(item, index) => `${item.id || item.title || index}`}
              contentContainerStyle={{ paddingRight: 16 }}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  horizontal
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id || 1 })}
                />
              )}
            />
          </View>

          {/* Browse by Category */}
          <HomeSection
            eyebrow="Discover"
            title="Browse by Category"
            description="Tap a category to jump into matching recipes."
            data={homeSections.categories}
            keyExtractor={(item, index) => `cat-${item.category || index}`}
            loading={homeSectionsLoading}
            error={homeSectionsError}
            emptyText="No categories yet — once recipes are added you'll see them here."
            renderItem={({ item }) => (
              <CategoryChip
                category={item.category}
                count={item.count}
                onPress={() =>
                  navigation.navigate('Search', { category: item.category })
                }
              />
            )}
          />

          {/* Popular Filipino Recipes */}
          <HomeSection
            eyebrow="Trending"
            title="Popular Filipino Recipes"
            description="Crowd favourites blending featured picks, meal-plan usage, and review buzz."
            data={homeSections.popularFilipinoRecipes}
            keyExtractor={(item, index) => `pop-${item.id || index}`}
            loading={homeSectionsLoading}
            error={homeSectionsError}
            emptyText="No popular recipes yet."
            renderItem={({ item }) => (
              <HomeRecipeCard
                recipe={item}
                onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
              />
            )}
          />

          {/* Recently Viewed */}
          {recentlyViewedLoading || hasRecentlyViewed ? (
            <HomeSection
              eyebrow="History"
              title="Recently Viewed"
              description="Pick up where you left off — your recently viewed recipes."
              data={homeSections.recentlyViewedRecipes}
              keyExtractor={(item, index) => `rv-${item.id || index}`}
              loading={recentlyViewedLoading}
              error={null}
              emptyText="No recently viewed"
              renderItem={({ item }) => (
                <HomeRecipeCard
                  recipe={item}
                  onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
                />
              )}
            />
          ) : (
            <View style={s.historySection}>
              <HomeSection
                eyebrow="History"
                title="Recently Viewed"
                description="Pick up where you left off — your recently viewed recipes."
                showContent={false}
              />
              <Text style={[s.historyEmptyText, { color: colors.textMuted }]}>
                No recently viewed
              </Text>
            </View>
          )}

          {/* Recently Added Recipes */}
          <HomeSection
            eyebrow="Fresh"
            title="Recently Added Recipes"
            description="The newest dishes from the CookMate kitchen, hot off the oven."
            onViewAll={() => navigation.navigate('AllRecipes')}
            viewAllLabel="View all recipes"
            data={homeSections.recentlyAddedRecipes}
            keyExtractor={(item, index) => `recent-${item.id || index}`}
            loading={homeSectionsLoading}
            error={homeSectionsError}
            emptyText="No recipes have been added yet."
            renderItem={({ item }) => (
              <HomeRecipeCard
                recipe={item}
                onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
              />
            )}
          />

          {/* Info Cards Row — matches web's Seasonal Ingredients / Cooking Skills blocks */}
          <View style={s.infoRow}>
            <TouchableOpacity style={[s.infoCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>Seasonal{'\n'}Ingredients</Text>
              <Text style={[s.infoCardDesc, { color: colors.textMuted }]}>Explore what's fresh this month: Artichokes, Asparagus, and ramps.</Text>
              <Text style={[s.infoCardLink, { color: colors.primary }]}>READ GUIDE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.infoCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>Cooking{'\n'}Skills</Text>
              <Text style={[s.infoCardDesc, { color: colors.textMuted }]}>Master the 'Julienne' cut with our new 2-minute video tutorial.</Text>
              <Text style={[s.infoCardLink, { color: colors.primary }]}>WATCH VIDEO</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Meal Plan — matches web right column Today's Meal Plan */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>TODAY'S MEAL PLAN</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Planner')} style={s.editBtn}>
                <Ionicons name="create-outline" size={14} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
            <View style={[s.mealPlanCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.background, borderColor: colors.border }]}>
              {dailyPlan.map((item, i) => (
                <View
                  key={item.slot}
                  style={[s.mealRow, i < dailyPlan.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={s.mealInfo}>
                    <Text style={[s.mealSlotLabel, { color: colors.textSubtle }]}>{item.slot.toUpperCase()}</Text>
                    <Text style={[s.mealRecipeName, { color: colors.text }]}>{item.recipe}</Text>
                  </View>
                  <Ionicons name="ellipse" size={14} color={colors.border} />
                </View>
              ))}
              <TouchableOpacity
                onPress={() => navigation.navigate('Planner')}
                style={[s.genListBtn, { borderColor: colors.border }]}
              >
                <Text style={[s.genListBtnText, { color: colors.primary }]}>GENERATE SHOPPING LIST</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Recipes — matches web left column Recent Recipes */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>RECENT RECIPES</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AllRecipes')}
                style={[s.viewAllBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[s.viewAllText, { color: colors.primary }]}>VIEW ALL RECIPES</Text>
              </TouchableOpacity>
            </View>
            {recentRecipes.map((recipe, index) => (
              <TouchableOpacity
                key={`${recipe.id || recipe.title || index}`}
                onPress={() => navigation.navigate('RecipeDetail', { id: recipe.id || 1 })}
                style={s.recentItem}
              >
                <Image
                  source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/recent/400/200' }}
                  style={[s.recentImage, { borderColor: colors.borderSoft }]}
                />
                <Text style={[s.recentTitle, { color: colors.text }]}>{recipe.title}</Text>
                <Text style={[s.recentTime, { color: colors.textMuted }]}>{recipe.date || 'Recently cooked'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Cooking Assistant — matches web right column dark AI panel */}
          <View style={[s.aiPanel, { backgroundColor: colors.primary }]}>
            <View style={s.aiPanelHeader}>
              <View style={[s.aiIconBox, { backgroundColor: '#1c1917' }]}>
                <Ionicons name="restaurant" size={16} color={colors.primary} />
              </View>
              <Text style={[s.aiPanelTitle, { color: '#fff' }]}>AI Cooking{'\n'}Assistant</Text>
            </View>
            <Text style={[s.aiPanelDesc, { color: 'rgba(255,255,255,0.9)' }]}>Ask me anything about your pantry or current recipe. I can suggest substitutes in real-time.</Text>
            <View style={[s.aiQuoteBox, { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <Text style={[s.aiQuoteText, { color: '#fff' }]}>"What can I use instead of heavy cream for this sauce?"</Text>
            </View>
            <TouchableOpacity style={[s.aiBtn, { backgroundColor: '#1c1917' }]} onPress={() => aiChatRef.current?.open()}>
              <Text style={[s.aiBtnText, { color: colors.primary }]}>START CONVERSATION</Text>
            </TouchableOpacity>
          </View>

          {/* Kitchen Stats — matches web right column stats */}
          <View style={[s.statsCard, { backgroundColor: '#b5afa8', borderRadius: 32 }]}>
            <Text style={[s.sectionLabel, { color: 'rgba(255,255,255,0.9)', marginBottom: 12 }]}>KITCHEN STATS</Text>
            <View style={s.statsRow}>
              <View style={[s.statCol, { borderRightWidth: 1, borderRightColor: 'rgba(0,0,0,0.15)' }]}>
                <Text style={[s.statNumber, { color: colors.primary }]}>12</Text>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>RECIPES MADE</Text>
              </View>
              <View style={s.statCol}>
                <Text style={[s.statNumber, { color: colors.primary }]}>4.8</Text>
                <Text style={[s.statLabel, { color: 'rgba(255,255,255,0.9)' }]}>AVG RATING</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <AIAssistantWidget ref={aiChatRef} onPress={() => console.log('AI Assistant Pressed')} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex1: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Geist_800ExtraBold', fontSize: 17, letterSpacing: -0.5 },
  brandSub: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  avatarWrap: { padding: 2, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 13, letterSpacing: -0.3 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 42, paddingHorizontal: 16, gap: 10 },
  searchText: { fontFamily: 'Geist_500Medium', fontSize: 13 },
  // Hero
  heroWrap: { width: '100%', aspectRatio: 1, borderRadius: 28, overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,25,23,0.42)' },
  heroContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  heroBadge: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16 },
  heroBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#ea580c', textTransform: 'uppercase' },
  heroTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 34, color: '#fff', textAlign: 'center', letterSpacing: -0.8, lineHeight: 38, marginBottom: 10 },
  heroDesc: { fontFamily: 'Geist_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 20, maxWidth: 280 },
  heroBtn: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14 },
  heroBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#ea580c' },
  // Quick start
  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
  quickCardText: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  // Section
  section: { gap: 10 },
  sectionTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, letterSpacing: -0.3 },
  sectionLabel: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn: { padding: 4 },
  viewAllBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  viewAllText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.4 },
  historySection: { gap: 10 },
  historyEmptyText: { fontFamily: 'Geist_800ExtraBold', fontSize: 20, lineHeight: 25 },
  // Info Cards
  infoRow: { flexDirection: 'row', gap: 12 },
  infoCard: { flex: 1, padding: 20, borderRadius: 0 },
  infoCardTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, lineHeight: 21, marginBottom: 8 },
  infoCardDesc: { fontFamily: 'Geist_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 14 },
  infoCardLink: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, textDecorationLine: 'underline' },
  // Meal plan
  mealPlanCard: { borderWidth: 1, padding: 16, borderRadius: 0 },
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  mealInfo: { flex: 1 },
  mealSlotLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 2, marginBottom: 3 },
  mealRecipeName: { fontFamily: 'Geist_700Bold', fontSize: 12, paddingRight: 16 },
  genListBtn: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 14 },
  genListBtnText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 2 },
  // Recent
  recentItem: { marginBottom: 16 },
  recentImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 0, borderWidth: 1, marginBottom: 8 },
  recentTitle: { fontFamily: 'Geist_700Bold', fontSize: 13, lineHeight: 17 },
  recentTime: { fontFamily: 'Geist_400Regular', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 },
  // AI Panel
  aiPanel: { padding: 24, alignItems: 'center', borderRadius: 32 },
  aiPanelHeader: { alignItems: 'center', gap: 10, marginBottom: 14 },
  aiIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  aiPanelTitle: { fontFamily: 'Geist_700Bold', fontSize: 18, textAlign: 'center', lineHeight: 22 },
  aiPanelDesc: { fontFamily: 'Geist_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  aiQuoteBox: { width: '100%', padding: 16, borderWidth: 1, borderRadius: 16, marginBottom: 16 },
  aiQuoteText: { fontFamily: 'Geist_500Medium', fontSize: 12, fontStyle: 'italic' },
  aiBtn: { width: '100%', alignItems: 'center', paddingVertical: 18, borderRadius: 32 },
  aiBtnText: { fontFamily: 'Geist_800ExtraBold', fontSize: 10, letterSpacing: 2 },
  // Stats
  statsCard: { padding: 20, alignItems: 'center', borderRadius: 0 },
  statsRow: { flexDirection: 'row', width: '100%' },
  statCol: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statNumber: { fontFamily: 'Geist_800ExtraBold', fontSize: 26 },
  statLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
});
