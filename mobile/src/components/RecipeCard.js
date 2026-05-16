import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import OptimizedImage from './OptimizedImage';

const StarRating = React.memo(function StarRating({ rating, size = 14 }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {[...Array(fullStars)].map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={size} color="#f59e0b" />
      ))}
      {hasHalfStar && (
        <View style={{ position: 'relative', width: size, height: size }}>
          <Ionicons name="star" size={size} color="#f59e0b" style={{ position: 'absolute', left: 0, top: 0 }} />
          <View style={{ position: 'absolute', left: size / 2, top: 0, width: size / 2, height: size, backgroundColor: 'transparent' }}>
            <Ionicons name="star" size={size} color="#d6d3d1" style={{ position: 'absolute', left: -size / 2, top: 0 }} />
          </View>
        </View>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star" size={size} color="#d6d3d1" />
      ))}
    </View>
  );
});

function RecipeCard({ recipe, horizontal, onPress }) {
  const { colors, isDark } = useAppTheme();

  if (horizontal) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[st.hCard, { borderColor: colors.border }]}>
        <OptimizedImage
          source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/placeholder/400/200' }}
          style={st.hImage}
          resizeMode="cover"
        />
        <View style={st.hBody}>
          <Text style={[st.hTitle, { color: colors.text }]} numberOfLines={1}>{recipe.title}</Text>
          <Text style={[st.hTime, { color: colors.textSubtle }]}>{(recipe.time || '30 MIN').toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <StarRating rating={recipe.avg_rating || 0} size={12} />
            <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 11, color: colors.textMuted }}>
              {(recipe.avg_rating || 0).toFixed(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={st.vCard}>
      <OptimizedImage
        source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/placeholder/400/400' }}
        style={[st.vImage, { borderColor: colors.border }]}
        resizeMode="cover"
      />
      <Text style={[st.vTitle, { color: colors.text }]} numberOfLines={2}>{recipe.title}</Text>
      <Text style={[st.vTime, { color: colors.textSubtle }]}>{(recipe.time || '30 MIN').toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <StarRating rating={recipe.avg_rating || 0} size={12} />
        <Text style={{ fontFamily: 'Geist_600SemiBold', fontSize: 11, color: colors.textMuted }}>
          {(recipe.avg_rating || 0).toFixed(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default memo(RecipeCard);

const st = StyleSheet.create({
  // Horizontal
  hCard: { width: 248, marginRight: 12, borderWidth: 1, overflow: 'hidden' },
  hImage: { width: '100%', height: 140 },
  hBody: { padding: 14, gap: 6 },
  hTitle: { fontFamily: 'Geist_700Bold', fontSize: 14 },
  hMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hTime: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
  hRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  hRatingText: { fontFamily: 'Geist_700Bold', fontSize: 11 },
  // Vertical / Grid
  vCard: { width: '48%', marginBottom: 16 },
  vImage: { width: '100%', aspectRatio: 1, borderWidth: 1, marginBottom: 8 },
  vTitle: { fontFamily: 'Geist_700Bold', fontSize: 13, lineHeight: 17, marginBottom: 4 },
  vTime: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1.5 },
});
