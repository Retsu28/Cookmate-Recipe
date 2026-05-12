import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';

/**
 * DateNavigationCard - Date navigation with prev/next buttons and Today button
 */
function DateNavigationCard({
  view,
  currentDate,
  setCurrentDate,
  startDate,
  endDate,
  todayPhKey,
  colors,
  softBorder,
  cardShadow,
}) {
  const dateKey = (date) => format(date, 'yyyy-MM-dd');

  const canGoBack = view === 'week'
    ? dateKey(startDate) > todayPhKey
    : dateKey(currentDate) > todayPhKey;

  return (
    <View
      style={[
        st.dateCard,
        { backgroundColor: colors.surface, borderColor: softBorder },
        cardShadow,
      ]}
    >
      <View style={st.dateRow}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={() => setCurrentDate(addDays(currentDate, view === 'week' ? -7 : -1))}
            activeOpacity={0.7}
            style={[st.chevBtn, { borderColor: softBorder }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44, height: 44 }} />
        )}

        <Text style={[st.dateRange, { color: colors.text }]}>
          {view === 'week'
            ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
            : format(currentDate, 'EEEE, MMM d, yyyy')}
        </Text>

        <TouchableOpacity
          onPress={() => setCurrentDate(addDays(currentDate, view === 'week' ? 7 : 1))}
          activeOpacity={0.7}
          style={[st.chevBtn, { borderColor: softBorder }]}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => setCurrentDate(new Date())}
        activeOpacity={0.85}
        style={[st.todayBtn, { borderColor: softBorder }]}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
        <Text style={[st.todayText, { color: colors.textMuted }]}>Today</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  dateCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chevBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRange: {
    fontFamily: 'Geist_700Bold',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
  },
  todayText: {
    fontFamily: 'Geist_600SemiBold',
    fontSize: 13,
  },
});

export default DateNavigationCard;
