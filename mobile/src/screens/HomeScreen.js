import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { plannerApi, recipeApi, notificationApi, apiBaseUrl } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMealPlansCached, offlineCache } from '../offline/cacheService';
import OfflineIndicator from '../offline/OfflineIndicator';
import OptimizedImage from '../components/OptimizedImage';
import RecipeCard from '../components/RecipeCard';
import HomeRecipeCard from '../components/HomeRecipeCard';
import HomeSection from '../components/HomeSection';
import CategoryChip from '../components/CategoryChip';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { HomeContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import { useFontSizes } from '../hooks/useFontSizes';

const StarRating = React.memo(function StarRating({ rating, size = 14 }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[...Array(fullStars)].map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={size} color="#f59e0b" />
      ))}
      {hasHalfStar && (
        <View style={{ position: 'relative', width: size, height: size }}>
          <Ionicons name="star" size={size} color="#f59e0b" style={{ position: 'absolute', left: 0, top: 0 }} />
          <View style={{ position: 'absolute', left: size / 2, top: 0, width: size / 2, height: size, backgroundColor: 'transparent' }}>
            <Ionicons name="star" size={size} color="#d6d3d1" style={{ position: 'absolute', left: -size / 2, top: 0 }} />
          </View>
        </View>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star" size={size} color="#d6d3d1" />
      ))}
    </View>
  );
});

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
  {
    id: 4,
    title: 'Beef Tapa',
    time: '40 min',
    difficulty: 'Medium',
    rating: 4.8,
    image: 'https://picsum.photos/seed/tapa/600/400',
    category: 'Filipino',
  },
  {
    id: 5,
    title: 'Chicken Adobo',
    time: '50 min',
    difficulty: 'Easy',
    rating: 4.9,
    image: 'https://picsum.photos/seed/adobo/600/400',
    category: 'Filipino',
  },
];

