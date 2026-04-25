import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function MealSlot({ label, meal, color, onAdd, onRemove }) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={st.wrap}>
      <Text style={[st.label, { color: colors.textSubtle }]}>{label.toUpperCase()}</Text>

      {meal ? (
        <View style={[st.filledSlot, { borderColor: colors.border }]}>
          <View style={st.filledLeft}>
            <Image source={{ uri: meal.image }} style={st.mealImg} />
            <View>
              <Text style={[st.mealTitle, { color: colors.text }]}>{meal.recipe}</Text>
              <Text style={[st.mealMeta, { color: colors.textSubtle }]}>15 MIN · EASY</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={colors.textSubtle} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={onAdd} style={[st.emptySlot, { borderColor: colors.border }]}>
          <Ionicons name="add" size={18} color={colors.textSubtle} />
          <Text style={[st.addText, { color: colors.textSubtle }]}>ADD RECIPE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: 20 },
  label: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 2, marginBottom: 8 },
  filledSlot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1 },
  filledLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mealImg: { width: 40, height: 40 },
  mealTitle: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  mealMeta: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1, marginTop: 2 },
  emptySlot: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed' },
  addText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
});
