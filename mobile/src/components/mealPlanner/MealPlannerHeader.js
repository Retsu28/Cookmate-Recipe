import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedPillToggle from './AnimatedPillToggle';

/**
 * MealPlannerHeader - Contains the header section with kicker, title, subtitle, and view toggle
 */
function MealPlannerHeader({
  colors,
  view,
  setView,
  pillTrack,
  softShadow,
}) {
  return (
    <View style={st.headerSection}>
      <View style={st.headerKickerRow}>
        <View style={[st.headerKickerDot, { backgroundColor: colors.primary }]} />
        <Text style={[st.headerKicker, { color: colors.primary }]}>
          RECIPE · PLAN · GROCERIES
        </Text>
      </View>

      <Text style={[st.pageTitle, { color: colors.text }]}>Meal Planner</Text>
      <Text style={[st.pageSubtitle, { color: colors.textMuted }]}>
        Plan breakfast, lunch & dinner from your saved recipes.
      </Text>

      <AnimatedPillToggle
        view={view}
        setView={setView}
        colors={colors}
        pillTrack={pillTrack}
        softShadow={softShadow}
      />
    </View>
  );
}

const st = StyleSheet.create({
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  headerKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  headerKickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerKicker: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 2,
  },
  pageTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: 'Geist_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
});

export default MealPlannerHeader;
