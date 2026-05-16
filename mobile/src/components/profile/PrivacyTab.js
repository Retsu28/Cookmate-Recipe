import React from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SectionHeader from './SectionHeader';
import LogoutButton from '../LogoutButton';

export default function PrivacyTab({
  colors,
  isDark,
  fontSizes,
  mfaEnabled,
  mfaStatusLoading,
  handleMfaToggle,
  navigation,
}) {
  return (
    <View style={st.wrap}>
      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon="shield-outline"
          title="Privacy & Security"
          caption="Manage your account safety and visibility."
          colors={colors}
        />

        {/* Kitchen Inventory - Coming Soon */}
        <View style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0, opacity: 0.5 }]}>
          <View style={st.settingLeft}>
            <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[st.settingLabel, { color: colors.textMuted }]}>Show kitchen inventory</Text>
                <View style={[st.badge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[st.badgeText, { color: colors.primary }]}>Coming Soon</Text>
                </View>
              </View>
              <Text style={[st.settingValue, { color: colors.textSubtle, fontSize: 11 }]}>
                Allow others to see your kitchen inventory
              </Text>
            </View>
          </View>
          <Switch
            value={false}
            disabled={true}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </View>

      {/* Two-Factor Authentication */}
      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon="lock-closed-outline"
          title="Two-Factor Authentication"
          caption="Add an extra layer of security to your account."
          colors={colors}
        />

        <View style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
          <View style={st.settingLeft}>
            <View style={[st.mfaIconWrap, { backgroundColor: mfaEnabled ? colors.primarySoft : colors.surfaceAlt }]}>
              <Ionicons
                name={mfaEnabled ? 'shield-checkmark' : 'shield-outline'}
                size={18}
                color={mfaEnabled ? colors.primary : colors.textMuted}
              />
            </View>
            <View>
              <Text style={[st.settingLabel, { color: colors.text }]}>Authenticator App (TOTP)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {mfaStatusLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={[
                    st.mfaStatusBadge,
                    { backgroundColor: mfaEnabled ? '#dcfce7' : colors.surfaceAlt }
                  ]}>
                    <View style={[
                      st.mfaStatusDot,
                      { backgroundColor: mfaEnabled ? '#16a34a' : colors.textSubtle }
                    ]} />
                    <Text style={[
                      st.mfaStatusText,
                      { color: mfaEnabled ? '#16a34a' : colors.textMuted }
                    ]}>
                      {mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Switch
            value={mfaEnabled}
            onValueChange={handleMfaToggle}
            disabled={mfaStatusLoading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon="document-text-outline"
          title="Data & Privacy"
          caption="Manage your data and privacy settings."
          colors={colors}
        />

        <TouchableOpacity
          onPress={() => {}}
          style={[st.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <View style={st.settingLeft}>
            <Ionicons name="download-outline" size={18} color={colors.primary} />
            <Text style={[st.settingLabel, { color: colors.text }]}>Request data export</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('PrivacyPolicy')}
          style={[st.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        >
          <View style={st.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={[st.settingLabel, { color: colors.text }]}>Privacy policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('About')}
          style={[st.settingRow, { borderBottomWidth: 0 }]}
        >
          <View style={st.settingLeft}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[st.settingLabel, { color: colors.text }]}>About CookMate</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
        </TouchableOpacity>
      </View>

      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
        <SectionHeader
          icon="trash-outline"
          title="Danger Zone"
          caption="Permanent actions that cannot be undone."
          colors={colors}
        />

        <TouchableOpacity
          onPress={() => {}}
          style={[st.resetBtn, { backgroundColor: colors.danger + '20', borderColor: colors.danger }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={[st.resetText, { color: colors.danger, marginLeft: 8 }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 24, paddingHorizontal: 0 }}>
        <LogoutButton />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 16 },
  section: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontFamily: 'Geist_500Medium', fontSize: 14 },
  settingValue: { fontFamily: 'Geist_700Bold', fontSize: 11, letterSpacing: 0.5 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
  badgeText: { fontFamily: 'Geist_700Bold', fontSize: 7, letterSpacing: 0.5, textTransform: 'uppercase' },
  mfaIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mfaStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  mfaStatusDot: { width: 6, height: 6, borderRadius: 3 },
  mfaStatusText: { fontFamily: 'Geist_600SemiBold', fontSize: 11 },
  resetBtn: { height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  resetText: { fontFamily: 'Geist_800ExtraBold', fontSize: 11, letterSpacing: 1.4 },
});
