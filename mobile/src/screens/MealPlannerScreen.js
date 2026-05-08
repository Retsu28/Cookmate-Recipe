import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAppTheme } from '../context/ThemeContext';
import { MealPlannerContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import AIAssistantWidget from '../components/AIAssistantWidget';
import { plannerApi } from '../api/api';
import { getGroceryListCached, getMealPlansCached, offlineCache } from '../offline/cacheService';
import { OFFLINE_MESSAGE, useNetwork } from '../offline/network';
import {
  formatPlanWindow,
  getCountdownText,
  getPlanWindowStatus,
  syncPlannerLocalNotifications,
} from '../notifications/plannerNotifications';

// Mirrors src/pages/MealPlanner.tsx mealSlots — orange-300 / orange-400 / orange-500
const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: '#fdba74' },
  { id: 'lunch', label: 'Lunch', color: '#fb923c' },
  { id: 'dinner', label: 'Dinner', color: '#f97316' },
];

function dateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

function dateFromKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function fallbackSlotWindow(slotId) {
  if (slotId === 'breakfast') return '7:00 AM - 8:00 AM';
  if (slotId === 'lunch') return '11:00 AM - 2:00 PM';
  return '6:00 PM - 8:00 PM';
}

function slotWindowLabel(slotId, slotMeals) {
  const custom = slotMeals.find((plan) => plan.custom_time_enabled);
  const plan = custom || slotMeals[0];
  return plan ? formatPlanWindow(plan) : fallbackSlotWindow(slotId);
}

