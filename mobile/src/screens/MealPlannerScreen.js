import React, { useState, useEffect, useCallback } from 'react';

import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useFocusEffect } from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';

import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

import { useAppTheme } from '../context/ThemeContext';

import { MealPlannerContentSkeleton } from '../components/SkeletonPlaceholder';
import {
  MealPlannerHeader,
  DateNavigationCard,
  UpcomingMealCard,
  MealSlotCard,
  EditPlanModal,
  RecipeRecommendationsSheet,
} from '../components/mealPlanner';
import useMealPlannerData from '../hooks/useMealPlannerData';
import useGroceryList from '../hooks/useGroceryList';
import SlideIconButton from '../components/SlideIconButton';

import useInitialContentLoading from '../hooks/useInitialContentLoading';

import AIAssistantWidget from '../components/AIAssistantWidget';

import { useNetwork } from '../offline/network';

import {
  formatPlanWindow,
  getPlanWindowStatus,
} from '../notifications/plannerNotifications';



// Mirrors src/pages/MealPlanner.tsx mealSlots — orange-300 / orange-400 / orange-500

const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: '#fdba74' },
  { id: 'lunch', label: 'Lunch', color: '#fb923c' },
  { id: 'dinner', label: 'Dinner', color: '#f97316' },
];

// Module-level flag to track initial focus (avoids useRef)
let didInitialPlanFocus = false;



function dateKey(date) {

  return format(date, 'yyyy-MM-dd');

}



function dateFromKey(value) {

  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return null;



  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(date.getTime()) ? null : date;

}



function normalizeViewParam(value) {

  return value === 'day' || value === 'week' ? value : null;

}



function normalizeMealTypeParam(value) {

  return mealSlots.some((slot) => slot.id === value) ? value : null;

}



