import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileHeader({
  colors,
  isDark,
  fontSizes,
  avatarUrl,
  displayName,
  displayInitial,
  displayEmail,
  uploadingAvatar,
  avatarPreview,
  cookingSkillLevel,
  onPickAvatar,
}) {
  return (
    <View style={[st.headerCard, { backgroundColor: isDark ? colors.surfaceAlt : colors.primarySoft }]}>
      <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.9}>
        <View style={st.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={[st.avatarLg, { backgroundColor: colors.primary }]} />
          ) : (
            <View style={[st.avatarLg, { backgroundColor: colors.primary }]}>
              <Text style={st.avatarLgText}>{displayInitial}</Text>
            </View>
          )}
          <View style={[st.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
          {uploadingAvatar && (
            <View style={[st.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
          {avatarPreview && !uploadingAvatar && (
            <View style={[st.avatarBadge, { backgroundColor: colors.primary }]}>
              <Text style={st.avatarBadgeText}>NEW</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <Text style={[st.nameText, { color: colors.text, fontSize: fontSizes.xl }]}>{displayName}</Text>
      <Text style={[st.emailText, { color: colors.textMuted, fontSize: fontSizes.sm }]}>{displayEmail}</Text>
      {uploadingAvatar && (
        <View style={[st.uploadProgressWrap, { backgroundColor: colors.border }]}>
          <View style={[st.uploadProgressBar, { backgroundColor: colors.primary }]} />
        </View>
      )}
      {uploadingAvatar && (
        <Text style={[st.avatarHint, { color: colors.primary }]}>
          Uploading photo…
        </Text>
      )}
      {avatarPreview && !uploadingAvatar && (
        <Text style={[st.avatarHint, { color: colors.textSubtle }]}>
          Tap avatar to change · Save to upload
        </Text>
      )}
      <Text style={[st.avatarHint, { color: colors.textSubtle, marginTop: 4 }]}>
        {'Cooking Skill — '}
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {cookingSkillLevel || 'Not set'}
        </Text>
      </Text>

      <View style={[st.statsRow, { borderTopColor: isDark ? colors.border : '#d6d3d1' }]}>
        {[
          { num: '12', label: 'RECIPES' },
        ].map((stat, i) => (
          <View key={i} style={[st.statCol, { borderRightWidth: 0 }]}>
            <Text style={[st.statNum, { color: colors.primary }]}>{stat.num}</Text>
            <Text style={[st.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  headerCard: { paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatarLg: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  avatarLgText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 36 },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 45, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  avatarBadge: { position: 'absolute', top: -4, right: -4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  avatarBadgeText: { color: '#fff', fontFamily: 'Geist_800ExtraBold', fontSize: 9, letterSpacing: 0.5 },
  avatarHint: { fontFamily: 'Geist_500Medium', fontSize: 11, marginTop: 4, marginBottom: 4 },
  uploadProgressWrap: { width: 120, height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  uploadProgressBar: { width: '65%', height: '100%', borderRadius: 2 },
  nameText: { fontFamily: 'Geist_800ExtraBold', fontSize: 22, letterSpacing: -0.3 },
  emailText: { fontFamily: 'Geist_400Regular', fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: 'Geist_800ExtraBold', fontSize: 22 },
  statLabel: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 1.5, marginTop: 4 },
});