export default function MealPlannerScreen({ navigation, route }) {
  const { colors, isDark } = useAppTheme();
  const { isOnline } = useNetwork();
  const [now, setNow] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'day' | 'week' — matches web pill toggle state
  const [plannedMeals, setPlannedMeals] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [groceryList, setGroceryList] = useState(null);
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const [savedLists, setSavedLists] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savingGrocery, setSavingGrocery] = useState(false);
  const [expandedSavedId, setExpandedSavedId] = useState(null);
  const [currentSavedListId, setCurrentSavedListId] = useState(null);
  const isInitialLoading = useInitialContentLoading();
  const introAnim = useRef(new Animated.Value(0)).current;
  const didInitialPlanFocus = useRef(false);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [slotModal, setSlotModal] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const startDate = view === 'week' ? startOfWeek(currentDate) : currentDate;
  const endDate = view === 'week' ? endOfWeek(currentDate) : currentDate;
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

  const plansByDateAndType = useMemo(() => {
    const grouped = new Map();
    plannedMeals.forEach((plan) => {
      const key = `${plan.planned_date}|${plan.meal_type}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(plan);
    });
    return grouped;
  }, [plannedMeals]);

  const upcomingMeal = useMemo(() => {
    return plannedMeals
      .filter((plan) => plan.reminder_enabled && getPlanWindowStatus(plan, now) !== 'ended')
      .sort((a, b) => new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime())[0] || null;
  }, [plannedMeals, now]);

  const displayedGroceryList = useMemo(() => {
    if (!groceryList) return null;
    if (selectedSlots.size === 0) return groceryList;

    const selectedRecipeIds = new Set();
    selectedSlots.forEach((slotKey) => {
      const slotPlans = plansByDateAndType.get(slotKey) || [];
      slotPlans.forEach((p) => {
        if (p.recipe?.id) selectedRecipeIds.add(p.recipe.id);
        else if (p.recipe_id) selectedRecipeIds.add(p.recipe_id);
      });
    });

    if (selectedRecipeIds.size === 0) {
      return { ...groceryList, items: [], groups: [], totalItems: 0 };
    }

    const filteredGroups = groceryList.groups.map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.recipes?.some((r) => selectedRecipeIds.has(r.id))
      );
      return { ...group, items: filteredItems };
    }).filter((group) => group.items.length > 0);

    const totalItems = filteredGroups.reduce((sum, group) => sum + group.items.length, 0);

    return {
      ...groceryList,
      groups: filteredGroups,
      items: filteredGroups.flatMap((g) => g.items),
      totalItems,
    };
  }, [groceryList, selectedSlots, plansByDateAndType]);

  const loadPlans = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setPlansLoading(true);
    try {
      const response = await getMealPlansCached(() => plannerApi.getPlan());
      const nextPlans = response?.data?.plans || [];
      setPlannedMeals(nextPlans);
      syncPlannerLocalNotifications(nextPlans).catch(() => {});
    } catch (err) {
      console.error('Failed to load meal plans', err);
      setPlannedMeals([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const hydrateCachedGroceryList = async () => {
    const cached = await offlineCache.groceryList.get('latest');
    if (cached?.data?.groceryList) {
      setGroceryList(cached.data.groceryList);
    }
  };

  const loadSavedLists = async () => {
    setSavedLoading(true);
    try {
      const response = await plannerApi.listSavedGroceryLists();
      setSavedLists(response?.data?.saved || []);
    } catch (err) {
      console.warn('Failed to load saved grocery lists', err?.message || err);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
    hydrateCachedGroceryList();
    loadSavedLists();
  }, [loadPlans]);

  useFocusEffect(
    useCallback(() => {
      const focusedDate = dateFromKey(route?.params?.plannedDate);
      if (focusedDate) {
        setCurrentDate(focusedDate);
        navigation.setParams?.({ plannedDate: undefined });
      }

      if (didInitialPlanFocus.current) {
        loadPlans({ showLoader: false });
      } else {
        didInitialPlanFocus.current = true;
      }

      return undefined;
    }, [loadPlans, navigation, route?.params?.plannedDate]),
  );

  const saveCurrentGroceryList = async () => {
    if (!groceryList || !groceryList.items?.length) {
      Alert.alert('Nothing to save', 'Generate a grocery list first.');
      return;
    }
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    setSavingGrocery(true);
    try {
      const defaultName = `Grocery list - ${format(new Date(), 'MMM d, yyyy')}`;
      const response = await plannerApi.saveGroceryList({
        name: defaultName,
        grocery_list: groceryList,
      });
      const saved = response?.data?.saved;
      if (saved) {
        setSavedLists((current) => [saved, ...current]);
        setCurrentSavedListId(saved.id);
        Alert.alert('Saved to My Saves', saved.name);
      }
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Please try again.');
    } finally {
      setSavingGrocery(false);
    }
  };

  const removeSavedList = async (saved) => {
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    try {
      await plannerApi.deleteSavedGroceryList(saved.id);
      setSavedLists((current) => current.filter((item) => item.id !== saved.id));
      setExpandedSavedId((current) => (current === saved.id ? null : current));
      setCurrentSavedListId((current) => (current === saved.id ? null : current));
    } catch (err) {
      Alert.alert('Remove failed', err?.message || 'Please try again.');
    }
  };

  const confirmRemoveSavedList = (saved) => {
    Alert.alert(
      'Remove saved list?',
      `"${saved.name}" will be deleted from your saves.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSavedList(saved) },
      ],
    );
  };

  const loadSavedIntoView = (saved) => {
    setGroceryList(saved.grocery_list);
    setCheckedItems({});
    setCurrentSavedListId(saved.id);
  };

  const clearGroceryList = async () => {
    if (currentSavedListId) {
      if (!isOnline) {
        Alert.alert('You are offline', OFFLINE_MESSAGE);
        return;
      }
      try {
        await plannerApi.deleteSavedGroceryList(currentSavedListId);
        setSavedLists((current) => current.filter((item) => item.id !== currentSavedListId));
        setExpandedSavedId((current) => (current === currentSavedListId ? null : current));
      } catch (err) {
        Alert.alert('Delete failed', err?.message || 'Please try again.');
        return;
      }
    }

    setGroceryList(null);
    setCheckedItems({});
    setCurrentSavedListId(null);
    await offlineCache.groceryList.delete('latest');
  };

  useEffect(() => {
    if (isInitialLoading) {
      return undefined;
    }
    // Mirrors web `.animate-fade-up` (0.58s, cubic-bezier(0.22, 1, 0.36, 1), translateY 16 → 0).
    introAnim.setValue(0);
    const animation = Animated.timing(introAnim, {
      toValue: 1,
      duration: 580,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isInitialLoading, introAnim]);

  if (isInitialLoading) {
    return <MealPlannerContentSkeleton colors={colors} />;
  }

  const introStyle = {
    opacity: introAnim,
    transform: [
      {
        translateY: introAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  // Soft borders / pill backgrounds tuned per theme to mirror the stone-100 / stone-200 web tokens.
  const softBorder = isDark ? colors.border : '#e7e5e4';
  const dashedBorder = isDark ? colors.border : '#d6d3d1';
  const pillTrack = isDark ? colors.surfaceAlt : '#f5f5f4';
  const emptySlotBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(245,245,244,0.5)';
  const qtyChipBg = isDark ? colors.surfaceAlt : '#f5f5f4';
  const viewFullBg = isDark ? colors.surfaceAlt : '#fafaf9';

  const cardShadow = isDark
    ? { shadowOpacity: 0, elevation: 0 }
    : {
        shadowColor: '#1c1917',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      };

  const softShadow = isDark
    ? { shadowOpacity: 0, elevation: 0 }
    : {
        shadowColor: '#1c1917',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      };

  const generateGroceryList = async () => {
    if (selectedSlots.size === 0) {
      Alert.alert('Select meals first', 'Tap a Breakfast, Lunch, or Dinner slot to select it before generating.');
      return;
    }

    if (!isOnline) {
      try {
        const response = await getGroceryListCached(() => plannerApi.getGroceryList());
        setGroceryList(response?.data?.groceryList || null);
        setCurrentSavedListId(null);
      } catch {
        Alert.alert('You are offline', 'Generate a grocery list once online before viewing it offline.');
      }
      return;
    }

    setGroceryLoading(true);
    try {
      const response = await getGroceryListCached(() => plannerApi.getGroceryList());
      setGroceryList(response?.data?.groceryList || null);
      setCurrentSavedListId(null);
      setCheckedItems({});
    } catch (err) {
      Alert.alert('Grocery list failed', err?.message || 'Please try again.');
    } finally {
      setGroceryLoading(false);
    }
  };

  const removePlan = async (plan) => {
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }

    try {
      await plannerApi.deleteMeal(plan.id);
      setPlannedMeals((current) => current.filter((item) => item.id !== plan.id));
      await offlineCache.mealPlans.delete(plan.id);
    } catch (err) {
      Alert.alert('Remove failed', err?.message || 'Please try again.');
    }
  };

  const toggleGroceryItem = (id) => {
    setCheckedItems((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleSlot = (slotKey) => {
    setSelectedSlots((current) => {
      const next = new Set(current);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView
        style={st.flex1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scrollContent}
      >
        <Animated.View style={[st.fadeWrap, introStyle]}>

          {/* Page header — matches web `Meal Planner` title + subtitle + Day/Week pill */}
          <View style={st.headerSection}>
            <Text style={[st.pageTitle, { color: colors.text }]}>Meal Planner</Text>
            <Text style={[st.pageSubtitle, { color: colors.textMuted }]}>Plan your week and eat healthier.</Text>

            <View style={[st.pill, { backgroundColor: pillTrack }]}>
              <TouchableOpacity
                onPress={() => setView('day')}
                activeOpacity={0.85}
                style={[
                  st.pillBtn,
                  view === 'day' && [{ backgroundColor: colors.surface }, softShadow],
                ]}
              >
                <Text
                  style={[
                    st.pillText,
                    { color: view === 'day' ? colors.text : colors.textSubtle },
                  ]}
                >
                  Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setView('week')}
                activeOpacity={0.85}
                style={[
                  st.pillBtn,
                  view === 'week' && [{ backgroundColor: colors.surface }, softShadow],
                ]}
              >
                <Text
                  style={[
                    st.pillText,
                    { color: view === 'week' ? colors.text : colors.textSubtle },
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date navigation card — matches web rounded-[2rem] white card with chevrons + Today */}
          <View
            style={[
              st.dateCard,
              { backgroundColor: colors.surface, borderColor: softBorder },
              cardShadow,
            ]}
          >
            <View style={st.dateRow}>
              <TouchableOpacity
                onPress={() => setCurrentDate(addDays(currentDate, view === 'week' ? -7 : -1))}
                activeOpacity={0.7}
                style={[st.chevBtn, { borderColor: softBorder }]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[st.dateRange, { color: colors.text }]}>
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1))}
                activeOpacity={0.7}
                style={[st.chevBtn, { borderColor: softBorder }]}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setCurrentDate(new Date())}
              activeOpacity={0.85}
              style={[st.todayBtn, { borderColor: softBorder }]}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={[st.todayText, { color: colors.textMuted }]}>Today</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              st.upcomingCard,
              { backgroundColor: colors.surface, borderColor: softBorder },
              cardShadow,
            ]}
          >
            <View style={[st.upcomingIcon, { backgroundColor: isDark ? 'rgba(249,115,22,0.14)' : '#ffedd5' }]}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
            </View>
            <View style={st.upcomingBody}>
              <Text style={[st.upcomingKicker, { color: colors.textSubtle }]}>UPCOMING MEAL</Text>
              {upcomingMeal ? (
                <>
                  <Text style={[st.upcomingTitle, { color: colors.text }]} numberOfLines={1}>
                    {upcomingMeal.meal_type_label} · {formatPlanWindow(upcomingMeal)}
                    {upcomingMeal.custom_time_enabled ? ' · CUSTOM' : ''}
                  </Text>
                  <Text style={[st.upcomingMeta, { color: colors.textMuted }]} numberOfLines={2}>
                    {getCountdownText(upcomingMeal, now)} · {upcomingMeal.recipe?.title || 'Planned recipe'}
                  </Text>
                </>
              ) : (
                <Text style={[st.upcomingMeta, { color: colors.textMuted }]}>
                  No upcoming reminders in the current planner window.
                </Text>
              )}
            </View>
          </View>

          {/* Week grid — horizontal scroll with 7 day columns, each with day-header + 3 meal slots */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.weekScroll}
          >
            <View style={st.weekRow}>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <View key={day.toString()} style={st.dayCol}>
                    {/* Day header — orange filled when today */}
                    <View
                      style={[
                        st.dayHeader,
                        isToday
                          ? [
                              {
                                backgroundColor: colors.primary,
                                shadowColor: colors.primary,
                              },
                              st.dayHeaderToday,
                            ]
                          : [
                              { backgroundColor: colors.surface },
                              softShadow,
                            ],
                      ]}
                    >
                      <Text
                        style={[
                          st.dayHeaderLabel,
                          {
                            color: isToday ? '#fff' : colors.textMuted,
                            opacity: isToday ? 0.85 : 1,
                          },
                        ]}
                      >
                        {format(day, 'EEE').toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          st.dayHeaderNum,
                          { color: isToday ? '#fff' : colors.text },
                        ]}
                      >
                        {format(day, 'd')}
                      </Text>
                    </View>

                    {/* 3 meal slots: filled (white card with colored dot + label + recipe) or empty (dashed) */}
                    <View style={st.slotsCol}>
                      {mealSlots.map((slot) => {
                        const slotKey = `${dateKey(day)}|${slot.id}`;
                        const isSelected = selectedSlots.has(slotKey);
                        const slotMeals = plannedMeals.filter(
                          (m) => m.planned_date === dateKey(day) && m.meal_type === slot.id,
                        );
                        const windowLabel = slotWindowLabel(slot.id, slotMeals);
                        const hasCustomTime = slotMeals.some((plan) => plan.custom_time_enabled);
                        const isActiveSlot = slotMeals.some((plan) => getPlanWindowStatus(plan, now) === 'active');
                        const meal = slotMeals[0];
                        const extraCount = slotMeals.length - 1;
                        if (meal) {
                          return (
                            <Pressable
                              key={slot.id}
                              onPress={() => toggleSlot(slotKey)}
                              style={({ pressed }) => [
                                st.mealCardFilled,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: isSelected ? colors.primary : softBorder,
                                  borderWidth: isSelected ? 2 : 1,
                                  opacity: pressed ? 0.9 : 1,
                                },
                                softShadow,
                              ]}
                            >
                              <View style={st.mealCardTopRow}>
                                <View style={[st.slotDot, { backgroundColor: slot.color }]} />
                                <View style={st.slotActions}>
                                  <TouchableOpacity
                                    onPress={() => navigation.navigate('RecipeDetail', { id: meal.recipe?.id || meal.recipe_id })}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={st.removeMealBtn}
                                  >
                                    <Ionicons name="eye-outline" size={14} color={colors.textSubtle} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => removePlan(meal)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={st.removeMealBtn}
                                  >
                                    <Ionicons name="trash-outline" size={14} color={colors.textSubtle} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <View style={st.mealCardBody}>
                                <Text
                                  style={[
                                    st.slotLabel,
                                    { color: colors.textSubtle },
                                  ]}
                                >
                                  {slot.label.toUpperCase()}
                                </Text>
                                <Text
                                  style={[
                                    st.slotTimeLabel,
                                    { color: isActiveSlot ? colors.primary : colors.textSubtle },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {windowLabel.toUpperCase()}{hasCustomTime ? ' · CUSTOM' : ''}
                                </Text>
                                <Text
                                  style={[st.recipeName, { color: colors.text }]}
                                  numberOfLines={1}
                                >
                                  {meal.recipe?.title || 'Planned recipe'}
                                </Text>
                                <Text
                                  style={[
                                    st.slotCountdown,
                                    { color: isActiveSlot ? colors.primary : colors.textMuted },
                                  ]}
                                  numberOfLines={2}
                                >
                                  {getCountdownText(meal, now)}
                                </Text>
                                {extraCount > 0 && (
                                  <TouchableOpacity
                                    onPress={() => setSlotModal({ slotKey, slotLabel: slot.label, day, meals: slotMeals })}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Text style={[st.extraCountText, { color: colors.primary }]}>
                                      +{extraCount} more
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </Pressable>
                          );
                        }
                        return (
                          <Pressable
                            key={slot.id}
                            onPress={() => toggleSlot(slotKey)}
                            style={({ pressed }) => [
                              st.mealCardEmpty,
                              {
                                borderColor: isSelected ? colors.primary : dashedBorder,
                                borderWidth: isSelected ? 2 : 2,
                                borderStyle: isSelected ? 'solid' : 'dashed',
                                backgroundColor: isSelected ? `${colors.primary}10` : emptySlotBg,
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <TouchableOpacity
                              onPress={() => navigation.navigate('Recipes')}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Text style={[st.emptySlotLabel, { color: colors.textSubtle }]}>
                                {slot.label.toUpperCase()}
                              </Text>
                              <Text style={[st.emptySlotTime, { color: colors.textSubtle }]}>
                                {windowLabel.toUpperCase()}
                              </Text>
                              <Text style={[st.emptySlotText, { color: colors.textSubtle }]}>
                                {plansLoading ? 'Loading' : 'Add'}
                              </Text>
                            </TouchableOpacity>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Shopping list dark banner — matches web aside top card */}
          <View style={st.shoppingHeader}>
            <View style={st.shoppingHeaderTitleRow}>
              <Ionicons name="cart" size={22} color={colors.primary} />
              <Text style={st.shoppingHeaderTitle}>Shopping List</Text>
            </View>
            <Text style={st.shoppingHeaderDesc}>Generated from your meal plan</Text>
            <View style={st.shoppingStatsRow}>
              <View>
                <Text style={st.shoppingStatNum}>{displayedGroceryList?.totalItems || 0}</Text>
                <Text style={st.shoppingStatLabel}>ITEMS NEEDED</Text>
              </View>
              <View style={st.shoppingHeaderActions}>
                <TouchableOpacity
                  onPress={generateGroceryList}
                  activeOpacity={0.85}
                  style={[st.exportBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={st.exportBtnText}>{groceryLoading ? 'Generating' : groceryList ? 'Regenerate' : 'Generate'}</Text>
                  <Ionicons name="refresh" size={14} color="#fff" />
                </TouchableOpacity>
                {displayedGroceryList && displayedGroceryList.items?.length ? (
                  <TouchableOpacity
                    onPress={saveCurrentGroceryList}
                    disabled={savingGrocery}
                    activeOpacity={0.85}
                    style={[st.exportBtn, st.saveBtn]}
                  >
                    <Text style={st.exportBtnText}>{savingGrocery ? 'Saving' : 'Save'}</Text>
                    <Ionicons name="bookmark" size={14} color="#fff" />
                  </TouchableOpacity>
                ) : null}
                {displayedGroceryList ? (
                  <TouchableOpacity
                    onPress={clearGroceryList}
                    activeOpacity={0.85}
                    style={[st.exportBtn, st.saveBtn]}
                  >
                    <Text style={st.exportBtnText}>{currentSavedListId ? 'Delete' : 'Clear'}</Text>
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* Shopping list categorized card — matches web aside bottom card */}
          <View
            style={[
              st.shoppingCard,
              { backgroundColor: colors.surface, borderColor: softBorder },
              cardShadow,
            ]}
          >
            <View style={st.shoppingCardInner}>
              {displayedGroceryList?.groups?.length ? (
                displayedGroceryList.groups.map((cat) => (
                  <View key={cat.category} style={st.shoppingSection}>
                    <View style={st.catHeaderRow}>
                      <View style={[st.catDot, { backgroundColor: colors.primaryLight }]} />
                      <Text style={[st.catLabel, { color: colors.textSubtle }]}>
                        {cat.category.toUpperCase()}
                      </Text>
                    </View>
                    <View style={st.catItemsCol}>
                      {cat.items.map((it) => {
                        const checked = !!checkedItems[it.id];
                        return (
                          <TouchableOpacity key={it.id} onPress={() => toggleGroceryItem(it.id)} style={st.shopItemRow} activeOpacity={0.75}>
                            <View style={st.shopItemLeft}>
                              <View style={[st.shopCheck, { borderColor: checked ? colors.primary : softBorder, backgroundColor: checked ? colors.primary : 'transparent' }]}>
                                {checked ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                              </View>
                              <Text style={[st.shopItemText, { color: checked ? colors.textSubtle : colors.text, textDecorationLine: checked ? 'line-through' : 'none' }]}>
                                {it.name}
                              </Text>
                            </View>
                            <View style={[st.shopQtyChip, { backgroundColor: qtyChipBg }]}>
                              <Text style={[st.shopQtyText, { color: colors.textSubtle }]}>
                                {it.quantity_label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <View style={st.emptyGroceryBox}>
                  <Text style={[st.shopItemText, { color: colors.textMuted, textAlign: 'center' }]}>
                    {selectedSlots.size > 0 ? 'Selected recipes do not have ingredients yet.' : 'Generate a grocery list after adding planned recipes.'}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={generateGroceryList}
              activeOpacity={0.85}
              style={[
                st.viewFullBtn,
                { borderTopColor: softBorder, backgroundColor: viewFullBg },
              ]}
            >
              <Text style={[st.viewFullText, { color: colors.primary }]}>Regenerate Grocery List</Text>
              <Ionicons name="refresh" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Slot meals modal */}
          <Modal
            visible={!!slotModal}
            transparent
            animationType="slide"
            onRequestClose={() => setSlotModal(null)}
          >
            <View style={st.modalOverlay}>
              <View style={[st.modalCard, { backgroundColor: colors.surface }]}>
                <View style={[st.modalHeader, { borderBottomColor: softBorder }]}>
                  <View>
                    <Text style={[st.modalDate, { color: colors.textMuted }]}>
                      {slotModal ? format(slotModal.day, 'EEEE, MMM d') : ''}
                    </Text>
                    <Text style={[st.modalTitle, { color: colors.text }]}>
                      {slotModal?.slotLabel || ''}
                    </Text>
                    <Text style={[st.modalSubtitle, { color: colors.textSubtle }]}>
                      {slotModal?.meals?.length || 0} recipe{(slotModal?.meals?.length || 0) === 1 ? '' : 's'} planned
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSlotModal(null)}
                    style={st.modalCloseBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
                  {(slotModal?.meals || []).map((m) => (
                    <View
                      key={m.id}
                      style={[st.modalItem, { borderBottomColor: softBorder }]}
                    >
                      <View style={st.modalItemLeft}>
                        <View style={[st.modalItemDot, { backgroundColor: colors.primaryLight }]} />
                        <View style={st.modalItemTextCol}>
                          <Text style={[st.modalItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {m.recipe?.title || 'Planned recipe'}
                          </Text>
                          <Text style={[st.modalItemMeta, { color: colors.textSubtle }]}>
                            {m.recipe?.total_time_minutes ? `${m.recipe.total_time_minutes} min` : 'Recipe'}
                          </Text>
                        </View>
                      </View>
                      <View style={st.modalItemActions}>
                        <TouchableOpacity
                          onPress={() => {
                            navigation.navigate('RecipeDetail', { id: m.recipe?.id || m.recipe_id });
                            setSlotModal(null);
                          }}
                          style={st.modalActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="eye-outline" size={16} color={colors.textSubtle} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            removePlan(m);
                            setSlotModal((current) =>
                              current
                                ? { ...current, meals: current.meals.filter((item) => item.id !== m.id) }
                                : null,
                            );
                          }}
                          style={st.modalActionBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.textSubtle} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* My Saves card — saved grocery lists */}
          <View
            style={[
              st.shoppingCard,
              { backgroundColor: colors.surface, borderColor: softBorder },
              cardShadow,
            ]}
          >
            <View style={[st.savesHeader, { borderBottomColor: softBorder }]}>
              <View style={st.savesHeaderTitleRow}>
                <Ionicons name="bookmark" size={20} color={colors.primary} />
                <Text style={[st.savesHeaderTitle, { color: colors.text }]}>My Saves</Text>
              </View>
              <View style={[st.savesBadge, { backgroundColor: qtyChipBg }]}>
                <Text style={[st.savesBadgeText, { color: colors.textSubtle }]}>
                  {savedLists.length}
                </Text>
              </View>
            </View>

            {savedLoading ? (
              <View style={st.savesEmptyBox}>
                <Text style={[st.shopItemText, { color: colors.textMuted, textAlign: 'center' }]}>
                  Loading saved lists...
                </Text>
              </View>
            ) : savedLists.length === 0 ? (
              <View style={st.savesEmptyBox}>
                <Ionicons name="bookmark-outline" size={26} color={colors.textSubtle} style={{ marginBottom: 8 }} />
                <Text style={[st.savesEmptyTitle, { color: colors.text }]}>No saved lists yet</Text>
                <Text style={[st.savesEmptyDesc, { color: colors.textMuted }]}>
                  Generate a grocery list and tap Save to keep it here.
                </Text>
              </View>
            ) : (
              <View style={st.savesList}>
                {savedLists.map((saved) => {
                  const isOpen = expandedSavedId === saved.id;
                  return (
                    <View key={saved.id} style={[st.savedItem, { borderTopColor: softBorder }]}>
                      <View style={st.savedItemRow}>
                        <TouchableOpacity
                          onPress={() => setExpandedSavedId(isOpen ? null : saved.id)}
                          activeOpacity={0.75}
                          style={st.savedItemMain}
                        >
                          <View style={[st.savedItemIcon, { backgroundColor: qtyChipBg }]}>
                            <Ionicons name="bookmark" size={14} color={colors.primary} />
                          </View>
                          <View style={st.savedItemBody}>
                            <Text
                              style={[st.savedItemTitle, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {saved.name}
                            </Text>
                            <Text style={[st.savedItemMeta, { color: colors.textMuted }]}>
                              {saved.total_items} items · {format(new Date(saved.created_at), 'MMM d, yyyy')}
                            </Text>
                          </View>
                          <Ionicons
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.textSubtle}
                          />
                        </TouchableOpacity>
                        <View style={st.savedItemActions}>
                          <TouchableOpacity
                            onPress={() => loadSavedIntoView(saved)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={[st.savedActionBtn, { backgroundColor: qtyChipBg }]}
                          >
                            <Ionicons name="eye-outline" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => confirmRemoveSavedList(saved)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={[st.savedActionBtn, { backgroundColor: qtyChipBg }]}
                          >
                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {isOpen ? (
                        <View style={[st.savedItemDetails, { backgroundColor: viewFullBg }]}>
                          {saved.grocery_list?.groups?.length ? (
                            saved.grocery_list.groups.map((group) => (
                              <View key={group.category} style={st.savedDetailGroup}>
                                <Text style={[st.savedDetailCat, { color: colors.textSubtle }]}>
                                  {group.category.toUpperCase()}
                                </Text>
                                {group.items.map((item) => (
                                  <View key={item.id} style={st.savedDetailItemRow}>
                                    <Text
                                      style={[st.savedDetailItemName, { color: colors.text }]}
                                      numberOfLines={1}
                                    >
                                      {item.name}
                                    </Text>
                                    <Text style={[st.savedDetailItemQty, { color: colors.textMuted }]}>
                                      {item.quantity_label}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ))
                          ) : (
                            <Text style={[st.shopItemText, { color: colors.textMuted, textAlign: 'center' }]}>
                              No items in this saved list.
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* Floating chat FAB — matches web AIChatWidget */}
      <AIAssistantWidget />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  fadeWrap: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },

  // Page header
  headerSection: { gap: 6 },
  pageTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 36,
    letterSpacing: -1,
    lineHeight: 40,
  },
  pageSubtitle: {
    fontFamily: 'Geist_500Medium',
    fontSize: 15,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  pillBtn: {
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
  },

  // Date navigation card
  dateCard: {
    borderRadius: 28,
    padding: 18,
    gap: 14,
    borderWidth: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chevBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRange: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 18,
    letterSpacing: -0.4,
    paddingHorizontal: 4,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    height: 46,
    gap: 8,
  },
  todayText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
  },
  upcomingCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  upcomingIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  upcomingKicker: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.8,
  },
  upcomingTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  upcomingMeta: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },

  // Week grid (horizontal scroll)
  weekScroll: { paddingRight: 16 },
  weekRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dayCol: {
    width: 108,
    gap: 12,
  },
  dayHeader: {
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
  },
  dayHeaderToday: {
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  dayHeaderLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 4,
  },
  dayHeaderNum: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  slotsCol: { gap: 12 },
  mealCardFilled: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    minHeight: 110,
    gap: 10,
  },
  mealCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeMealBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  mealCardBody: { flex: 1, justifyContent: 'flex-end', gap: 4 },
  slotLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  slotTimeLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    lineHeight: 13,
  },
  recipeName: {
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  slotCountdown: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 10,
    lineHeight: 14,
  },
  extraCountText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  mealCardEmpty: {
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  emptySlotTime: {
    fontFamily: 'Geist_700Bold',
    fontSize: 8,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 6,
  },
  emptySlotText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Shopping list dark header
  shoppingHeader: {
    backgroundColor: '#24160f',
    padding: 24,
    borderRadius: 36,
    marginTop: 4,
    gap: 6,
  },
  shoppingHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shoppingHeaderTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.5,
  },
  shoppingHeaderDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    color: '#a8a29e',
    marginBottom: 14,
  },
  shoppingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    borderRadius: 18,
  },
  shoppingStatNum: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 28,
    color: '#fff',
  },
  shoppingStatLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    color: '#a8a29e',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  shoppingHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  exportBtnText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
    color: '#fff',
  },

  // Shopping list white card
  shoppingCard: {
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shoppingCardInner: {
    padding: 22,
    gap: 22,
  },
  shoppingSection: { gap: 12 },
  emptyGroceryBox: { paddingVertical: 22, paddingHorizontal: 12 },
  catHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 2,
  },
  catItemsCol: { gap: 4 },
  shopItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  shopItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopCheck: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 7,
  },
  shopItemText: {
    fontFamily: 'Geist_500Medium',
    fontSize: 14,
  },
  shopQtyChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  shopQtyText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 10,
  },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  viewFullText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
  },

  // My Saves card
  savesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  savesHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savesHeaderTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 18,
    letterSpacing: -0.4,
  },
  savesBadge: {
    minWidth: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
  },
  savesBadgeText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 12,
  },
  savesEmptyBox: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 4,
  },
  savesEmptyTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 15,
  },
  savesEmptyDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  savesList: {
    paddingVertical: 4,
  },

  // Slot meals modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  modalCard: {
    borderRadius: 36,
    overflow: 'hidden',
    maxHeight: '70%',
    shadowColor: '#1c1917',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalDate: {
    fontFamily: 'Geist_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  modalSubtitle: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  modalItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalItemTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  modalItemTitle: {
    fontFamily: 'Geist_700Bold',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  modalItemMeta: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
  },
  modalItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  savedItem: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  savedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedItemBody: {
    flex: 1,
    minWidth: 0,
  },
  savedItemTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  savedItemMeta: {
    fontFamily: 'Geist_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  savedItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  savedActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedItemDetails: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  savedDetailGroup: {
    gap: 4,
  },
  savedDetailCat: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  savedDetailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 3,
  },
  savedDetailItemName: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 12,
    flex: 1,
  },
  savedDetailItemQty: {
    fontFamily: 'Geist_700Bold',
    fontSize: 11,
  },
});
