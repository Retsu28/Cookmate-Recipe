import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

const FALLBACK_ICON = 'restaurant';

export default function CategoryChip({ category, count, imageUrl, onPress }) {
  const { colors, isDark } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        st.chip,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.brandShadow },
      ]}
    >
      <View style={[st.iconBox, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft, overflow: 'hidden' }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={st.image} resizeMode="cover" />
        ) : (
          <Ionicons name={FALLBACK_ICON} size={18} color={colors.primary} />
        )}
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
  image: { width: 36, height: 36, borderRadius: 12 },
  body: { gap: 2, paddingRight: 4 },
  title: { fontFamily: 'Geist_700Bold', fontSize: 13 },
  count: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
});
