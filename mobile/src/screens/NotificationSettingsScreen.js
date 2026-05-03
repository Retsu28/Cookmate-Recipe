import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../context/ThemeContext';
import { NotificationSettingsContentSkeleton } from '../components/SkeletonPlaceholder';
import useInitialContentLoading from '../hooks/useInitialContentLoading';

const STORAGE_KEY = 'cookmate.notificationSettings';

const defaultNotificationPreferences = {
  pushAlerts: true,
  emailAlerts: true,
  mealReminders: true,
  ingredientExpiry: true,
  recommendations: false,
};

const channelRows = [
  {
    id: 'pushAlerts',
    title: 'Push alerts',
    description: 'Show reminders and important updates in the app.',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'emailAlerts',
    title: 'Email alerts',
    description: 'Send key account and planning updates to your inbox.',
    icon: 'mail-outline',
  },
];

const alertRows = [
  {
    id: 'mealReminders',
    title: 'Meal reminders',
    description: 'Get nudges before planned meals and prep windows.',
    icon: 'time-outline',
  },
  {
    id: 'ingredientExpiry',
    title: 'Ingredient expiry',
    description: 'Receive alerts when saved ingredients are close to expiring.',
    icon: 'warning-outline',
  },
  {
    id: 'recommendations',
    title: 'Recipe recommendations',
    description: 'Hear about recipe matches based on your cooking profile.',
    icon: 'sparkles-outline',
  },
];

function ToggleRow({ title, description, checked, icon, onChange, colors }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onChange}
      style={[
        st.toggleRow,
        {
          borderColor: checked ? colors.primarySoft : colors.border,
          backgroundColor: checked ? colors.primarySoft + '40' : colors.surface,
        },
      ]}
    >
      <View style={st.toggleRowLeft}>
        <View
          style={[
            st.iconWrapper,
            { backgroundColor: checked ? colors.primarySoft : colors.surfaceAlt },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={checked ? colors.primary : colors.textSubtle}
          />
        </View>
        <View style={st.toggleTextWrap}>
          <Text style={[st.toggleTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[st.toggleDesc, { color: colors.textMuted }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={checked}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
      />
    </TouchableOpacity>
  );
}

export default function NotificationSettingsScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const [preferences, setPreferences] = useState(defaultNotificationPreferences);
  const [loading, setLoading] = useState(true);
  const isInitialLoading = useInitialContentLoading();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences({ ...defaultNotificationPreferences, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.error('Failed to load notification settings', e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const togglePreference = (id) => {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      navigation.goBack();
    } catch (e) {
      console.error('Failed to save notification settings', e);
    }
  };

  const enabledCount = Object.values(preferences).filter(Boolean).length;

  if (isInitialLoading || loading) {
    return <NotificationSettingsContentSkeleton colors={colors} />;
  }

  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: colors.text }]}>Notification settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <View style={st.introSection}>
          <Text style={[st.introDesc, { color: colors.textMuted }]}>
            Configure your email and push alert preferences.
          </Text>
        </View>

        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[st.sectionTitle, { color: colors.text }]}>Delivery</Text>
              <Text style={[st.sectionSubtitle, { color: colors.textMuted }]}>Choose where CookMate can send updates.</Text>
            </View>
          </View>
          <View style={st.toggleList}>
            {channelRows.map((row) => (
              <ToggleRow
                key={row.id}
                title={row.title}
                description={row.description}
                icon={row.icon}
                checked={preferences[row.id]}
                onChange={() => togglePreference(row.id)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <View style={[st.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIconBox, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="notifications" size={20} color={colors.textSubtle} />
            </View>
            <View>
              <Text style={[st.sectionTitle, { color: colors.text }]}>Alert types</Text>
              <Text style={[st.sectionSubtitle, { color: colors.textMuted }]}>Pick the updates that matter during planning and cooking.</Text>
            </View>
          </View>
          <View style={st.toggleList}>
            {alertRows.map((row) => (
              <ToggleRow
                key={row.id}
                title={row.title}
                description={row.description}
                icon={row.icon}
                checked={preferences[row.id]}
                onChange={() => togglePreference(row.id)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <View style={[st.summaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[st.summaryHeader, { borderBottomColor: colors.border }]}>
            <View style={[st.summaryIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[st.summaryCount, { color: colors.text }]}>{enabledCount} enabled</Text>
              <Text style={[st.summaryLabel, { color: colors.textMuted }]}>Notification preferences</Text>
            </View>
          </View>
          <View style={[st.infoBox, { backgroundColor: isDark ? colors.surfaceAlt : colors.background }]}>
            <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={[st.infoText, { color: colors.textSubtle }]}>
              Critical account messages may still be sent for security and service updates.
            </Text>
          </View>
          <TouchableOpacity
            style={[st.saveBtn, { backgroundColor: colors.primary }]}
            onPress={savePreferences}
          >
            <Text style={st.saveBtnText}>SAVE NOTIFICATIONS</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: -4,
  },
  introDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 15,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 18,
  },
  sectionSubtitle: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    marginTop: 2,
    maxWidth: 240,
  },
  toggleList: {
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  toggleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 15,
  },
  toggleDesc: {
    fontFamily: 'Geist_500Medium',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 16,
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 16,
  },
  summaryLabel: {
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: 'Geist_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  saveBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: 'Geist_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.5,
    color: '#fff',
  },
});
