import React from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SectionHeader from './SectionHeader';

export default function NotificationsTab({
  colors,
  fontSizes,
  form,
  setField,
  draftNotifications,
  hasUnsavedNotifications,
  setAppliedNotifications,
  user,
  settingsApi,
}) {
  const saveNotificationSettings = async () => {
    if (!user?.id) return;

    try {
      await AsyncStorage.setItem('cookmate:notifications', JSON.stringify(draftNotifications));

      const apiPayload = {
        pushNotifications: draftNotifications.pushNotifications,
        emailNotifications: draftNotifications.emailNotifications,
        newRecipeAlerts: draftNotifications.recipeAlerts,
        weeklyDigest: draftNotifications.weeklyDigest,
      };

      await settingsApi.saveSettings(user.id, 'notifications', apiPayload);
      setAppliedNotifications(draftNotifications);
      Alert.alert('Notifications Saved', 'Your notification preferences have been saved.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save notification settings.');
    }
  };

  return (
    <View style={st.wrap}>
      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon="notifications-outline"
          title="Notification preferences"
          caption="Choose how you want to be notified."
          colors={colors}
        />

        {[
          { icon: 'phone-portrait-outline', label: 'Push notifications', key: 'pushNotifications' },
          { icon: 'mail-outline', label: 'Email notifications', key: 'emailNotifications' },
          { icon: 'flame-outline', label: 'Recipe alerts', key: 'recipeAlerts' },
        ].map((item) => (
          <View key={item.key} style={[st.settingRow, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
            <View style={st.settingLeft}>
              <Ionicons name={item.icon} size={18} color={colors.primary} />
              <Text style={[st.settingLabel, { color: colors.text, fontSize: fontSizes.sm }]}>{item.label}</Text>
            </View>
            <Switch
              value={form[item.key] || false}
              onValueChange={(value) => setField(item.key, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        ))}

        {hasUnsavedNotifications && (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
              You have unsaved notification changes
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={saveNotificationSettings}
          activeOpacity={0.9}
          style={{
            marginTop: hasUnsavedNotifications ? 8 : 16,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center',
            opacity: hasUnsavedNotifications ? 1 : 0.9,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            {hasUnsavedNotifications ? 'SAVE NOTIFICATIONS • UNSAVED' : 'SAVE NOTIFICATIONS'}
          </Text>
        </TouchableOpacity>
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
});
