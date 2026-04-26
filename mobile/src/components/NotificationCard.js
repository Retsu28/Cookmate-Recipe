import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function NotificationCard({ notification, onPress }) {
  const { colors, isDark } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.message}`}
      onPress={onPress}
      style={[st.card, { borderBottomColor: colors.border, opacity: notification.read ? 0.55 : 1 }]}
    >
      <View style={[st.iconBox, { backgroundColor: isDark ? colors.surfaceAlt : '#f5f5f4' }]}>
        <Ionicons name={notification.icon} size={20} color={notification.iconColor} />
      </View>

      <View style={st.body}>
        <View style={st.topRow}>
          <Text style={[st.title, { color: colors.text }]}>{notification.title}</Text>
          <Text style={[st.time, { color: colors.textSubtle }]}>{notification.time}</Text>
        </View>
        <Text style={[st.msg, { color: colors.textMuted }]} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>

      {!notification.read && (
        <View style={[st.dot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, paddingVertical: 16, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Geist_700Bold', fontSize: 14, flex: 1, paddingRight: 8 },
  time: { fontFamily: 'Geist_700Bold', fontSize: 8, letterSpacing: 1 },
  msg: { fontFamily: 'Geist_400Regular', fontSize: 13, lineHeight: 19 },
  dot: { width: 8, height: 8, marginTop: 4 },
});
