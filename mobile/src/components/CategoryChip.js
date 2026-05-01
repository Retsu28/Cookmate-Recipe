import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Maps common recipe categories to an Ionicons glyph. Falls back to
 * "restaurant" so unrecognised categories still render.
 */
const CATEGORY_ICONS = {
  soup: 'cafe',
  noodle: 'restaurant',
  noodles: 'restaurant',
  pasta: 'restaurant',
  rice: 'restaurant',
  appetizer: 'fast-food',
  appetizers: 'fast-food',
  snack: 'ice-cream',
  snacks: 'ice-cream',
  dessert: 'ice-cream',
  desserts: 'ice-cream',
  drink: 'wine',
  drinks: 'wine',
  beverage: 'wine',
  vegetable: 'leaf',
  vegetables: 'leaf',
  salad: 'leaf',
  salads: 'leaf',
  beef: 'flame',
  pork: 'flame',
  chicken: 'flame',
  poultry: 'flame',
  seafood: 'fish',
  fish: 'fish',
  main: 'restaurant',
  'main dish': 'restaurant',
  'main dishes': 'restaurant',
};

function pickIcon(category) {
  const key = (category || '').trim().toLowerCase();
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  for (const k of Object.keys(CATEGORY_ICONS)) {
    if (key.includes(k)) return CATEGORY_ICONS[k];
  }
  return 'restaurant';
}

export default function CategoryChip({ category, count, onPress }) {
  const { colors, isDark } = useAppTheme();
  const icon = pickIcon(category);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        st.chip,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.brandShadow },
      ]}
    >
      <View style={[st.iconBox, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={st.body}>
        <Text style={[st.title, { color: colors.text }]} numberOfLines={1}>
          {category}
        </Text>
        {typeof count === 'number' ? (
          <Text style={[st.count, { color: colors.textSubtle }]}>
            {count} {count === 1 ? 'RECIPE' : 'RECIPES'}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { gap: 2, paddingRight: 4 },
  title: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  count: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
});