const fallbackRecent = [
  { id: 1, title: 'Mediterranean Quinoa Bowl', date: '15 mins ago', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80' },
  { id: 2, title: 'Classic Basil Pesto Pasta', date: '2 hours ago', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80' },
];

const mealPlanSlots = [
  { id: 'breakfast', slot: 'Breakfast', dotColor: '#fdba74' },
  { id: 'lunch', slot: 'Lunch', dotColor: '#fb923c' },
  { id: 'dinner', slot: 'Dinner', dotColor: '#f97316' },
];

const phSeasonalByMonth = {
  0:  [{ name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' }, { name: 'Carrots', status: 'Peak Season', emoji: '🥕' }, { name: 'Patatas (Potato)', status: 'Peak Season', emoji: '🥔' }],
  1:  [{ name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' }, { name: 'Broccoli', status: 'Peak Season', emoji: '🥦' }, { name: 'Carrots', status: 'Peak Season', emoji: '🥕' }],
  2:  [{ name: 'Mangga (Mango)', status: 'Just In', emoji: '🥭' }, { name: 'Pakwan (Watermelon)', status: 'Just In', emoji: '🍉' }, { name: 'Melon', status: 'Just In', emoji: '🍈' }],
  3:  [{ name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭' }, { name: 'Pakwan (Watermelon)', status: 'Peak Season', emoji: '🍉' }, { name: 'Nangka (Jackfruit)', status: 'Just In', emoji: '🌿' }],
  4:  [{ name: 'Mangga (Mango)', status: 'Peak Season', emoji: '🥭' }, { name: 'Nangka (Jackfruit)', status: 'Peak Season', emoji: '🌿' }, { name: 'Durian', status: 'Peak Season', emoji: '🌿' }],
  5:  [{ name: 'Kangkong', status: 'Peak Season', emoji: '🌿' }, { name: 'Sitaw (String Beans)', status: 'Peak Season', emoji: '🫛' }, { name: 'Mais (Corn)', status: 'Just In', emoji: '🌽' }],
  6:  [{ name: 'Kangkong', status: 'Peak Season', emoji: '🌿' }, { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽' }, { name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬' }],
  7:  [{ name: 'Kangkong', status: 'Peak Season', emoji: '🌿' }, { name: 'Mais (Corn)', status: 'Peak Season', emoji: '🌽' }, { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' }],
  8:  [{ name: 'Pechay (Bok Choy)', status: 'Peak Season', emoji: '🥬' }, { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' }, { name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠' }],
  9:  [{ name: 'Kamote (Sweet Potato)', status: 'Peak Season', emoji: '🍠' }, { name: 'Gabi (Taro)', status: 'Peak Season', emoji: '🌿' }, { name: 'Carrots', status: 'Just In', emoji: '🥕' }],
  10: [{ name: 'Repolyo (Cabbage)', status: 'Just In', emoji: '🥬' }, { name: 'Carrots', status: 'Peak Season', emoji: '🥕' }, { name: 'Pineapple', status: 'Peak Season', emoji: '🍍' }],
  11: [{ name: 'Repolyo (Cabbage)', status: 'Peak Season', emoji: '🥬' }, { name: 'Pineapple', status: 'Peak Season', emoji: '🍍' }, { name: 'Broccoli', status: 'Just In', emoji: '🥦' }],
};
const _currentMonthSeasonal = phSeasonalByMonth[new Date().getMonth()] ?? phSeasonalByMonth[0];
const seasonalIngredients = _currentMonthSeasonal.map((i) => ({ ...i, image: null }));

const withFallback = (items, fallback) => {
  if (Array.isArray(items) && items.length > 0) {
    return items;
  }
  return fallback;
};

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const { fontSizes } = useFontSizes();
  const { user } = useAuth();
  const [featuredRecipes, setFeaturedRecipes] = useState(fallbackFeatured);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselIndexRef = useRef(0);
  const featuredLenRef = useRef(fallbackFeatured.length);
  const carouselTimerRef = useRef(null);
  const heroTextAnim = useRef(new Animated.Value(1)).current;
  const [recentRecipes, setRecentRecipes] = useState(fallbackRecent);
  const [plannedMeals, setPlannedMeals] = useState([]);
  const [plannedMealsLoading, setPlannedMealsLoading] = useState(true);
  const [homeSections, setHomeSections] = useState({
    categories: [],
    popularFilipinoRecipes: [],
    recentlyAddedRecipes: [],
    recentlyViewedRecipes: [],
  });
  const [homeSectionsLoading, setHomeSectionsLoading] = useState(true);
  const [homeSectionsError, setHomeSectionsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isInitialLoading = useInitialContentLoading(800);
  const [heroImagesReady, setHeroImagesReady] = useState(false);
  const aiChatRef = useRef(null);
  const didFocusOnceRef = useRef(false);
  const lastUnreadFetchRef = useRef(0);
  const hasRecentlyViewed = homeSections.recentlyViewedRecipes.length > 0;
  const recentlyViewedLoading = homeSectionsLoading && Boolean(user?.id);

  const profileInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  const headerAvatarUrl = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${apiBaseUrl}${user.avatar_url}`)
    : null;

  const cardStyle = useMemo(() => ({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    shadowColor: colors.brandShadow || colors.primary,
    shadowOpacity: isDark ? 0.18 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 0 : 2,
  }), [colors, isDark]);

  const loadMealPlans = useCallback(async ({ showLoader = true } = {}) => {
    if (!user?.id) {
      setPlannedMealsLoading(false);
      return;
    }
    if (showLoader) setPlannedMealsLoading(true);
    try {
      const response = await getMealPlansCached(() => plannerApi.getPlan());
      setPlannedMeals(response?.data?.plans || []);
    } catch {
      setPlannedMeals([]);
    } finally {
      if (showLoader) setPlannedMealsLoading(false);
    }
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    setHomeSectionsLoading(true);
    setHomeSectionsError(null);
    try {
      const [featuredRes, recentRes, sectionsRes] = await Promise.all([
        recipeApi.getFeatured(),
        recipeApi.getRecent(),
        recipeApi.getHomeSections(),
      ]);
      const featured = withFallback(featuredRes?.data?.recipes?.slice(0, 5), fallbackFeatured);
      const recent = withFallback(recentRes?.data?.recipes, fallbackRecent);
      setFeaturedRecipes(featured);
      setRecentRecipes(recent);
      const payload = sectionsRes?.data || {};
      const sections = {
        categories: Array.isArray(payload.categories) ? payload.categories : [],
        popularFilipinoRecipes: Array.isArray(payload.popularFilipinoRecipes) ? payload.popularFilipinoRecipes : [],
        recentlyAddedRecipes: Array.isArray(payload.recentlyAddedRecipes) ? payload.recentlyAddedRecipes : [],
        recentlyViewedRecipes: Array.isArray(payload.recentlyViewedRecipes) ? payload.recentlyViewedRecipes : [],
      };
      setHomeSections(sections);
      // Mirror fetched recipes to the offline cache so the Home screen can
      // still show content when the network goes away.
      const cacheable = [
        ...featured,
        ...recent,
        ...sections.popularFilipinoRecipes,
        ...sections.recentlyAddedRecipes,
        ...sections.recentlyViewedRecipes,
      ].filter((r) => r && r.id != null);
      offlineCache.recipes.upsertMany(cacheable).catch(() => {});
    } catch (error) {
      console.error('Failed to fetch home data', error);
      // Offline fallback — read whatever we have cached locally.
      try {
        const cachedRows = await offlineCache.recipes.getAll({ limit: 200 });
        const cached = cachedRows.map((r) => r.data).filter(Boolean);
        if (cached.length > 0) {
          setFeaturedRecipes(cached.slice(0, 6));
          setRecentRecipes(cached.slice(0, 10));
          setHomeSections((prev) => ({ ...prev, recentlyAddedRecipes: cached.slice(0, 10) }));
          setHomeSectionsError(null);
        } else {
          setFeaturedRecipes(fallbackFeatured);
          setRecentRecipes(fallbackRecent);
          setHomeSections((prev) => ({ ...prev, recentlyViewedRecipes: [] }));
          setHomeSectionsError('Could not load homepage sections. Pull to refresh.');
        }
      } catch {
        setFeaturedRecipes(fallbackFeatured);
        setRecentRecipes(fallbackRecent);
        setHomeSections((prev) => ({ ...prev, recentlyViewedRecipes: [] }));
        setHomeSectionsError('Could not load homepage sections. Pull to refresh.');
      }
    } finally {
      setRefreshing(false);
      setHomeSectionsLoading(false);
    }
  }, []);

  const goToSlide = useCallback((idx) => {
    Animated.timing(heroTextAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      carouselIndexRef.current = idx;
      setCarouselIndex(idx);
      Animated.timing(heroTextAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    });
  }, [heroTextAnim]);

  const goNext = useCallback(() => {
    const len = featuredLenRef.current;
    if (len < 2) return;
    goToSlide((carouselIndexRef.current + 1) % len);
  }, [goToSlide]);

  const goPrev = useCallback(() => {
    const len = featuredLenRef.current;
    if (len < 2) return;
    goToSlide((carouselIndexRef.current - 1 + len) % len);
  }, [goToSlide]);

  useEffect(() => {
    featuredLenRef.current = featuredRecipes.length;
  }, [featuredRecipes.length]);

  useEffect(() => {
    if (featuredRecipes.length < 2) return;
    carouselTimerRef.current = setInterval(goNext, 4500);
    return () => { if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); };
  }, [goNext]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      fetchData();
      loadMealPlans();
    });
    return () => task.cancel();
  }, [user?.id, fetchData, loadMealPlans]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const now = Date.now();
    if (now - lastUnreadFetchRef.current < 60_000) return;
    lastUnreadFetchRef.current = now;
    try {
      const READ_KEY = 'cookmate.readPlannerNotifications';
      const [upcomingRes, groceryRes, dbNotifsRes, storedRaw] = await Promise.all([
        plannerApi.getUpcoming({ lookaheadHours: 168, lookbackHours: 24 }).catch(() => null),
        plannerApi.getGroceryList().catch(() => null),
        notificationApi.getNotifications(user.id).catch(() => null),
        AsyncStorage.getItem(READ_KEY).catch(() => null),
      ]);
      const readIds = storedRaw ? JSON.parse(storedRaw) : [];
      const plans = upcomingRes?.data?.plans || [];
      const groceryList = groceryRes?.data?.groceryList;
      const dbNotifs = dbNotifsRes?.data?.notifications || [];
      let count = 0;
      dbNotifs.forEach((n) => { if (!n.is_read) count += 1; });
      plans.forEach((p) => { if (!readIds.includes(p.id)) count += 1; });
      if (groceryList && groceryList.totalItems > 0 && !readIds.includes(-1)) count += 1;
      setUnreadCount(count);
    } catch {
      // best-effort — keep previous count
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadMealPlans({ showLoader: false });
      fetchUnreadCount();

      if (!user?.id) {
        setHomeSections((prev) =>
          prev.recentlyViewedRecipes.length > 0
            ? { ...prev, recentlyViewedRecipes: [] }
            : prev
        );
        return undefined;
      }

      if (!didFocusOnceRef.current) {
        didFocusOnceRef.current = true;
        return undefined;
      }

      let active = true;
      const timer = setTimeout(async () => {
        try {
          const response = await recipeApi.getRecentlyViewed();
          if (!active) return;

          const recentlyViewed = Array.isArray(response?.data?.recipes)
            ? response.data.recipes
            : [];
          setHomeSections((prev) => ({
            ...prev,
            recentlyViewedRecipes: recentlyViewed,
          }));

          if (recentlyViewed.length > 0) {
            offlineCache.recipes.upsertMany(recentlyViewed).catch(() => {});
          }
        } catch {
          /* recently viewed is best-effort; keep the current section */
        }
      }, 450);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [loadMealPlans, fetchUnreadCount, user?.id])
  );


  const renderRecentItem = useCallback(({ item: recipe }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('RecipeDetail', { id: recipe.id || 1 })}
      style={s.recentItem}
    >
      <OptimizedImage
        source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/recent/400/200' }}
        style={[s.recentImage, { borderColor: colors.borderSoft }]}
        resizeMode="cover"
      />
      <Text style={[s.recentTitle, { color: colors.text }]}>{recipe.title}</Text>
      <Text style={[s.recentTime, { color: colors.textMuted }]}>{recipe.date || 'Recent recipes'}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <StarRating rating={recipe.avg_rating || 0} size={10} />
        <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 10, color: colors.textMuted }}>
          {(recipe.avg_rating || 0).toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [navigation, colors]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    loadMealPlans({ showLoader: false });
  };

  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todaysMealRows = mealPlanSlots.map((slot) => {
    const plans = plannedMeals.filter((plan) => plan.planned_date === todayKey && plan.meal_type === slot.id);
    return {
      ...slot,
      plans,
      primaryPlan: plans[0] || null,
    };
  });
  const todaysPlanCount = todaysMealRows.reduce((total, row) => total + row.plans.length, 0);
  const openTodayPlanner = (params = {}) => {
    navigation.navigate('Planner', {
      plannedDate: todayKey,
      view: 'day',
      ...params,
    });
  };

  if (isInitialLoading) {
    return <HomeContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: colors.background }]}>
      {/* Header — matches web topbar */}
      <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={[s.logoBadge, { backgroundColor: colors.primary }]} />
          <View>
            <Text style={[s.brandName, { fontSize: fontSizes.lg }]}>
              <Text style={{ color: colors.text }}>Cook</Text><Text style={{ color: colors.primary }}>Mate</Text>
            </Text>
            <View style={s.brandSubRow}>
              <View style={[s.brandLine, { backgroundColor: colors.primary }]} />
              <Text style={[s.brandSub, { color: colors.primary, fontSize: fontSizes.xs }]}>KITCHEN ASSISTANT</Text>
              <View style={[s.brandLine, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={[s.iconBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="notifications-outline" size={18} color={colors.textMuted} />
            {unreadCount > 0 && (
              <View style={[s.notifDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            style={[s.avatarWrap, { borderColor: headerAvatarUrl ? colors.primary : 'transparent' }]}
          >
            {headerAvatarUrl ? (
              <View style={s.avatarImgWrap}>
                <Image source={{ uri: headerAvatarUrl }} style={s.avatarImg} />
              </View>
            ) : (
              <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                <Text style={s.avatarText}>{profileInitial}</Text>
              </View>
            )}
            {/* Connection status — green (online) / red breathing (offline). */}
            <OfflineIndicator bottom={-2} right={-2} size={12} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.flex1}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <View style={s.content}>
          {/* Featured Hero Carousel */}
          <View style={s.heroWrap}>
            {/* Pre-mounted images — one per recipe, always in tree, opacity toggled.
                Slide 0 loads immediately; slides 1+ mount only after slide 0's
                onLoad fires so they don’t race for bandwidth on initial render. */}
            {featuredRecipes.map((recipe, idx) => (
              (idx === 0 || heroImagesReady) ? (
                <Image
                  key={recipe.id ?? idx}
                  source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/chicken/800/800' }}
                  style={[s.heroImage, StyleSheet.absoluteFill, { opacity: idx === carouselIndex ? 1 : 0 }]}
                  resizeMode="cover"
                  onLoad={idx === 0 ? () => setHeroImagesReady(true) : undefined}
                />
              ) : null
            ))}

            {/* Dark gradient overlays */}
            <View style={s.heroOverlay} />
            <View style={s.heroOverlayTop} />

            {/* Text content — single fade on the whole block */}
            <Animated.View style={[s.heroContent, { opacity: heroTextAnim }]}>
              {/* Badge with star icon + border */}
              <View style={s.heroBadge}>
                <Ionicons name="star" size={10} color="#fb923c" />
                <Text style={s.heroBadgeText}>FEATURED TONIGHT</Text>
              </View>

              {/* Two-line split title: first half white, second half orange italic */}
              {(() => {
                const title = featuredRecipes[carouselIndex]?.title || 'Discover New Recipes';
                const words = title.split(' ');
                const half = Math.ceil(words.length / 2);
                const firstLine = words.slice(0, half).join(' ');
                const secondLine = words.slice(half).join(' ');
                return (
                  <View style={{ width: '100%' }}>
                    <Text style={s.heroTitleWhite}>{firstLine}</Text>
                    {secondLine ? <Text style={s.heroTitleOrange}>{secondLine}</Text> : null}
                  </View>
                );
              })()}

              <Text style={s.heroDesc} numberOfLines={3}>
                {featuredRecipes[carouselIndex]?.description?.slice(0, 100) || 'A masterclass in texture and aroma.'}
              </Text>

              {/* Premium button with icon pill + arrow */}
              <TouchableOpacity
                style={s.heroBtn}
                activeOpacity={0.82}
                onPress={() => navigation.navigate('RecipeDetail', { id: featuredRecipes[carouselIndex]?.id || 1 })}
              >
                <View style={s.heroBtnIconWrap}>
                  <Ionicons name="restaurant" size={11} color="#fff" />
                </View>
                <Text style={s.heroBtnText}>Let's Cook</Text>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </Animated.View>

            {/* Prev / Next arrows */}
            {featuredRecipes.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={() => { if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); goPrev(); }}
                  style={[s.heroArrow, s.heroArrowLeft]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); goNext(); }}
                  style={[s.heroArrow, s.heroArrowRight]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </>
            )}

            {/* Dot indicators */}
            {featuredRecipes.length > 1 && (
              <View style={s.heroDots}>
                {featuredRecipes.slice(0, 5).map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { clearInterval(carouselTimerRef.current); carouselTimerRef.current = null; goToSlide(i); }}
                    style={[
                      s.heroDot,
                      i === carouselIndex ? s.heroDotActive : s.heroDotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

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
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={3}
              removeClippedSubviews={true}
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
            colors={colors}
            isDark={isDark}
            renderItem={({ item }) => (
              <CategoryChip
                category={item.category}
                count={item.count}
                imageUrl={item.image_url || null}
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
            colors={colors}
            isDark={isDark}
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
              colors={colors}
              isDark={isDark}
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
                colors={colors}
                isDark={isDark}
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
            colors={colors}
            isDark={isDark}
            renderItem={({ item }) => (
              <HomeRecipeCard
                recipe={item}
                onPress={() => navigation.navigate('RecipeDetail', { id: item.id })}
              />
            )}
          />

          {/* Info Cards Row — matches web's Seasonal Ingredients / Cooking Skills blocks */}
          <View style={s.infoRow}>
            <TouchableOpacity style={[s.infoCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.surface }]} onPress={() => navigation.navigate('SeasonalGuide')}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>Seasonal{'\n'}Ingredients</Text>
              <Text style={[s.infoCardDesc, { color: colors.textMuted }]}>Explore what's fresh in the Philippines this season: from highland Baguio veggies to tropical summer fruits.</Text>
              <Text style={[s.infoCardLink, { color: colors.primary }]}>READ GUIDE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.infoCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.surface }]} onPress={() => navigation.navigate('CookingSkills')}>
              <Text style={[s.infoCardTitle, { color: colors.text }]}>Cooking{'\n'}Skills</Text>
              <Text style={[s.infoCardDesc, { color: colors.textMuted }]}>Master the 'Julienne' cut with our new 2-minute video tutorial.</Text>
              <Text style={[s.infoCardLink, { color: colors.primary }]}>WATCH VIDEO</Text>
            </TouchableOpacity>
          </View>

          {/* Daily Meal Plan — matches web right column Today's Meal Plan */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: colors.textMuted }]}>TODAY'S MEAL PLAN</Text>
              <TouchableOpacity onPress={() => openTodayPlanner()} style={s.editBtn}>
                <Ionicons name="create-outline" size={14} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>
            <View style={[s.mealPlanCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.background, borderColor: colors.border }]}>
              {todaysMealRows.map((item, i) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => openTodayPlanner({ mealType: item.id })}
                  activeOpacity={0.78}
                  style={[s.mealRow, i < todaysMealRows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={s.mealInfo}>
                    <Text style={[s.mealSlotLabel, { color: colors.textSubtle }]}>{item.slot.toUpperCase()}</Text>
                    <Text style={[s.mealRecipeName, { color: colors.text }]}>
                      {plannedMealsLoading
                        ? 'Loading planner...'
                        : item.primaryPlan?.recipe?.title || 'Not planned yet'}
                    </Text>
                    {!plannedMealsLoading && item.plans.length > 1 ? (
                      <Text style={[s.mealExtraText, { color: colors.primary }]}>
                        +{item.plans.length - 1} more planned
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={item.primaryPlan ? 'checkmark-circle-outline' : 'ellipse-outline'}
                    size={16}
                    color={item.primaryPlan ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => openTodayPlanner(todaysPlanCount > 0 ? { selectToday: true } : {})}
                style={[s.genListBtn, { borderColor: colors.border }]}
              >
                <Text style={[s.genListBtnText, { color: colors.primary }]}>
                  {todaysPlanCount > 0 ? 'GENERATE SHOPPING LIST' : 'OPEN MEAL PLANNER'}
                </Text>
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
            <FlatList
              data={recentRecipes}
              keyExtractor={(item, index) => `recent-row-${item.id || item.title || index}`}
              scrollEnabled={false}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              removeClippedSubviews={false}
              renderItem={renderRecentItem}
            />
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
        </View>
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
  brandName: { fontFamily: 'PlayfairDisplay_800ExtraBold_Italic', fontSize: 18, letterSpacing: -0.3 },
  brandSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  brandLine: { height: 1, width: 10, opacity: 0.6 },
  brandSub: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 2, textTransform: 'uppercase' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  avatarWrap: { position: 'relative', padding: 2, borderRadius: 20, borderWidth: 2 },
  avatarImgWrap: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: 32, height: 32 },
  avatarText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 13, letterSpacing: -0.3 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 42, paddingHorizontal: 16, gap: 10 },
  searchText: { fontFamily: 'Geist_500Medium', fontSize: 13 },
  // Hero
  heroWrap: { width: '100%', aspectRatio: 1, borderRadius: 28, overflow: 'hidden' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,10,9,0.45)' },
  heroOverlayTop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(60,20,0,0.18)' },
  heroContent: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', alignItems: 'flex-start', paddingBottom: 44, paddingHorizontal: 28 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(251,146,60,0.6)', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 14 },
  heroBadgeText: { fontFamily: 'Geist_700Bold', fontSize: 10, letterSpacing: 1.5, color: '#fed7aa', textTransform: 'uppercase' },
  heroTitleWhite: { fontFamily: 'PlayfairDisplay_800ExtraBold', fontSize: 38, color: '#fff', letterSpacing: -0.5, lineHeight: 44 },
  heroTitleOrange: { fontFamily: 'PlayfairDisplay_800ExtraBold_Italic', fontSize: 38, color: '#fb923c', letterSpacing: -0.5, lineHeight: 44, marginBottom: 10 },
  heroDesc: { fontFamily: 'Geist_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'left', marginBottom: 20, maxWidth: 260 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ea580c', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, shadowColor: '#7c2d12', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 6 },
  heroBtnIconWrap: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroBtnText: { fontFamily: 'Geist_700Bold', fontSize: 12, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
  heroArrow: { position: 'absolute', top: SCREEN_W / 2 - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  heroArrowLeft: { left: 14 },
  heroArrowRight: { right: 14 },
  heroDots: { position: 'absolute', bottom: 18, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  heroDot: { height: 6, borderRadius: 3 },
  heroDotActive: { width: 18, backgroundColor: '#fff' },
  heroDotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.4)' },
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
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  infoCard: { flex: 1, padding: 20, borderRadius: 24 },
  infoCardTitle: { fontFamily: 'Geist_700Bold', fontSize: 16, lineHeight: 21, marginBottom: 8 },
  infoCardDesc: { fontFamily: 'Geist_400Regular', fontSize: 11, lineHeight: 16, marginBottom: 14 },
  infoCardLink: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, textDecorationLine: 'underline' },
  // Meal plan
  mealPlanCard: { borderWidth: 1, padding: 16, borderRadius: 0 },
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  mealInfo: { flex: 1 },
  mealSlotLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 2, marginBottom: 3 },
  mealRecipeName: { fontFamily: 'Geist_700Bold', fontSize: 12, paddingRight: 16 },
  mealExtraText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.2, marginTop: 4, textTransform: 'uppercase' },
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