function selectedSlotsFromFocus(date, mealType, selectToday) {

  const key = dateKey(date);

  if (mealType) return new Set([`${key}|${mealType}`]);

  if (selectToday) return new Set(mealSlots.map((slot) => `${key}|${slot.id}`));

  return new Set();

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
  const isInitialLoading = useInitialContentLoading();

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [modalState, setModalState] = useState({ slot: null, editing: null });
  const [recommendationsSheet, setRecommendationsSheet] = useState({ visible: false, mealType: null, day: null });
  const [addRecipeModal, setAddRecipeModal] = useState({ visible: false, recipe: null });

  const {
    plannedMeals,
    savedLists,
    setSavedLists,
    loadingPlans,
    loadingSaved,
    loadPlans,
    loadSavedLists,
    updatePlan,
    removePlan,
    confirmRemoveSavedList,
  } = useMealPlannerData({ isOnline });

  const plansByDateAndType = (() => {
    const grouped = new Map();
    plannedMeals.forEach((plan) => {
      const key = `${plan.planned_date}|${plan.meal_type}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(plan);
    });
    return grouped;
  })();

  const {
    groceryList,
    setGroceryList,
    checkedItems,
    setCheckedItems,
    savedListState,
    setSavedListState,
    loadingGrocery,
    savingGrocery,
    hydrateCachedGroceryList,
    generateGroceryList,
    saveCurrentGroceryList,
    clearGroceryList,
    loadSavedIntoView,
    toggleGroceryItem,
    getDisplayedGroceryList,
  } = useGroceryList({ isOnline, selectedSlots, plansByDateAndType });

  const displayedGroceryList = getDisplayedGroceryList();

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayPhKeyForEffect = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowMs);
  useEffect(() => {
    setCurrentDate((prev) => {
      const prevKey = dateKey(prev);
      return prevKey < todayPhKeyForEffect ? new Date() : prev;
    });
  }, [todayPhKeyForEffect]);

  useEffect(() => {
    loadPlans();
    hydrateCachedGroceryList();
    loadSavedLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDate = view === 'week' ? startOfWeek(currentDate, { weekStartsOn: 0 }) : currentDate;
  const endDate = view === 'week' ? endOfWeek(currentDate, { weekStartsOn: 0 }) : currentDate;
  const todayPhKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(nowMs);
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = view === 'week' ? allDays.filter((d) => dateKey(d) >= todayPhKey) : allDays;

  const getUpcomingMeal = () => plannedMeals
    .filter((plan) => plan.reminder_enabled && getPlanWindowStatus(plan, nowMs) !== 'ended')
    .sort((a, b) => new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime())[0] || null;



  useFocusEffect(

    useCallback(() => {

      const focusedDate = dateFromKey(route?.params?.plannedDate);

      const focusedView = normalizeViewParam(route?.params?.view);

      const focusedMealType = normalizeMealTypeParam(route?.params?.mealType);

      const shouldSelectToday = route?.params?.selectToday === true || route?.params?.selectToday === 'true';



      if (focusedDate) {

        setCurrentDate(focusedDate);

      }

      if (focusedView) {

        setView(focusedView);

      }

      if (focusedDate && (focusedMealType || shouldSelectToday)) {

        setSelectedSlots(selectedSlotsFromFocus(focusedDate, focusedMealType, shouldSelectToday));

      }

      if (focusedDate || focusedView || focusedMealType || shouldSelectToday) {

        navigation.setParams?.({

          plannedDate: undefined,

          view: undefined,

          mealType: undefined,

          selectToday: undefined,

        });

      }



      if (didInitialPlanFocus) {
        loadPlans({ showLoader: false });
      } else {
        didInitialPlanFocus = true;
      }



      return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      navigation,
      route?.params?.mealType,
      route?.params?.plannedDate,
      route?.params?.selectToday,
      route?.params?.view,
    ]),

  );












  // Static shadow styles
  const cardShadow = isDark
    ? { shadowOpacity: 0, elevation: 0 }
    : { shadowColor: '#1c1917', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 };

  const softShadow = isDark
    ? { shadowOpacity: 0, elevation: 0 }
    : { shadowColor: '#1c1917', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 };

  const toggleSlot = (slotKey) => {
    setSelectedSlots((current) => {
      const next = new Set(current);
      if (next.has(slotKey)) next.delete(slotKey);
      else next.add(slotKey);
      return next;
    });
  };

  // Direct value access - no need for useMemo
  const now = new Date(nowMs);

  // Navigation helpers - no useCallback needed (navigation is stable)
  const onViewRecipe = (id) => navigation.navigate('RecipeDetail', { id });
  const onAddRecipe = (slotId, day) => {
    setRecommendationsSheet({ visible: true, mealType: slotId, day });
  };
  const onBrowseAllRecipes = () => {
    setRecommendationsSheet({ visible: false, mealType: null, day: null });
    navigation.navigate('Recipes');
  };

  // Render slot - regular function (not useCallback)
  const renderSlot = (day, slot, isSelected, softBorder) => {
    const slotKey = `${dateKey(day)}|${slot.id}`;
    const slotMeals = plansByDateAndType.get(slotKey) || [];
    const meal = slotMeals[0];
    const windowLabel = slotWindowLabel(slot.id, slotMeals);
    const hasCustomTime = slotMeals.some((p) => p.custom_time_enabled);
    const extraCount = slotMeals.length - 1;
    return (
      <MealSlotCard
        key={slot.id}
        slotKey={slotKey}
        slot={slot}
        meal={meal ?? null}
        slotMeals={slotMeals}
        windowLabel={windowLabel}
        hasCustomTime={hasCustomTime}
        extraCount={extraCount}
        isSelected={isSelected}
        softBorder={softBorder}
        colors={colors}
        isDark={isDark}
        plansLoading={loadingPlans}
        day={day}
        nowMs={nowMs}
        onToggle={toggleSlot}
        onView={onViewRecipe}
        onEdit={(plan) => setModalState((s) => ({ ...s, editing: plan }))}
        onMore={(slot) => setModalState((s) => ({ ...s, slot }))}
        onRemove={removePlan}
        onAdd={() => onAddRecipe(slot.id, day)}
      />
    );
  };




  if (isInitialLoading) {

    return <MealPlannerContentSkeleton colors={colors} />;

  }



  // Soft borders / pill backgrounds tuned per theme to mirror the stone-100 / stone-200 web tokens.

  const softBorder = isDark ? colors.border : '#e7e5e4';

  const pillTrack = isDark ? colors.surfaceAlt : '#f5f5f4';

  const qtyChipBg = isDark ? colors.surfaceAlt : '#f5f5f4';

  const viewFullBg = isDark ? colors.surfaceAlt : '#fafaf9';

  const isDayView = view === 'day';



  return (

    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>

      <ScrollView

        style={st.flex1}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={st.scrollContent}

      >

        <View style={st.fadeWrap}>



          {/* Header with title and view toggle */}
          <MealPlannerHeader
            colors={colors}
            view={view}
            setView={setView}
            pillTrack={pillTrack}
            softShadow={softShadow}
          />

          {/* Date navigation card */}
          <DateNavigationCard
            view={view}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            startDate={startDate}
            endDate={endDate}
            todayPhKey={todayPhKey}
            colors={colors}
            softBorder={softBorder}
            cardShadow={cardShadow}
          />

          {/* Upcoming meal reminder */}
          <UpcomingMealCard
            upcomingMeal={getUpcomingMeal()}
            nowMs={nowMs}
            colors={colors}
            isDark={isDark}
            softBorder={softBorder}
            cardShadow={cardShadow}
          />



          {/* Meal grid — Day: single full-width column, Week: horizontal scroll with 7 columns */}

          <View>

          {isDayView ? (
            <View style={st.dayGridSingle}>
              {weekDays.map((day) => {
                const isToday = dateKey(day) === todayPhKey;
                return (
                  <View key={day.toString()} style={{ gap: 12 }}>
                    <View
                      style={[
                        st.dayHeader,
                        isToday
                          ? [{ backgroundColor: colors.primary, shadowColor: colors.primary }, st.dayHeaderToday]
                          : [{ backgroundColor: colors.surface }, softShadow],
                      ]}
                    >
                      <Text style={[st.dayHeaderLabel, { color: isToday ? '#fff' : colors.textMuted, opacity: isToday ? 0.85 : 1 }]}>
                        {format(day, 'EEE').toUpperCase()}
                      </Text>
                      <Text style={[st.dayHeaderNum, { color: isToday ? '#fff' : colors.text }]}>
                        {format(day, 'd')}
                      </Text>
                      <Text style={[st.dayHeaderMonth, { color: isToday ? '#fff' : colors.textMuted, opacity: isToday ? 0.85 : 1 }]}>
                        {format(day, 'MMM yyyy').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ gap: 12 }}>
                      {mealSlots.map((slot) => renderSlot(day, slot, selectedSlots.has(`${dateKey(day)}|${slot.id}`), softBorder))}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.weekScroll}
            >
              <View style={st.weekRow}>
                {weekDays.map((day) => {
                  const isToday = dateKey(day) === todayPhKey;
                  return (
                    <View key={day.toString()} style={st.dayCol}>
                      <View
                        style={[
                          st.dayHeader,
                          isToday
                            ? [{ backgroundColor: colors.primary, shadowColor: colors.primary }, st.dayHeaderToday]
                            : [{ backgroundColor: colors.surface }, softShadow],
                        ]}
                      >
                        <Text style={[st.dayHeaderLabel, { color: isToday ? '#fff' : colors.textMuted, opacity: isToday ? 0.85 : 1 }]}>
                          {format(day, 'EEE').toUpperCase()}
                        </Text>
                        <Text style={[st.dayHeaderNum, { color: isToday ? '#fff' : colors.text }]}>
                          {format(day, 'd')}
                        </Text>
                      </View>
                      <View style={st.slotsCol}>
                        {mealSlots.map((slot) => renderSlot(day, slot, selectedSlots.has(`${dateKey(day)}|${slot.id}`), softBorder))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          </View>

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

                  <Text style={st.exportBtnText}>

                    {loadingGrocery ? 'Generating' : groceryList ? 'Regenerate' : 'Generate'}

                  </Text>

                  <Ionicons name="refresh" size={14} color="#fff" />

                </TouchableOpacity>

                {displayedGroceryList && displayedGroceryList.items?.length ? (

                  <TouchableOpacity

                    onPress={() => saveCurrentGroceryList(displayedGroceryList, setSavedLists)}

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

                    onPress={() => clearGroceryList(setSavedLists)}

                    activeOpacity={0.85}

                    style={[st.exportBtn, st.saveBtn]}

                  >

                    <Text style={st.exportBtnText}>{savedListState.currentId ? 'Delete' : 'Clear'}</Text>

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

            visible={!!modalState.slot}
            transparent
            animationType="slide"
            onRequestClose={() => setModalState((s) => ({ ...s, slot: null }))}

          >

            <View style={st.modalOverlay}>

              <View style={[st.modalCard, { backgroundColor: colors.surface }]}>

                <View style={[st.modalHeader, { borderBottomColor: softBorder }]}>

                  <View>

                    <Text style={[st.modalDate, { color: colors.textMuted }]}>

                      {modalState.slot ? format(modalState.slot.day, 'EEEE, MMM d') : ''}

                    </Text>

                    <Text style={[st.modalTitle, { color: colors.text }]}>

                      {modalState.slot?.slotLabel || ''}

                    </Text>

                    <Text style={[st.modalSubtitle, { color: colors.textSubtle }]}>

                      {modalState.slot?.meals?.length || 0} recipe{(modalState.slot?.meals?.length || 0) === 1 ? '' : 's'} planned

                    </Text>

                  </View>

                  <TouchableOpacity

                    onPress={() => setModalState((s) => ({ ...s, slot: null }))}

                    style={st.modalCloseBtn}

                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}

                  >

                    <Ionicons name="close" size={22} color={colors.textMuted} />

                  </TouchableOpacity>

                </View>

                <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>

                  {(modalState.slot?.meals || []).map((m) => (

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

                            setModalState((s) => ({ ...s, slot: null }));

                          }}

                          style={st.modalActionBtn}

                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}

                        >

                          <Ionicons name="eye-outline" size={16} color={colors.textSubtle} />

                        </TouchableOpacity>

                        <TouchableOpacity

                          onPress={() => {

                            removePlan(m);

                            setModalState((s) => ({ ...s, slot: s.slot ? { ...s.slot, meals: s.slot.meals.filter((item) => item.id !== m.id) } : null }));
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



            {loadingSaved ? (

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

                  const isOpen = savedListState.expandedId === saved.id;

                  return (

                    <View key={saved.id} style={[st.savedCard, { backgroundColor: colors.surface, borderColor: softBorder }]}>

                      <View style={st.savedHeaderRow}>

                        <TouchableOpacity

                          onPress={() => setSavedListState((s) => ({ ...s, expandedId: isOpen ? null : saved.id }))}

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

                        </TouchableOpacity>

                        <View style={st.savedItemActions}>
                          <SlideIconButton
                            name={isOpen ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.textSubtle}
                            onPress={() => setSavedListState((s) => ({ ...s, expandedId: isOpen ? null : saved.id }))}
                            style={[st.savedActionBtn, { backgroundColor: 'transparent' }]}
                          />
                          <SlideIconButton
                            name="eye-outline"
                            size={14}
                            color={colors.textMuted}
                            onPress={() => loadSavedIntoView(saved)}
                            style={[st.savedActionBtn, { backgroundColor: qtyChipBg }]}
                          />
                          <SlideIconButton
                            name="trash-outline"
                            size={14}
                            color="#ef4444"
                            onPress={() => confirmRemoveSavedList(saved, { savedListState, setSavedListState, setGroceryList, setCheckedItems })}
                            style={[st.savedActionBtn, { backgroundColor: qtyChipBg }]}
                          />
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



        </View>

      </ScrollView>



      {/* Edit meal plan modal */}

      {modalState.editing ? (
        <EditPlanModal
          plan={modalState.editing}
          colors={colors}
          isDark={isDark}
          softBorder={softBorder}
          isOnline={isOnline}
          onClose={() => setModalState((s) => ({ ...s, editing: null }))}
          onSave={(data) => updatePlan(modalState.editing, data, () => setModalState((s) => ({ ...s, editing: null })))}
        />
      ) : null}

      {/* Recipe Recommendations Sheet */}
      <RecipeRecommendationsSheet
        visible={recommendationsSheet.visible}
        mealType={recommendationsSheet.mealType}
        date={recommendationsSheet.day}
        onClose={() => setRecommendationsSheet({ visible: false, mealType: null, day: null })}
        onSelectRecipe={(recipe) => {
          setRecommendationsSheet({ visible: false, mealType: null, day: null });
          // Navigate to AddToPlanner equivalent - just navigate to RecipeDetail for now
          // The user can add from there
          navigation.navigate('RecipeDetail', { id: recipe.id });
        }}
        onBrowseAll={onBrowseAllRecipes}
      />

      {/* Floating chat FAB — matches web AIChatWidget */}

      <AIAssistantWidget />

    </SafeAreaView>

  );

}




const st = StyleSheet.create({

  flex1: { flex: 1 },

  scrollContent: { paddingBottom: 120 },

  fadeWrap: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },

  dayGridSingle: { gap: 12 },

  dayHeaderMonth: {

    fontFamily: 'Geist_700Bold',

    fontSize: 9,

    letterSpacing: 2,

    marginTop: 2,

  },

  // Page header

  headerSection: { gap: 6 },

  headerKickerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,

    marginBottom: 4,

  },

  headerKickerDot: {

    width: 6,

    height: 6,

    borderRadius: 3,

  },

  headerKicker: {

    fontFamily: 'Geist_800ExtraBold',

    fontSize: 9,

    letterSpacing: 2.2,

  },

  pageTitle: {

    fontFamily: 'Geist_800ExtraBold',

    fontSize: 34,

    letterSpacing: -1,

    lineHeight: 38,

  },

  pageSubtitle: {

    fontFamily: 'Geist_500Medium',

    fontSize: 14,

    marginTop: 2,

    lineHeight: 20,

  },

  pill: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  pillSlider: {
    position: 'absolute',
    top: 6,
    left: 6,
    bottom: 6,
    borderRadius: 999,
  },

  pillBtn: {

    paddingVertical: 9,

    borderRadius: 999,

    alignItems: 'center',

    justifyContent: 'center',

  },

  pillText: {

    fontFamily: 'Geist_700Bold',

    fontSize: 13,

  },



  // Date navigation card

  dateCard: {

    borderRadius: 28,

    padding: 20,

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

    borderRadius: 26,

    borderWidth: 1,

    padding: 18,

    flexDirection: 'row',

    gap: 14,

    alignItems: 'flex-start',

  },

  upcomingIcon: {

    width: 44,

    height: 44,

    borderRadius: 18,

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

    gap: 10,

  },

  dayCol: {

    width: 132,

    gap: 10,

  },

  dayHeader: {

    borderRadius: 20,

    paddingVertical: 13,

    alignItems: 'center',

    justifyContent: 'center',

    minHeight: 78,

  },

  dayHeaderToday: {

    shadowOpacity: 0.28,

    shadowRadius: 16,

    shadowOffset: { width: 0, height: 6 },

    elevation: 6,

  },

  dayHeaderLabel: {

    fontFamily: 'Geist_700Bold',

    fontSize: 9,

    letterSpacing: 2,

    marginBottom: 3,

  },

  dayHeaderNum: {

    fontFamily: 'Geist_800ExtraBold',

    fontSize: 28,

    letterSpacing: -0.5,

  },

  slotsCol: { gap: 10 },

  mealCardFilled: {

    borderRadius: 20,

    padding: 14,

    borderWidth: 1,

    height: 178,

    gap: 6,

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

    fontFamily: 'Geist_800ExtraBold',

    fontSize: 10,

    letterSpacing: 1.4,

  },

  slotTimeLabel: {

    fontFamily: 'Geist_600SemiBold',

    fontSize: 10,

    letterSpacing: 0.3,

    lineHeight: 14,

  },

  recipeName: {

    fontFamily: 'Geist_800ExtraBold',

    fontSize: 15,

    letterSpacing: -0.3,

    lineHeight: 20,

  },

  slotCountdown: {

    fontFamily: 'Geist_600SemiBold',

    fontSize: 11,

    lineHeight: 15,

  },

  extraCountText: {

    fontFamily: 'Geist_700Bold',

    fontSize: 12,

    letterSpacing: 0.2,

    marginTop: 2,

  },

  mealCardEmpty: {

    borderRadius: 20,

    borderWidth: 1,

    height: 178,

    padding: 14,

    gap: 6,

  },



  // Shopping list dark header

  shoppingHeader: {

    backgroundColor: '#1c0f08',

    padding: 24,

    borderRadius: 32,

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

    borderRadius: 32,

    borderWidth: 1,

    overflow: 'hidden',

  },

  shoppingCardInner: {

    padding: 22,

    gap: 20,

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

  savedCard: {

    marginHorizontal: 12,

    marginVertical: 6,

    borderRadius: 16,

    borderWidth: 1,

    overflow: 'hidden',

  },

  savedHeaderRow: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 14,

    paddingVertical: 12,

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

