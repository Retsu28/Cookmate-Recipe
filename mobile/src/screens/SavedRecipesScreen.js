import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { recipeApi } from '../api/api';
import OptimizedImage from '../components/OptimizedImage';

export default function SavedRecipesScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  const loadSaved = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await recipeApi.getSavedRecipes(user.id);
      setSaved(res.data?.saved || []);
    } catch {
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadSaved(); }, [loadSaved]));

  const handleRemove = async (item) => {
    if (removingId) return;
    setRemovingId(item.recipe_id);
    setSaved(prev => prev.filter(r => r.recipe_id !== item.recipe_id));
    try {
      await recipeApi.unsaveRecipe(item.recipe_id);
    } catch {
      setSaved(prev => [item, ...prev]);
    } finally {
      setRemovingId(null);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[st.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('RecipeDetail', { id: item.recipe_id })}
    >
      <View style={st.imageWrap}>
        {item.image_url ? (
          <OptimizedImage
            source={{ uri: item.image_url }}
            style={st.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[st.imageFallback, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={st.info}>
        <Text style={[st.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        <View style={st.meta}>
          {item.category ? (
            <View style={[st.badge, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
              <Text style={[st.badgeText, { color: colors.primary }]}>{item.category}</Text>
            </View>
          ) : null}
          {item.total_time_minutes ? (
            <View style={st.timeRow}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[st.timeText, { color: colors.textMuted }]}>{item.total_time_minutes} min</Text>
            </View>
          ) : null}
        </View>
        <Text style={[st.savedAt, { color: colors.textSubtle }]}>
          Saved {new Date(item.saved_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        disabled={removingId === item.recipe_id}
        style={st.removeBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {removingId === item.recipe_id ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Ionicons name="heart" size={22} color="#ef4444" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>My Saved Recipes</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={st.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : saved.length === 0 ? (
        <View style={st.centered}>
          <Ionicons name="heart-outline" size={64} color={colors.border} />
          <Text style={[st.emptyTitle, { color: colors.text }]}>No saved recipes yet</Text>
          <Text style={[st.emptyDesc, { color: colors.textMuted }]}>
            Tap the heart icon on any recipe to save it here.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Recipes')}
            style={[st.exploreBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={st.exploreBtnText}>Explore Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 18, letterSpacing: -0.3 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontFamily: 'Geist_700Bold', fontSize: 18, marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontFamily: 'Geist_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  exploreBtn: {
    marginTop: 24, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 999,
  },
  exploreBtnText: { fontFamily: 'Geist_700Bold', fontSize: 14, color: '#fff', letterSpacing: 0.3 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    padding: 12,
    gap: 12,
  },
  imageWrap: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
  image: { width: '100%', height: '100%' },
  imageFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  title: { fontFamily: 'Geist_700Bold', fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeText: { fontFamily: 'Geist_500Medium', fontSize: 11 },
  savedAt: { fontFamily: 'Geist_400Regular', fontSize: 11 },
  removeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
