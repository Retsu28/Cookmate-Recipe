import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { recipeApi } from '../../api/api';
import { useAppTheme } from '../../context/ThemeContext';

export default function RecipeRecommendationsSheet({
  visible,
  mealType,
  date,
  onClose,
  onSelectRecipe,
  onBrowseAll,
}) {
  const { colors, isDark } = useAppTheme();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!visible || !mealType) return;

    let cancelled = false;
    setLoading(true);
    setRecipes([]);

    recipeApi
      .getRecommendedForMeal(mealType)
      .then((res) => {
        if (!cancelled) {
          setRecipes(res.data?.recipes || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecipes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, mealType]);

  const handleSelect = (recipe) => {
    setSelectedId(recipe.id);
    onSelectRecipe?.(recipe);
  };

  const mealLabel = mealType
    ? mealType.charAt(0).toUpperCase() + mealType.slice(1)
    : 'Meal';

  const dateLabel = date ? format(date, 'EEEE, MMM d, yyyy') : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[st.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[st.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[st.header, { borderBottomColor: colors.border }]}>
            <View style={st.headerLeft}>
              <View style={[st.iconWrap, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={st.headerText}>
                <Text style={[st.headerLabel, { color: colors.primary }]}>
                  RECOMMENDED FOR {mealLabel.toUpperCase()}
                </Text>
                <Text style={[st.headerTitle, { color: colors.text }]}>
                  Top-rated {mealLabel.toLowerCase()} ideas
                </Text>
                {dateLabel ? (
                  <Text style={[st.headerSubtitle, { color: colors.textMuted }]}>
                    {dateLabel}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={st.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={st.body}
            contentContainerStyle={st.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={st.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[st.loadingText, { color: colors.textMuted }]}>
                  Loading recommendations...
                </Text>
              </View>
            ) : recipes.length === 0 ? (
              <View style={st.emptyBox}>
                <View style={[st.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="restaurant" size={28} color={colors.primary} />
                </View>
                <Text style={[st.emptyTitle, { color: colors.text }]}>
                  No recommendations yet
                </Text>
                <Text style={[st.emptyDesc, { color: colors.textMuted }]}>
                  We couldn&apos;t find recipes matching {mealLabel.toLowerCase()}.
                </Text>
                <TouchableOpacity
                  onPress={onBrowseAll}
                  style={[st.browseBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={st.browseBtnText}>Browse All Recipes</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={st.grid}>
                  {recipes.map((recipe) => (
                    <TouchableOpacity
                      key={recipe.id}
                      onPress={() => handleSelect(recipe)}
                      disabled={selectedId === recipe.id}
                      activeOpacity={0.85}
                      style={[
                        st.card,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          opacity: selectedId === recipe.id ? 0.7 : 1,
                        },
                      ]}
                    >
                      {/* Image */}
                      <View style={st.cardImageBox}>
                        {recipe.image_url ? (
                          <Image
                            source={{ uri: recipe.image_url }}
                            style={st.cardImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[st.cardImagePlaceholder, { backgroundColor: isDark ? '#292524' : '#f5f5f4' }]}>
                            <Ionicons name="restaurant" size={32} color={colors.textMuted} />
                          </View>
                        )}
                        {/* Rating badge */}
                        {recipe.avg_rating > 0 && (
                          <View style={st.ratingBadge}>
                            <Ionicons name="star" size={10} color="#f59e0b" />
                            <Text style={st.ratingText}>
                              {recipe.avg_rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View style={st.cardContent}>
                        <Text style={[st.cardTitle, { color: colors.text }]} numberOfLines={1}>
                          {recipe.title}
                        </Text>
                        {recipe.category && (
                          <Text style={[st.cardCategory, { color: colors.textSubtle }]}>
                            {recipe.category}
                          </Text>
                        )}
                        <View style={st.cardMeta}>
                          {recipe.total_time_minutes && (
                            <View style={st.metaItem}>
                              <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                              <Text style={[st.metaText, { color: colors.textMuted }]}>
                                {recipe.total_time_minutes} min
                              </Text>
                            </View>
                          )}
                          {recipe.review_count > 0 && (
                            <Text style={[st.metaText, { color: colors.textMuted }]}>
                              {recipe.review_count} reviews
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Browse all */}
                <TouchableOpacity
                  onPress={onBrowseAll}
                  style={[st.browseAllBtn, { borderColor: colors.border }]}
                >
                  <Text style={[st.browseAllText, { color: colors.primary }]}>
                    Browse all recipes
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontFamily: 'Geist_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 17,
    marginTop: 2,
  },
  headerSubtitle: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 13,
    marginTop: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 16,
  },
  emptyDesc: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  browseBtnText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageBox: {
    height: 100,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratingText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 10,
    color: '#f59e0b',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 13,
  },
  cardCategory: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 10,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 10,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 20,
  },
  browseAllText: {
    fontFamily: 'Geist_700Bold',
    fontSize: 13,
  },
});
