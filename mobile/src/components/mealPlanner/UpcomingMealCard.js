import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPlanWindow, getCountdownText } from '../../notifications/plannerNotifications';

/**
 * UpcomingMealCard - Shows the next upcoming meal reminder
 */
function UpcomingMealCard({
  upcomingMeal,
  nowMs,
  colors,
  isDark,
  softBorder,
  cardShadow,
}) {
  return (
    <View
      style={[
        st.upcomingCard,
        { backgroundColor: colors.surface, borderColor: softBorder },
        cardShadow,
      ]}
    >
      <View
        style={[
          st.upcomingIcon,
          { backgroundColor: isDark ? 'rgba(249,115,22,0.14)' : '#ffedd5' },
        ]}
      >
        <Ionicons name="notifications" size={20} color={colors.primary} />
      </View>

      <View style={st.upcomingBody}>
        <Text style={[st.upcomingKicker, { color: colors.textSubtle }]}>
          UPCOMING MEAL
        </Text>

        {upcomingMeal ? (
          <>
            <Text style={[st.upcomingTitle, { color: colors.text }]} numberOfLines={1}>
              {upcomingMeal.meal_type_label} · {formatPlanWindow(upcomingMeal)}
              {upcomingMeal.custom_time_enabled ? ' · CUSTOM' : ''}
            </Text>
            <Text style={[st.upcomingMeta, { color: colors.textMuted }]} numberOfLines={2}>
              {getCountdownText(upcomingMeal, nowMs)} · {upcomingMeal.recipe?.title || 'Planned recipe'}
            </Text>
          </>
        ) : (
          <Text style={[st.upcomingMeta, { color: colors.textMuted }]}>
            No upcoming reminders in the current planner window.
          </Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  upcomingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  upcomingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBody: {
    flex: 1,
    gap: 3,
  },
  upcomingKicker: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  upcomingTitle: {
    fontFamily: 'Geist_700Bold',
    fontSize: 14,
  },
  upcomingMeta: {
    fontFamily: 'Geist_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default UpcomingMealCard;
