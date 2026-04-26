import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useAppTheme } from '../context/ThemeContext';
import { MealPlannerContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';
import AIAssistantWidget from '../components/AIAssistantWidget';

// Mirrors src/pages/MealPlanner.tsx mealSlots — orange-300 / orange-400 / orange-500
const mealSlots = [
  { id: 'breakfast', label: 'Breakfast', color: '#fdba74' },
  { id: 'lunch', label: 'Lunch', color: '#fb923c' },
  { id: 'dinner', label: 'Dinner', color: '#f97316' },
];

const initialPlannedMeals = [
  { date: new Date(), slot: 'breakfast', recipe: 'Avocado Toast', id: 10 },
  { date: new Date(), slot: 'lunch', recipe: 'Quinoa Salad', id: 11 },
];

// Mirrors the web Shopping List sidebar categories.
const shoppingCategories = [
  { name: 'Produce', items: [{ label: 'Avocados', qty: '3 pcs' }, { label: 'Tomatoes', qty: '5 pcs' }] },
  { name: 'Dairy', items: [{ label: 'Feta Cheese', qty: '200g' }, { label: 'Greek Yogurt', qty: '1' }] },
  { name: 'Pantry', items: [{ label: 'Quinoa', qty: '500g' }, { label: 'Olive Oil', qty: '200g' }] },
];

export default function MealPlannerScreen() {
  const { colors, isDark } = useAppTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'day' | 'week' — matches web pill toggle state
  const [plannedMeals, setPlannedMeals] = useState(initialPlannedMeals);
  const isInitialLoading = useInitialContentLoading();
  const introAnim = useRef(new Animated.Value(0)).current;

  const startDate = startOfWeek(currentDate);
  const endDate = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

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
                onPress={() => setCurrentDate(addDays(currentDate, -7))}
                activeOpacity={0.7}
                style={[st.chevBtn, { borderColor: softBorder }]}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={[st.dateRange, { color: colors.text }]}>
                {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentDate(addDays(currentDate, 7))}
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
                        const meal = plannedMeals.find(
                          (m) => isSameDay(m.date, day) && m.slot === slot.id,
                        );
                        if (meal) {
                          return (
                            <TouchableOpacity
                              key={slot.id}
                              activeOpacity={0.85}
                              style={[
                                st.mealCardFilled,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: softBorder,
                                },
                                softShadow,
                              ]}
                            >
                              <View style={[st.slotDot, { backgroundColor: slot.color }]} />
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
                                  style={[st.recipeName, { color: colors.text }]}
                                  numberOfLines={2}
                                >
                                  {meal.recipe}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          );
                        }
                        return (
                          <TouchableOpacity
                            key={slot.id}
                            activeOpacity={0.7}
                            style={[
                              st.mealCardEmpty,
                              {
                                borderColor: dashedBorder,
                                backgroundColor: emptySlotBg,
                              },
                            ]}
                          />
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
                <Text style={st.shoppingStatNum}>12</Text>
                <Text style={st.shoppingStatLabel}>ITEMS NEEDED</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[st.exportBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={st.exportBtnText}>Export</Text>
                <Ionicons name="download" size={14} color="#fff" />
              </TouchableOpacity>
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
              {shoppingCategories.map((cat) => (
                <View key={cat.name} style={st.shoppingSection}>
                  <View style={st.catHeaderRow}>
                    <View style={[st.catDot, { backgroundColor: colors.primaryLight }]} />
                    <Text style={[st.catLabel, { color: colors.textSubtle }]}>
                      {cat.name.toUpperCase()}
                    </Text>
                  </View>
                  <View style={st.catItemsCol}>
                    {cat.items.map((it) => (
                      <View key={it.label} style={st.shopItemRow}>
                        <View style={st.shopItemLeft}>
                          <View style={[st.shopCheck, { borderColor: softBorder }]} />
                          <Text style={[st.shopItemText, { color: colors.text }]}>
                            {it.label}
                          </Text>
                        </View>
                        <View style={[st.shopQtyChip, { backgroundColor: qtyChipBg }]}>
                          <Text style={[st.shopQtyText, { color: colors.textSubtle }]}>
                            {it.qty}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                st.viewFullBtn,
                { borderTopColor: softBorder, backgroundColor: viewFullBg },
              ]}
            >
              <Text style={[st.viewFullText, { color: colors.primary }]}>View Full List</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
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
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  mealCardBody: { flex: 1, justifyContent: 'flex-end', gap: 4 },
  slotLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  recipeName: {
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  mealCardEmpty: {
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 110,
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
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
});
