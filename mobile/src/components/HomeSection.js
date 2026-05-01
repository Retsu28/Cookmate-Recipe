import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Shared section frame for the homepage discovery rows. Renders a small
 * eyebrow + title + optional "View all" link, then a horizontal FlatList
 * of items. Handles loading, error, and empty states so each caller stays
 * focused on the data it owns.
 */
export default function HomeSection({
  eyebrow,
  title,
  description,
  onViewAll,
  viewAllLabel = 'View all',
  data,
  keyExtractor,
  renderItem,
  loading = false,
  error = null,
  emptyText = 'Nothing here yet — check back soon.',
  itemSpacing = 12,
}) {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={st.section}>
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          {eyebrow ? (
            <Text style={[st.eyebrow, { color: colors.primary }]}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[st.title, { color: colors.text }]}>{title}</Text>
          {description ? (
            <Text style={[st.description, { color: colors.textMuted }]}>
              {description}
            </Text>
          ) : null}
        </View>
        {onViewAll ? (
          <TouchableOpacity
            onPress={onViewAll}
            style={[st.viewAllBtn, { borderColor: colors.border }]}
          >
            <Text style={[st.viewAllText, { color: colors.primary }]}>
              {viewAllLabel.toUpperCase()}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={st.loadingRow}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={[st.errorBox, { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceAlt : '#fef2f2' }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[st.errorText, { color: colors.danger }]} numberOfLines={2}>
            {error}
          </Text>
        </View>
      ) : !data || data.length === 0 ? (
        <View style={[st.emptyBox, { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
          <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
          <Text style={[st.emptyText, { color: colors.textMuted }]} numberOfLines={2}>
            {emptyText}
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingRight: 16 }}
          ItemSeparatorComponent={() => <View style={{ width: itemSpacing }} />}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  section: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  title: { fontFamily: 'Geist_800ExtraBold', fontSize: 20, letterSpacing: -0.4 },
  description: { fontFamily: 'Geist_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4 },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  viewAllText: { fontFamily: 'Geist_700Bold', fontSize: 9, letterSpacing: 1.5 },
  loadingRow: { paddingVertical: 24, alignItems: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
  },
  errorText: { fontFamily: 'Geist_500Medium', fontSize: 12, flex: 1 },
  emptyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 16, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: { fontFamily: 'Geist_500Medium', fontSize: 12, flex: 1 },
});
