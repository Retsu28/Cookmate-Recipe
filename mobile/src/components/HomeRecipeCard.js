import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Compact recipe card used by the homepage discovery rows. Mirrors the
 * web HomeRecipeCard look (image + time pill + title + meta) so both
 * platforms feel like a single product.
 */
export default function HomeRecipeCard({ recipe, onPress }) {
  const { colors, isDark } = useAppTheme();

  const computedTime =
    recipe?.total_time_minutes ??
    ((recipe?.prep_time_minutes || 0) + (recipe?.cook_time_minutes || 0));
  const time = computedTime > 0 ? `${computedTime} MIN` : null;
  const meta = recipe?.category || recipe?.region_or_origin || 'FILIPINO';
  const imageUri = recipe?.image_url || recipe?.image;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        st.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.brandShadow },
      ]}
    >
      <View style={[st.imageWrap, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={st.image} resizeMode="cover" />
        ) : (
          <View style={st.imageFallback}>
            <Ionicons name="restaurant" size={28} color={colors.primary} />
          </View>
        )}
        {time ? (
          <View style={[st.timePill, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : '#fff' }]}>
            <Ionicons name="time-outline" size={10} color={colors.primary} />
            <Text style={[st.timePillText, { color: colors.primary }]}>{time}</Text>
          </View>
        ) : null}
        {recipe?.is_featured ? (
          <View style={[st.featuredPill, { backgroundColor: colors.primary }]}>
            <Ionicons name="star" size={10} color="#fff" />
            <Text style={st.featuredText}>FEATURED</Text>
          </View>
        ) : null}
      </View>
      <View style={st.body}>
        <Text style={[st.title, { color: colors.text }]} numberOfLines={2}>
          {recipe?.title || 'Untitled recipe'}
        </Text>
        <Text style={[st.meta, { color: colors.textSubtle }]} numberOfLines={1}>
          {meta.toString().toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: {
    width: 200,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  imageWrap: { position: 'relative', width: '100%', aspectRatio: 4 / 3 },
  image: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  timePill: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  timePillText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1 },
  featuredPill: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  featuredText: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.2, color: '#fff' },
  body: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  title: { fontFamily: 'Geist_700Bold', fontSize: 13, lineHeight: 17 },
  meta: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
});
