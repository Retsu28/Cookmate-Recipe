import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPlanWindowStatus, getCountdownText } from '../../notifications/plannerNotifications';

const MealSlotCard = React.memo(function MealSlotCard({
  slotKey, slot, meal, slotMeals, windowLabel, hasCustomTime,
  extraCount, isSelected, softBorder,
  colors, isDark, plansLoading, day, nowMs,
  onToggle, onView, onEdit, onRemove, onMore, onAdd,
}) {
  const isActiveSlot = meal ? getPlanWindowStatus(meal, nowMs) === 'active' : false;
  const countdownText = meal ? getCountdownText(meal, nowMs) : '';

  if (meal) {
    return (
      <Pressable
        onPress={() => onToggle(slotKey)}
        style={({ pressed }) => [
          st.mealCardFilled,
          {
            backgroundColor: isSelected
              ? `${colors.primary}14`
              : isDark ? 'rgba(249,115,22,0.06)' : 'rgba(249,115,22,0.04)',
            borderColor: isSelected ? colors.primary : isDark ? 'rgba(249,115,22,0.25)' : 'rgba(249,115,22,0.28)',
            borderWidth: isSelected ? 2 : 1,
            borderStyle: 'solid',
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={st.mealCardTopRow}>
          <View style={[st.slotDot, { backgroundColor: slot.color }]} />
          <View style={st.slotActions}>
            <TouchableOpacity
              onPress={() => onView(meal.recipe?.id || meal.recipe_id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={st.removeMealBtn}
            >
              <Ionicons name="eye-outline" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onEdit(meal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={st.removeMealBtn}
            >
              <Ionicons name="create-outline" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRemove(meal)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={st.removeMealBtn}
            >
              <Ionicons name="trash-outline" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.mealCardBody}>
          <Text style={[st.slotLabel, { color: colors.textSubtle }]}>
            {slot.label.toUpperCase()}
          </Text>
          <Text style={[st.slotTimeLabel, { color: isActiveSlot ? colors.primary : colors.textSubtle }]} numberOfLines={2}>
            {windowLabel.toUpperCase()}{hasCustomTime ? ' · CUSTOM' : ''}
          </Text>
          <Text style={[st.recipeName, { color: colors.text }]} numberOfLines={1}>
            {meal.recipe?.title || 'Planned recipe'}
          </Text>
          <Text style={[st.slotCountdown, { color: isActiveSlot ? colors.primary : colors.textMuted }]} numberOfLines={2}>
            {countdownText}
          </Text>
          {extraCount > 0 && (
            <TouchableOpacity
              onPress={() => onMore({ slotKey, slotLabel: slot.label, day, meals: slotMeals })}
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
      onPress={() => onToggle(slotKey)}
      style={({ pressed }) => [
        st.mealCardEmpty,
        {
          borderColor: isSelected ? colors.primary : softBorder,
          borderWidth: isSelected ? 2 : 1,
          borderStyle: isSelected ? 'solid' : 'dashed',
          backgroundColor: isSelected ? `${colors.primary}10` : 'transparent',
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={st.mealCardTopRow}>
        <View style={[st.slotDot, { backgroundColor: slot.color }]} />
        <TouchableOpacity
          onPress={onAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={st.removeMealBtn}
        >
          <Ionicons name="add" size={15} color={colors.textSubtle} />
        </TouchableOpacity>
      </View>
      <View style={st.mealCardBody}>
        <Text style={[st.slotLabel, { color: colors.textSubtle }]}>
          {slot.label.toUpperCase()}
        </Text>
        <Text style={[st.slotTimeLabel, { color: colors.textSubtle }]} numberOfLines={2}>
          {windowLabel.toUpperCase()}
        </Text>
        <Text style={[st.recipeName, { color: colors.text }]} numberOfLines={1}>
          Add Recipe
        </Text>
        <Text style={[st.slotCountdown, { color: colors.textMuted }]} numberOfLines={2}>
          {plansLoading ? 'Loading planner' : 'No recipe planned'}
        </Text>
      </View>
    </Pressable>
  );
});

export default MealSlotCard;

const st = StyleSheet.create({
  mealCardFilled: { borderRadius: 20, padding: 14, borderWidth: 1, height: 178, gap: 6 },
  mealCardEmpty: { borderRadius: 20, borderWidth: 1, height: 178, padding: 14, gap: 6 },
  mealCardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotDot: { width: 8, height: 8, borderRadius: 4 },
  removeMealBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  mealCardBody: { flex: 1, justifyContent: 'flex-end', gap: 4 },
  slotLabel: { fontFamily: 'Geist_800ExtraBold', fontSize: 10, letterSpacing: 1.4 },
  slotTimeLabel: { fontFamily: 'Geist_600SemiBold', fontSize: 10, letterSpacing: 0.3, lineHeight: 14 },
  recipeName: { fontFamily: 'Geist_800ExtraBold', fontSize: 15, letterSpacing: -0.3, lineHeight: 20 },
  slotCountdown: { fontFamily: 'Geist_600SemiBold', fontSize: 11, lineHeight: 15 },
  extraCountText: { fontFamily: 'Geist_700Bold', fontSize: 12, letterSpacing: 0.2, marginTop: 2 },
});
