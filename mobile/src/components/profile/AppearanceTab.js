import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SectionHeader from './SectionHeader';
import FieldLabel from './FieldLabel';

export default function AppearanceTab({
  colors,
  fontSizes,
  draftTheme,
  setDraftTheme,
  draftFontSize,
  setDraftFontSize,
  hasUnsavedAppearance,
  setTheme,
  setFontSize,
  setAppliedTheme,
  setAppliedFontSize,
  user,
  settingsApi,
}) {
  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('cookmate:theme', draftTheme);
      await AsyncStorage.setItem('cookmate:fontSize', draftFontSize);
      await setTheme(draftTheme);
      await setFontSize(draftFontSize);
      setAppliedTheme(draftTheme);
      setAppliedFontSize(draftFontSize);

      if (user?.id) {
        await settingsApi.saveSettings(user.id, 'appearance', {
          theme: draftTheme,
          fontSize: draftFontSize,
        });
      }

      Alert.alert('Appearance Saved', 'Your appearance settings have been saved.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save appearance settings.');
    }
  };

  return (
    <View style={st.wrap}>
      <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SectionHeader
          icon="color-palette-outline"
          title="Appearance"
          caption="Customize how CookMate looks."
          colors={colors}
        />

        <FieldLabel label="Theme" colors={colors} fontSizes={fontSizes} />
        <View style={st.skillGrid}>
          {[
            { id: 'system', label: 'System' },
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ].map((theme) => {
            const active = draftTheme === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                onPress={() => setDraftTheme(theme.id)}
                style={[
                  st.skillBtn,
                  {
                    backgroundColor: active ? colors.text : colors.surface,
                    borderColor: active ? colors.text : colors.border,
                  },
                ]}
              >
                <Text style={[st.skillText, { color: active ? colors.background : colors.textMuted, fontSize: fontSizes.sm }]}>
                  {theme.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FieldLabel label="Font Size" colors={colors} fontSizes={fontSizes} />
        <View style={st.skillGrid}>
          {[
            { id: 'small', label: 'Small' },
            { id: 'medium', label: 'Medium' },
            { id: 'large', label: 'Large' },
          ].map((size) => {
            const active = draftFontSize === size.id;
            return (
              <TouchableOpacity
                key={size.id}
                onPress={() => setDraftFontSize(size.id)}
                style={[
                  st.skillBtn,
                  {
                    backgroundColor: active ? colors.text : colors.surface,
                    borderColor: active ? colors.text : colors.border,
                  },
                ]}
              >
                <Text style={[st.skillText, { color: active ? colors.background : colors.textMuted, fontSize: fontSizes.sm }]}>
                  {size.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasUnsavedAppearance && (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
              You have unsaved changes
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.9}
          style={{
            marginTop: hasUnsavedAppearance ? 8 : 16,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center',
            opacity: hasUnsavedAppearance ? 1 : 0.9,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            {hasUnsavedAppearance ? 'SAVE APPEARANCE • UNSAVED' : 'SAVE APPEARANCE'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 16 },
  section: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  skillGrid: { gap: 8 },
  skillBtn: { minHeight: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skillText: { fontFamily: 'Geist_800ExtraBold', fontSize: 12 },
});
