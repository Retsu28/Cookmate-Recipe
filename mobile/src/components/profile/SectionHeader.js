import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SectionHeader({ icon, title, caption, colors, compact = false }) {
  return (
    <View style={[st.sectionHeader, compact && { marginBottom: 0 }]}>
      <View style={[st.sectionIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={st.sectionTitleWrap}>
        <Text style={[st.sectionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[st.sectionCaption, { color: colors.textMuted }]}>{caption}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  sectionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitleWrap: { flex: 1 },
  sectionTitle: { fontFamily: 'Geist_800ExtraBold', fontSize: 17, letterSpacing: 0 },
  sectionCaption: { fontFamily: 'Geist_500Medium', fontSize: 12, lineHeight: 17, marginTop: 1 },
});
