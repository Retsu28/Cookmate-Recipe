import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function RecipeCard({ recipe, horizontal, onPress }) {
  const { colors, isDark } = useAppTheme();

  if (horizontal) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[st.hCard, { borderColor: colors.border }]}>
        <Image
          source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/placeholder/400/200' }}
          style={st.hImage}
          resizeMode="cover"
        />
        <View style={st.hBody}>
          <Text style={[st.hTitle, { color: colors.text }]} numberOfLines={1}>{recipe.title}</Text>
          <View style={st.hMeta}>
            <Text style={[st.hTime, { color: colors.textSubtle }]}>{(recipe.time || '30 MIN').toUpperCase()}</Text>
            <View style={st.hRating}>
              <Ionicons name="star" size={10} color={colors.amber} />
              <Text style={[st.hRatingText, { color: colors.text }]}>{recipe.rating || '4.5'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={st.vCard}>
      <Image
        source={{ uri: recipe.image_url || recipe.image || 'https://picsum.photos/seed/placeholder/400/400' }}
        style={[st.vImage, { borderColor: colors.border }]}
        resizeMode="cover"
      />
      <Text style={[st.vTitle, { color: colors.text }]} numberOfLines={2}>{recipe.title}</Text>
      <Text style={[st.vTime, { color: colors.textSubtle }]}>{(recipe.time || '30 MIN').toUpperCase()}</Text>
    </TouchableOpacity>
  );
}

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
